import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';

interface FooterColumn {
  title: string;
  links: { label: string; href?: string }[];
}

@customElement('lethean-mkt-footer')
export class LetheanMktFooter extends LitElement {
  @property() brand = 'Lethean';
  @property() tagline = '';
  @property() copyright = '';
  @property({ attribute: false }) columns: FooterColumn[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <footer
        style="
          padding: 56px 24px 32px;
          background: var(--ink-0);
          border-top: 1px solid var(--line-1);
        "
      >
        <div
          style="
            max-width: 1100px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: minmax(220px, 1.5fr) repeat(auto-fit, minmax(140px, 1fr));
            gap: 36px;
          "
        >
          <div>
            <lethean-brand-mark size="md" name=${this.brand}></lethean-brand-mark>
            ${this.tagline
              ? html`<p
                  style="
                    margin: 14px 0 0;
                    font-size: 13px;
                    color: var(--fg-3);
                    line-height: 1.6;
                    max-width: 280px;
                  "
                >${this.tagline}</p>`
              : html``}
          </div>
          ${this.columns.map(
            (col) => html`
              <div style="min-width: 0;">
                <div
                  style="
                    font-size: 11px;
                    font-family: var(--font-mono);
                    color: var(--fg-4);
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    margin-bottom: 14px;
                  "
                >${col.title}</div>
                <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
                  ${col.links.map(
                    (l) => html`
                      <li>
                        <a
                          href=${l.href || '#'}
                          style="
                            font-size: 13px;
                            color: var(--fg-2);
                            text-decoration: none;
                          "
                        >${l.label}</a>
                      </li>
                    `
                  )}
                </ul>
              </div>
            `
          )}
        </div>

        <div
          style="
            max-width: 1100px;
            margin: 36px auto 0;
            padding-top: 22px;
            border-top: 1px solid var(--line-1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            font-size: 12px;
            color: var(--fg-4);
          "
        >
          <div>${this.copyright}</div>
          <slot name="meta"></slot>
        </div>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-footer': LetheanMktFooter;
  }
}
