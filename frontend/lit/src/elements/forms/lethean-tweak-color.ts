// <lethean-tweak-color> — labelled colour-swatch picker.
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweak-color')
export class LetheanTweakColor extends LitElement {
  @property() label = '';
  @property() value = '#000000';

  static styles = tweaksStyles;

  private _onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.value = v;
    this.dispatchEvent(new CustomEvent<string>('tweak-change', { detail: v }));
  }

  render() {
    return html`
      <div class="twk-row twk-row-h">
        <div class="twk-lbl"><span>${this.label}</span></div>
        <input
          type="color"
          class="twk-swatch"
          .value=${this.value}
          @input=${this._onInput}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-color': LetheanTweakColor;
  }
}
