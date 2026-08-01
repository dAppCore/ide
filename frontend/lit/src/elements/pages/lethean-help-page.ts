// <lethean-help-page> — help.host.uk.com home. Vi as the search field,
// 4×2 categories grid, popular-this-week list, "talk to a human" callout.
// Ported from help-blog-changelog.jsx > HelpCentreHome. Marketing
// chrome (nav + footer) NOT included — wrap with <lethean-mkt-nav>
// + <lethean-mkt-footer> as the consumer needs.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../atoms/lethean-vi';

const CATEGORIES = [
  { icon: 'rocket', title: 'Getting started', count: 18, lead: 'Make your first site, point your domain, set up email' },
  { icon: 'server', title: 'Hosting', count: 42, lead: 'WordPress, Ghost, Node, Python · runtime quirks' },
  { icon: 'envelope', title: 'Email & DNS', count: 24, lead: 'DKIM, SPF, DMARC, MX records the way Vi writes them' },
  { icon: 'credit-card', title: 'Billing', count: 16, lead: 'Invoices, VAT, plan changes, refunds' },
  { icon: 'key', title: 'Domains', count: 21, lead: 'Register, transfer, point, .uk policy' },
  { icon: 'shield-halved', title: 'Security', count: 14, lead: '2FA, audit log, who has access, key rotation' },
  { icon: 'robot', title: 'About Vi', count: 9, lead: "What she does, what she doesn't, how to override" },
  { icon: 'gear', title: 'Account & teams', count: 11, lead: 'Roles, switching workspaces, leaving a team' },
];

const POPULAR = [
  { title: 'How to point a domain to your Host UK site', cat: 'Domains', min: 4 },
  { title: 'Setting up DKIM, SPF, DMARC properly', cat: 'Email & DNS', min: 6 },
  { title: 'Migrating from WordPress.com', cat: 'Hosting', min: 8 },
  { title: 'Adding a teammate with limited access', cat: 'Account & teams', min: 2 },
  { title: "What Vi does and doesn't have access to", cat: 'About Vi', min: 5 },
  { title: 'Enabling Reverse VAT for B2B EU customers', cat: 'Billing', min: 3 },
];

