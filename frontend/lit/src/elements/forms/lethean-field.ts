import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-field')
export class LetheanField extends LitElement {
  @property() label = '';
  @property() hint = '';
  @property() error = '';

  render() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${this.label
          ? html`<label style="font-size: 12px; color: var(--fg-2); letter-spacing: -0.005em;">${this.label}</label>`
          : html``}
        <slot></slot>
        ${this.error
          ? html`<div style="font-size: 11.5px; color: var(--danger-400);">${this.error}</div>`
          : this.hint
          ? html`<div style="font-size: 11.5px; color: var(--fg-3);">${this.hint}</div>`
          : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-field': LetheanField;
  }
}
