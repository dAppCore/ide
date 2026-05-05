// <lethean-host-landing-page> — host.uk.com / lthn.ai / ofm.app marketing
// landing. Single page-element with brand-aware content. Composes Nav,
// Hero (with Vi hero panel), ProductFamily grid, PricingStrip, TrustBar,
// Footer. Switch brand via `brand` attribute (hostuk | lethean | ofm).
//
// Ported from landing.jsx, adapted to consume Lit primitives where
// practical and inline brand-data tables (PRODUCTS_BY_BRAND + BRAND_COPY)
// from components.jsx.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Brand = 'hostuk' | 'lethean' | 'ofm';

interface Product {
  id: string;
  name: string;
  tag: string;
  icon: string;
  subdomain: string;
  desc: string;
  price: number;
}

interface BrandCopy {
  name: string;
  domain: string;
  tagline: string;
  sub: string;
  cta: string;
}

const HOSTUK_PRODUCTS: Product[] = [
  { id: 'link', name: 'Host Link', tag: 'Bio link', icon: 'link', subdomain: 'link.host.uk.com', desc: 'One link, everything you do.', price: 4 },
  { id: 'social', name: 'Host Social', tag: 'Scheduling', icon: 'calendar-days', subdomain: 'social.host.uk.com', desc: 'Schedule posts. Analyse results.', price: 12 },
  { id: 'analytics', name: 'Host Analytics', tag: 'Privacy analytics', icon: 'chart-line', subdomain: 'analytics.host.uk.com', desc: 'Cookieless. GDPR. Yours.', price: 9 },
  { id: 'trust', name: 'Host Trust', tag: 'Social proof', icon: 'shield-check', subdomain: 'trust.host.uk.com', desc: 'Reviews and proof, on-site.', price: 7 },
  { id: 'notify', name: 'Host Notify', tag: 'Push', icon: 'bell', subdomain: 'notify.host.uk.com', desc: 'Bring people back, gently.', price: 6 },
  { id: 'mail', name: 'Host Mail', tag: 'Webmail', icon: 'envelope', subdomain: 'mail.host.uk.com', desc: 'Private, UK-hosted email.', price: 5 },
];

const LETHEAN_PRODUCTS: Product[] = [
  { id: 'agent', name: 'Lethean Agent', tag: 'Self-hosted', icon: 'microchip', subdomain: 'lthn.ai/agent', desc: 'EUPL-1.2. Run it yourself.', price: 0 },
  { id: 'core', name: 'Lethean Core', tag: 'Hosted runtime', icon: 'server', subdomain: 'app.lthn.ai', desc: 'We host the OSS for you.', price: 24 },
  { id: 'mcp', name: 'MCP Bridge', tag: 'Tooling', icon: 'plug', subdomain: 'mcp.lthn.ai', desc: 'Tool-server for any model.', price: 12 },
  { id: 'team', name: 'Lethean Team', tag: 'Workspace', icon: 'users', subdomain: 'team.lthn.ai', desc: 'Mattermost, themed.', price: 8 },
  { id: 'forge', name: 'Lethean Forge', tag: 'Code', icon: 'code-branch', subdomain: 'forge.lthn.ai', desc: 'Forgejo, but ours.', price: 10 },
  { id: 'wiki', name: 'Lethean Wiki', tag: 'Docs', icon: 'book-open', subdomain: 'wiki.lthn.sh', desc: 'Long-form, indexed.', price: 4 },
];

