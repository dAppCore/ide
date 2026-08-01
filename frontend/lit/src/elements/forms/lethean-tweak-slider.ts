// <lethean-tweak-slider> — labelled range slider with optional unit.
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweak-slider')
export class LetheanTweakSlider extends LitElement {
  @property() label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property() unit = '';

  static styles = tweaksStyles;

  private _onInput(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    this.value = v;
    this.dispatchEvent(new CustomEvent<number>('tweak-change', { detail: v }));
  }

  render() {
    return html`
      <div class="twk-row">
        <div class="twk-lbl">
          <span>${this.label}</span>
          <span class="twk-val">${this.value}${this.unit}</span>
        </div>
        <input
          type="range"
          class="twk-slider"
          min=${String(this.min)}
          max=${String(this.max)}
          step=${String(this.step)}
          .value=${String(this.value)}
          @input=${this._onInput}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-slider': LetheanTweakSlider;
  }
}
