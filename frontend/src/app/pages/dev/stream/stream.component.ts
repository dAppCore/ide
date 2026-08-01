// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import * as StreamBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/streambridge';
import { FileEditorStore } from '../../../services/store/file-editor.store';
import { StreamEventsService } from '../../../services/stream-events.service';

interface StreamStatus {
  running: boolean;
  peer_count: number;
  channel_count: number;
  subscriber_counts: Record<string, number>;
  config: { heartbeat_ms: number; pong_timeout_ms: number; write_timeout_ms: number };
}

interface StreamChannel {
  name: string;
  subscriber_count: number;
  recent_frames: number;
}

interface StreamFrame {
  channel?: string;
  timestamp: string;
  frame_text: string;
  frame_bytes: number;
}

interface ParsedFrame {
  isJson: boolean;
  pretty?: string;
  raw: string;
  clickablePath?: string;
}

/**
 * Stream panel — go-stream Hub inspector. In-process pub/sub viewer
 * with channel browser, frame list, and a publish form.
 *
 * Migrated 2026-05-09 to typed StreamBridge wails binding.
 *
 * Push-side updates 2026-05-10: subscribes to StreamEventsService
 * (SSE on /internal/events) so frames on the actions channel land
 * in the recent-frames list without polling. The poll-side reload
 * still works for any channel + on demand.
 */