const OFM_PRODUCTS: Product[] = [
  { id: 'ofm-core', name: 'OFM Studio', tag: 'Agency core', icon: 'palette', subdomain: 'ofm.bot', desc: 'The creator agency desk.', price: 18 },
  { id: 'ofm-pipe', name: 'OFM Pipeline', tag: 'Workflows', icon: 'diagram-project', subdomain: 'pipe.ofm.bot', desc: 'Briefs in, drafts out.', price: 22 },
  { id: 'ofm-cast', name: 'OFM Cast', tag: 'Talent', icon: 'address-card', subdomain: 'cast.ofm.bot', desc: 'Roster, rights, rates.', price: 14 },
  { id: 'ofm-pulse', name: 'OFM Pulse', tag: 'Analytics', icon: 'wave-pulse', subdomain: 'pulse.ofm.bot', desc: 'Performance across creators.', price: 11 },
  { id: 'ofm-vault', name: 'OFM Vault', tag: 'Assets', icon: 'vault', subdomain: 'vault.ofm.bot', desc: 'Source files, secured.', price: 8 },
  { id: 'ofm-pay', name: 'OFM Pay', tag: 'Splits', icon: 'money-bill-transfer', subdomain: 'pay.ofm.bot', desc: 'Pay creators on time.', price: 9 },
];

const PRODUCTS_BY_BRAND: Record<Brand, Product[]> = {
  hostuk: HOSTUK_PRODUCTS,
  lethean: LETHEAN_PRODUCTS,
  ofm: OFM_PRODUCTS,
};

const BRAND_COPY: Record<Brand, BrandCopy> = {
  hostuk: {
    name: 'Host UK',
    domain: 'host.uk.com',
    tagline: 'Hosting and SaaS, for UK businesses and creators.',
    sub: 'One login across the family. Privacy-first by default. Plain pricing, clear cancellation, no surprise charges.',
    cta: 'Start with Host UK',
  },
  lethean: {
    name: 'Lethean',
    domain: 'lthn.ai',
    tagline: 'Open source AI infrastructure.',
    sub: 'Dual-licensed: EUPL-1.2 OSS for self-hosters, commercial hosted service for teams that want it run for them.',
    cta: 'Read the docs',
  },
  ofm: {
    name: 'OFM',
    domain: 'ofm.bot',
    tagline: 'The operating system for creator agencies.',
    sub: 'Briefs, talent, splits, and reporting — in one place built for the people running the agency, not the platforms.',
    cta: 'Request access',
  },
};

const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(n);

@customElement('lethean-host-landing-page')
export class LetheanHostLandingPage extends LitElement {
  @property({ reflect: true }) brand: Brand = 'hostuk';

  protected createRenderRoot() {
    return this;
  }

  private _navItems(): string[] {
    if (this.brand === 'lethean') return ['Product', 'Docs', 'Open source', 'Pricing', 'Blog'];
    if (this.brand === 'ofm') return ['Studio', 'Roster', 'Pricing', 'About'];
    return ['Products', 'Pricing', 'About', 'Help', 'Status'];
  }

  private _heroPill(): string {
    if (this.brand === 'lethean') return 'EUPL-1.2 · Self-host or hosted';
    if (this.brand === 'ofm') return 'Private beta · invite only';
    return 'UK-hosted · Privacy-first';
  }

  private _heroHeadline(): TemplateResult {
    if (this.brand === 'lethean') {
      return html`Open source AI infrastructure,
        <span class="editorial" style="font-style: italic; color: var(--brand-200);"
          >for people who'd rather own it.</span
        >`;
    }
    if (this.brand === 'ofm') {
      return html`The operating system for
        <span class="editorial" style="font-style: italic; color: var(--brand-200);">creator agencies</span>.`;
    }
    return html`Hosting and SaaS,
      <span class="editorial" style="font-style: italic; color: var(--brand-200);">built quietly</span>
      for UK businesses and creators.`;
  }

  private _stat(n: string, label: string, mono = false) {
    return html`
      <div>
        <div
          class=${mono ? 'num' : ''}
          style="
            font-size: ${mono ? '13px' : '22px'};
            font-weight: 600; color: var(--fg-0);
            letter-spacing: ${mono ? '0' : '-0.02em'};
          "
        >${n}</div>
        <div style="font-size: 12px; color: var(--fg-3); margin-top: 2px;">${label}</div>
      </div>
    `;
  }

