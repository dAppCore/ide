// <lethean-tweak-select> — labelled dropdown.
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { tweaksStyles } from './tweaks-styles';

interface SelOpt {
  value: string;
  label: string;
}

@customElement('lethean-tweak-select')
export class LetheanTweakSelect extends LitElement {
  @property() label = '';
  @property() value = '';
  @property({ attribute: false }) options: Array<string | SelOpt> = [];

  static styles = tweaksStyles;

  private _onChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.value = v;
    this.dispatchEvent(new CustomEvent<string>('tweak-change', { detail: v }));
  }

  render() {
    return html`
      <div class="twk-row">
        <div class="twk-lbl"><span>${this.label}</span></div>
        <select class="twk-field" .value=${this.value} @change=${this._onChange}>
          ${this.options.map((o) => {
            const v = typeof o === 'object' ? o.value : o;
            const l = typeof o === 'object' ? o.label : o;
            return html`<option value=${v}>${l}</option>`;
          })}
        </select>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweak-select': LetheanTweakSelect;
  }
}
