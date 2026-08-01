// <lethean-dc-section> — section container for the design canvas.
// Title + subtitle header, then a horizontal scrolling row of slotted
// <lethean-dc-artboard-frame> children. Static — drag-reorder + edit
// mechanics from design-canvas.jsx are not ported (would need the
// canvas pan/zoom layer to make sense).

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-dc-section')
export class LetheanDcSection extends LitElement {
  @property() title = '';
  @property() subtitle = '';
  @property({ type: Number }) gap = 48;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div style="margin-bottom: 80px; position: relative;">
        <div style="padding: 0 60px 56px;">
          <div
            style="
              font-size: 28px; font-weight: 600;
              color: var(--fg-0); letter-spacing: -0.4px;
              margin-bottom: 6px;
            "
          >${this.title}</div>
          ${this.subtitle
            ? html`<div style="font-size: 16px; color: var(--fg-3);">${this.subtitle}</div>`
            : html``}
        </div>
        <div
          style="
            display: flex; gap: ${this.gap}px;
            padding: 0 60px;
            align-items: flex-start;
            overflow-x: auto;
          "
        >
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-dc-section': LetheanDcSection;
  }
}