  private _renderNav() {
    return html`
      <header
        style="
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 56px; border-bottom: 1px solid var(--line-1);
          position: sticky; top: 0;
          background: color-mix(in oklch, var(--ink-1) 88%, transparent);
          backdrop-filter: blur(8px); z-index: 5;
        "
      >
        <div
          style="
            font-family: var(--font-display);
            font-size: 17px; font-weight: 600;
            color: var(--fg-0); letter-spacing: -0.02em;
          "
        >${BRAND_COPY[this.brand].name}</div>
        <nav style="display: flex; gap: 28px;">
          ${this._navItems().map(
            (i) => html`<a style="font-size: 14px; color: var(--fg-2);">${i}</a>`
          )}
        </nav>
        <div style="display: flex; gap: 8px; align-items: center;">
          <a class="btn btn-ghost btn-sm">Sign in</a>
          <a class="btn btn-primary btn-sm">
            ${this.brand === 'lethean' ? 'Get a quote' : 'Start free'}
          </a>
        </div>
      </header>
    `;
  }

  private _renderHostUkHero() {
    return html`
      <div style="position: relative; width: 460px; height: 460px;">
        <div
          class="dot-grid"
          style="
            position: absolute; inset: 0; border-radius: 24px; opacity: 0.5;
            background-image: radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--fg-0) 12%, transparent) 1px, transparent 0);
            background-size: 18px 18px;
            mask-image: radial-gradient(circle at 60% 50%, black 30%, transparent 70%);
          "
        ></div>
        <div
          style="
            position: absolute; left: 30px; top: 60px; width: 300px; padding: 18px;
            background: var(--ink-2); border: 1px solid var(--line-2); border-radius: 14px;
            box-shadow: 0 12px 28px color-mix(in oklch, #000 25%, transparent);
          "
        >
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div
              style="
                width: 28px; height: 28px; border-radius: 8px;
                background: color-mix(in oklch, var(--brand-500) 25%, var(--ink-3));
                display: grid; place-items: center;
              "
            >
              <i class="fa-solid fa-link" style="font-size: 12px; color: var(--brand-200);"></i>
            </div>
            <div style="font-size: 13px; font-weight: 500; color: var(--fg-0);">link.host.uk.com</div>
            <span class="pill pill-success" style="margin-left: auto;">Live</span>
          </div>
          <div style="font-size: 12px; color: var(--fg-2); line-height: 1.5;">
            "Your bio link, social schedule and analytics — one login, one bill."
          </div>
        </div>
        <div
          style="
            position: absolute; right: -30px; bottom: -10px;
            width: 420px; height: 420px;
            display: grid; place-items: center;
            background: radial-gradient(circle, color-mix(in oklch, var(--brand-500) 28%, transparent), transparent 70%);
            filter: drop-shadow(0 24px 40px rgba(0,0,0,0.5));
          "
        >
          <i
            class="fa-solid fa-feather"
            style="font-size: 200px; color: color-mix(in oklch, var(--brand-300) 80%, transparent);"
          ></i>
        </div>
        <div
          style="
            position: absolute; right: 12px; top: 30px; padding: 10px 14px;
            background: var(--ink-2); border: 1px solid var(--line-2); border-radius: 12px;
            font-size: 12px; color: var(--fg-1);
            box-shadow: 0 12px 28px color-mix(in oklch, #000 25%, transparent);
            max-width: 200px;
          "
        >
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--brand-200); margin-bottom: 4px;">VI</div>
          Right then. Fancy a cuppa whilst I sort your hosting?
        </div>
      </div>
    `;
  }

