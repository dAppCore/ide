import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface SummaryLine {
  label: string;
  value: string;
  meta?: string;
  emphasis?: boolean;
}

@customElement('lethean-cart-summary')
export class LetheanCartSummary extends LitElement {
  @property() heading = 'Order summary';
  @property({ attribute: false }) lines: SummaryLine[] = [];
  @property() totalLabel = 'Total today';
  @property() totalValue = '';
  @property() totalMeta = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <aside
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 12px;
          overflow: hidden;
          position: sticky;
          top: 24px;
        "
      >
        <header style="padding: 14px 18px; border-bottom: 1px solid var(--line-1);">
          <div
            style="
              font-size: 11px;
              font-family: var(--font-mono);
              color: var(--fg-4);
              letter-spacing: 0.06em;
              text-transform: uppercase;
            "
          >${this.heading}</div>
        </header>

        <div style="padding: 14px 18px; display: flex; flex-direction: column; gap: 10px;">
          ${this.lines.map(
            (l) => html`
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 13px;">
                <span style="color: ${l.emphasis ? 'var(--fg-0)' : 'var(--fg-2)'}; font-weight: ${l.emphasis ? 500 : 400};">${l.label}</span>
                <span style="font-family: var(--font-mono); color: var(--fg-1); text-align: right;">
                  ${l.value}
                  ${l.meta ? html`<span style="display: block; font-size: 10.5px; color: var(--fg-4); margin-top: 1px;">${l.meta}</span>` : html``}
                </span>
              </div>
            `
          )}
        </div>

        <div
          style="
            padding: 16px 18px;
            border-top: 1px solid var(--line-1);
            background: var(--ink-1);
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
          "
        >
          <span
            style="
              font-size: 12px;
              color: var(--fg-2);
              text-transform: uppercase;
              letter-spacing: 0.06em;
              font-family: var(--font-mono);
            "
          >${this.totalLabel}</span>
          <span style="text-align: right;">
            <span style="font-size: 22px; color: var(--fg-0); font-family: var(--font-mono); letter-spacing: -0.02em;">${this.totalValue}</span>
            ${this.totalMeta ? html`<span style="display: block; font-size: 11px; color: var(--fg-4); margin-top: 2px;">${this.totalMeta}</span>` : html``}
          </span>
        </div>

        <div style="padding: 14px 18px; border-top: 1px solid var(--line-1); display: flex; flex-direction: column; gap: 8px;">
          <slot name="actions"></slot>
        </div>

        <slot name="footer"></slot>
      </aside>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-cart-summary': LetheanCartSummary;
  }
}
