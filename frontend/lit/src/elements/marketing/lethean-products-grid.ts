import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface Product {
  id: string;
  name: string;
  tag: string;
  icon: string;
  subdomain: string;
  desc: string;
  price?: number;
}

@customElement('lethean-products-grid')
export class LetheanProductsGrid extends LitElement {
  @property({ attribute: false }) products: Product[] = [];
  @property({ type: Boolean, attribute: 'show-price' }) showPrice = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        "
      >
        ${this.products.map(
          (p) => html`
            <article
              style="
                background: var(--ink-2);
                border: 1px solid var(--line-1);
                border-radius: 12px;
                padding: 18px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                cursor: pointer;
                transition: border-color 120ms ease, transform 120ms ease;
              "
              onmouseover="this.style.borderColor='color-mix(in oklch, var(--brand-500) 35%, var(--line-1))'; this.style.transform='translateY(-1px)';"
              onmouseout="this.style.borderColor='var(--line-1)'; this.style.transform='none';"
            >
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
                <div
                  style="
                    width: 36px; height: 36px;
                    border-radius: 9px;
                    background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
                    border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-1));
                    display: grid; place-items: center;
                    color: var(--brand-200);
                    flex-shrink: 0;
                  "
                >
                  <i class="fa-solid fa-${p.icon}" style="font-size: 14px;"></i>
                </div>
                ${this.showPrice && p.price !== undefined
                  ? html`<div style="text-align: right; flex-shrink: 0;">
                      <div style="font-size: 18px; font-family: var(--font-mono); color: var(--fg-0); letter-spacing: -0.02em;">£${p.price}</div>
                      <div style="font-size: 10.5px; color: var(--fg-4);">/ month</div>
                    </div>`
                  : html``}
              </div>

              <div>
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--brand-300); letter-spacing: 0.06em; margin-bottom: 4px;">
                  ${p.tag.toUpperCase()}
                </div>
                <div
                  style="
                    font-size: 16px;
                    color: var(--fg-0);
                    font-weight: 500;
                    letter-spacing: -0.015em;
                  "
                >${p.name}</div>
                <div
                  style="
                    font-size: 11.5px;
                    color: var(--fg-3);
                    margin-top: 4px;
                    font-family: var(--font-mono);
                  "
                >${p.subdomain}</div>
              </div>

              <p style="font-size: 13px; color: var(--fg-2); margin: 0; line-height: 1.5;">${p.desc}</p>
            </article>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-products-grid': LetheanProductsGrid;
  }
}