  private _renderLetheanHero() {
    return html`
      <div style="position: relative; width: 460px; height: 460px;">
        <div
          style="
            position: absolute; inset: 20px 10px 40px 20px;
            background: var(--ink-2); border: 1px solid var(--line-2); border-radius: 14px;
            box-shadow: 0 16px 40px color-mix(in oklch, #000 35%, transparent);
            padding: 18px;
            font-family: var(--font-mono); font-size: 12px; color: var(--fg-1);
            overflow: hidden;
          "
        >
          <div style="display: flex; gap: 6px; margin-bottom: 16px; align-items: center;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--ink-4);"></div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--ink-4);"></div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--ink-4);"></div>
            <div style="margin-left: auto; color: var(--fg-3); font-size: 11px;">~/lethean</div>
          </div>
          <div style="color: var(--fg-3);">
            $ <span style="color: var(--fg-0);">lthn agent up</span>
          </div>
          <div style="color: var(--success-400);">✓ pulled lthn-core 0.42.1</div>
          <div style="color: var(--success-400);">✓ key set · EUPL-1.2</div>
          <div style="color: var(--success-400);">✓ MCP bridge :7331</div>
          <div style="color: var(--fg-2); margin-top: 8px;">agent listening on de1.lthn.ai</div>
          <div style="color: var(--fg-3); margin-top: 8px;">
            $ <span style="color: var(--brand-200);">_</span>
          </div>
        </div>
        <div
          style="
            position: absolute; right: -10px; bottom: -20px;
            width: 180px; height: 180px;
            display: grid; place-items: center;
            background: radial-gradient(circle, color-mix(in oklch, var(--brand-500) 32%, transparent), transparent 70%);
          "
        >
          <i
            class="fa-solid fa-feather"
            style="font-size: 90px; color: color-mix(in oklch, var(--brand-300) 80%, transparent);"
          ></i>
        </div>
      </div>
    `;
  }

  private _renderOfmHero() {
    return html`
      <div style="position: relative; width: 460px; height: 460px;">
        <div
          style="
            position: absolute; inset: 30px;
            display: grid; place-items: center;
            background: radial-gradient(circle, color-mix(in oklch, oklch(0.72 0.20 200) 30%, transparent), transparent 70%);
          "
        >
          <i
            class="fa-solid fa-headphones"
            style="font-size: 200px; color: color-mix(in oklch, oklch(0.78 0.17 200) 80%, transparent);"
          ></i>
        </div>
        <div
          style="
            position: absolute; left: 24px; bottom: 24px;
            font-size: 11px; font-family: var(--font-mono);
            color: var(--fg-3); letter-spacing: 0.06em;
          "
        >VI · OFM-CONFIDENT-ROSTER · PLACEHOLDER</div>
      </div>
    `;
  }

  private _renderHero() {
    const copy = BRAND_COPY[this.brand];
    return html`
      <section
        class="brand-glow"
        style="padding: 72px 56px 56px; position: relative; overflow: hidden;"
      >
        <div
          style="
            display: grid; grid-template-columns: 1.15fr 0.85fr;
            gap: 48px; align-items: center; max-width: 1180px;
          "
        >
          <div>
            <div class="pill pill-brand" style="margin-bottom: 22px;">
              <i class="fa-solid fa-circle-dot" style="font-size: 9px;"></i>
              ${this._heroPill()}
            </div>
            <h1
              style="
                font-size: 60px; line-height: 1.02; letter-spacing: -0.035em;
                margin: 0 0 22px;
              "
            >${this._heroHeadline()}</h1>
            <p
              style="
                font-size: 18px; color: var(--fg-2);
                max-width: 560px; margin: 0 0 32px;
                line-height: 1.5;
              "
            >${copy.sub}</p>
            <div style="display: flex; gap: 12px; align-items: center;">
              <a class="btn btn-primary btn-lg">
                ${copy.cta}
                <i class="fa-solid fa-arrow-right" style="font-size: 13px; margin-left: 8px;"></i>
              </a>
              <a class="btn btn-ghost btn-lg">
                <i class="fa-regular fa-circle-play" style="font-size: 15px; margin-right: 8px;"></i>
                See how it works · 90s
              </a>
            </div>
            <div style="margin-top: 40px; display: flex; gap: 28px; align-items: center;">
              ${this._stat('2,400+', this.brand === 'lethean' ? 'self-hosted nodes' : 'UK businesses')}
              <div style="width: 1px; height: 36px; background: var(--line-1);"></div>
              ${this._stat('99.98%', 'uptime · last 90 days')}
              <div style="width: 1px; height: 36px; background: var(--line-1);"></div>
              ${this._stat('DE1, FR1, UK1', 'EU-only data plane', true)}
            </div>
          </div>
          <div style="position: relative; height: 460px; display: flex; align-items: center; justify-content: center;">
            ${this.brand === 'hostuk'
              ? this._renderHostUkHero()
              : this.brand === 'lethean'
              ? this._renderLetheanHero()
              : this._renderOfmHero()}
          </div>
        </div>
      </section>
    `;
  }

