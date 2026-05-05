// <lethean-tweak-text> — labelled text input.
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweak-text')
export class LetheanTweakText extends LitElement {
  @property() label = '';
  @property() value = '';
  @property() placeholder = '';

  static styles = tweaksStyles;

  private _onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.value = v;
    this.dispatchEvent(new CustomEvent<string>('tweak-change', { detail: v }));
  }

  render() {
    return html`
      <div class="twk-row">
        <div class="twk-lbl"><span>${this.label}</span></div>
        <input
          class="twk-field"
          type="text"
          .value=${this.value}
          placeholder=${this.placeholder}
          @input=${this._onInput}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-text': LetheanTweakText;
  }
}
