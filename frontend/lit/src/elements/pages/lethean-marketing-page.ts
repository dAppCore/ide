// <lethean-marketing-page> — demo of the marketing nav + mega dropdowns.
// Shows a sticky <lethean-mkt-nav> with two trigger links (Products,
// Solutions) wired to the matching mega panels. A fake landing-page
// scroll area below proves the sticky-with-overlay behaviour and the
// hover-trigger flow.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../marketing/lethean-mkt-nav';
import '../marketing/lethean-mkt-products-mega';
import '../marketing/lethean-mkt-solutions-mega';
import '../marketing/lethean-mkt-hero';
import '../marketing/lethean-mkt-section';

import type { MktProductItem } from '../marketing/lethean-mkt-products-mega';
import type { MktSolutionColumn } from '../marketing/lethean-mkt-solutions-mega';
import type { MktNavLink } from '../marketing/lethean-mkt-nav';

const HOST_PRODUCTS: MktProductItem[] = [
  { id: 'hosting',   name: 'Hosting',         sub: 'host.uk.com',           blurb: 'WordPress, static, Node, Python — and a calm Vi watching',           icon: 'server' },
  { id: 'link',      name: 'Host Link',       sub: 'link.host.uk.com',      blurb: 'One link, everything you do — the login bridge for the family',     icon: 'link' },
  { id: 'analytics', name: 'Host Analytics',  sub: 'analytics.host.uk.com', blurb: 'Cookieless. GDPR. The numbers you actually need',                    icon: 'chart-line' },
  { id: 'notify',    name: 'Host Notify',     sub: 'notify.host.uk.com',    blurb: 'Web + app push, deliverability you can audit',                       icon: 'bell' },
  { id: 'social',    name: 'Host Social',     sub: 'social.host.uk.com',    blurb: 'Schedule, queue, analyse — six networks, one calm grid',             icon: 'calendar-days' },
  { id: 'trust',     name: 'Host Trust',      sub: 'trust.host.uk.com',     blurb: "Embeddable widgets so your customers' words can do the selling",     icon: 'shield-halved' },
  { id: 'mail',      name: 'Host Mail',       sub: 'mail.host.org.mx',      blurb: 'Plain mail with proper deliverability and Vi as your assistant',     icon: 'envelope' },
];

const SOLUTION_COLUMNS: MktSolutionColumn[] = [
  {
    title: 'By role',
    items: [
      { label: 'For founders' },
      { label: 'For designers' },
      { label: 'For agencies' },
      { label: 'For developers' },
      { label: 'For creators' },
    ],
  },
  {
    title: 'By need',
    items: [
      { label: 'Migrating in' },
      { label: 'Going UK-sovereign' },
      { label: 'GDPR / data export' },
      { label: 'Multi-site management' },
      { label: 'Team workspace' },
    ],
  },
  {
    title: 'By industry',
    items: [
      { label: 'Hospitality' },
      { label: 'Retail / e-commerce' },
      { label: 'Charities' },
      { label: 'Public sector' },
      { label: 'Independent press' },
    ],
  },
];

const USEFUL_LINKS = [
  { label: 'Migration from Squarespace / Bluehost / GoDaddy' },
  { label: 'Compare us with Cloudflare Pages' },
  { label: 'API documentation' },
  { label: 'Status (current uptime: 99.99%)' },
];

const NAV_LINKS: MktNavLink[] = [
  { label: 'Products', mega: 'products' },
  { label: 'Solutions', mega: 'solutions' },
  { label: 'Pricing' },
  { label: 'Customers' },
  { label: 'Help' },
  { label: 'Blog' },
];

@customElement('lethean-marketing-page')
export class LetheanMarketingPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    const megas = {
      products: html`
        <lethean-mkt-products-mega
          .products=${HOST_PRODUCTS}
          .usefulLinks=${USEFUL_LINKS}
        ></lethean-mkt-products-mega>
      `,
      solutions: html`
        <lethean-mkt-solutions-mega
          .columns=${SOLUTION_COLUMNS}
        ></lethean-mkt-solutions-mega>
      `,
    };

    return html`
      <div class="surface" style="min-height: 100%; background: var(--ink-0);">
        <lethean-mkt-nav
          brand="Host UK"
          subdomain="host.uk.com"
          .links=${NAV_LINKS}
          .megas=${megas}
          show-ask
          ctaPrimary="Start free"
          ctaSecondary="Sign in"
        ></lethean-mkt-nav>

        <main style="padding: 80px 56px;">
          <div style="max-width: 720px;">
            <span class="pill pill-brand" style="margin-bottom: 24px;">
              <i class="fa-solid fa-sparkles" style="font-size: 11px;"></i>
              Marketing nav demo
            </span>
            <h1
              style="
                font-size: 56px;
                line-height: 1.05;
                letter-spacing: -0.02em;
                color: var(--fg-0);
                margin: 16px 0 24px;
                font-weight: 700;
              "
            >
              Hover the nav triggers above.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">
                Products
              </span>
              and
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">
                Solutions
              </span>
              drop their megas.
            </h1>
            <p
              style="
                font-size: 18px;
                line-height: 1.6;
                color: var(--fg-2);
                max-width: 560px;
              "
            >
              Sticky bar at the top, mega panels overlay the page rather
              than push it down. The 7 Host UK products + 3-column
              solutions matrix come straight from
              <code style="font-family: var(--font-mono); font-size: 14px;">marketing-shared.jsx</code>
              with the same data shapes.
            </p>
          </div>

          <div style="height: 60vh;"></div>

          <div style="max-width: 720px;">
            <h2 style="font-size: 32px; color: var(--fg-0); margin-bottom: 16px;">
              Scroll back up — nav stays sticky.
            </h2>
            <p style="font-size: 16px; color: var(--fg-2); line-height: 1.6;">
              The mega-panel position is absolute under the nav, so it
              overlays whatever is below regardless of scroll position.
            </p>
          </div>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-marketing-page': LetheanMarketingPage;
  }
}
