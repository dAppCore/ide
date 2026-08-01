// <lethean-playback-bar> — rendered inside <lethean-stage> below the
// canvas. Play/pause, return-to-start, scrub track with hover-preview,
// fixed-width tabular time fields so layout doesn't thrash.
//
// Communicates with parent Stage via CustomEvent: play-pause, reset, seek,
// hover. Bar is dumb — Stage owns the state.

import { LitElement, css, html, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { clamp } from './easing';

const MONO = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

@customElement('lethean-playback-bar')
export class LetheanPlaybackBar extends LitElement {
  @property({ type: Number }) time = 0;
  @property({ type: Number }) duration = 10;
  @property({ type: Boolean }) playing = false;

  @state() private _dragging = false;

  @query('.track') private _track!: HTMLElement;

  private _onWindowMoveBound = this._onWindowMove.bind(this);
  private _onWindowUpBound = this._onWindowUp.bind(this);

  static styles = css`
    :host {
      display: block;
      width: 100%;
      flex-shrink: 0;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      margin: 0 auto;
      background: rgba(20, 20, 20, 0.92);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      max-width: 680px;
      color: #f6f4ef;
      user-select: none;
      box-sizing: border-box;
    }
    button.icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #f6f4ef;
      cursor: pointer;
      padding: 0;
      transition: background 120ms;
    }
    button.icon:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    .time {
      font-family: ${unsafeCSS(MONO)};
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      width: 64px;
    }
    .time.now {
      text-align: right;
      color: #f6f4ef;
    }
    .time.dur {
      text-align: left;
      color: rgba(246, 244, 239, 0.55);
    }
    .track {
      flex: 1;
      height: 22px;
      position: relative;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    .track-bg {
      position: absolute;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 2px;
    }
    .track-fill {
      position: absolute;
      left: 0;
      height: 4px;
      background: oklch(72% 0.12 250);
      border-radius: 2px;
    }
    .track-thumb {
      position: absolute;
      top: 50%;
      width: 12px;
      height: 12px;
      margin-left: -6px;
      margin-top: -6px;
      background: #fff;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
  `;

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('mousemove', this._onWindowMoveBound);
    window.removeEventListener('mouseup', this._onWindowUpBound);
  }

  private _timeFromEvent(e: { clientX: number }): number {
    if (!this._track) return 0;
    const rect = this._track.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * this.duration;
  }

  private _onTrackMove(e: MouseEvent) {
    const t = this._timeFromEvent(e);
    if (this._dragging) {
      this.dispatchEvent(new CustomEvent<number>('seek', { detail: t }));
    } else {
      this.dispatchEvent(new CustomEvent<number>('hover', { detail: t }));
    }
  }

  private _onTrackLeave() {
    if (!this._dragging) {
      this.dispatchEvent(new CustomEvent<number | null>('hover', { detail: null }));
    }
  }

  private _onTrackDown(e: MouseEvent) {
    this._dragging = true;
    const t = this._timeFromEvent(e);
    this.dispatchEvent(new CustomEvent<number>('seek', { detail: t }));
    this.dispatchEvent(new CustomEvent<number | null>('hover', { detail: null }));
    window.addEventListener('mousemove', this._onWindowMoveBound);
    window.addEventListener('mouseup', this._onWindowUpBound);
  }

  private _onWindowMove(e: MouseEvent) {
    if (!this._dragging) return;
    const t = this._timeFromEvent(e);
    this.dispatchEvent(new CustomEvent<number>('seek', { detail: t }));
  }

  private _onWindowUp() {
    this._dragging = false;
    window.removeEventListener('mousemove', this._onWindowMoveBound);
    window.removeEventListener('mouseup', this._onWindowUpBound);
  }

  private _fmt(t: number): string {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  render() {
    const pct = this.duration > 0 ? (this.time / this.duration) * 100 : 0;
    return html`
      <div class="bar">
        <button
          class="icon"
          title="Return to start (0)"
          @click=${() => this.dispatchEvent(new CustomEvent('reset'))}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 2v10M12 2L5 7l7 5V2z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          class="icon"
          title="Play / pause (space)"
          @click=${() => this.dispatchEvent(new CustomEvent('play-pause'))}
        >
          ${this.playing
            ? html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="2" width="3" height="10" fill="currentColor" />
                <rect x="8" y="2" width="3" height="10" fill="currentColor" />
              </svg>`
            : html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 2l9 5-9 5V2z" fill="currentColor" />
              </svg>`}
        </button>

        <div class="time now">${this._fmt(this.time)}</div>

        <div
          class="track"
          @mousemove=${this._onTrackMove}
          @mouseleave=${this._onTrackLeave}
          @mousedown=${this._onTrackDown}
        >
          <div class="track-bg"></div>
          <div class="track-fill" style=${`width:${pct}%`}></div>
          <div class="track-thumb" style=${`left:${pct}%`}></div>
        </div>

        <div class="time dur">${this._fmt(this.duration)}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-playback-bar': LetheanPlaybackBar;
  }
}
