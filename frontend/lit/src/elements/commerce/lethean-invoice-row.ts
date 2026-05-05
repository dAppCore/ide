import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';

@customElement('lethean-invoice-row')
export class LetheanInvoiceRow extends LitElement {
  @property() number = '';
  @property() period = '';
  @property() amount = '';
  @property() status: InvoiceStatus = 'paid';
  @property() issued = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private toneColor(): string {
    switch (this.status) {
      case 'pending': return 'var(--warning-400)';
      case 'failed': return 'var(--danger-400)';
      case 'refunded': return 'var(--info-400)';
      default: return 'var(--success-400)';
    }
  }

  private fireDownload = () => {
    this.dispatchEvent(new CustomEvent('lethean-invoice-download', {
      detail: { number: this.number },
      bubbles: true,
      composed: true,
    }));
  };

  render() {
    const tc = this.toneColor();
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: 28px 1fr auto auto auto;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--line-1);
        "
      >
        <div
          style="
            width: 28px; height: 28px; border-radius: 6px;
            background: var(--ink-3);
            border: 1px solid var(--line-1);
            display: grid; place-items: center;
            color: var(--fg-2);
          "
        >
          <i class="fa-solid fa-receipt" style="font-size: 11px;"></i>
        </div>

        <div style="min-width: 0;">
          <div style="font-size: 13px; color: var(--fg-0); font-family: var(--font-mono); letter-spacing: -0.005em;">${this.number}</div>
          <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 2px;">${this.period}</div>
        </div>

        <span
          style="
            display: inline-flex; align-items: center; gap: 5px;
            padding: 2px 8px; border-radius: 999px;
            background: color-mix(in oklch, ${tc} 18%, var(--ink-3));
            border: 1px solid color-mix(in oklch, ${tc} 28%, transparent);
            color: ${tc};
            font-size: 10.5px; font-weight: 500;
            letter-spacing: 0.04em;
          "
        ><span style="width: 5px; height: 5px; border-radius: 50%; background: ${tc};"></span>${this.status.toUpperCase()}</span>

        <span style="font-size: 13px; color: var(--fg-0); font-family: var(--font-mono); text-align: right; min-width: 80px;">${this.amount}</span>

        <button
          @click=${this.fireDownload}
          aria-label="Download invoice"
          style="
            display: inline-flex; align-items: center; gap: 6px;
            padding: 5px 10px;
            background: transparent;
            border: 1px solid var(--line-2);
            color: var(--fg-1);
            border-radius: 6px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
          "
        >
          <i class="fa-solid fa-download" style="font-size: 11px;"></i>
          PDF
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-invoice-row': LetheanInvoiceRow;
  }
}
