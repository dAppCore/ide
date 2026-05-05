import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface Category {
  icon: string;
  title: string;
  count?: number;
  lead?: string;
  href?: string;
}

@customElement('lethean-help-categories')
export class LetheanHelpCategories extends LitElement {
  @property({ attribute: false }) categories: Category[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        "
      >
        ${this.categories.map(
          (c) => html`
            <a
              href=${c.href || '#'}
              style="
                background: var(--ink-2);
                border: 1px solid var(--line-1);
                border-radius: 10px;
                padding: 18px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                text-decoration: none;
                color: inherit;
                transition: border-color 120ms ease, transform 120ms ease;
              "
              onmouseover="this.style.borderColor='color-mix(in oklch, var(--brand-500) 32%, var(--line-1))'; this.style.transform='translateY(-1px)';"
              onmouseout="this.style.borderColor='var(--line-1)'; this.style.transform='none';"
            >
              <div style="display: flex; align-items: center; gap: 12px;">
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
                  <i class="fa-solid fa-${c.icon}" style="font-size: 14px;"></i>
                </div>
                <div style="min-width: 0;">
                  <div
                    style="
                      font-size: 14px;
                      font-weight: 500;
                      color: var(--fg-0);
                      letter-spacing: -0.01em;
                    "
                  >${c.title}</div>
                  ${c.count !== undefined
                    ? html`<div style="font-size: 11.5px; color: var(--fg-3); font-family: var(--font-mono);">${c.count} articles</div>`
                    : html``}
                </div>
              </div>
              ${c.lead
                ? html`<p
                    style="
                      font-size: 12.5px;
                      color: var(--fg-2);
                      margin: 0;
                      line-height: 1.5;
                    "
                  >${c.lead}</p>`
                : html``}
            </a>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-help-categories': LetheanHelpCategories;
  }
}
