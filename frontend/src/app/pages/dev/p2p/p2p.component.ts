// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { callBridge } from '../../../lib/bridge';
import { NotificationService } from '../../../services/notification.service';

interface P2PPeer {
  id: string;
  topic: string;
  connected: boolean;
  seen_at: string;
}

interface P2PState {
  node_id?: string;
  listen_addr?: string;
  peers?: P2PPeer[];
}

/**
 * P2P panel — gui p2p service surface. Shows the local peer node ID +
 * listen address, the active peer list, and a publish form for sanity-
 * checking the topic bus.
 *
 * Empty state covers the actual "not running" condition: no
 * listen_addr means the TCP driver hasn't bound, every Subscribe /
 * Publish is silently no-op. Tell the user to set p2p.listen_addr in
 * /dev/settings rather than letting the panel pretend to work.
 *
 * TODO(snider/wails): replace callBridge('p2p_*') with a p2pBridge
 * wails service for streamed peer events.
 */
@Component({
  selector: 'dev-p2p',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block p2p-block">
      <div class="block-header p2p-header">
        <h2 class="block-title">{{ 'p2p.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'p2p.subtitle' | translate }}</span>
      </div>

      <div class="p2p-toolbar">
        <button class="btn btn-ghost btn-sm" (click)="refresh()" [disabled]="loading()">
          @if (loading()) { <span>{{ 'p2p.status.loading' | translate }}</span> }
          @else { <span>↻ {{ 'p2p.button.refresh' | translate }}</span> }
        </button>
      </div>

      @if (probeError(); as err) {
        <div class="p2p-empty">
          <h3>{{ 'p2p.empty.no-bridge.title' | translate }}</h3>
          <p>{{ 'p2p.empty.no-bridge.body' | translate }}</p>
          <pre class="p2p-error-detail">{{ err }}</pre>
        </div>
      } @else {
        <div class="p2p-grid">
          <div class="p2p-card">
            <div class="p2p-card-label">{{ 'p2p.card.node-id' | translate }}</div>
            <div class="p2p-card-value p2p-mono">{{ state()?.node_id || ('p2p.value.unassigned' | translate) }}</div>
          </div>
          <div class="p2p-card">
            <div class="p2p-card-label">{{ 'p2p.card.listen-addr' | translate }}</div>
            <div class="p2p-card-value p2p-mono" [class.p2p-warn]="!state()?.listen_addr">
              {{ state()?.listen_addr || ('p2p.value.no-listener' | translate) }}
            </div>
            @if (!state()?.listen_addr) {
              <div class="p2p-card-hint">{{ 'p2p.hint.no-listener' | translate }}</div>
            }
          </div>
          <div class="p2p-card">
            <div class="p2p-card-label">{{ 'p2p.card.peers' | translate }}</div>
            <div class="p2p-card-value" [class.p2p-warn]="(state()?.peers?.length || 0) === 0">
              {{ state()?.peers?.length || 0 }}
            </div>
          </div>
        </div>

        <div class="p2p-section">
          <h3 class="p2p-section-title">{{ 'p2p.heading.peer-list' | translate }}</h3>
          @if ((state()?.peers?.length || 0) === 0) {
            <div class="p2p-empty-inline">{{ 'p2p.empty.no-peers' | translate }}</div>
          } @else {
            <table class="p2p-table">
              <thead>
                <tr>
                  <th>{{ 'p2p.column.id' | translate }}</th>
                  <th>{{ 'p2p.column.topic' | translate }}</th>
                  <th>{{ 'p2p.column.connected' | translate }}</th>
                  <th>{{ 'p2p.column.seen' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (p of state()?.peers; track p.id) {
                  <tr>
                    <td><code>{{ p.id }}</code></td>
                    <td><code>{{ p.topic }}</code></td>
                    <td>
                      <span class="p2p-pill" [class.p2p-ok]="p.connected" [class.p2p-down]="!p.connected">
                        {{ p.connected ? ('p2p.status.connected' | translate) : ('p2p.status.disconnected' | translate) }}
                      </span>
                    </td>
                    <td><code>{{ p.seen_at?.slice(11, 19) }}</code></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <div class="p2p-section p2p-publish-section">
          <h3 class="p2p-section-title">{{ 'p2p.heading.publish' | translate }}</h3>
          <div class="p2p-publish">
            <input class="input p2p-input" [placeholder]="'p2p.placeholder.topic' | translate"
                   [value]="topic()" (input)="topic.set($any($event.target).value)" />
            <input class="input p2p-input" [placeholder]="'p2p.placeholder.route' | translate"
                   [value]="route()" (input)="route.set($any($event.target).value)" />
            <textarea class="input p2p-payload" rows="3"
                      [placeholder]="'p2p.placeholder.payload' | translate"
                      [value]="payloadText()"
                      (input)="payloadText.set($any($event.target).value)"></textarea>
            <button class="btn btn-primary btn-sm" (click)="publish()" [disabled]="!canPublish()">
              {{ 'p2p.button.publish' | translate }}
            </button>
          </div>
          @if (publishError(); as err) {
            <div class="p2p-publish-error">{{ err }}</div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .p2p-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: auto; }
    .p2p-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .p2p-toolbar { padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; display: flex; gap: 8px; }

    .p2p-empty { padding: 32px; max-width: 600px; margin: 24px auto; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; }
    .p2p-empty h3 { font-size: 14px; color: var(--fg-1); margin: 0 0 8px; }
    .p2p-empty p { color: var(--fg-2); font-size: 13px; line-height: 1.5; margin: 6px 0; }
    .p2p-error-detail { font-family: var(--font-mono); font-size: 11px; color: #fbbf24; background: var(--ink-1); padding: 10px 12px; border-radius: 4px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin-top: 12px; }
    .p2p-empty-inline { padding: 18px; color: var(--fg-3); font-style: italic; font-size: 12px; text-align: center; }

    .p2p-grid { padding: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .p2p-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
    .p2p-card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-3); }
    .p2p-card-value { font-size: 18px; font-weight: 500; color: var(--fg-1); }
    .p2p-card-value.p2p-mono { font-family: var(--font-mono); font-size: 12px; word-break: break-all; }
    .p2p-card-value.p2p-warn { color: #fbbf24; }
    .p2p-card-hint { font-size: 11px; color: var(--fg-3); font-style: italic; }

    .p2p-section { padding: 14px 18px; }
    .p2p-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 10px; }
    .p2p-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .p2p-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); background: var(--ink-2); }
    .p2p-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .p2p-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .p2p-pill { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .p2p-pill.p2p-ok { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .p2p-pill.p2p-down { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }

    .p2p-publish { display: grid; grid-template-columns: 200px 200px 1fr auto; gap: 8px; align-items: start; }
    .p2p-input { font-family: var(--font-mono); font-size: 12px; }
    .p2p-payload { grid-column: 1 / -1; font-family: var(--font-mono); font-size: 12px; resize: vertical; }
    .p2p-publish-error { color: #f87171; font-size: 12px; padding: 8px 10px; background: color-mix(in oklch, #f87171 8%, var(--ink-1)); border-radius: 4px; margin-top: 8px; font-family: var(--font-mono); }
  `],
})
export class P2PComponent implements OnInit {
  private readonly notify = inject(NotificationService);

  readonly state = signal<P2PState | null>(null);
  readonly loading = signal(false);
  readonly probeError = signal<string | null>(null);

  readonly topic = signal('');
  readonly route = signal('');
  readonly payloadText = signal('');
  readonly publishError = signal<string | null>(null);

  readonly canPublish = computed(() => this.topic().trim().length > 0 && this.state()?.listen_addr);

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.probeError.set(null);
    try {
      const v = await callBridge<{ state?: P2PState }>('p2p_state', {});
      this.state.set(v?.state || null);
    } catch (e) {
      this.probeError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.loading.set(false);
    }
  }

  async publish(): Promise<void> {
    this.publishError.set(null);
    let payload: Record<string, unknown> = {};
    const raw = this.payloadText().trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          payload = parsed as Record<string, unknown>;
        } else {
          payload = { value: parsed };
        }
      } catch (e) {
        this.publishError.set('Payload must be JSON object: ' + (e instanceof Error ? e.message : String(e)));
        return;
      }
    }

    try {
      const v = await callBridge<{ success?: boolean }>('p2p_publish', {
        topic: this.topic().trim(),
        route: this.route().trim(),
        payload,
      });
      this.notify.notify({
        message: v?.success ? 'Frame published' : 'Publish returned (no transport)',
        variant: v?.success ? 'success' : 'warning',
        icon: v?.success ? 'check' : 'triangle-exclamation',
      });
      void this.refresh();
    } catch (e) {
      this.publishError.set(e instanceof Error ? e.message : String(e));
    }
  }
}
