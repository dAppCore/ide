// <lethean-tweak-toggle> — iOS-shape switch on a labelled row.
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweak-toggle')
export class LetheanTweakToggle extends LitElement {
  @property() label = '';
  @property({ type: Boolean }) value = false;

  static styles = tweaksStyles;

  private _onClick() {
    this.value = !this.value;
    this.dispatchEvent(new CustomEvent<boolean>('tweak-change', { detail: this.value }));
  }

  render() {
    return html`
      <div class="twk-row twk-row-h">
        <div class="twk-lbl"><span>${this.label}</span></div>
        <button
          type="button"
          class="twk-toggle"
          data-on=${this.value ? '1' : '0'}
          role="switch"
          aria-checked=${this.value ? 'true' : 'false'}
          @click=${this._onClick}
        ><i></i></button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-toggle': LetheanTweakToggle;
  }
}
