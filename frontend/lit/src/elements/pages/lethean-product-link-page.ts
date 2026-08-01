// <lethean-product-link-page> — link.host.uk.com bio-link product page.
// Live-preview led: hero with phone mock, use cases, login bridge mock,
// analytics teaser table, CTA. Inlines minimal nav + footer. Ported
// from products-set1.jsx > ProductLink.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const LINK_BUTTONS = [
  { label: 'Latest investigation · The Guardian', icon: 'newspaper' },
  { label: 'Subscribe to my newsletter', icon: 'envelope-open' },
  { label: 'Book a 15-min source call', icon: 'calendar' },
  { label: 'Mastodon · @ada@social.host.uk.com', icon: 'at' },
];

const USE_CASES = [
  { who: 'Independent journalists', what: 'Pin investigations, paywalled or not. Subscribers find the next thing in one tap.' },
  { who: 'Small charities', what: 'Donate · volunteer · trustees · annual report. The four buttons that actually matter.' },
  { who: 'Indie restaurants', what: "Booking · menu · Instagram · today's specials. Updateable from your phone." },
  { who: 'Agencies', what: 'Case studies · contact · careers. Per-client subdomains under one master account.' },
];

const ANALYTICS_ROWS: Array<[string, number, number, string, string]> = [
  ['Latest investigation · The Guardian', 1284, 982, 'instagram.com', '12.4%'],
  ['Subscribe to my newsletter', 432, 421, 'guardian.co.uk', '8.1%'],
  ['Book a 15-min source call', 87, 84, 'linkedin.com', '1.6%'],
  ['Mastodon · @ada@social.host.uk.com', 246, 198, 'twitter.com', '4.6%'],
];

@customElement('lethean-product-link-page')
export class LetheanProductLinkPage extends LitElement {
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

  private _renderPhonePreview() {
    return html`
      <div
        style="
          width: 320px; height: 600px;
          border-radius: 32px; padding: 12px;
          background: var(--ink-2); border: 8px solid var(--ink-3);
          box-shadow: 0 24px 56px color-mix(in oklch, #000 35%, transparent);
          margin: 0 auto;
          position: relative;
        "
      >
        <div
          style="
            width: 100%; height: 100%; border-radius: 22px;
            background: var(--ink-0);
            padding: 32px 18px 18px;
            display: flex; flex-direction: column; align-items: center; gap: 14px;
            overflow: hidden;
            box-sizing: border-box;
          "
        >
          <div
            style="
              width: 72px; height: 72px; border-radius: 999px;
              background: linear-gradient(135deg, var(--brand-400), var(--brand-700));
              display: grid; place-items: center;
              font-size: 26px; font-weight: 600; color: var(--fg-0);
              border: 2px solid var(--brand-300);
            "
          >AP</div>
          <div style="text-align: center;">
            <div style="font-size: 16px; color: var(--fg-0); font-weight: 600;">Ada Patel</div>
            <div
              style="
                font-size: 12px; color: var(--fg-3);
                font-family: var(--font-mono); margin-top: 2px;
              "
            >ada.host.uk.com</div>
          </div>
          <div
            style="
              font-size: 12px; color: var(--fg-2); text-align: center;
              line-height: 1.4; padding: 0 8px;
            "
          >
            Independent journalist · UK-based · investigations into housing
          </div>
          <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
            ${LINK_BUTTONS.map(
              (l) => html`
                <div
                  style="
                    padding: 10px 12px;
                    background: var(--ink-2); border: 1px solid var(--line-1);
                    border-radius: 8px;
                    display: flex; gap: 10px; align-items: center;
                    font-size: 12.5px; color: var(--fg-1);
                  "
                >
                  <i class="fa-solid fa-${l.icon}" style="font-size: 11px; color: var(--brand-300);"></i>
                  <span style="flex: 1;">${l.label}</span>
                  <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 9px; color: var(--fg-4);"></i>
                </div>
              `
            )}
          </div>
          <div
            style="
              margin-top: auto;
              font-size: 9.5px; color: var(--fg-4);
              font-family: var(--font-mono); letter-spacing: 0.04em;
            "
          >built on host.uk.com</div>
        </div>
      </div>
    `;
  }

