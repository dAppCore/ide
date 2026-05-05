// <lethean-tweak-radio> — segmented radio group with animated thumb.
// Drag-friendly: pointer-down on the track and drag across segments.
import { LitElement, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

interface RadioOpt {
  value: string;
  label: string;
}

@customElement('lethean-tweak-radio')
export class LetheanTweakRadio extends LitElement {
  @property() label = '';
  @property() value = '';
  /** Array of strings or { value, label } objects. */
  @property({ attribute: false }) options: Array<string | RadioOpt> = [];

  @state() private _dragging = false;
  @query('[role="radiogroup"]') private _track!: HTMLElement;

  static styles = tweaksStyles;

  private _normOpts(): RadioOpt[] {
    return this.options.map((o) =>
      typeof o === 'object' ? o : { value: o, label: o },
    );
  }

  private _segAt(clientX: number): string {
    if (!this._track) return this.value;
    const opts = this._normOpts();
    const r = this._track.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * opts.length);
    return opts[Math.max(0, Math.min(opts.length - 1, i))].value;
  }

  private _emit(v: string) {
    if (v === this.value) return;
    this.value = v;
    this.dispatchEvent(new CustomEvent<string>('tweak-change', { detail: v }));
  }

  private _onPointerDown(e: PointerEvent) {
    this._dragging = true;
    this._emit(this._segAt(e.clientX));
    const move = (ev: PointerEvent) => this._emit(this._segAt(ev.clientX));
    const up = () => {
      this._dragging = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  render() {
    const opts = this._normOpts();
    const idx = Math.max(0, opts.findIndex((o) => o.value === this.value));
    const n = opts.length || 1;
    return html`
      <div class="twk-row">
        <div class="twk-lbl"><span>${this.label}</span></div>
        <div
          role="radiogroup"
          class=${this._dragging ? 'twk-seg dragging' : 'twk-seg'}
          @pointerdown=${this._onPointerDown}
        >
          <div
            class="twk-seg-thumb"
            style=${`left: calc(2px + ${idx} * (100% - 4px) / ${n}); width: calc((100% - 4px) / ${n});`}
          ></div>
          ${opts.map(
            (o) => html`
              <button
                type="button"
                role="radio"
                aria-checked=${o.value === this.value ? 'true' : 'false'}
                @click=${() => this._emit(o.value)}
              >${o.label}</button>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-radio': LetheanTweakRadio;
  }
}
