// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { FileEditorStore } from '../../../services/store/file-editor.store';

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
 * TODO(snider/wails): swap callBridge('stream_*') for a streamBridge
 * wails service. The Hub already exposes a clean interface in core/
 * stream — wrapping it as wails services is straightforward.
 *
 * TODO: openStreamFramePath currently no-ops. The IdeComponent legacy
 * version routes through openSearchResult to open the file in Monaco.
 * Move to a shared FileEditorService when Search extracts.
 */
@Component({
  selector: 'dev-stream',
  standalone: true,
  template: `
    <section class="block stream-block">
      <div class="block-header stream-header">
        <h2 class="block-title">Stream</h2>
        <span class="editorial subtitle">go-stream Hub inspector · in-process pub/sub.</span>
      </div>
      @if (streamStatus(); as st) {
        <div class="stream-status-grid">
          <div class="stream-stat">
            <div class="stream-stat-label">running</div>
            <div class="stream-stat-value" [class.stream-ok]="st.running" [class.stream-warn]="!st.running">
              {{ st.running ? '✓ yes' : '· starting' }}
            </div>
          </div>
          <div class="stream-stat">
            <div class="stream-stat-label">peers</div>
            <div class="stream-stat-value">{{ st.peer_count }}</div>
          </div>
          <div class="stream-stat">
            <div class="stream-stat-label">channels</div>
            <div class="stream-stat-value">{{ st.channel_count }}</div>
          </div>
          <div class="stream-stat">
            <div class="stream-stat-label">heartbeat</div>
            <div class="stream-stat-value">{{ st.config.heartbeat_ms / 1000 }}s</div>
          </div>
        </div>
      }
      <div class="stream-body">
        <aside class="stream-channels">
          <div class="stream-list-title">Channels ({{ streamChannels().length }})</div>
          <button class="stream-channel-row" [class.active]="streamSelectedChannel() === null" (click)="loadStreamFrames(null)">
            <span class="stream-channel-name"><em>(broadcast)</em></span>
            <span class="stream-channel-meta">{{ streamBroadcastBufCount() }} fr</span>
          </button>
          @for (c of streamChannels(); track c.name) {
            <button class="stream-channel-row" [class.active]="streamSelectedChannel() === c.name" (click)="loadStreamFrames(c.name)">
              <span class="stream-channel-name">{{ c.name }}</span>
              <span class="stream-channel-meta">
                <span title="subscribers">{{ c.subscriber_count }} sub</span>
                <span title="recent frames">· {{ c.recent_frames }} fr</span>
              </span>
            </button>
          }
          @if (streamChannels().length === 0) {
            <div class="stream-empty">No channels yet — publish below to seed.</div>
          }
        </aside>
        <main class="stream-frames">
          <div class="stream-list-title">
            Frames {{ streamSelectedChannel() ? '· ' + streamSelectedChannel() : '· (broadcast)' }}
            <button class="btn btn-ghost btn-sm stream-refresh" (click)="loadStream()" [disabled]="streamLoading()">↻</button>
          </div>
          @if (streamFrames().length === 0) {
            <div class="stream-empty">No frames captured for this channel yet.</div>
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
                      <span class="stream-frame-tag">json</span>
                      <button class="stream-frame-toggle" (click)="toggleStreamFrameRaw(i)">{{ raw ? 'pretty' : 'raw' }}</button>
                    }
                    @if (parsed.clickablePath; as p) {
                      <button class="stream-frame-jump" (click)="openStreamFramePath(p)" [title]="'Open ' + p">↗ {{ p.split('/').slice(-2).join('/') }}</button>
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
        <div class="stream-list-title">Publish test frame</div>
        <div class="stream-publish-row">
          <select class="input stream-mode-select" [value]="streamPublishMode()" (change)="streamPublishMode.set($any($event.target).value)">
            <option value="publish">publish</option>
            <option value="broadcast">broadcast</option>
          </select>
          @if (streamPublishMode() === 'publish') {
            <input class="input stream-channel-input" placeholder="channel name" [value]="streamPublishChannel()" (input)="streamPublishChannel.set($any($event.target).value)" />
          }
          <input class="input stream-frame-input" placeholder="frame body (text or json)" [value]="streamPublishBody()" (input)="streamPublishBody.set($any($event.target).value)" (keyup.enter)="publishStreamFrame()" />
          <button class="btn btn-primary btn-sm" (click)="publishStreamFrame()">Publish</button>
        </div>
      </div>
    </section>
  `,
})
export class StreamComponent implements OnInit {
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

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

  ngOnInit(): void {
    void this.loadStream();
  }

  async loadStream(): Promise<void> {
    this.streamLoading.set(true);
    try {
      const status = await callBridge<StreamStatus>('stream_status', {});
      this.streamStatus.set(status);
      const channels = await callBridge<{ channels?: StreamChannel[]; broadcast_buf?: number }>('stream_channels', {});
      this.streamChannels.set(channels?.channels || []);
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
      const v = await callBridge<{ frames?: StreamFrame[] }>('stream_recent', params);
      this.streamFrames.set((v?.frames || []).slice().reverse());
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
      await callBridge('stream_publish', { mode, channel, frame });
      this.streamPublishBody.set('');
      await this.loadStream();
    } catch {
      // ignore — user can retry via the publish button
    }
  }
}
