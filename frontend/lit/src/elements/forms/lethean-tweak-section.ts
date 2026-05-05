// <lethean-tweak-section> — section header inside <lethean-tweaks-panel>.
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

@customElement('lethean-tweak-section')
export class LetheanTweakSection extends LitElement {
  @property() label = '';
  static styles = tweaksStyles;
  render() {
    return html`<div class="twk-sect">${this.label}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-section': LetheanTweakSection;
  }
}
