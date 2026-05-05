// <lethean-product-trust-page> — trust.host.uk.com social-proof widget
// product page. Widget-led showroom: hero, 6-widget gallery (each a
// self-contained example with the script-src hint underneath), import
// flow (4 sources), Vi reply mode (review + draft + send/edit/tone),
// CTA. Inlines minimal nav + footer. Ported from products-set2.jsx >
// ProductTrust.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

const IMPORT_SOURCES = [
  { name: 'Trustpilot', icon: 'star', note: 'OAuth, real-time sync' },
  { name: 'Google Reviews', icon: 'google', note: 'Place ID, daily sync' },
  { name: 'Apple Maps', icon: 'apple', note: 'MapKit, daily sync' },
  { name: 'CSV import', icon: 'file-csv', note: 'One-off, signed off' },
];

@customElement('lethean-product-trust-page')
export class LetheanProductTrustPage extends LitElement {
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
          <div style="font-family: var(--font-display); font-size: 17px; font-weight: 600; color: var(--fg-0); letter-spacing: -0.02em;">Host UK</div>
          <nav style="display: flex; gap: 4px; font-size: 13px; color: var(--fg-2);">
            ${items.map(
              (i, idx) => html`<a style="padding: 8px 12px; border-radius: 6px; color: ${idx === 0 ? 'var(--fg-0)' : 'var(--fg-2)'}; font-weight: ${idx === 0 ? 500 : 400};">${i}</a>`
            )}
          </nav>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost btn-sm">Sign in</button>
          <button class="btn btn-primary btn-sm">Start free</button>
        </div>
      </header>
    `;
  }

  private _renderHero() {
    return html`
      <section class="brand-glow" style="padding: 72px 56px 48px; position: relative; overflow: hidden;">
        <div style="max-width: 720px; display: flex; flex-direction: column; gap: 22px;">
          <div
            style="
              display: inline-flex; align-self: flex-start; align-items: center; gap: 8px;
              padding: 5px 12px; border-radius: 999px;
              background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              font-size: 11.5px; color: var(--brand-200);
              font-family: var(--font-mono); letter-spacing: 0.04em;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
            HOST TRUST · TESTIMONIAL & REVIEW WIDGETS
          </div>
          <h1 style="font-size: 56px; letter-spacing: -0.04em; line-height: 1.04; margin: 0;">
            Your customers' words.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              On your site. Looking like yours.
            </span>
          </h1>
          <p style="font-size: 17px; color: var(--fg-2); line-height: 1.55; max-width: 580px; margin: 0;">
            Embeddable testimonials, review collection, star widgets. Imports from
            Trustpilot, Google, Apple. Your design, not theirs.
          </p>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-primary btn-lg">Browse widget gallery</button>
            <button class="btn btn-secondary btn-lg">Try in 2 mins</button>
          </div>
          <div style="display: flex; gap: 22px; margin-top: 8px; font-size: 12px; color: var(--fg-3); font-family: var(--font-mono);">
            ${['GDPR-compliant collection', 'Schema.org markup baked in', 'Light + dark themes per widget'].map(
              (p) => html`<span>
                <i class="fa-solid fa-circle-check" style="font-size: 11px; color: var(--success-400); margin-right: 6px;"></i>
                ${p}
              </span>`
            )}
          </div>
        </div>
      </section>
    `;
  }

  private _widgetFrame(label: string, body: TemplateResult) {
    const slug = label.toLowerCase().replace(/[^a-z]+/g, '-');
    return html`
      <div
        style="
          position: relative;
          background: var(--ink-2); border: 1px solid var(--line-2);
          border-radius: 12px; padding: 18px; padding-top: 36px;
        "
      >
        <div
          style="
            position: absolute; top: 8px; left: 12px;
            font-size: 9.5px; font-family: var(--font-mono);
            color: var(--fg-4); letter-spacing: 0.06em;
          "
        >${label.toUpperCase()}</div>
        ${body}
        <div
          style="
            margin-top: 12px; padding-top: 10px;
            border-top: 1px dashed var(--line-2);
            font-size: 10px; font-family: var(--font-mono);
            color: var(--fg-4); line-height: 1.5;
          "
        >
          &lt;script src="trust.host.uk.com/w/${slug}.js"&gt;&lt;/script&gt;
        </div>
      </div>
    `;
  }

  private _renderWidgetGallery() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="max-width: 580px; margin-bottom: 36px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;">
            THE GALLERY
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Six widgets. Drop in any of them.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            Each one is a single &lt;script&gt; tag. They render lazily, they don't block your
            page, and they style off your CSS variables.
          </p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;">
          ${this._widgetFrame(
            'Stars + count',
            html`
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="display: flex; gap: 1px; color: var(--gold-400); font-size: 16px;">★★★★★</span>
                <span class="num tnum" style="font-size: 14px; color: var(--fg-0); font-weight: 600;">4.9</span>
                <span style="font-size: 12px; color: var(--fg-3);">· 312 reviews</span>
              </div>
            `
          )}
          ${this._widgetFrame(
            'Single quote',
            html`
              <p style="font-size: 13px; color: var(--fg-1); line-height: 1.55; margin: 0;">
                "Vi found the leaky migration in the first hour. Felt like having a senior engineer on retainer."
              </p>
              <div style="margin-top: 8px; font-size: 11px; color: var(--fg-3); font-family: var(--font-mono);">
                — Anson L., founder · Lethean
              </div>
            `
          )}
          ${this._widgetFrame(
            'Marquee scroll',
            html`
              <div style="display: flex; gap: 10px; overflow: hidden;">
                ${['★ 4.9 · 312', 'Lethean', 'Open Food', 'Patel & Co', 'Oxbow Press'].map(
                  (t) => html`
                    <span
                      style="
                        padding: 4px 10px; background: var(--ink-3);
                        border-radius: 999px; font-size: 11px; color: var(--fg-2);
                        white-space: nowrap; border: 1px solid var(--line-2);
                      "
                    >${t}</span>
                  `
                )}
              </div>
            `
          )}
          ${this._widgetFrame(
            '3-up grid',
            html`
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                ${[1, 2, 3].map(
                  () => html`
                    <div
                      style="
                        padding: 8px; background: var(--ink-3);
                        border-radius: 6px;
                        display: flex; flex-direction: column; gap: 4px;
                      "
                    >
                      <span style="font-size: 11px; color: var(--gold-400);">★★★★★</span>
                      <span style="font-size: 10px; color: var(--fg-2); line-height: 1.4;">"Best decision we made all year."</span>
                    </div>
                  `
                )}
              </div>
            `
          )}
          ${this._widgetFrame(
            'Floating ribbon',
            html`
              <div
                style="
                  padding: 8px 12px; background: var(--success-500);
                  color: white; font-size: 11.5px;
                  border-radius: 6px;
                  display: flex; gap: 8px; align-items: center;
                "
              >
                <i class="fa-solid fa-circle-check" style="font-size: 11px;"></i>
                <span>Trusted by 312 UK businesses</span>
              </div>
            `
          )}
          ${this._widgetFrame(
            'Hero pull-quote',
            html`
              <div
                class="editorial"
                style="
                  font-style: italic; font-size: 17px;
                  color: var(--fg-0); line-height: 1.35;
                  letter-spacing: -0.01em;
                "
              >
                "Like having someone on the team who actually reads the runbook."
              </div>
              <div style="margin-top: 6px; font-size: 11px; color: var(--fg-4); font-family: var(--font-mono);">
                Patel & Co · 4.9 ★
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderImportFlow() {
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
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;">
            IMPORT
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Bring in everything you've earned elsewhere.
          </h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          ${IMPORT_SOURCES.map(
            (s) => html`
              <div
                style="
                  background: var(--ink-2); border: 1px solid var(--line-1);
                  border-radius: 10px; padding: 18px;
                  display: flex; flex-direction: column; gap: 10px;
                  align-items: flex-start;
                "
              >
                <div
                  style="
                    width: 36px; height: 36px; border-radius: 7px;
                    background: var(--ink-3);
                    border: 1px solid var(--line-2);
                    display: grid; place-items: center;
                  "
                >
                  <i class="fa-solid fa-${s.icon}" style="font-size: 14px; color: var(--brand-200);"></i>
                </div>
                <div style="font-size: 13.5px; color: var(--fg-0); font-weight: 500;">${s.name}</div>
                <div style="font-size: 11.5px; color: var(--fg-3);">${s.note}</div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderReplyMode() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="max-width: 580px; margin-bottom: 36px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;">
            VI HELPS
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Vi drafts the replies. You hit send.
          </h2>
        </div>
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 14px; padding: 22px;
            display: flex; flex-direction: column; gap: 14px;
          "
        >
          <div
            style="
              padding: 14px;
              background: var(--ink-1); border: 1px solid var(--line-1);
              border-radius: 10px;
              font-size: 13px; color: var(--fg-1); line-height: 1.55;
            "
          >
            <div style="font-size: 11px; color: var(--fg-4); font-family: var(--font-mono); margin-bottom: 6px;">
              ★★☆☆☆ · Sarah · 12 Mar
            </div>
            "The migration started fine but hit a snag with the staging URL. Took support
            four hours to spot it. Solved in the end, but please add a check for this."
          </div>
          <div
            style="
              padding: 14px;
              background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 25%, var(--line-2));
              border-radius: 10px;
              display: flex; flex-direction: column; gap: 8px;
            "
          >
            <div style="display: flex; gap: 8px; align-items: center; font-size: 11px; color: var(--brand-300); font-family: var(--font-mono);">
              <i class="fa-solid fa-feather" style="font-size: 11px;"></i>
              VI'S DRAFT REPLY
            </div>
            <p style="font-size: 13px; color: var(--fg-1); line-height: 1.55; margin: 0;">
              Sarah — that staging-URL check is now in the migration runbook
              (changelog 2026-03-15). Sorry it cost you four hours; we've credited
              you a month. — Anson
            </p>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <button class="btn btn-primary btn-sm">Send</button>
              <button class="btn btn-secondary btn-sm">Edit</button>
              <button class="btn btn-ghost btn-sm">Try another tone</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private _renderCTA() {
    return html`
      <section style="padding: 80px 56px;">
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 18px; padding: 44px;
            display: grid; grid-template-columns: 1fr auto;
            gap: 32px; align-items: center;
            position: relative; overflow: hidden;
          "
        >
          <div class="brand-glow" style="position: absolute; inset: 0; opacity: 0.6; pointer-events: none;"></div>
          <div style="position: relative; z-index: 1;">
            <h2 style="font-size: 30px; letter-spacing: -0.025em; max-width: 580px; line-height: 1.15; margin: 0;">
              Words from your customers.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">That match your stylesheet.</span>
            </h2>
          </div>
          <div style="position: relative; z-index: 1;">
            <button class="btn btn-primary btn-lg">Generate your widget</button>
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
      <div class="surface" data-brand="hostuk" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        ${this._renderNav()}
        ${this._renderHero()}
        ${this._renderWidgetGallery()}
        ${this._renderImportFlow()}
        ${this._renderReplyMode()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-product-trust-page': LetheanProductTrustPage;
  }
}
