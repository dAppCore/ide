// <lethean-pricing-page> — full pricing page composition. Hero +
// annual/monthly toggle + 3-plan grid + Vi "ask before you buy"
// widget + plan-by-plan comparison table + FAQ.
//
// Ported from pricing.jsx > PricingPage. Plan data inlined as the
// canonical Host UK pricing; consumers can fork for OFM / Lethean
// variants or accept the data as a property.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';
import '../atoms/lethean-vi';
import '../commerce/lethean-plan-card';

interface Plan {
  name: string;
  tagline: string;
  price: number;
  featured?: boolean;
  features: string[];
  limits: string;
}

const DEFAULT_PLANS: Plan[] = [
  {
    name: 'Starter',
    tagline: 'One site, kept simple',
    price: 6,
    features: [
      '1 site · 5 GB hosting',
      '1 mailbox · 2 GB',
      'Free .uk.com subdomain',
      'Vi: alerts only',
      'Community support',
    ],
    limits: 'Email response within 48h',
  },
  {
    name: 'Standard',
    tagline: 'Most people start here',
    price: 12,
    featured: true,
    features: [
      '3 sites · 20 GB hosting',
      '5 mailboxes · 5 GB each',
      'Free domain (1st year)',
      'Vi: full agent · acts on your behalf',
      'Privacy analytics + bio link included',
      'Email + chat support · 4h response',
    ],
    limits: '14-day backups · auto-failover',
  },
  {
    name: 'Studio',
    tagline: 'Agencies + teams',
    price: 32,
    features: [
      '10 sites · 100 GB hosting',
      'Unlimited mailboxes',
      'Up to 5 free domains',
      'Vi: team mode · per-site permissions',
      'All Host UK products included',
      'Priority support · 1h response',
    ],
    limits: 'Custom invoicing · VAT export',
  },
];

const COMPARISON_ROWS: Array<[string, string, string, string]> = [
  ['Sites', '1', '3', '10'],
  ['Hosting storage', '5 GB', '20 GB', '100 GB'],
  ['Mailboxes', '1', '5', 'Unlimited'],
  ['Free domain (1st year)', '—', '✓', 'Up to 5'],
  ['Bandwidth', '100 GB', '500 GB', '2 TB'],
  ['Vi agent', 'Alerts only', 'Full · acts on your behalf', 'Team mode'],
  ['Privacy analytics', '—', '✓', '✓'],
  ['Bio-link page (Host Link)', '—', '✓', '✓'],
  ['Backups retained', '7 days', '14 days', '30 days'],
  ['Auto-failover (UK ↔ EU)', '—', '✓', '✓'],
  ['Support response', '48h', '4h', '1h · Slack channel'],
  ['VAT-itemised invoices', '—', '✓', 'Bulk export · API'],
];

const FAQ_PAIRS: Array<[string, string]> = [
  ['Can I move existing sites in?', "Yes. Vi handles WordPress, Ghost, static sites, and most Node/Python apps. She'll do the migration overnight while you sleep."],
  ['What if I want to leave?', 'Press one button. Your sites, mail, and data export as standard formats. No lock-in clauses, no exit fees, no awkward calls.'],
  ['Is Vi reading my site content?', "No. She reads account data — uptime, bills, configurations. Site content (your files, your visitors' data) stays untouched unless you explicitly ask her to look."],
  ['Do you charge VAT?', 'Yes — 20% UK VAT, itemised on every invoice. Reverse-charge applies for EU-registered businesses.'],
  ["Where's my data hosted?", "UK-South (Manchester) by default, with auto-failover to EU-West (Amsterdam) on Standard and Studio. We're never on US-only infrastructure."],
  ["What counts as a 'site'?", 'A unique domain or subdomain. Ten subdomains of one site = one site, in our counting.'],
];

@customElement('lethean-pricing-page')
export class LetheanPricingPage extends LitElement {
  @property() brandName = 'Host UK';
  @property() subdomain = '';
  @property({ attribute: false }) plans: Plan[] = DEFAULT_PLANS;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        class="surface"
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          padding: 32px 56px 64px;
          display: flex; flex-direction: column; gap: 36px;
          box-sizing: border-box;
        "
      >
        <!-- nav -->
        <header style="display: flex; justify-content: space-between; align-items: center;">
          <lethean-brand-mark size="md" name=${this.brandName} subdomain=${this.subdomain}></lethean-brand-mark>
          <nav style="display: flex; gap: 24px; font-size: 13px; color: var(--fg-2);">
            <a href="#">Products</a><a href="#">Pricing</a><a href="#">Customers</a><a href="#">Docs</a><a href="#">Company</a>
          </nav>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm">Sign in</button>
            <button class="btn btn-primary btn-sm">Start free</button>
          </div>
        </header>

        <!-- Hero -->
        <section
          style="
            text-align: center; display: flex; flex-direction: column;
            align-items: center; gap: 14px; padding-top: 16px;
          "
        >
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em;
            "
          >PLAIN PRICING · GBP · NO HIDDEN FEES</div>
          <h1
            style="
              font-size: 48px; letter-spacing: -0.03em;
              line-height: 1.05; max-width: 720px; margin: 0;
            "
          >
            One price.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              Everything bundled.
            </span>
          </h1>
          <p
            style="
              font-size: 16px; color: var(--fg-2);
              max-width: 580px; line-height: 1.55; margin: 0;
            "
          >
            Hosting, domain, mail, analytics, and Vi watching over the lot.
            Cancel any time, your data ports out clean.
          </p>
          <!-- annual/monthly toggle -->
          <div
            style="
              margin-top: 8px;
              display: inline-flex; padding: 4px; border-radius: 999px;
              background: var(--ink-2); border: 1px solid var(--line-2); gap: 4px;
            "
          >
            <button
              style="
                padding: 7px 16px; border-radius: 999px;
                background: var(--ink-3); color: var(--fg-0);
                font-size: 12.5px; border: none; font-family: inherit; cursor: pointer;
              "
            >Annual <span style="color: var(--success-400);">· save 2 months</span></button>
            <button
              style="
                padding: 7px 16px; border-radius: 999px;
                background: transparent; color: var(--fg-3);
                font-size: 12.5px; border: none; font-family: inherit; cursor: pointer;
              "
            >Monthly</button>
          </div>
        </section>