  private _renderHero() {
    return html`
      <section
        style="
          padding: 72px 56px 56px;
          display: grid; grid-template-columns: 1fr 420px;
          gap: 56px; align-items: center;
        "
      >
        <div style="display: flex; flex-direction: column; gap: 22px;">
          <div
            style="
              display: inline-flex; align-items: center; gap: 8px;
              padding: 5px 12px; border-radius: 999px;
              background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              font-size: 11.5px; color: var(--brand-200);
              font-family: var(--font-mono); align-self: flex-start;
              letter-spacing: 0.04em;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
            HOST LINK · LOGIN BRIDGE FOR THE FAMILY
          </div>
          <h1 style="font-size: 56px; letter-spacing: -0.04em; line-height: 1.04; margin: 0;">
            One link.<br />
            <span class="editorial" style="font-style: italic; color: var(--brand-200); font-size: 58px;">
              Everything you do.
            </span>
          </h1>
          <p style="font-size: 17.5px; color: var(--fg-2); line-height: 1.55; max-width: 520px; margin: 0;">
            The bio link that doubles as your sign-in. Drop it in your Insta bio,
            your CV, your email signature. It's the door to your whole Host UK family.
          </p>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 6px;">
            <input
              placeholder="ada"
              style="
                width: 140px; height: 48px; padding: 0 14px;
                background: var(--ink-2); border: 1px solid var(--line-2);
                border-radius: 10px; color: var(--fg-0);
                font-family: var(--font-mono); font-size: 14px;
                box-sizing: border-box;
              "
            />
            <span style="font-size: 14px; color: var(--fg-3); font-family: var(--font-mono);">.host.uk.com</span>
            <button class="btn btn-primary btn-lg">Claim it</button>
          </div>
          <div style="font-size: 12px; color: var(--fg-4); font-family: var(--font-mono);">
            ✓ 2 379 names taken this month · Vi will check yours in real time
          </div>
        </div>
        ${this._renderPhonePreview()}
      </section>
    `;
  }

