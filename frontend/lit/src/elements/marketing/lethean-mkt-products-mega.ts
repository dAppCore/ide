// <lethean-mkt-products-mega> — products dropdown panel for the
// marketing nav. 2-col products grid on the left, featured/quick-links
// sidebar on the right. Ported from marketing-shared.jsx > ProductsMega.
//
// Standalone — drops in alongside <lethean-mkt-nav> via the nav's mega
// slot, OR can be used directly in a layout.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface MktProductItem {
  id: string;
  name: string;
  blurb: string;
  sub?: string;       // e.g. "host.uk.com" — small mono caption
  icon?: string;      // FA icon name, default "server"
}

export interface MktUsefulLink {
  label: string;
  href?: string;
}

@customElement('lethean-mkt-products-mega')
export class LetheanMktProductsMega extends LitElement {
  @property({ attribute: false }) products: MktProductItem[] = [];
  @property() familyEyebrow = 'THE FAMILY';
  @property() featuredEyebrow = 'NEW';
  @property() featuredTitle = 'Vi Bundle · save 30%';
  @property() featuredBody = 'Hosting + Link + Analytics for the price of two. Most start here.';
  @property() featuredCta = 'See the bundle';
  @property() usefulEyebrow = 'USEFUL';
  @property({ attribute: false }) usefulLinks: MktUsefulLink[] = [];

  // Light DOM — uses the global tokens.css `.btn`, `.divider` atoms,
  // matches the sibling marketing primitives.
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        style="
          background: var(--ink-1);
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-2);
          box-shadow: var(--shadow-3);
          padding: 28px 56px 32px;
        "
      >
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 32px;">
          <!-- products grid -->
          <div>
            <div
              style="
                font-size: 11px;
                font-family: var(--font-mono);
                color: var(--fg-4);
                letter-spacing: 0.08em;
                margin-bottom: 14px;
              "
            >${this.familyEyebrow}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              ${this.products.map(
                (p) => html`
                  <a
                    href="#"
                    style="
                      display: grid;
                      grid-template-columns: 32px 1fr;
                      gap: 12px;
                      align-items: start;
                      padding: 10px 12px;
                      border-radius: 8px;
                      cursor: pointer;
                      text-decoration: none;
                      color: inherit;
                    "
                  >
                    <div
                      style="
                        width: 32px;
                        height: 32px;
                        border-radius: 7px;
                        background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2));
                        border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
                        display: grid;
                        place-items: center;
                      "
                    >
                      <i
                        class="fa-solid fa-${p.icon || 'server'}"
                        style="font-size: 13px; color: var(--brand-200);"
                      ></i>
                    </div>
                    <div>
                      <div style="font-size: 13.5px; font-weight: 500; color: var(--fg-0);">${p.name}</div>
                      <div style="font-size: 12px; color: var(--fg-3); margin-top: 2px; line-height: 1.45;">${p.blurb}</div>
                      ${p.sub
                        ? html`<div
                            style="
                              font-size: 10.5px;
                              font-family: var(--font-mono);
                              color: var(--fg-4);
                              margin-top: 4px;
                            "
                          >${p.sub}</div>`
                        : html``}
                    </div>
                  </a>
                `
              )}
            </div>
          </div>

          <!-- sidebar — featured + quick links -->
          <div
            style="
              padding: 22px;
              border-radius: 12px;
              background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 22%, var(--line-2));
              display: flex;
              flex-direction: column;
              gap: 14px;
            "
          >
            <div
              style="
                font-size: 11px;
                font-family: var(--font-mono);
                color: var(--brand-300);
                letter-spacing: 0.08em;
              "
            >${this.featuredEyebrow}</div>
            <div>
              <div
                style="
                  font-size: 17px;
                  color: var(--fg-0);
                  letter-spacing: -0.02em;
                  font-weight: 600;
                "
              >${this.featuredTitle}</div>
              <p style="font-size: 12.5px; color: var(--fg-2); margin: 6px 0 0; line-height: 1.5;">
                ${this.featuredBody}
              </p>
            </div>
            <button class="btn btn-secondary btn-sm" style="align-self: flex-start;">
              ${this.featuredCta}
              <i class="fa-solid fa-arrow-right" style="font-size: 10px; margin-left: 4px;"></i>
            </button>

            ${this.usefulLinks.length > 0
              ? html`
                  <div class="divider"></div>
                  <div
                    style="
                      font-size: 11px;
                      font-family: var(--font-mono);
                      color: var(--fg-4);
                      letter-spacing: 0.08em;
                    "
                  >${this.usefulEyebrow}</div>
                  <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--fg-2);">
                    ${this.usefulLinks.map(
                      (l) => html`<a
                        href=${l.href || '#'}
                        style="color: inherit; text-decoration: none;"
                      >${l.label}</a>`
                    )}
                  </div>
                `
              : html``}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-products-mega': LetheanMktProductsMega;
  }
}
