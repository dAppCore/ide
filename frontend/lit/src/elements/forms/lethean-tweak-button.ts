// <lethean-tweak-button> — primary or secondary button on its own row.
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweak-button')
export class LetheanTweakButton extends LitElement {
  @property() label = '';
  @property({ type: Boolean }) secondary = false;

  static styles = tweaksStyles;

  private _onClick() {
    this.dispatchEvent(new CustomEvent('tweak-click'));
  }

  render() {
    return html`
      <button
        type="button"
        class=${this.secondary ? 'twk-btn secondary' : 'twk-btn'}
        @click=${this._onClick}
      >${this.label}</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-button': LetheanTweakButton;
  }
}