@Component({
  selector: 'dev-stream',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block stream-block">
      <div class="block-header stream-header">
        <h2 class="block-title">{{ 'stream.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'stream.subtitle' | translate }}</span>
      </div>
      @if (streamStatus(); as st) {
        <div class="stream-status-grid">
          <div class="stream-stat">
            <div class="stream-stat-label">{{ 'stream.stat.running' | translate }}</div>
            <div class="stream-stat-value" [class.stream-ok]="st.running" [class.stream-warn]="!st.running">
              {{ (st.running ? 'stream.status.yes' : 'stream.status.starting') | translate }}
            </div>
          </div>
          <div class="stream-stat">
            <div class="stream-stat-label">{{ 'stream.stat.peers' | translate }}</div>
            <div class="stream-stat-value">{{ st.peer_count }}</div>
          </div>
          <div class="stream-stat">
            <div class="stream-stat-label">{{ 'stream.stat.channels' | translate }}</div>
            <div class="stream-stat-value">{{ st.channel_count }}</div>
          </div>
          <div class="stream-stat">
            <div class="stream-stat-label">{{ 'stream.stat.heartbeat' | translate }}</div>
            <div class="stream-stat-value">{{ st.config.heartbeat_ms / 1000 }}s</div>
          </div>
        </div>
      }
      <div class="stream-body">
        <aside class="stream-channels">
          <div class="stream-list-title">{{ 'stream.heading.channels' | translate }} ({{ streamChannels().length }})</div>
          <button class="stream-channel-row" [class.active]="streamSelectedChannel() === null" (click)="loadStreamFrames(null)">
            <span class="stream-channel-name"><em>{{ 'stream.label.broadcast' | translate }}</em></span>
            <span class="stream-channel-meta">{{ streamBroadcastBufCount() }} {{ 'stream.suffix.frames' | translate }}</span>
          </button>
          @for (c of streamChannels(); track c.name) {
            <button class="stream-channel-row" [class.active]="streamSelectedChannel() === c.name" (click)="loadStreamFrames(c.name)">
              <span class="stream-channel-name">{{ c.name }}</span>
              <span class="stream-channel-meta">
                <span [title]="'stream.tooltip.subscribers' | translate">{{ c.subscriber_count }} {{ 'stream.suffix.subscribers' | translate }}</span>
                <span [title]="'stream.tooltip.recent-frames' | translate">· {{ c.recent_frames }} {{ 'stream.suffix.frames' | translate }}</span>
              </span>
            </button>
          }
          @if (streamChannels().length === 0) {
            <div class="stream-empty">{{ 'stream.empty.no-channels' | translate }}</div>
          }
        </aside>
        <main class="stream-frames">
          <div class="stream-list-title">
            {{ 'stream.heading.frames' | translate }} {{ streamSelectedChannel() ? '· ' + streamSelectedChannel() : '· ' + ('stream.label.broadcast' | translate) }}
            <span class="stream-live-pill" [class.live]="streamEvents.connected()" [title]="streamEvents.connected() ? ('stream.tooltip.live' | translate) : ('stream.tooltip.reconnecting' | translate)">
              ● {{ streamEvents.connected() ? ('stream.label.live' | translate) : ('stream.label.reconnecting' | translate) }}
              @if (streamEvents.eventCount(); as n) {
                · {{ n }}
              }
            </span>
            <button class="btn btn-ghost btn-sm stream-refresh" (click)="loadStream()" [disabled]="streamLoading()">↻</button>
          </div>
          @if (streamFrames().length === 0) {
            <div class="stream-empty">{{ 'stream.empty.no-frames' | translate }}</div>
          } @else {
            <div class="stream-frame-list">
              @for (f of streamFrames(); track $index; let i = $index) {
                @let parsed = parseStreamFrame(f);
                @let raw = streamFrameRawMode().has(i);
                <div class="stream-frame" [class.stream-frame-json]="parsed.isJson">
                  <div class="stream-frame-head">
                    <span class="stream-frame-time">{{ f.timestamp.slice(11, 19) }}</span>
                    <span class="stream-frame-bytes">{{ f.frame_bytes }}B</span>
                    @if (parsed.isJson) {
                      <span class="stream-frame-tag">{{ 'stream.tag.json' | translate }}</span>
                      <button class="stream-frame-toggle" (click)="toggleStreamFrameRaw(i)">{{ (raw ? 'stream.toggle.pretty' : 'stream.toggle.raw') | translate }}</button>
                    }
                    @if (parsed.clickablePath; as p) {
                      <button class="stream-frame-jump" (click)="openStreamFramePath(p)" [title]="openTitle(p)">↗ {{ p.split('/').slice(-2).join('/') }}</button>
                    }
                  </div>
                  @if (parsed.isJson && !raw) {
                    <pre class="stream-frame-pretty">{{ parsed.pretty }}</pre>
                  } @else {
                    <span class="stream-frame-text">{{ parsed.raw }}</span>
                  }
                </div>
              }
            </div>
          }
        </main>
      </div>
      <div class="stream-publish">
        <div class="stream-list-title">{{ 'stream.heading.publish' | translate }}</div>
        <div class="stream-publish-row">
          <select class="input stream-mode-select" [value]="streamPublishMode()" (change)="streamPublishMode.set($any($event.target).value)">
            <option value="publish">{{ 'stream.option.publish' | translate }}</option>
            <option value="broadcast">{{ 'stream.option.broadcast' | translate }}</option>
          </select>
          @if (streamPublishMode() === 'publish') {
            <input class="input stream-channel-input" [placeholder]="'stream.placeholder.channel-name' | translate" [value]="streamPublishChannel()" (input)="streamPublishChannel.set($any($event.target).value)" />
          }
          <input class="input stream-frame-input" [placeholder]="'stream.placeholder.frame-body' | translate" [value]="streamPublishBody()" (input)="streamPublishBody.set($any($event.target).value)" (keyup.enter)="publishStreamFrame()" />
          <button class="btn btn-primary btn-sm" (click)="publishStreamFrame()">{{ 'stream.button.publish' | translate }}</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Stream panel */
    .stream-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .stream-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-stat { background: var(--ink-2); padding: 10px 12px; border-radius: 6px; }
    .stream-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-3); }
    .stream-stat-value { font-size: 18px; font-weight: 500; color: var(--fg-1); margin-top: 4px; font-family: var(--font-mono); }
    .stream-ok { color: #34d399; }
    .stream-warn { color: #fbbf24; }
    .stream-body { display: grid; grid-template-columns: 240px 1fr; gap: 0; flex: 1; min-height: 0; overflow: hidden; }
    .stream-channels { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .stream-list-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); padding: 0 14px 8px; display: flex; justify-content: space-between; align-items: center; }
    .stream-refresh { padding: 2px 6px; font-size: 11px; }
    .stream-live-pill { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); margin-left: auto; margin-right: 6px; opacity: 0.7; }
    .stream-live-pill.live { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; opacity: 1; }
    .stream-channel-row { width: 100%; padding: 8px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; justify-content: space-between; align-items: center; }
    .stream-channel-row:hover { background: var(--ink-2); }
    .stream-channel-row.active { background: var(--ink-2); border-left-color: var(--brand-200); color: var(--fg-1); }
    .stream-channel-name { font-size: 12px; font-weight: 500; font-family: var(--font-mono); }
    .stream-channel-meta { font-size: 10px; color: var(--fg-3); display: flex; gap: 4px; }
    .stream-empty { padding: 18px; font-size: 12px; color: var(--fg-3); font-style: italic; text-align: center; }
    .stream-frames { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .stream-frame-list { flex: 1; overflow-y: auto; padding: 0 18px; font-family: var(--font-mono); font-size: 11px; }
    .stream-frame { padding: 6px 0; border-bottom: 1px solid var(--line-1); display: flex; flex-direction: column; gap: 4px; }
    .stream-frame-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .stream-frame-time { color: var(--fg-3); font-size: 11px; min-width: 60px; }
    .stream-frame-bytes { color: var(--brand-200); font-size: 11px; min-width: 40px; text-align: right; }
    .stream-frame-tag { background: color-mix(in oklch, var(--brand-200) 16%, var(--ink-1)); color: var(--brand-200); font-size: 9px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .stream-frame-toggle { background: var(--ink-1); border: 1px solid var(--line-1); color: var(--fg-3); font-size: 9px; padding: 1px 6px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); }
    .stream-frame-toggle:hover { color: var(--fg-1); border-color: var(--brand-200); }
    .stream-frame-jump { background: transparent; border: 1px solid var(--brand-200); color: var(--brand-200); font-size: 10px; padding: 1px 6px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); margin-left: auto; }
    .stream-frame-jump:hover { background: color-mix(in oklch, var(--brand-200) 14%, transparent); }
    .stream-frame-text { color: var(--fg-2); white-space: pre-wrap; word-break: break-all; font-size: 11px; }
    .stream-frame-pretty { color: var(--fg-2); white-space: pre; overflow-x: auto; font-size: 10px; padding: 6px 8px; background: var(--ink-1); border-radius: 4px; margin: 0; line-height: 1.4; }
    .stream-frame-json .stream-frame-time { color: var(--brand-200); }
    .stream-publish { padding: 14px 18px; border-top: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-publish-row { display: flex; gap: 8px; align-items: center; }
    .stream-mode-select { width: 110px; flex-shrink: 0; }
    .stream-channel-input { width: 160px; flex-shrink: 0; }
    .stream-frame-input { flex: 1; }
  `],
})
export class StreamComponent implements OnInit {
  private readonly fileEditor = inject(FileEditorStore);
  readonly streamEvents = inject(StreamEventsService);
  private readonly router = inject(Router);
  private readonly t = inject(TranslateService);

  readonly streamStatus = signal<StreamStatus | null>(null);
  readonly streamChannels = signal<StreamChannel[]>([]);
  readonly streamBroadcastBufCount = signal(0);
  readonly streamSelectedChannel = signal<string | null>(null);
  readonly streamFrames = signal<StreamFrame[]>([]);
  readonly streamPublishChannel = signal('');
  readonly streamPublishBody = signal('');
  readonly streamPublishMode = signal<'publish' | 'broadcast'>('publish');
  readonly streamLoading = signal(false);
  readonly streamFrameRawMode = signal<Set<number>>(new Set());

  /** Last event count we already absorbed into streamFrames — guards
   *  against re-firing the effect when the selected channel changes
   *  but no new SSE frame has arrived since.
   */
  private absorbedEventCount = 0;

  constructor() {
    // Push-side: when the SSE service receives a new envelope on the
    // currently-selected channel, prepend it to streamFrames so the
    // panel stays live without polling.
    effect(() => {
      const env = this.streamEvents.latest();
      const count = this.streamEvents.eventCount();
      if (!env || count === this.absorbedEventCount) return;
      this.absorbedEventCount = count;
      const selected = this.streamSelectedChannel();
      // Broadcasts (selected===null) currently aren't part of the SSE
      // stream — only the "actions" channel is auto-published. Match
      // by exact channel for now; ?topics= filtering lands later.
      if (selected !== env.channel) return;
      const text = JSON.stringify(env);
      const synth: StreamFrame = {
        channel: env.channel,
        timestamp: env.ts,
        frame_text: text,
        frame_bytes: text.length,
      };
      this.streamFrames.update((list) => [synth, ...list].slice(0, 200));
    });
  }

  ngOnInit(): void {
    this.streamEvents.connect();
    void this.loadStream();
  }

  openTitle(path: string): string {
    return this.t.instant('stream.tooltip.open') + ' ' + path;
  }

  async loadStream(): Promise<void> {
    this.streamLoading.set(true);
    try {
      const status = (await StreamBridge.Status()) as unknown as StreamStatus;
      this.streamStatus.set(status);
      const channels = await StreamBridge.Channels();
      this.streamChannels.set((channels?.channels as StreamChannel[]) || []);
      this.streamBroadcastBufCount.set(channels?.broadcast_buf || 0);
      const sel = this.streamSelectedChannel();
      if (sel !== null) {
        await this.loadStreamFrames(sel);
      }
    } catch {
      // Tolerate; the panel surfaces errors via empty state.
    } finally {
      this.streamLoading.set(false);
    }
  }

  async loadStreamFrames(channel: string | null): Promise<void> {
    this.streamSelectedChannel.set(channel);
    const params: Record<string, string> = {};
    if (channel) params['channel'] = channel;
    try {
      const v = await StreamBridge.Recent({ channel: params['channel'] || '' });
      this.streamFrames.set(((v?.frames as StreamFrame[]) || []).slice().reverse());
    } catch {
      this.streamFrames.set([]);
    }
  }

  // Frame parsing: try to JSON-parse; if it works, pretty-print +
  // extract a clickable path if one exists. Falls back to raw text.
  parseStreamFrame(frame: { frame_text: string }): ParsedFrame {
    const raw = frame.frame_text;
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { isJson: false, raw };
    }
    try {
      const parsed = JSON.parse(trimmed);
      let clickablePath: string | undefined;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidate = parsed['path'] || parsed['file'] || parsed['file_path'];
        if (typeof candidate === 'string' && candidate.startsWith('/')) {
          clickablePath = candidate;
        }
      }
      return {
        isJson: true,
        pretty: JSON.stringify(parsed, null, 2),
        raw,
        clickablePath,
      };
    } catch {
      return { isJson: false, raw };
    }
  }

  toggleStreamFrameRaw(idx: number): void {
    const s = new Set(this.streamFrameRawMode());
    if (s.has(idx)) s.delete(idx); else s.add(idx);
    this.streamFrameRawMode.set(s);
  }

  async openStreamFramePath(path: string): Promise<void> {
    await this.fileEditor.openFile(path);
    void this.router.navigate(['/dev/explorer']);
  }

  async publishStreamFrame(): Promise<void> {
    const mode = this.streamPublishMode();
    const channel = this.streamPublishChannel().trim();
    const frame = this.streamPublishBody();
    if (mode === 'publish' && !channel) return;
    try {
      await StreamBridge.Publish({ mode, channel, frame });
      this.streamPublishBody.set('');
      await this.loadStream();
    } catch {
      // ignore — user can retry via the publish button
    }
  }
}