  private _renderUseCases() {
    return html`
      <section
        style="
          padding: 80px 56px;
          background: var(--ink-1);
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-1);
        "
      >
        <div style="max-width: 580px; margin-bottom: 36px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >WHO USES IT</div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Four kinds of people, mostly.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            Host Link replaces the mess of three or four hosted services with one link,
            one login, and one bill.
          </p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
          ${USE_CASES.map(
            (c) => html`
              <article
                style="
                  padding: 22px; border-radius: 12px;
                  background: var(--ink-2); border: 1px solid var(--line-1);
                "
              >
                <div style="font-size: 16px; font-weight: 500; color: var(--fg-0); letter-spacing: -0.015em;">
                  ${c.who}
                </div>
                <p style="font-size: 13.5px; color: var(--fg-2); margin: 8px 0 0; line-height: 1.55;">
                  ${c.what}
                </p>
              </article>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderLoginBridge() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px; align-items: center;">
          <div>
            <div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
              "
            >THE LOGIN BRIDGE</div>
            <h2 style="font-size: 34px; letter-spacing: -0.03em; line-height: 1.1; margin: 0;">
              Sign in once.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">Land anywhere.</span>
            </h2>
            <p style="font-size: 15px; color: var(--fg-2); margin: 14px 0 0; line-height: 1.6; max-width: 460px;">
              Click
              <code
                style="
                  font-family: var(--font-mono); color: var(--brand-200);
                  background: var(--ink-2); padding: 2px 6px; border-radius: 4px;
                "
              >Analytics</code>
              on your link page, you're signed into analytics.host.uk.com — no second password,
              no detour. The token expires in 60 seconds; one-time-use, audit-logged.
            </p>
            <div
              style="
                margin-top: 18px; font-size: 12px; color: var(--fg-4);
                font-family: var(--font-mono); line-height: 1.6;
              "
            >
              POST /auth/bridge · {'{ token: ottoken_x4f2k, dest: "analytics" }'} → 302
              https://analytics.host.uk.com/?session=…
            </div>
          </div>
          <div
            style="
              background: var(--ink-2); border: 1px solid var(--line-2);
              border-radius: 14px; padding: 22px;
              display: flex; flex-direction: column; gap: 14px; align-items: center;
            "
          >
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%;">
              ${['link', 'analytics', 'social'].map(
                (s, i) => html`
                  <div
                    style="
                      padding: 14px 10px; border-radius: 8px;
                      background: ${i === 0
                        ? 'color-mix(in oklch, var(--brand-500) 18%, var(--ink-2))'
                        : 'var(--ink-3)'};
                      border: 1px solid ${i === 0
                        ? 'color-mix(in oklch, var(--brand-500) 35%, var(--line-2))'
                        : 'var(--line-1)'};
                      display: flex; flex-direction: column; align-items: center; gap: 4px;
                    "
                  >
                    <i
                      class="fa-solid fa-${s === 'link'
                        ? 'link'
                        : s === 'analytics'
                        ? 'chart-line'
                        : 'calendar-days'}"
                      style="font-size: 14px; color: ${i === 0 ? 'var(--brand-200)' : 'var(--fg-3)'};"
                    ></i>
                    <span
                      style="
                        font-size: 11px; color: ${i === 0 ? 'var(--fg-0)' : 'var(--fg-3)'};
                        font-family: var(--font-mono);
                      "
                    >${s}</span>
                  </div>
                `
              )}
            </div>
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4);">
              signed in via link · 60s token
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <i class="fa-solid fa-circle-check" style="font-size: 11px; color: var(--success-400);"></i>
              <span style="font-size: 11.5px; color: var(--fg-2);">3 surfaces unlocked, no second password</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private _renderAnalyticsTeaser() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="max-width: 640px; margin-bottom: 36px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >ANALYTICS, BUILT IN</div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Who clicked. Where they went. Nothing more.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            Cookieless, no fingerprinting, no third-party scripts. Click counts and referrers,
            broken down by link. Export to CSV.
          </p>
        </div>
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-1);
            border-radius: 12px; padding: 24px;
          "
        >
          <div
            style="
              display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 80px;
              padding: 10px 14px;
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.06em;
              border-bottom: 1px solid var(--line-1);
            "
          >
            <span>LINK</span>
            <span>CLICKS · 7D</span>
            <span>UNIQUE</span>
            <span>TOP REFERRER</span>
            <span style="text-align: right;">CTR</span>
          </div>
          ${ANALYTICS_ROWS.map(
            (r) => html`
              <div
                style="
                  display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 80px;
                  padding: 11px 14px; font-size: 13px;
                  border-top: 1px solid var(--line-1);
                "
              >
                <span style="color: var(--fg-1);">${r[0]}</span>
                <span class="num tnum" style="color: var(--fg-0);">${r[1].toLocaleString()}</span>
                <span class="num tnum" style="color: var(--fg-1);">${r[2].toLocaleString()}</span>
                <span style="color: var(--fg-2); font-family: var(--font-mono); font-size: 12px;">${r[3]}</span>
                <span class="num tnum" style="color: var(--fg-1); text-align: right;">${r[4]}</span>
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
              Your link,
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">your name above the door.</span>
            </h2>
            <p style="font-size: 14.5px; color: var(--fg-2); margin: 10px 0 0; max-width: 580px; line-height: 1.55;">
              Free .uk.com subdomain on every plan. Custom domain on Standard and up.
            </p>
          </div>
          <div style="position: relative; z-index: 1;">
            <button class="btn btn-primary btn-lg">Claim your link</button>
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
        ${this._renderUseCases()}
        ${this._renderLoginBridge()}
        ${this._renderAnalyticsTeaser()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-product-link-page': LetheanProductLinkPage;
  }
}
