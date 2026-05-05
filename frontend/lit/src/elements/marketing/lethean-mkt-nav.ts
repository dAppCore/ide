// <lethean-mkt-nav> — sticky marketing top-bar with optional mega
// dropdowns. Links can be plain (href) or triggers (mega name) — when a
// trigger link is hovered/focused, the nav reveals the matching mega
// panel below the bar.
//
// Mega panels are passed as a Record of Lit template results keyed by
// the same name used in the link's `mega` field:
//
//   nav.megas = {
//     products: html`<lethean-mkt-products-mega .products=${...}></lethean-mkt-products-mega>`,
//     solutions: html`<lethean-mkt-solutions-mega .columns=${...}></lethean-mkt-solutions-mega>`,
//   };
//
// Source: marketing-shared.jsx > MarketingNav. Mega panels in
// lethean-mkt-products-mega.ts and lethean-mkt-solutions-mega.ts.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';

export interface MktNavLink {
  label: string;
  href?: string;
  active?: boolean;
  /** When set, this link is a trigger; matches a key in `megas`. */
  mega?: string;
}

@customElement('lethean-mkt-nav')
export class LetheanMktNav extends LitElement {
  @property() brand = 'Lethean';
  @property() subdomain = '';
  @property({ attribute: false }) links: MktNavLink[] = [];
  @property() ctaPrimary = 'Start free';
  @property() ctaSecondary = 'Sign in';
  @property() askLabel = 'Ask Vi';
  @property({ type: Boolean, attribute: 'show-ask' }) showAsk = false;

  /** Mega panels keyed by the same name used in link's `mega` field. */
  @property({ attribute: false }) megas: Record<string, TemplateResult> = {};

  /** Currently-open mega panel name, or null. */
  @state() private _open: string | null = null;

  protected createRenderRoot() {
    return this;
  }

  private _setOpen(name: string | null) {
    this._open = name;
  }

  private _renderLink(l: MktNavLink) {
    const isOpen = !!l.mega && this._open === l.mega;
    const highlighted = l.active || isOpen;
    if (l.mega) {
      return html`
        <button
          @mouseenter=${() => this._setOpen(l.mega ?? null)}
          @mouseleave=${() => this._setOpen(null)}
          @focus=${() => this._setOpen(l.mega ?? null)}
          @blur=${() => this._setOpen(null)}
          style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            background: ${isOpen ? 'var(--ink-2)' : 'transparent'};
            border: none;
            border-radius: 6px;
            color: ${highlighted ? 'var(--fg-0)' : 'var(--fg-2)'};
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
          "
        >
          ${l.label}
          <i class="fa-solid fa-chevron-down" style="font-size: 9px; color: var(--fg-4);"></i>
        </button>
      `;
    }
    return html`
      <a
        href=${l.href || '#'}
        style="
          padding: 8px 12px;
          border-radius: 6px;
          color: ${highlighted ? 'var(--fg-0)' : 'var(--fg-2)'};
          font-weight: ${highlighted ? 500 : 400};
          font-size: 13px;
          text-decoration: none;
        "
      >${l.label}</a>
    `;
  }

  render() {
    return html`
      <header
        style="
          position: sticky;
          top: 0;
          z-index: 30;
          background: color-mix(in oklch, var(--ink-0) 88%, transparent);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line-1);
        "
      >
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 56px;
          "
        >
          <div style="display: flex; align-items: center; gap: 28px;">
            <lethean-brand-mark size="md" name=${this.brand} subdomain=${this.subdomain}></lethean-brand-mark>
            <nav style="display: flex; gap: 4px; font-size: 13px; color: var(--fg-2);">
              ${this.links.map((l) => this._renderLink(l))}
            </nav>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${this.showAsk
              ? html`<button class="btn btn-ghost btn-sm">
                  <i class="fa-solid fa-magnifying-glass" style="font-size: 11px;"></i>
                  ${this.askLabel}
                  <kbd
                    style="
                      margin-left: 4px;
                      padding: 1px 5px;
                      background: var(--ink-3);
                      border: 1px solid var(--line-2);
                      border-radius: 3px;
                      font-size: 10px;
                      font-family: var(--font-mono);
                    "
                  >⌘K</kbd>
                </button>`
              : html``}
            ${this.ctaSecondary
              ? html`<button class="btn btn-ghost btn-sm">${this.ctaSecondary}</button>`
              : html``}
            ${this.ctaPrimary
              ? html`<button class="btn btn-primary btn-sm">${this.ctaPrimary}</button>`
              : html``}
          </div>
        </div>

        <!-- Mega panel — rendered when a trigger link is hovered/focused.
             Positioned absolute under the bar so it overlays page
             content rather than pushing it down. -->
        ${this._open && this.megas[this._open]
          ? html`
              <div
                @mouseenter=${() => this._setOpen(this._open)}
                @mouseleave=${() => this._setOpen(null)}
                style="
                  position: absolute;
                  left: 0;
                  right: 0;
                  top: 100%;
                "
              >
                ${this.megas[this._open]}
              </div>
            `
          : html``}
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-nav': LetheanMktNav;
  }
}
