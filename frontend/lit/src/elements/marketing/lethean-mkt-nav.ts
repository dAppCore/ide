import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';

interface NavLink {
  label: string;
  href?: string;
  active?: boolean;
}

@customElement('lethean-mkt-nav')
export class LetheanMktNav extends LitElement {
  @property() brand = 'Lethean';
  @property() subdomain = '';
  @property({ attribute: false }) links: NavLink[] = [];
  @property() ctaPrimary = 'Start free';
  @property() ctaSecondary = 'Sign in';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <nav
        style="
          position: sticky;
          top: 0;
          z-index: 80;
          padding: 14px 24px;
          background: color-mix(in oklch, var(--ink-0) 88%, transparent);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border-bottom: 1px solid var(--line-1);
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 24px;
        "
      >
        <lethean-brand-mark size="md" name=${this.brand} subdomain=${this.subdomain}></lethean-brand-mark>

        <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
          ${this.links.map(
            (l) => html`
              <a
                href=${l.href || '#'}
                style="
                  padding: 6px 12px;
                  border-radius: 6px;
                  font-size: 13px;
                  font-weight: 500;
                  color: ${l.active ? 'var(--fg-0)' : 'var(--fg-2)'};
                  background: ${l.active ? 'var(--ink-2)' : 'transparent'};
                  text-decoration: none;
                  letter-spacing: -0.005em;
                "
              >${l.label}</a>
            `
          )}
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <slot name="search"></slot>
          ${this.ctaSecondary
            ? html`<a
                href="#"
                style="
                  padding: 7px 14px;
                  font-size: 13px;
                  font-weight: 500;
                  color: var(--fg-1);
                  text-decoration: none;
                "
              >${this.ctaSecondary}</a>`
            : html``}
          ${this.ctaPrimary
            ? html`<a
                href="#"
                style="
                  padding: 7px 14px;
                  background: var(--brand-500);
                  border: 1px solid var(--brand-400);
                  color: var(--fg-0);
                  font-size: 13px;
                  font-weight: 500;
                  border-radius: 6px;
                  text-decoration: none;
                "
              >${this.ctaPrimary}</a>`
            : html``}
        </div>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-nav': LetheanMktNav;
  }
}
