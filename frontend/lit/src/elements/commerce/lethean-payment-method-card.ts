import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | 'unknown';

@customElement('lethean-payment-method-card')
export class LetheanPaymentMethodCard extends LitElement {
  @property() brand: CardBrand = 'visa';
  @property() last4 = '';
  @property() expiry = '';
  @property() holder = '';
  @property({ type: Boolean, attribute: 'is-default' }) isDefault = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private brandLabel(): string {
    return {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      diners: 'Diners Club',
      unknown: 'Card',
    }[this.brand];
  }

  private brandColor(): string {
    switch (this.brand) {
      case 'visa': return '#1a1f71';
      case 'mastercard': return '#eb001b';
      case 'amex': return '#006fcf';
      case 'diners': return '#0079be';
      default: return 'var(--ink-3)';
    }
  }

  render() {
    return html`
      <article
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          padding: 14px 16px;
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 14px;
          align-items: center;
        "
      >
        <div
          style="
            width: 44px; height: 30px;
            border-radius: 5px;
            background: ${this.brandColor()};
            display: grid; place-items: center;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.04em;
            font-family: var(--font-sans);
            text-transform: uppercase;
          "
        >${this.brand === 'visa' ? 'VISA' : this.brand === 'mastercard' ? 'MC' : this.brand === 'amex' ? 'AMEX' : 'CARD'}</div>

        <div style="min-width: 0;">
          <div style="font-size: 13px; color: var(--fg-0); display: flex; align-items: center; gap: 8px;">
            <span style="font-family: var(--font-mono); letter-spacing: 0.04em;">${this.brandLabel()} ·· ${this.last4}</span>
            ${this.isDefault
              ? html`<span style="font-size: 10px; padding: 1px 6px; border-radius: 3px; background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3)); border: 1px solid color-mix(in oklch, var(--brand-500) 28%, transparent); color: var(--brand-200); font-family: var(--font-mono); letter-spacing: 0.05em;">DEFAULT</span>`
              : html``}
          </div>
          <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 3px; font-family: var(--font-mono);">
            ${this.holder ? `${this.holder} · ` : ''}exp ${this.expiry}
          </div>
        </div>

        <div style="display: flex; gap: 6px;">
          <slot name="actions"></slot>
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-payment-method-card': LetheanPaymentMethodCard;
  }
}
