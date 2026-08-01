// <lethean-help-search-page> — help search results. Search bar at top
// (showing the current query), Vi's prose answer with sources, ranked
// article list with snippets, filter sidebar. Ported from
// help-blog-changelog.jsx > HelpSearchResults.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

const RESULTS = [
  { title: 'How to point a domain to your Host UK site', cat: 'Domains', min: 4, snippet: 'Add an A record to <code>@</code> and a CNAME for <code>www</code> pointing at <code>edge.host.uk.com</code>. DNS can take up to 24 hours…' },
  { title: "Why isn't my domain working yet?", cat: 'Domains', min: 5, snippet: "Three things to check first: (1) the nameservers, (2) the A and CNAME records, (3) DNSSEC if you've enabled it…" },
  { title: 'Transferring an existing domain in', cat: 'Domains', min: 6, snippet: 'Unlock the domain at your current registrar, request the auth code, paste it during transfer…' },
  { title: 'Pointing a subdomain to a different service', cat: 'Domains', min: 3, snippet: 'You can point <code>shop.yourdomain.com</code> at Shopify or any other host while keeping the apex on Host UK…' },
  { title: 'DNS propagation: what the wait actually means', cat: 'Email & DNS', min: 4, snippet: 'Resolvers cache responses based on TTL. Lower TTL before a change to speed propagation…' },
];

const FILTERS: Array<{ title: string; items: string[] }> = [
  { title: 'Topic', items: ['Domains (8)', 'Email & DNS (4)', 'Hosting (2)', 'Billing (0)'] },
  { title: 'Type', items: ['How-to (10)', 'Reference (3)', 'Troubleshooting (1)'] },
  { title: 'Updated', items: ['Last 30 days (6)', 'Last 90 days (12)', 'Last year (14)'] },
];

@customElement('lethean-help-search-page')
export class LetheanHelpSearchPage extends LitElement {
  @property() query = 'domain not pointing';

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <section
          style="
            padding: 32px 56px 64px;
            display: grid; grid-template-columns: 1fr 280px; gap: 36px;
          "
        >
          <div style="max-width: 760px; min-width: 0;">
            <!-- Search bar -->
            <div
              style="
                padding: 12px 16px;
                background: var(--ink-2); border: 1px solid var(--line-2);
                border-radius: 10px;
                display: flex; gap: 12px; align-items: center;
                margin-bottom: 24px;
              "
            >
              <i class="fa-solid fa-magnifying-glass" style="font-size: 13px; color: var(--fg-3);"></i>
              <span style="flex: 1; font-size: 14.5px; color: var(--fg-0); font-family: var(--font-mono);">
                ${this.query}
              </span>
              <span style="font-size: 11px; color: var(--fg-4); font-family: var(--font-mono);">
                14 results · 184ms
              </span>
            </div>

            <!-- Vi answer -->
            <div
              style="
                padding: 22px; margin-bottom: 28px;
                background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2));
                border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
                border-radius: 12px;
              "
            >
              <div
                style="
                  display: flex; gap: 10px; align-items: center;
                  margin-bottom: 12px;
                  font-size: 11px; color: var(--brand-300);
                  font-family: var(--font-mono); letter-spacing: 0.06em;
                "
              >
                <div
                  style="
                    width: 22px; height: 22px; border-radius: 6px;
                    background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-3));
                    border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
                    display: grid; place-items: center; overflow: hidden;
                  "
                >
                  <lethean-vi pose="master" size="26" style="margin-top: 3px;"></lethean-vi>
                </div>
                VI'S BEST GUESS · WITH SOURCES
              </div>
              <p style="font-size: 14.5px; color: var(--fg-0); line-height: 1.65; margin: 0;">
                Most "domain not pointing" issues come down to one of three things: the
                nameservers haven't been changed at your registrar, the A and CNAME records
                are wrong, or DNS hasn't propagated yet (it can take up to 24 hours, but
                usually under 30 minutes for new domains).
                <br /><br />
                Quickest check: run
                <code
                  style="
                    font-family: var(--font-mono); color: var(--brand-200);
                    background: var(--ink-3); padding: 1px 6px; border-radius: 3px;
                  "
                >dig yourdomain.com</code>
                in a terminal — if you see
                <code
                  style="
                    font-family: var(--font-mono); color: var(--brand-200);
                    background: var(--ink-3); padding: 1px 6px; border-radius: 3px;
                  "
                >edge.host.uk.com</code>
                in the answer, you're set.
              </p>
              <div
                style="
                  margin-top: 16px; padding-top: 12px;
                  border-top: 1px solid color-mix(in oklch, var(--brand-500) 22%, var(--line-2));
                  font-size: 11.5px; color: var(--fg-4);
                  font-family: var(--font-mono);
                "
              >
                sources · article #DNS-014 · article #DOMAINS-021 · status incident #2026-03-12
              </div>
            </div>

            <!-- Result list -->
            <div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 14px;
              "
            >RANKED ARTICLES</div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              ${RESULTS.map(
                (r, i) => html`
                  <a
                    href="#"
                    style="
                      padding: 16px 18px;
                      background: ${i === 0 ? 'var(--ink-2)' : 'transparent'};
                      border: 1px solid ${i === 0 ? 'var(--line-2)' : 'transparent'};
                      border-radius: 8px;
                      cursor: pointer;
                      text-decoration: none; color: inherit;
                    "
                  >
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
                      <span style="font-size: 14.5px; color: var(--fg-0); font-weight: 500;">${r.title}</span>
                      <span
                        style="
                          font-size: 10.5px; color: var(--fg-4);
                          font-family: var(--font-mono); letter-spacing: 0.04em;
                        "
                      >· ${r.cat.toUpperCase()} · ${r.min} MIN</span>
                    </div>
                    <div
                      style="font-size: 13px; color: var(--fg-2); line-height: 1.55;"
                      .innerHTML=${r.snippet}
                    ></div>
                  </a>
                `
              )}
            </div>
          </div>

          <!-- Filters -->
          <aside>
            <div
              style="
                font-size: 10.5px; font-family: var(--font-mono);
                color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 12px;
              "
            >FILTER BY</div>
            ${FILTERS.map(
              (g) => html`
                <div style="margin-bottom: 22px;">
                  <div style="font-size: 12px; color: var(--fg-1); font-weight: 500; margin-bottom: 8px;">
                    ${g.title}
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${g.items.map(
                      (i) => html`
                        <label
                          style="
                            display: flex; gap: 8px; align-items: center;
                            font-size: 12.5px; color: var(--fg-2);
                          "
                        >
                          <input type="checkbox" />
                          <span>${i}</span>
                        </label>
                      `
                    )}
                  </div>
                </div>
              `
            )}
          </aside>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-help-search-page': LetheanHelpSearchPage;
  }
}
