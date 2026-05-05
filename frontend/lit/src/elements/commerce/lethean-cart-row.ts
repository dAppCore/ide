import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-cart-row')
export class LetheanCartRow extends LitElement {
  @property() heading = '';
  @property() description = '';
  @property({ type: Number }) price = 0;
  @property() currency = '£';
  @property() cadence = 'monthly';
  @property({ type: Number }) qty = 1;
  @property() icon = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private fireRemove = () => {
    this.dispatchEvent(new CustomEvent('lethean-cart-remove', {
      detail: { heading: this.heading },
      bubbles: true,
      composed: true,
    }));
  };

  render() {
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: 36px 1fr auto auto;
          gap: 14px;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid var(--line-1);
        "
      >
        <div
          style="
            width: 36px; height: 36px;
            border-radius: 8px;
            background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
            border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-1));
            display: grid; place-items: center;
            color: var(--brand-200);
          "
        >
          ${this.icon
            ? html`<i class="fa-solid fa-${this.icon}" style="font-size: 13px;"></i>`
            : html``}
        </div>

        <div style="min-width: 0;">
          <div style="font-size: 14px; color: var(--fg-0); font-weight: 500; letter-spacing: -0.01em;">
            ${this.heading}
          </div>
          ${this.description
            ? html`<div style="font-size: 12px; color: var(--fg-3); margin-top: 3px;">${this.description}</div>`
            : html``}
        </div>

        <div style="text-align: right;">
          <div style="font-size: 14px; color: var(--fg-0); font-family: var(--font-mono);">
            ${this.currency}${(this.price * this.qty).toFixed(2)}
          </div>
          <div style="font-size: 11px; color: var(--fg-4); margin-top: 2px;">
            ${this.qty > 1 ? `${this.qty} × ${this.currency}${this.price.toFixed(2)} · ` : ''}${this.cadence}
          </div>
        </div>

        <button
          @click=${this.fireRemove}
          aria-label="Remove from cart"
          style="
            width: 26px; height: 26px;
            background: transparent;
            border: 1px solid var(--line-2);
            color: var(--fg-3);
            border-radius: 6px;
            cursor: pointer;
            display: grid; place-items: center;
            font-family: inherit;
            font-size: 12px;
          "
        >×</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-cart-row': LetheanCartRow;
  }
}