  private _renderProductFamily() {
    const products = PRODUCTS_BY_BRAND[this.brand];
    const heading =
      this.brand === 'lethean'
        ? 'One stack. Self-host or hand it to us.'
        : this.brand === 'ofm'
        ? 'One desk. Every part of the agency.'
        : 'Six products. One login. No surprises.';
    const pillLabel =
      this.brand === 'lethean' ? 'Stack' : this.brand === 'ofm' ? 'Modules' : 'The family';

    return html`
      <section style="padding: 64px 56px; border-top: 1px solid var(--line-1);">
        <div style="display: flex; justify-content: space-between; align-items: end; margin-bottom: 32px;">
          <div>
            <span class="pill" style="margin-bottom: 14px; display: inline-block;">${pillLabel}</span>
            <h2 style="font-size: 38px; letter-spacing: -0.03em; max-width: 640px; margin: 0;">
              ${heading}
            </h2>
          </div>
          <a style="font-size: 14px; color: var(--brand-200); display: flex; align-items: center; gap: 6px;">
            See pricing <i class="fa-solid fa-arrow-right" style="font-size: 11px;"></i>
          </a>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          ${products.map(
            (p) => html`
              <div
                class="card"
                style="padding: 22px; position: relative; transition: border-color 120ms;"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                  <div
                    style="
                      width: 36px; height: 36px; border-radius: 10px;
                      background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
                      display: grid; place-items: center;
                      border: 1px solid color-mix(in oklch, var(--brand-500) 30%, transparent);
                    "
                  >
                    <i class="fa-solid fa-${p.icon}" style="font-size: 14px; color: var(--brand-200);"></i>
                  </div>
                  <span class="pill">${p.tag}</span>
                </div>
                <div style="font-size: 17px; font-weight: 600; color: var(--fg-0); margin-bottom: 4px;">
                  ${p.name}
                </div>
                <div style="font-size: 13px; color: var(--fg-2); margin-bottom: 14px; min-height: 38px;">
                  ${p.desc}
                </div>
                <div
                  style="
                    display: flex; justify-content: space-between; align-items: center;
                    padding-top: 14px; border-top: 1px solid var(--line-1);
                  "
                >
                  <span style="font-family: var(--font-mono); font-size: 11px; color: var(--fg-3);">${p.subdomain}</span>
                  <span style="font-size: 13px; color: var(--fg-1);">
                    ${p.price === 0
                      ? html`Free / OSS`
                      : html`<span class="tnum" style="font-weight: 600; color: var(--fg-0);">${gbp(p.price)}</span
                          ><span style="color: var(--fg-3);"> / mo</span>`}
                  </span>
                </div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _pricingTiers() {
    if (this.brand === 'lethean') {
      return [
        { name: 'Self-hosted', price: 'Free', suffix: '', note: 'EUPL-1.2 · run it yourself', features: ['Lethean Agent OSS', 'MCP bridge', 'Community support'], cta: 'Read the docs', featured: false },
        { name: 'Hosted', price: '£24', suffix: '/mo', note: 'We run it for you', features: ['Everything in self-hosted', 'DE1 / FR1 data plane', '9×5 UK support'], cta: 'Start free trial', featured: true },
        { name: 'Team', price: '£8', suffix: '/seat', note: 'Workspaces + audit', features: ['Mattermost included', 'SSO + audit log', 'DPA + UK invoicing'], cta: 'Talk to us', featured: false },
      ];
    }
    if (this.brand === 'ofm') {
      return [
        { name: 'Solo', price: '£18', suffix: '/mo', note: '1 manager · 5 creators', features: ['Studio + Pulse', 'Brief library', 'Rate cards'], cta: 'Request access', featured: false },
        { name: 'Studio', price: '£64', suffix: '/mo', note: '5 managers · 50 creators', features: ['Everything in Solo', 'OFM Pay splits', 'Asset vault 1TB'], cta: 'Request access', featured: true },
        { name: 'Network', price: 'POA', suffix: '', note: 'Unlimited', features: ['Everything in Studio', 'Dedicated CSM', 'Custom contracts'], cta: 'Talk to sales', featured: false },
      ];
    }
    return [
      { name: 'Starter', price: '£7', suffix: '/mo', note: 'One product, one login', features: ['Pick any one product', '1 GB storage', 'Email support'], cta: 'Start free', featured: false },
      { name: 'Family', price: '£24', suffix: '/mo', note: 'All six products, one bill', features: ['Everything in the family', '10 GB · 5 seats', 'Priority UK support'], cta: 'Start 14-day trial', featured: true },
      { name: 'Agency', price: '£64', suffix: '/mo', note: 'Multi-tenant for clients', features: ['Family × 25 workspaces', 'Reseller branding', 'DPA + invoicing'], cta: 'Talk to us', featured: false },
    ];
  }

  private _renderPricing() {
    const tiers = this._pricingTiers();
    return html`
      <section style="padding: 64px 56px; border-top: 1px solid var(--line-1);">
        <div style="margin-bottom: 32px;">
          <span class="pill" style="margin-bottom: 14px; display: inline-block;">Plain pricing</span>
          <h2 style="font-size: 32px; letter-spacing: -0.03em; margin: 0;">
            No surprise charges. Cancel any time.
          </h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          ${tiers.map(
            (t) => html`
              <div
                class="card"
                style="
                  padding: 28px;
                  border: 1px solid ${t.featured
                    ? 'color-mix(in oklch, var(--brand-400) 60%, transparent)'
                    : 'var(--line-1)'};
                  background: ${t.featured
                    ? 'color-mix(in oklch, var(--brand-500) 5%, var(--ink-2))'
                    : 'var(--ink-2)'};
                  position: relative;
                "
              >
                ${t.featured
                  ? html`<span class="pill pill-brand" style="position: absolute; top: -11px; left: 24px;">Most popular</span>`
                  : html``}
                <div style="font-size: 15px; font-weight: 600; color: var(--fg-0); margin-bottom: 4px;">${t.name}</div>
                <div style="font-size: 13px; color: var(--fg-3); margin-bottom: 18px;">${t.note}</div>
                <div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 22px;">
                  <span class="tnum" style="font-size: 38px; font-weight: 600; color: var(--fg-0); letter-spacing: -0.03em;">
                    ${t.price}
                  </span>
                  ${t.suffix
                    ? html`<span style="color: var(--fg-3); font-size: 14px;">${t.suffix}</span>`
                    : html``}
                </div>
                <ul style="list-style: none; padding: 0; margin: 0 0 22px; display: flex; flex-direction: column; gap: 10px;">
                  ${t.features.map(
                    (f) => html`
                      <li style="display: flex; gap: 10px; align-items: center; font-size: 13.5px; color: var(--fg-1);">
                        <i class="fa-solid fa-check" style="font-size: 11px; color: var(--success-400);"></i>
                        ${f}
                      </li>
                    `
                  )}
                </ul>
                <a class=${t.featured ? 'btn btn-primary' : 'btn btn-secondary'} style="width: 100%; justify-content: center;">${t.cta}</a>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderTrustBar() {
    const items = [
      { icon: 'shield-halved', t: 'GDPR by default', s: 'UK-hosted, no third-party trackers' },
      { icon: 'file-contract', t: 'DPA on request', s: 'Plain-English, signed inside a day' },
      { icon: 'sterling-sign', t: 'UK invoicing', s: 'VAT receipts, BACS supported' },
      { icon: 'headset', t: 'Real UK support', s: 'Reply within 4 hours, 9-5' },
    ];
    return html`
      <section
        style="
          padding: 40px 56px; border-top: 1px solid var(--line-1);
          background: var(--ink-0);
        "
      >
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px;">
          ${items.map(
            (i) => html`
              <div style="display: flex; gap: 14px; align-items: flex-start;">
                <i class="fa-solid fa-${i.icon}" style="font-size: 18px; color: var(--brand-300); margin-top: 2px;"></i>
                <div>
                  <div style="font-size: 13.5px; font-weight: 500; color: var(--fg-0); margin-bottom: 2px;">${i.t}</div>
                  <div style="font-size: 12px; color: var(--fg-3);">${i.s}</div>
                </div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderFooter() {
    const copy = BRAND_COPY[this.brand];
    const aboutText =
      this.brand === 'lethean'
        ? 'Lethean Ltd. Registered in the UK. EUPL-1.2 OSS + commercial hosting.'
        : this.brand === 'ofm'
        ? 'OFM is a Lethean spin-out. Private beta · 2026.'
        : 'Host UK is a Lethean company. Registered in England · No. 14820413.';

    const cols: Array<[string, string[]]> = [
      ['Products', ['Host Link', 'Host Social', 'Host Analytics', 'Host Trust']],
      ['Company', ['About', 'Careers', 'Press', 'Contact']],
      ['Resources', ['Docs', 'Status', 'Changelog', 'API']],
      ['Legal', ['Terms', 'Privacy', 'DPA', 'Cookies']],
    ];

    return html`
      <footer
        style="
          padding: 40px 56px 32px; border-top: 1px solid var(--line-1);
          background: var(--ink-0);
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;">
          <div style="max-width: 320px;">
            <div
              style="
                font-family: var(--font-display); font-size: 17px;
                font-weight: 600; color: var(--fg-0); letter-spacing: -0.02em;
              "
            >${copy.name}</div>
            <p style="font-size: 12.5px; color: var(--fg-3); margin: 12px 0 0; line-height: 1.5;">
              ${aboutText}
            </p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, auto); gap: 8px 56px;">
            ${cols.map(
              ([h, items]) => html`
                <div>
                  <div style="font-size: 12px; font-weight: 600; color: var(--fg-2); margin-bottom: 12px;">${h}</div>
                  <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px;">
                    ${items.map((i) => html`<li style="font-size: 12.5px; color: var(--fg-3);">${i}</li>`)}
                  </ul>
                </div>
              `
            )}
          </div>
        </div>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px;">
          <div style="font-size: 11.5px; color: var(--fg-4);">© 2026 · UK English everywhere · EU-only data plane</div>
          <div style="display: flex; gap: 14px; font-size: 12px; color: var(--fg-3);">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--success-500);"></span>
              All systems normal
            </span>
            <span style="font-family: var(--font-mono); font-size: 11px;">v0.42.1</span>
          </div>
        </div>
      </footer>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        data-brand=${this.brand}
        style="width: 100%; min-height: 100%; background: var(--ink-0); position: relative;"
      >
        ${this._renderNav()}
        ${this._renderHero()}
        ${this._renderProductFamily()}
        ${this._renderPricing()}
        ${this._renderTrustBar()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-host-landing-page': LetheanHostLandingPage;
  }
}
