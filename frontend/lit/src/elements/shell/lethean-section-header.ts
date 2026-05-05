import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-section-header')
export class LetheanSectionHeader extends LitElement {
  @property() heading = '';
  @property() subtitle = '';

  render() {
    return html`
      <div
        style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        "
      >
        <h2
          style="
            font-family: var(--font-display, inherit);
            font-size: 13px;
            font-weight: 600;
            color: var(--fg-0);
            letter-spacing: -0.005em;
            margin: 0;
          "
        >${this.heading}</h2>
        ${this.subtitle
          ? html`<span style="font-size: 11px; color: var(--fg-4);">· ${this.subtitle}</span>`
          : html``}
        <span style="flex: 1;"></span>
        <slot name="trailing"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-section-header': LetheanSectionHeader;
  }
}
