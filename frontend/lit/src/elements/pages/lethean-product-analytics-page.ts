// <lethean-product-analytics-page> — analytics.host.uk.com privacy
// analytics product page. Hero + chart, "what we don't do" restraint
// grid, dashboard preview, comparison table, CTA. Inlines minimal
// nav + footer. Ported from products-set1.jsx > ProductAnalytics.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const RESTRAINT_ROWS = [
  { off: 'No cookies', on: 'Stateless. Visit counted, no jar.' },
  { off: 'No fingerprinting', on: 'Browser/OS/screen — discarded after geolocating to country.' },
  { off: 'No third-party scripts', on: 'One JS file. 1.2 KB. Loaded from your domain.' },
  { off: 'No data sales', on: 'Your visitors are not the product.' },
  { off: 'No cross-site tracking', on: "We can't, even if we wanted to. There's no identifier." },
  { off: 'No cookie banner needed', on: 'ICO-confirmed. Ship it without consent UI.' },
];

const DASHBOARD_BLOCKS = [
  {
    title: 'Top sources',
    rows: [
      ['guardian.co.uk', 4218, '33%'],
      ['instagram.com', 2849, '22%'],
      ['Direct', 1672, '13%'],
      ['mastodon.social', 1024, '8%'],
      ['t.co', 802, '6%'],
    ] as Array<[string, number, string]>,
  },
  {
    title: 'Top pages',
    rows: [
      ['/housing-deep-dive', 3214, '25%'],
      ['/', 2849, '22%'],
      ['/about', 1284, '10%'],
      ['/subscribe', 982, '8%'],
      ['/archive', 612, '5%'],
    ] as Array<[string, number, string]>,
  },
  {
    title: 'Country',
    rows: [
      ['🇬🇧 United Kingdom', 7842, '61%'],
      ['🇮🇪 Ireland', 1284, '10%'],
      ['🇺🇸 United States', 982, '8%'],
      ['🇩🇪 Germany', 642, '5%'],
      ['🇫🇷 France', 412, '3%'],
    ] as Array<[string, number, string]>,
  },
  {
    title: 'Browser',
    rows: [
      ['Safari', 4824, '38%'],
      ['Chrome', 4012, '31%'],
      ['Firefox', 1842, '14%'],
      ['Edge', 824, '6%'],
      ['Other', 1345, '11%'],
    ] as Array<[string, number, string]>,
  },
];

const COMPARE_ROWS: Array<[string, string, string, string]> = [
  ['Cookieless', '✓', '—', '✓'],
  ['GDPR by construction', '✓', 'Banner required', '✓'],
  ['Hosted in UK', '✓ Manchester', 'US (Google)', 'US'],
  ['Page weight', '1.2 KB', '45 KB', '1.5 KB'],
  ['Data ownership', 'You · CSV export', 'Google', 'You'],
  ['Price', 'From £9 / mo', 'Free + ads', 'From $14 / mo'],
  ['Sells your data', '—', 'Aggregated', '—'],
];