        <!-- Plans -->
        <section style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          ${this.plans.map(
            (p) => html`
              <lethean-plan-card
                name=${p.name}
                tagline=${p.tagline}
                price=${String(p.price)}
                ?featured=${!!p.featured}
                .features=${p.features}
                limits=${p.limits}
              ></lethean-plan-card>
            `
          )}
        </section>

        <!-- Vi widget — pick a plan for me -->
        <section
          style="
            background: var(--ink-1);
            border: 1px solid color-mix(in oklch, var(--brand-500) 24%, var(--line-2));
            border-radius: 18px;
            padding: 28px;
            display: grid; grid-template-columns: auto 1fr auto;
            gap: 24px; align-items: center;
            position: relative; overflow: hidden;
          "
        >
          <div
            style="
              position: absolute; inset: 0;
              background: radial-gradient(ellipse 50% 80% at 80% 50%, color-mix(in oklch, var(--brand-500) 14%, transparent), transparent 60%);
              pointer-events: none;
            "
          ></div>
          <div
            style="
              width: 90px; height: 90px; border-radius: 16px;
              background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2));
              display: grid; place-items: center; overflow: hidden;
              position: relative; z-index: 1;
            "
          >
            <lethean-vi pose="master" size="108" style="margin-top: 12px;"></lethean-vi>
          </div>
          <div style="position: relative; z-index: 1;">
            <div
              style="
                font-size: 11px; color: var(--brand-300);
                font-family: var(--font-mono); letter-spacing: 0.06em;
              "
            >VI · ASK BEFORE YOU BUY</div>
            <h3 style="font-size: 22px; margin-top: 6px; letter-spacing: -0.02em;">
              Tell me what you're building. I'll pick the plan.
            </h3>
            <p style="font-size: 13.5px; color: var(--fg-2); margin: 6px 0 0; max-width: 540px; line-height: 1.55;">
              Two questions — what you're hosting and how many people use it. I'll
              suggest a plan and tell you when to upgrade. No hard sell, no upgrade nags.
            </p>
          </div>
          <button class="btn btn-primary btn-lg" style="position: relative; z-index: 1;">
            Ask Vi · 30s
            <i class="fa-solid fa-arrow-right" style="font-size: 12px; margin-left: 4px;"></i>
          </button>
        </section>

        <!-- Comparison table -->
        <section>
          <h2 style="font-size: 22px; letter-spacing: -0.02em; margin: 0 0 18px;">Plan-by-plan</h2>
          <div
            style="
              background: var(--ink-2); border: 1px solid var(--line-1);
              border-radius: 12px; overflow: hidden;
            "
          >
            <div
              style="
                display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
                padding: 14px 22px; background: var(--ink-1);
                border-bottom: 1px solid var(--line-1);
                font-size: 11px; font-family: var(--font-mono);
                color: var(--fg-4); letter-spacing: 0.06em;
              "
            >
              <span>FEATURE</span>
              <span style="text-align: center;">STARTER</span>
              <span style="text-align: center; color: var(--brand-300);">STANDARD</span>
              <span style="text-align: center;">STUDIO</span>
            </div>
            ${COMPARISON_ROWS.map(
              (row, i) => html`
                <div
                  style="
                    display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
                    padding: 11px 22px; font-size: 13px;
                    border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                    align-items: center;
                  "
                >
                  <span style="color: var(--fg-1);">${row[0]}</span>
                  ${row.slice(1).map(
                    (cell, j) => html`
                      <span
                        style="
                          text-align: center;
                          color: ${cell === '—'
                            ? 'var(--fg-4)'
                            : j === 1
                            ? 'var(--brand-200)'
                            : 'var(--fg-1)'};
                          font-family: ${/[\d✓]/.test(cell) || cell === '—' ? 'var(--font-mono)' : 'inherit'};
                          font-size: ${cell === '✓' || cell === '—' ? '14px' : '13px'};
                        "
                      >${cell}</span>
                    `
                  )}
                </div>
              `
            )}
          </div>
        </section>

        <!-- FAQ -->
        <section>
          <h2 style="font-size: 22px; letter-spacing: -0.02em; margin: 0 0 18px;">Things people ask</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            ${FAQ_PAIRS.map(
              ([q, a]) => html`
                <div
                  style="
                    background: var(--ink-2);
                    border: 1px solid var(--line-1);
                    border-radius: 12px;
                    padding: 16px 18px;
                  "
                >
                  <div
                    style="
                      font-size: 14px; color: var(--fg-0);
                      font-weight: 500; letter-spacing: -0.005em;
                    "
                  >${q}</div>
                  <div
                    style="
                      font-size: 13px; color: var(--fg-2);
                      margin-top: 8px; line-height: 1.55;
                    "
                  >${a}</div>
                </div>
              `
            )}
          </div>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-pricing-page': LetheanPricingPage;
  }
}
