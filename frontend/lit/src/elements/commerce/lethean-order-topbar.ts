// <lethean-order-topbar> — checkout-flow progress topbar with brand-mark
// + step indicator (numbered circles + labels + connector lines) +
// "Secure checkout" lock note. Steps default to Basket → Payment → Done.
// Ported from cart-checkout.jsx > OrderTopbar.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';

@customElement('lethean-order-topbar')
export class LetheanOrderTopbar extends LitElement {
  @property({ type: Number }) step = 1;
  @property({ attribute: false }) steps: string[] = ['Basket', 'Payment', 'Done'];
  @property() brandName = 'Host UK';
  @property() subdomain = 'order';

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <header
        style="
          padding: 16px 56px;
          border-bottom: 1px solid var(--line-1);
          display: flex; align-items: center; justify-content: space-between;
          background: var(--ink-0);
        "
      >
        <div style="display: flex; align-items: center; gap: 14px;">
          <lethean-brand-mark size="sm" name=${this.brandName} subdomain=${this.subdomain}></lethean-brand-mark>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--fg-3);">
            ${this.subdomain}.host.uk.com
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${this.steps.map(
            (s, i) => html`
              <div style="display: flex; align-items: center; gap: 8px;">
                <div
                  class="tnum"
                  style="
                    width: 22px; height: 22px; border-radius: 50%;
                    background: ${i + 1 <= this.step ? 'var(--brand-500)' : 'var(--ink-3)'};
                    color: ${i + 1 <= this.step ? 'var(--fg-0)' : 'var(--fg-3)'};
                    display: grid; place-items: center;
                    font-size: 11px; font-weight: 600;
                    border: ${i + 1 === this.step
                      ? '2px solid color-mix(in oklch, var(--brand-300) 60%, transparent)'
                      : '1px solid var(--line-2)'};
                  "
                >${i + 1}</div>
                <span
                  style="
                    font-size: 13px;
                    color: ${i + 1 === this.step ? 'var(--fg-0)' : 'var(--fg-3)'};
                    font-weight: ${i + 1 === this.step ? 500 : 400};
                  "
                >${s}</span>
              </div>
              ${i < this.steps.length - 1
                ? html`<div style="width: 24px; height: 1px; background: var(--line-2);"></div>`
                : html``}
            `
          )}
        </div>
        <div
          style="
            font-size: 12px; color: var(--fg-3);
            display: flex; gap: 6px; align-items: center;
          "
        >
          <i class="fa-solid fa-lock" style="font-size: 11px;"></i>
          Secure checkout
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-order-topbar': LetheanOrderTopbar;
  }
}
