import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-action-card')
export class LetheanActionCard extends LitElement {
  @property() eyebrow = '';
  @property() heading = '';
  @property() subhead = '';
  @property() amount = '';
  @property({ attribute: 'amount-meta' }) amountMeta = '';
  @property() meta = '';

  render() {
    return html`
      <div
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-2);
          border-radius: 12px;
          overflow: hidden;
        "
      >
        <div
          style="
            padding: 14px 16px;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            align-items: center;
          "
        >
          <div>
            ${this.eyebrow
              ? html`<div
                  style="
                    font-size: 11px;
                    color: var(--brand-300);
                    font-family: var(--font-mono);
                    letter-spacing: 0.06em;
                    margin-bottom: 4px;
                  "
                >${this.eyebrow}</div>`
              : html``}
            ${this.heading
              ? html`<div
                  style="
                    font-size: 18px;
                    color: var(--fg-0);
                    letter-spacing: -0.02em;
                    font-family: var(--font-mono);
                    font-weight: 500;
                  "
                >${this.heading}</div>`
              : html``}
            ${this.subhead
              ? html`<div style="font-size: 12px; color: var(--fg-3); margin-top: 4px;">${this.subhead}</div>`
              : html``}
          </div>
          ${this.amount
            ? html`<div style="text-align: right;">
                <div style="font-size: 24px; color: var(--fg-0); letter-spacing: -0.02em; font-family: var(--font-mono);">${this.amount}</div>
                ${this.amountMeta
                  ? html`<div style="font-size: 11px; color: var(--fg-4); margin-top: 2px;">${this.amountMeta}</div>`
                  : html``}
              </div>`
            : html``}
        </div>
        <div
          style="
            border-top: 1px solid var(--line-1);
            background: var(--ink-1);
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          "
        >
          <div style="font-size: 12px; color: var(--fg-3);">${this.meta}<slot name="meta"></slot></div>
          <div style="display: flex; gap: 8px;"><slot name="actions"></slot></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-action-card': LetheanActionCard;
  }
}
