// <lethean-tweak-number> — labelled number input with horizontal-scrub
// label (drag the label left/right to step the value).
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweak-number')
export class LetheanTweakNumber extends LitElement {
  @property() label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min: number | null = null;
  @property({ type: Number }) max: number | null = null;
  @property({ type: Number }) step = 1;
  @property() unit = '';

  static styles = tweaksStyles;

  private _clamp(n: number): number {
    if (this.min != null && n < this.min) return this.min;
    if (this.max != null && n > this.max) return this.max;
    return n;
  }

  private _emit(v: number) {
    this.value = v;
    this.dispatchEvent(new CustomEvent<number>('tweak-change', { detail: v }));
  }

  private _onScrubStart(e: PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = this.value;
    const decimals = (String(this.step).split('.')[1] || '').length;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const raw = startVal + dx * this.step;
      const snapped = Math.round(raw / this.step) * this.step;
      this._emit(this._clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  private _onInput(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    this._emit(this._clamp(v));
  }

  render() {
    return html`
      <div class="twk-num">
        <span class="twk-num-lbl" @pointerdown=${this._onScrubStart}>${this.label}</span>
        <input
          type="number"
          .value=${String(this.value)}
          min=${this.min == null ? '' : String(this.min)}
          max=${this.max == null ? '' : String(this.max)}
          step=${String(this.step)}
          @input=${this._onInput}
        />
        ${this.unit ? html`<span class="twk-num-unit">${this.unit}</span>` : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-number': LetheanTweakNumber;
  }
}
