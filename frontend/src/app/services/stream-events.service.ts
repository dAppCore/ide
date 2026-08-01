// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, Signal, computed, signal } from '@angular/core';

/**
 * Envelope shape published on the Stream Hub "actions" channel by
 * stream_bridge.AutoPublishCoreActions in the Go backend. Every core
 * ACTION dispatched anywhere in the IDE is JSON-encoded once and sent
 * here as a single SSE frame.
 *
 * `type` is the fully-qualified Go type name of the action message —
 * `dappco.re/go/gui/pkg/lifecycle.ActionDidBecomeActive` etc. — useful
 * for routing on the frontend without needing to switch on each new
 * action type the backend learns to emit.
 */
export interface StreamEventEnvelope {
  channel: string;
  type: string;
  ts: string;
  data: unknown;
}

const SSE_URL = 'http://127.0.0.1:9877/internal/events';
const RECENT_LIMIT = 200;
const RETRY_INTERVAL_MS = 2000;

/**
 * StreamEventsService — single shared EventSource subscriber to the
 * IDE's /internal/events SSE endpoint. Every backend ACTION lands here
 * as a typed envelope; panels filter by `type` or `channel` via the
 * `observeType()` / `observeChannel()` helpers.
 *
 * This is the framework primitive for "live state" panels. Until a
 * panel needs push-side updates, it doesn't pay the connection cost
 * — the EventSource only opens on first `connect()` call. Once open,
 * it stays open for the rest of the session and serves all consumers.
 *
 * Usage:
 *
 *   constructor() {
 *     this.streamEvents.connect();
 *   }
 *
 *   readonly viStatusEvents = this.streamEvents.observeType('.ViStatus');
 *
 * Future lanes:
 * - ?topics= filter on the SSE endpoint to scope server-side fan-out
 * - per-channel subscription (currently only "actions" is auto-published)
 * - typed helpers per action package
 */
@Injectable({ providedIn: 'root' })
export class StreamEventsService {
  private es?: EventSource;
  private retryTimer?: ReturnType<typeof setTimeout>;

  /** True when the SSE connection is open and ready for frames. */
  readonly connected = signal(false);

  /** Most recent envelope received, or null if none yet. */
  readonly latest = signal<StreamEventEnvelope | null>(null);

  /** Cumulative count of envelopes received since connect(). */
  readonly eventCount = signal(0);

  /** Ring buffer of recent envelopes, latest-first. Capped at RECENT_LIMIT. */
  readonly recent = signal<StreamEventEnvelope[]>([]);

  /** Idempotent — safe to call from every consumer's ngOnInit. */
  connect(): void {
    if (this.es) return;
    this.openSource();
  }

  /** Filter recent envelopes by Go type-name suffix. Stable computed. */
  observeType(typeSuffix: string): Signal<StreamEventEnvelope[]> {
    return computed(() => this.recent().filter((e) => e.type.endsWith(typeSuffix)));
  }

  /** Filter recent envelopes by channel name. Stable computed. */
  observeChannel(channel: string): Signal<StreamEventEnvelope[]> {
    return computed(() => this.recent().filter((e) => e.channel === channel));
  }

  private openSource(): void {
    if (typeof EventSource === 'undefined') return; // SSR guard
    try {
      this.es = new EventSource(SSE_URL);
      this.es.onopen = () => this.connected.set(true);
      this.es.onerror = () => {
        this.connected.set(false);
        // Browsers auto-reconnect on transient errors; if the connection
        // is fully CLOSED, fall back to a manual retry. Without this,
        // backend restarts during dev would leave the FE stuck.
        if (this.es && this.es.readyState === EventSource.CLOSED) {
          this.es = undefined;
          this.scheduleRetry();
        }
      };
      this.es.onmessage = (ev) => this.handleFrame(ev.data);
    } catch {
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.openSource();
    }, RETRY_INTERVAL_MS);
  }

  private handleFrame(raw: string): void {
    let env: StreamEventEnvelope;
    try {
      env = JSON.parse(raw) as StreamEventEnvelope;
    } catch {
      return;
    }
    this.latest.set(env);
    this.eventCount.update((n) => n + 1);
    this.recent.update((list) => {
      const next = [env, ...list];
      if (next.length > RECENT_LIMIT) next.length = RECENT_LIMIT;
      return next;
    });
  }
}