@customElement('lethean-product-analytics-page')
export class LetheanProductAnalyticsPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _renderNav() {
    const items = ['Products', 'Solutions', 'Pricing', 'Customers', 'Help', 'Blog'];
    return html`
      <header
        style="
          position: sticky; top: 0; z-index: 30;
          background: color-mix(in oklch, var(--ink-0) 88%, transparent);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line-1);
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 56px;
        "
      >
        <div style="display: flex; align-items: center; gap: 28px;">
          <div
            style="
              font-family: var(--font-display); font-size: 17px;
              font-weight: 600; color: var(--fg-0); letter-spacing: -0.02em;
            "
          >Host UK</div>
          <nav style="display: flex; gap: 4px; font-size: 13px; color: var(--fg-2);">
            ${items.map(
              (i, idx) => html`
                <a
                  style="
                    padding: 8px 12px; border-radius: 6px;
                    color: ${idx === 0 ? 'var(--fg-0)' : 'var(--fg-2)'};
                    font-weight: ${idx === 0 ? 500 : 400};
                  "
                >${i}</a>
              `
            )}
          </nav>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-ghost btn-sm">Sign in</button>
          <button class="btn btn-primary btn-sm">Start free</button>
        </div>
      </header>
    `;
  }

  private _renderHeroChart() {
    return html`
      <div
        style="
          background: var(--ink-2); border: 1px solid var(--line-2);
          border-radius: 14px; padding: 22px;
          box-shadow: 0 16px 40px color-mix(in oklch, #000 28%, transparent);
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div>
            <div style="font-size: 12px; color: var(--fg-3); font-family: var(--font-mono);">
              ada.host.uk.com
            </div>
            <div
              class="num tnum"
              style="
                font-size: 36px; color: var(--fg-0);
                letter-spacing: -0.025em; font-weight: 600;
                margin-top: 4px;
              "
            >
              12,847
              <span
                style="
                  font-size: 14px; color: var(--success-400);
                  letter-spacing: 0; font-weight: 400;
                "
              >+18%</span>
            </div>
            <div
              style="
                font-size: 11.5px; color: var(--fg-4);
                font-family: var(--font-mono); margin-top: 2px;
              "
            >visits · last 30 days</div>
          </div>
          <div style="display: flex; gap: 6px;">
            ${['24h', '7d', '30d', 'All'].map(
              (p, i) => html`
                <span
                  style="
                    padding: 5px 10px; font-size: 11.5px; font-family: var(--font-mono);
                    background: ${i === 2 ? 'var(--ink-3)' : 'transparent'};
                    color: ${i === 2 ? 'var(--fg-0)' : 'var(--fg-3)'};
                    border-radius: 5px;
                    border: 1px solid ${i === 2 ? 'var(--line-2)' : 'transparent'};
                  "
                >${p}</span>
              `
            )}
          </div>
        </div>
        <svg viewBox="0 0 400 140" style="width: 100%; display: block;">
          ${[0, 35, 70, 105, 140].map(
            (y) => html`<line x1="0" y1=${y} x2="400" y2=${y} stroke="var(--line-1)" stroke-width="0.5"></line>`
          )}
          <path
            d="M 0 110 L 30 95 L 60 105 L 90 78 L 120 84 L 150 64 L 180 70 L 210 50 L 240 56 L 270 38 L 300 42 L 330 30 L 360 22 L 400 18"
            stroke="oklch(0.72 0.115 305)" stroke-width="2" fill="none"
          ></path>
          <path
            d="M 0 110 L 30 95 L 60 105 L 90 78 L 120 84 L 150 64 L 180 70 L 210 50 L 240 56 L 270 38 L 300 42 L 330 30 L 360 22 L 400 18 L 400 140 L 0 140 Z"
            fill="url(#g1)" opacity="0.4"
          ></path>
          <defs>
            <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="oklch(0.72 0.115 305)" stop-opacity="0.6"></stop>
              <stop offset="100%" stop-color="oklch(0.72 0.115 305)" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
        </svg>
        <div
          style="
            display: flex; justify-content: space-between; margin-top: 8px;
            font-size: 10.5px; color: var(--fg-4); font-family: var(--font-mono);
          "
        >
          ${['1 Mar', '8 Mar', '15 Mar', '22 Mar', '29 Mar'].map((d) => html`<span>${d}</span>`)}
        </div>
        <div
          style="
            margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line-1);
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          "
        >
          ${[
            ['Top page', '/housing-deep-dive', null],
            ['Top source', 'guardian.co.uk', null],
            ['Avg. on-page', '4m 12s', '+22s'],
            ['Bounce', '31%', '-4pp'],
          ].map(
            ([k, v, d]) => html`
              <div>
                <div
                  style="
                    font-size: 11px; color: var(--fg-4);
                    font-family: var(--font-mono);
                    text-transform: uppercase; letter-spacing: 0.04em;
                  "
                >${k}</div>
                <div style="font-size: 13.5px; color: var(--fg-0); margin-top: 4px;">${v}</div>
                ${d ? html`<div style="font-size: 11px; color: var(--success-400); margin-top: 2px;">${d}</div>` : html``}
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderHero() {
    return html`
      <section
        style="
          padding: 72px 56px 32px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; align-items: center;
        "
      >
        <div style="display: flex; flex-direction: column; gap: 22px;">
          <div
            style="
              display: inline-flex; align-self: flex-start;
              padding: 5px 12px; border-radius: 999px;
              background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              font-size: 11.5px; color: var(--brand-200);
              font-family: var(--font-mono); letter-spacing: 0.04em;
              gap: 8px; align-items: center;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
            HOST ANALYTICS · COOKIELESS · GDPR BY CONSTRUCTION
          </div>
          <h1 style="font-size: 54px; letter-spacing: -0.04em; line-height: 1.04; margin: 0;">
            The numbers you actually need.<br />
            <span class="editorial" style="font-style: italic; color: var(--brand-200); font-size: 56px;">
              And nothing else.
            </span>
          </h1>
          <p style="font-size: 17px; color: var(--fg-2); line-height: 1.55; max-width: 520px; margin: 0;">
            Visits, sources, what they read, what made them leave. No cookie banners,
            no fingerprinting, no
            <span style="font-family: var(--font-mono); color: var(--fg-1);">_ga_*</span>,
            no Meta pixel. Charts your accountant can read, your DPO will sign off.
          </p>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-primary btn-lg">Try free for 30 days</button>
            <button class="btn btn-secondary btn-lg">
              View live demo
              <i class="fa-solid fa-arrow-right" style="font-size: 11px; margin-left: 8px;"></i>
            </button>
          </div>
        </div>
        ${this._renderHeroChart()}
      </section>
    `;
  }

  private _renderRestraint() {
    return html`
      <section
        style="
          padding: 80px 56px;
          background: var(--ink-1);
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-1);
        "
      >
        <div style="max-width: 720px; margin-bottom: 36px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >WHAT WE DON'T DO</div>
          <h2 style="font-size: 34px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            We don't track.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">That's the feature.</span>
          </h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          ${RESTRAINT_ROWS.map(
            (r) => html`
              <div
                style="
                  padding: 18px 22px; border-radius: 10px;
                  background: var(--ink-2); border: 1px solid var(--line-1);
                  display: grid; grid-template-columns: auto 1fr;
                  gap: 16px; align-items: start;
                "
              >
                <div
                  style="
                    padding: 3px 9px; font-size: 10.5px; font-family: var(--font-mono);
                    color: var(--danger-400);
                    background: color-mix(in oklch, var(--danger-500) 12%, var(--ink-2));
                    border: 1px solid color-mix(in oklch, var(--danger-500) 28%, var(--line-2));
                    border-radius: 999px; letter-spacing: 0.04em;
                    white-space: nowrap;
                  "
                >${r.off}</div>
                <div style="font-size: 13.5px; color: var(--fg-1); line-height: 1.5;">${r.on}</div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderDashboard() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="max-width: 580px; margin-bottom: 36px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >THE DASHBOARD</div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Built for skim-reading.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            One screen. Five blocks. The numbers your investor or your line manager
            actually asks about.
          </p>
        </div>
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-1);
            border-radius: 14px; padding: 24px;
          "
        >
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            ${DASHBOARD_BLOCKS.map(
              (b) => html`
                <div
                  style="
                    background: var(--ink-1); border: 1px solid var(--line-1);
                    border-radius: 10px; overflow: hidden;
                  "
                >
                  <div
                    style="
                      padding: 12px 16px;
                      font-size: 11.5px; font-family: var(--font-mono);
                      color: var(--fg-4); letter-spacing: 0.06em;
                      border-bottom: 1px solid var(--line-1);
                    "
                  >${b.title.toUpperCase()}</div>
                  ${b.rows.map(
                    (r, i) => html`
                      <div
                        style="
                          position: relative; padding: 8px 16px; font-size: 13px;
                          border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                          display: grid; grid-template-columns: 1fr 70px 50px;
                          gap: 8px; align-items: center;
                        "
                      >
                        <div
                          style="
                            position: absolute; left: 0; top: 0; bottom: 0;
                            width: ${r[2]};
                            background: color-mix(in oklch, var(--brand-500) 12%, transparent);
                            z-index: 0;
                          "
                        ></div>
                        <span style="color: var(--fg-1); position: relative; z-index: 1;">${r[0]}</span>
                        <span
                          class="num tnum"
                          style="color: var(--fg-2); text-align: right; position: relative; z-index: 1;"
                        >${r[1].toLocaleString()}</span>
                        <span
                          style="
                            color: var(--fg-3); font-size: 11.5px;
                            font-family: var(--font-mono); text-align: right;
                            position: relative; z-index: 1;
                          "
                        >${r[2]}</span>
                      </div>
                    `
                  )}
                </div>
              `
            )}
          </div>
        </div>
      </section>
    `;
  }

  private _renderCompare() {
    return html`
      <section style="padding: 64px 56px;">
        <div style="max-width: 720px; margin-bottom: 28px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >VS. THE INDUSTRY</div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; margin: 0;">
            The honest comparison table.
          </h2>
        </div>
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-1);
            border-radius: 12px; overflow: hidden;
          "
        >
          <div
            style="
              display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
              padding: 12px 22px;
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.06em;
              background: var(--ink-1);
              border-bottom: 1px solid var(--line-1);
            "
          >
            <span>FEATURE</span>
            <span style="text-align: center; color: var(--brand-300);">HOST ANALYTICS</span>
            <span style="text-align: center;">GA4</span>
            <span style="text-align: center;">FATHOM</span>
          </div>
          ${COMPARE_ROWS.map(
            (r, i) => html`
              <div
                style="
                  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
                  padding: 11px 22px; font-size: 13px;
                  border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                "
              >
                <span style="color: var(--fg-1);">${r[0]}</span>
                ${r.slice(1).map(
                  (c, j) => html`
                    <span
                      style="
                        text-align: center;
                        color: ${c === '✓'
                          ? j === 0
                            ? 'var(--brand-300)'
                            : 'var(--success-400)'
                          : c === '—'
                          ? 'var(--fg-4)'
                          : 'var(--fg-1)'};
                        font-size: ${c === '✓' || c === '—' ? '14px' : '12.5px'};
                      "
                    >${c}</span>
                  `
                )}
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderCTA() {
    return html`
      <section style="padding: 64px 56px;">
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 18px; padding: 44px;
            display: grid; grid-template-columns: 1fr auto;
            gap: 32px; align-items: center;
            position: relative; overflow: hidden;
          "
        >
          <div
            class="brand-glow"
            style="position: absolute; inset: 0; opacity: 0.6; pointer-events: none;"
          ></div>
          <div style="position: relative; z-index: 1;">
            <h2 style="font-size: 30px; letter-spacing: -0.025em; line-height: 1.15; margin: 0; max-width: 580px;">
              Privacy-first.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">Future-proof.</span>
            </h2>
            <p style="font-size: 14.5px; color: var(--fg-2); margin: 10px 0 0; line-height: 1.55; max-width: 580px;">
              GDPR by construction, not by cookie banner. Move your numbers in from
              Google Analytics in 60 seconds.
            </p>
          </div>
          <div style="position: relative; z-index: 1; display: flex; gap: 10px;">
            <button class="btn btn-primary btn-lg">Try it on your site</button>
            <button class="btn btn-secondary btn-lg">Read the GDPR brief</button>
          </div>
        </div>
      </section>
    `;
  }

  private _renderFooter() {
    return html`
      <footer
        style="
          padding: 48px 56px 28px;
          border-top: 1px solid var(--line-1);
          background: var(--ink-0);
          font-size: 11.5px; color: var(--fg-4);
          font-family: var(--font-mono);
          display: flex; justify-content: space-between; align-items: center;
        "
      >
        <span>© Host UK 2026 · a Lethean studio brand</span>
        <span>Built with ☕ in Manchester</span>
      </footer>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        data-brand="hostuk"
        style="width: 100%; min-height: 100%; background: var(--ink-0);"
      >
        ${this._renderNav()}
        ${this._renderHero()}
        ${this._renderRestraint()}
        ${this._renderDashboard()}
        ${this._renderCompare()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-product-analytics-page': LetheanProductAnalyticsPage;
  }
}
