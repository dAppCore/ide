// <lethean-tweaks-panel> — floating draggable design-tool panel.
// Slot-bearing wrapper that hosts <lethean-tweak-section> + control
// elements. Listens for the host's __activate_edit_mode message and
// shows itself; close-button posts __edit_mode_dismissed back so the
// host's toolbar stays in sync.
//
// Ported from tweaks-panel.jsx > TweaksPanel.

import { LitElement, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweaks-panel')
export class LetheanTweaksPanel extends LitElement {
  @property() title = 'Tweaks';
  /**
   * When true, the panel renders unconditionally instead of waiting for
   * the host's __activate_edit_mode message. Useful for the demo page
   * (no host iframe).
   */
  @property({ type: Boolean, attribute: 'always-open' }) alwaysOpen = false;

  @state() private _open = false;
  @state() private _x = 16;
  @state() private _y = 16;

  @query('.twk-panel') private _panel!: HTMLElement;

  private _onMsgBound = this._onMsg.bind(this);
  private _onWindowMoveBound: ((e: MouseEvent) => void) | null = null;
  private _onWindowUpBound: (() => void) | null = null;
  private _resizeObs: ResizeObserver | null = null;

  static styles = tweaksStyles;

  connectedCallback() {
    super.connectedCallback();
    if (this.alwaysOpen) this._open = true;
    window.addEventListener('message', this._onMsgBound);
    // Announce edit-mode availability to the host once mounted.
    try {
      window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    } catch {
      // ignore — running standalone (no parent host)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this._onMsgBound);
    this._resizeObs?.disconnect();
    this._resizeObs = null;
    this._stopDrag();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('_open') && this._open) {
      this._clampToViewport();
      this._resizeObs?.disconnect();
      this._resizeObs = new ResizeObserver(() => this._clampToViewport());
      this._resizeObs.observe(document.documentElement);
    } else if (changed.has('_open') && !this._open) {
      this._resizeObs?.disconnect();
      this._resizeObs = null;
    }
  }

  private _onMsg(e: MessageEvent) {
    const t = (e?.data as { type?: string } | undefined)?.type;
    if (t === '__activate_edit_mode') this._open = true;
    else if (t === '__deactivate_edit_mode') this._open = false;
  }

  private _clampToViewport() {
    if (!this._panel) return;
    const PAD = 16;
    const w = this._panel.offsetWidth;
    const h = this._panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    this._x = Math.min(maxRight, Math.max(PAD, this._x));
    this._y = Math.min(maxBottom, Math.max(PAD, this._y));
  }

  private _dismiss() {
    this._open = false;
    try {
      window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
    } catch {
      // ignore
    }
  }

  private _onDragStart(e: MouseEvent) {
    if (!this._panel) return;
    const r = this._panel.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    this._onWindowMoveBound = (ev: MouseEvent) => {
      this._x = startRight - (ev.clientX - sx);
      this._y = startBottom - (ev.clientY - sy);
      this._clampToViewport();
    };
    this._onWindowUpBound = () => this._stopDrag();
    window.addEventListener('mousemove', this._onWindowMoveBound);
    window.addEventListener('mouseup', this._onWindowUpBound);
  }

  private _stopDrag() {
    if (this._onWindowMoveBound)
      window.removeEventListener('mousemove', this._onWindowMoveBound);
    if (this._onWindowUpBound)
      window.removeEventListener('mouseup', this._onWindowUpBound);
    this._onWindowMoveBound = null;
    this._onWindowUpBound = null;
  }

  render() {
    if (!this._open) return html``;
    return html`
      <div class="twk-panel" style=${`right: ${this._x}px; bottom: ${this._y}px;`}>
        <div class="twk-hd" @mousedown=${this._onDragStart}>
          <b>${this.title}</b>
          <button
            class="twk-x"
            aria-label="Close tweaks"
            @mousedown=${(e: MouseEvent) => e.stopPropagation()}
            @click=${this._dismiss}
          >✕</button>
        </div>
        <div class="twk-body">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweaks-panel': LetheanTweaksPanel;
  }
}
