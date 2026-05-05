import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

@customElement('lethean-empty-state')
export class LetheanEmptyState extends LitElement {
  @property() heading = '';
  @property() body = '';
  @property() pose = 'master';
  @property({ attribute: 'vi-size', type: Number }) viSize = 120;
  @property() footnote = '';

  render() {
    return html`
      <div
        style="
          width: 100%;
          min-height: 100%;
          background: var(--ink-1);
          display: grid;
          place-items: center;
          padding: 48px 32px;
          text-align: center;
          box-sizing: border-box;
        "
      >
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; max-width: 460px;">
          <div
            style="
              width: ${this.viSize + 20}px;
              height: ${this.viSize + 20}px;
              border-radius: 16px;
              background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 25%, var(--line-2));
              display: grid;
              place-items: center;
              overflow: hidden;
            "
          >
            <lethean-vi pose=${this.pose} size=${this.viSize}></lethean-vi>
          </div>

          ${this.heading
            ? html`<h2
                style="
                  font-size: 22px;
                  letter-spacing: -0.02em;
                  margin: 0;
                  font-family: var(--font-display, inherit);
                  font-weight: 600;
                  color: var(--fg-0);
                "
              >${this.heading}</h2>`
            : html``}

          ${this.body
            ? html`<p
                style="
                  font-size: 14px;
                  color: var(--fg-2);
                  line-height: 1.55;
                  margin: 0;
                "
              >${this.body}</p>`
            : html``}

          <div style="display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; justify-content: center;">
            <slot name="actions"></slot>
          </div>

          ${this.footnote
            ? html`<div
                style="
                  font-size: 11.5px;
                  color: var(--fg-4);
                  font-family: var(--font-mono);
                  margin-top: 8px;
                "
              >${this.footnote}</div>`
            : html``}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-empty-state': LetheanEmptyState;
  }
}