@customElement('lethean-help-page')
export class LetheanHelpPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <!-- Hero -->
        <section style="padding: 72px 56px 48px; text-align: center;">
          <div
            style="
              display: inline-flex; align-items: center; gap: 8px;
              padding: 5px 12px; border-radius: 999px;
              background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              font-size: 11.5px; color: var(--brand-200);
              font-family: var(--font-mono); letter-spacing: 0.04em;
              margin-bottom: 22px;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
            HELP CENTRE · 156 ARTICLES · UPDATED WEEKLY
          </div>
          <h1 style="font-size: 52px; letter-spacing: -0.04em; line-height: 1.05; margin: 0;">
            Ask Vi.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              Or browse below.
            </span>
          </h1>
          <p
            style="
              font-size: 16.5px; color: var(--fg-2);
              margin: 16px auto 0; max-width: 580px; line-height: 1.55;
            "
          >
            Most answers come back in under a second. If Vi can't find it,
            our humans are an email away.
          </p>

          <!-- Vi-as-search -->
          <div
            style="
              margin: 36px auto 0; max-width: 680px;
              padding: 16px 18px;
              background: var(--ink-2); border: 1px solid var(--line-2);
              border-radius: 14px; box-shadow: var(--shadow-2);
              display: flex; gap: 14px; align-items: center;
            "
          >
            <div
              style="
                width: 36px; height: 36px; border-radius: 8px;
                background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
                border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2));
                display: grid; place-items: center; overflow: hidden; flex-shrink: 0;
              "
            >
              <lethean-vi pose="master" size="42" style="margin-top: 4px;"></lethean-vi>
            </div>
            <div style="flex: 1; text-align: left;">
              <div
                style="
                  font-size: 11px; font-family: var(--font-mono);
                  color: var(--fg-4); letter-spacing: 0.06em; margin-bottom: 2px;
                "
              >ASK VI</div>
              <div style="font-size: 15px; color: var(--fg-3);">
                How do I point my domain to a new server?
              </div>
            </div>
            <kbd
              style="
                padding: 3px 8px;
                background: var(--ink-3); border: 1px solid var(--line-2);
                border-radius: 4px;
                font-size: 11px; color: var(--fg-2);
                font-family: var(--font-mono);
              "
            >↵</kbd>
          </div>
          <div
            style="
              margin-top: 14px;
              display: flex; justify-content: center; gap: 6px;
              font-size: 11.5px; color: var(--fg-4);
              font-family: var(--font-mono);
            "
          >
            recent: "DKIM record" · "cancel plan" · "transfer domain" · "Squarespace migration"
          </div>
        </section>

        <!-- Categories grid -->
        <section style="padding: 48px 56px 24px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 18px;
            "
          >BROWSE BY TOPIC</div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            ${CATEGORIES.map(
              (c) => html`
                <a
                  href="#"
                  style="
                    padding: 22px;
                    background: var(--ink-2);
                    border: 1px solid var(--line-1);
                    border-radius: 12px;
                    display: flex; flex-direction: column; gap: 10px;
                    cursor: pointer;
                    transition: border-color 0.18s;
                    text-decoration: none; color: inherit;
                  "
                >
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div
                      style="
                        width: 36px; height: 36px; border-radius: 8px;
                        background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-2));
                        border: 1px solid color-mix(in oklch, var(--brand-500) 26%, var(--line-2));
                        display: grid; place-items: center;
                      "
                    >
                      <i class="fa-solid fa-${c.icon}" style="font-size: 14px; color: var(--brand-200);"></i>
                    </div>
                    <span class="num tnum" style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4);">
                      ${c.count}
                    </span>
                  </div>
                  <div>
                    <div style="font-size: 14.5px; color: var(--fg-0); font-weight: 500; letter-spacing: -0.01em;">
                      ${c.title}
                    </div>
                    <div style="font-size: 12.5px; color: var(--fg-3); margin-top: 4px; line-height: 1.5;">
                      ${c.lead}
                    </div>
                  </div>
                </a>
              `
            )}
          </div>
        </section>

        <!-- Popular -->
        <section style="padding: 32px 56px 64px;">
          <div
            style="
              display: flex; justify-content: space-between;
              align-items: baseline; margin-bottom: 18px;
            "
          >
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.08em;">
              POPULAR THIS WEEK
            </div>
            <a href="#" style="font-size: 12.5px; color: var(--brand-300);">All articles →</a>
          </div>
          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 12px; overflow: hidden;">
            ${POPULAR.map(
              (p, i) => html`
                <a
                  href="#"
                  style="
                    display: grid; grid-template-columns: 1fr 140px 50px;
                    padding: 16px 20px;
                    border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                    align-items: center; cursor: pointer;
                    text-decoration: none; color: inherit;
                  "
                >
                  <span style="font-size: 14px; color: var(--fg-1);">${p.title}</span>
                  <span style="font-size: 11.5px; color: var(--fg-4); font-family: var(--font-mono); letter-spacing: 0.04em;">
                    ${p.cat.toUpperCase()}
                  </span>
                  <span style="font-size: 11.5px; color: var(--fg-3); font-family: var(--font-mono); text-align: right;">
                    ${p.min} min
                  </span>
                </a>
              `
            )}
          </div>
        </section>

        <!-- Talk to a human -->
        <section style="padding: 32px 56px 80px;">
          <div
            style="
              padding: 32px;
              background: var(--ink-1); border: 1px solid var(--line-1);
              border-radius: 14px;
              display: grid; grid-template-columns: 1fr auto;
              gap: 24px; align-items: center;
            "
          >
            <div>
              <div style="font-size: 18px; color: var(--fg-0); letter-spacing: -0.02em; font-weight: 500;">
                Vi couldn't help?
                <span class="editorial" style="font-style: italic; color: var(--brand-200);">
                  Then write to us.
                </span>
              </div>
              <p style="font-size: 13.5px; color: var(--fg-2); margin: 6px 0 0; max-width: 560px;">
                Standard plans: average 3h 42m response. Studio plans: 38 minutes.
                Real humans, mostly in Manchester, occasionally in Oaxaca.
              </p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-md">Email support</button>
              <button class="btn btn-primary btn-md">Open a ticket</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-help-page': LetheanHelpPage;
  }
}
