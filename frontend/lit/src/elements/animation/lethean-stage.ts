// <lethean-stage> — host for the animation timeline. Provides
// TimelineContext to slotted descendants. Runs the rAF playhead, persists
// time across reloads, auto-scales the canvas to the viewport, handles
// keyboard scrub, and renders the PlaybackBar below the canvas.
//
// Usage:
//   <lethean-stage width="1280" height="720" duration="10" persist-key="demo">
//     <lethean-sprite start="0" end="3">
//       <lethean-text-sprite text="Hello"/>
//     </lethean-sprite>
//   </lethean-stage>

import { LitElement, css, html, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { timelineContext, type TimelineState } from './context';
import { clamp } from './easing';
import './lethean-playback-bar';

const SANS_STACK = 'Inter, system-ui, sans-serif';

@customElement('lethean-stage')
export class LetheanStage extends LitElement {
  @property({ type: Number }) width = 1280;
  @property({ type: Number }) height = 720;
  @property({ type: Number }) duration = 10;
  @property({ type: String }) background = '#f6f4ef';
  @property({ type: Number }) fps = 60;
  @property({ type: Boolean }) loop = true;
  @property({ type: Boolean }) autoplay = true;
  @property({ type: String, attribute: 'persist-key' }) persistKey = 'animstage';

  @state() private _time = 0;
  @state() private _playing = false;
  @state() private _hoverTime: number | null = null;
  @state() private _scale = 1;

  @query('.host') private _host!: HTMLElement;

  private _rafId: number | null = null;
  private _lastTs: number | null = null;
  private _resizeObs: ResizeObserver | null = null;
  private _onKeyBound = this._onKey.bind(this);
  private _onResizeBound = this._measure.bind(this);

  // Provide TimelineContext to descendants. Updated whenever displayTime
  // / duration / playing change — Lit's @provide uses the property's
  // current value at render time.
  @provide({ context: timelineContext })
  @state()
  private _ctx: TimelineState = {
    time: 0,
    duration: 10,
    playing: false,
    setTime: (t: number) => this._setTime(t),
    setPlaying: (p: boolean) => this._setPlaying(p),
  };

  // Public accessor for the current playhead — also satisfies TS6133 by
  // giving `_ctx` a read site (the @provide decorator's read isn't
  // visible to the type checker).
  get currentTime(): number {
    return this._ctx.time;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      font-family: ${unsafeCSS(SANS_STACK)};
    }
    .host {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #0a0a0a;
    }
    .canvas-wrap {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 0;
    }
    .canvas {
      position: relative;
      transform-origin: center;
      flex-shrink: 0;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Restore persisted playhead.
    try {
      const v = parseFloat(localStorage.getItem(this.persistKey + ':t') ?? '0');
      if (isFinite(v)) this._time = clamp(v, 0, this.duration);
    } catch {
      // ignore
    }
    this._playing = this.autoplay;
    window.addEventListener('keydown', this._onKeyBound);
    window.addEventListener('resize', this._onResizeBound);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._onKeyBound);
    window.removeEventListener('resize', this._onResizeBound);
    this._resizeObs?.disconnect();
    this._resizeObs = null;
    this._stopRaf();
  }

  firstUpdated() {
    this._measure();
    if (this._host) {
      this._resizeObs = new ResizeObserver(() => this._measure());
      this._resizeObs.observe(this._host);
    }
    if (this._playing) this._startRaf();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('_playing')) {
      if (this._playing) this._startRaf();
      else this._stopRaf();
    }
    // Refresh provided context whenever timing-state changes. Display time
    // shows hover preview while scrubbing, otherwise the actual playhead.
    if (
      changed.has('_time') ||
      changed.has('_hoverTime') ||
      changed.has('_playing') ||
      changed.has('duration')
    ) {
      const display = this._hoverTime != null ? this._hoverTime : this._time;
      this._ctx = {
        time: display,
        duration: this.duration,
        playing: this._playing,
        setTime: (t: number) => this._setTime(t),
        setPlaying: (p: boolean) => this._setPlaying(p),
      };
      // Persist the actual time, not the hover preview.
      try {
        localStorage.setItem(this.persistKey + ':t', String(this._time));
      } catch {
        // ignore
      }
    }
  }

  private _measure() {
    if (!this._host) return;
    const barH = 60; // playback bar height + gap
    const s = Math.min(
      this._host.clientWidth / this.width,
      (this._host.clientHeight - barH) / this.height,
    );
    this._scale = Math.max(0.05, s);
  }

  private _setTime(t: number) {
    this._time = clamp(t, 0, this.duration);
  }

  private _setPlaying(p: boolean) {
    this._playing = p;
  }

  private _startRaf() {
    if (this._rafId != null) return;
    const step = (ts: number) => {
      if (this._lastTs == null) this._lastTs = ts;
      const dt = (ts - this._lastTs) / 1000;
      this._lastTs = ts;
      let next = this._time + dt;
      if (next >= this.duration) {
        if (this.loop) next = next % this.duration;
        else {
          next = this.duration;
          this._playing = false;
        }
      }
      this._time = next;
      if (this._playing) {
        this._rafId = requestAnimationFrame(step);
      } else {
        this._rafId = null;
        this._lastTs = null;
      }
    };
    this._rafId = requestAnimationFrame(step);
  }

  private _stopRaf() {
    if (this._rafId != null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._lastTs = null;
  }

  private _onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      this._playing = !this._playing;
    } else if (e.code === 'ArrowLeft') {
      this._setTime(this._time - (e.shiftKey ? 1 : 0.1));
    } else if (e.code === 'ArrowRight') {
      this._setTime(this._time + (e.shiftKey ? 1 : 0.1));
    } else if (e.key === '0' || e.code === 'Home') {
      this._setTime(0);
    }
  }

  render() {
    const display = this._hoverTime != null ? this._hoverTime : this._time;
    return html`
      <div class="host">
        <div class="canvas-wrap">
          <div
            class="canvas"
            style=${`width:${this.width}px;height:${this.height}px;background:${this.background};transform:scale(${this._scale});`}
          >
            <slot></slot>
          </div>
        </div>
        <lethean-playback-bar
          .time=${display}
          .duration=${this.duration}
          .playing=${this._playing}
          @play-pause=${() => (this._playing = !this._playing)}
          @reset=${() => this._setTime(0)}
          @seek=${(e: CustomEvent<number>) => this._setTime(e.detail)}
          @hover=${(e: CustomEvent<number | null>) => (this._hoverTime = e.detail)}
        ></lethean-playback-bar>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-stage': LetheanStage;
  }
}
