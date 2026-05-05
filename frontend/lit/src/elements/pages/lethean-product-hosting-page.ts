// <lethean-product-hosting-page> — host.uk.com/hosting product page.
// Spec-sheet led: hero, 4-section spec table, 6-runtime grid, free
// migration story (with run log), proof strip, CTA. Inlines a minimal
// marketing nav + footer (the full mega-menu surface lives in
// <lethean-marketing-page>). Ported from products-set1.jsx.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const SPEC_ROWS = [
  {
    area: 'Compute',
    spec: [
      ['Runtime', 'PHP 8.3, Node 20, Python 3.12, static'],
      ['RAM per site', '1 → 8 GB (plan-dependent)'],
      ['CPU', 'Shared dedicated cores · vCPU 1 → 4'],
      ['Process model', 'FrankenPHP / Octane workers'],
    ],
  },
  {
    area: 'Storage',
    spec: [
      ['Hosting disk', '5 → 100 GB NVMe SSD'],
      ['Bandwidth', '100 GB → 2 TB / month'],
      ['File system', 'Per-site chroot, no shared /tmp'],
      ['Backups', '7/14/30 day rolling, point-in-time restore'],
    ],
  },
  {
    area: 'Network',
    spec: [
      ['Primary region', 'UK-South · Manchester (Hetzner UK1)'],
      ['Failover', 'EU-West · Amsterdam (Hetzner FSN1)'],
      ['DNS', 'Per-site Anycast, free .uk.com subdomain'],
      ['TLS', "Let's Encrypt + ECDSA, auto-renew"],
    ],
  },
  {
    area: 'Operations',
    spec: [
      ['Vi monitoring', '30-second probes, status page included'],
      ['Deploy', 'Git push or Vi ("deploy preview to staging")'],
      ['SSH', 'Yes, per-site key, audit log'],
      ['Support response', '4h Standard · 1h Studio'],
    ],
  },
];

const RUNTIMES = [
  { name: 'WordPress', v: '6.5+', icon: 'wordpress', note: 'Managed core + auto-update toggle' },
  { name: 'Ghost', v: '5+', icon: 'ghost', note: 'Custom theme, MySQL or SQLite' },
  { name: 'Node', v: '18 / 20 / 22', icon: 'node-js', note: 'PM2 / direct, persistent processes' },
  { name: 'Python', v: '3.10 / 3.11 / 3.12', icon: 'python', note: 'Gunicorn / uvicorn, requirements.txt' },
  { name: 'Laravel', v: '10 / 11', icon: 'laravel', note: 'FrankenPHP + Octane out of the box' },
  { name: 'Static', v: 'any', icon: 'code', note: 'Drop a folder, get a CDN' },
];

const MIGRATION_STEPS: Array<[string, string, string, string]> = [
  ['23:00', 'snapshot.create(source=ada-old.com)', 'ok', '184ms'],
  ['23:01', 'files.transfer · 4.2 GB · 12 min', 'ok', '12m 04s'],
  ['23:14', 'db.export → db.import · 84 MB', 'ok', '47s'],
  ['23:15', 'config.normalise · wp-config.php', 'ok', '12ms'],
  ['23:16', 'ssl.issue · ECDSA · LE', 'ok', '8s'],
  ['23:17', 'smoke-tests · 47 URLs · 200 OK', 'ok', '1m 22s'],
  ['23:19', 'dns.cutover · TTL=60 · pre-staged', 'ok', '0s'],
  ['03:42', 'vi.email("compared, here are the numbers")', 'ok', '2s'],
];

const MIGRATION_BULLETS = [
  'WordPress · including custom themes & plugins',
  'Ghost · including members & subscriptions',
  'cPanel sites · email + databases included',
  'Squarespace exports · we rebuild against your domain',
  'Custom Node/Python apps · case-by-case, free assessment',
];

const PROOF_STATS: Array<[string, string]> = [
  ['99.99%', 'uptime · 12 mo rolling'],
  ['£0', 'migration · all plans'],
  ['28 ms', 'TTFB · UK-South median'],
  ['4h', 'support response · Standard'],
];

@customElement('lethean-product-hosting-page')
export class LetheanProductHostingPage extends LitElement {
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

  private _renderHero() {
    return html`
      <section
        class="brand-glow"
        style="
          padding: 72px 56px 56px;
          display: grid; grid-template-columns: 1.1fr 0.9fr;
          gap: 48px; align-items: center; max-width: 1180px;
          position: relative; overflow: hidden;
        "
      >
        <div>
          <div
            style="
              display: inline-flex; align-items: center; gap: 8px;
              padding: 5px 12px; border-radius: 999px;
              background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              font-size: 11.5px; color: var(--brand-200);
              font-family: var(--font-mono); letter-spacing: 0.04em; margin-bottom: 22px;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
            HOSTING · UK-SOUTH + EU-WEST
          </div>
          <h1 style="font-size: 56px; line-height: 1.04; letter-spacing: -0.04em; margin: 0;">
            Hosting that just
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">behaves itself.</span>
          </h1>
          <p style="font-size: 17px; color: var(--fg-2); max-width: 540px; margin: 22px 0 0; line-height: 1.55;">
            WordPress, Ghost, Node, Python, static. UK-South Manchester by default,
            automatic EU-West failover. Vi watches the lot. We'll move you in for free.
          </p>
          <div style="display: flex; gap: 12px; margin-top: 30px;">
            <button class="btn btn-primary btn-lg">Start 30-day trial</button>
            <button class="btn btn-secondary btn-lg">Read the spec sheet</button>
          </div>
          <div
            style="
              display: flex; gap: 22px; margin-top: 28px;
              font-size: 12px; color: var(--fg-3);
              font-family: var(--font-mono);
            "
          >
            ${['UK + EU sovereign', 'Free migration', '99.99% uptime, 12 months running'].map(
              (p) => html`
                <span>
                  <i class="fa-solid fa-circle-check" style="font-size: 11px; color: var(--success-400); margin-right: 6px;"></i>
                  ${p}
                </span>
              `
            )}
          </div>
        </div>
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-2);
            border-radius: 14px; padding: 22px;
            box-shadow: 0 16px 40px color-mix(in oklch, #000 28%, transparent);
            font-family: var(--font-mono); font-size: 12px;
          "
        >
          <div style="font-size: 11px; color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 14px;">
            VI · ada.host.uk.com — STATUS
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--fg-3);">UPTIME · 30D</span>
              <span style="color: var(--success-400);">99.99%</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--fg-3);">TTFB · MEDIAN</span>
              <span style="color: var(--fg-1);">28ms</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--fg-3);">REGION</span>
              <span style="color: var(--fg-1);">UK-South · Manchester</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--fg-3);">FAILOVER</span>
              <span style="color: var(--fg-1);">EU-West · Amsterdam</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--fg-3);">RUNTIME</span>
              <span style="color: var(--brand-200);">php 8.3 · frankenphp</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private _renderSpecSheet() {
    return html`
      <section style="padding: 64px 56px;">
        <div style="max-width: 640px; margin-bottom: 36px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >THE SPEC SHEET</div>
          <h2 style="font-size: 32px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            The numbers, written down.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">No asterisks.</span>
          </h2>
        </div>
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 12px;
            overflow: hidden;
          "
        >
          ${SPEC_ROWS.map(
            (r, i) => html`
              <div
                style="
                  display: grid; grid-template-columns: 180px 1fr;
                  border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                "
              >
                <div
                  style="
                    padding: 18px 22px;
                    font-size: 11px; font-family: var(--font-mono);
                    color: var(--brand-300); letter-spacing: 0.08em;
                    border-right: 1px solid var(--line-1);
                    background: var(--ink-1);
                  "
                >${r.area.toUpperCase()}</div>
                <div>
                  ${r.spec.map(
                    ([k, v], j) => html`
                      <div
                        style="
                          display: grid; grid-template-columns: 200px 1fr;
                          padding: 11px 22px; font-size: 13.5px;
                          border-top: ${j === 0 ? 'none' : '1px solid var(--line-1)'};
                        "
                      >
                        <span style="color: var(--fg-3);">${k}</span>
                        <span style="color: var(--fg-0);">${v}</span>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderRuntimes() {
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
          >WHAT YOU CAN RUN</div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Six runtimes, no surprises.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            If your stack isn't here, ask Vi — she'll tell you honestly whether it'll work.
          </p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          ${RUNTIMES.map(
            (r) => html`
              <div
                style="
                  padding: 22px; border-radius: 12px;
                  background: var(--ink-2); border: 1px solid var(--line-1);
                  display: grid; grid-template-columns: auto 1fr auto;
                  gap: 14px; align-items: center;
                "
              >
                <div
                  style="
                    width: 40px; height: 40px; border-radius: 8px;
                    background: var(--ink-3); border: 1px solid var(--line-2);
                    display: grid; place-items: center;
                  "
                >
                  <i class="fa-brands fa-${r.icon}" style="font-size: 18px; color: var(--brand-200);"></i>
                </div>
                <div>
                  <div style="font-size: 14px; color: var(--fg-0); font-weight: 500;">${r.name}</div>
                  <div style="font-size: 12.5px; color: var(--fg-3); margin-top: 3px;">${r.note}</div>
                </div>
                <div
                  style="
                    font-size: 11px; font-family: var(--font-mono);
                    color: var(--fg-4); letter-spacing: 0.04em;
                  "
                >${r.v}</div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderMigration() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 56px; align-items: center;">
          <div>
            <div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
              "
            >FREE MIGRATION</div>
            <h2 style="font-size: 36px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
              We move you in.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">You sleep through it.</span>
            </h2>
            <p style="font-size: 15.5px; color: var(--fg-2); margin: 14px 0 0; line-height: 1.6; max-width: 480px;">
              Tell Vi where you're hosted now. She'll inspect, propose a plan, do the move
              overnight, and email you the comparison the next morning. If it's worse on
              Host UK, we won't switch your DNS.
            </p>
            <div style="margin-top: 22px; display: flex; flex-direction: column; gap: 10px;">
              ${MIGRATION_BULLETS.map(
                (t) => html`
                  <div style="display: flex; gap: 10px; font-size: 13.5px; color: var(--fg-1);">
                    <i class="fa-solid fa-circle-check" style="font-size: 12px; color: var(--success-400);"></i>
                    <span>${t}</span>
                  </div>
                `
              )}
            </div>
          </div>
          <div
            style="
              background: var(--ink-2);
              border: 1px solid var(--line-2);
              border-radius: 14px; padding: 24px;
              font-family: var(--font-mono); font-size: 13px;
              box-shadow: 0 16px 40px color-mix(in oklch, #000 28%, transparent);
            "
          >
            <div style="font-size: 11px; color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 14px;">
              MIGRATION RUN · Tue 17 Mar · 23:00 → 03:42 UK
            </div>
            <ol style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;">
              ${MIGRATION_STEPS.map(
                ([t, c, s, ms]) => html`
                  <li
                    style="
                      display: grid; grid-template-columns: 60px 1fr 50px 60px;
                      gap: 10px; align-items: center;
                    "
                  >
                    <span style="color: var(--fg-4);">${t}</span>
                    <span style="color: var(--fg-1);">${c}</span>
                    <span style="color: var(--success-400); font-size: 11px;">● ${s.toUpperCase()}</span>
                    <span style="color: var(--fg-3); text-align: right; font-size: 11.5px;">${ms}</span>
                  </li>
                `
              )}
            </ol>
          </div>
        </div>
      </section>
    `;
  }

  private _renderProofStrip() {
    return html`
      <section
        style="
          padding: 48px 56px;
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-1);
          background: var(--ink-1);
        "
      >
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; text-align: center;">
          ${PROOF_STATS.map(
            ([n, l]) => html`
              <div>
                <div
                  class="num tnum"
                  style="font-size: 38px; color: var(--fg-0); letter-spacing: -0.03em; font-weight: 600;"
                >${n}</div>
                <div
                  style="
                    font-size: 12px; color: var(--fg-3); margin-top: 6px;
                    font-family: var(--font-mono);
                  "
                >${l}</div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderCTA() {
    return html`
      <section style="padding: 80px 56px;">
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-2);
            border-radius: 18px;
            padding: 44px;
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
            <h2 style="font-size: 30px; letter-spacing: -0.025em; max-width: 580px; line-height: 1.15; margin: 0;">
              Move in this weekend.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">We'll do the boxes.</span>
            </h2>
            <p style="font-size: 14.5px; color: var(--fg-2); margin: 10px 0 0; line-height: 1.55; max-width: 580px;">
              Free migration on every plan. Vi runs it overnight; you wake up to a working site.
            </p>
          </div>
          <div style="position: relative; z-index: 1; display: flex; gap: 10px;">
            <button class="btn btn-primary btn-lg">Start migration</button>
          </div>
        </div>
      </section>
    `;
  }

  private _renderFooter() {
    const cols: Array<[string, string[]]> = [
      ['Products', ['Host Link', 'Host Social', 'Host Analytics', 'Host Trust']],
      ['Company', ['About', 'Careers', 'Press', 'Brand']],
      ['Legal', ['Terms', 'Privacy', 'AUP', 'GDPR']],
      ['Resources', ['Help', 'API docs', 'Changelog', 'Status']],
    ];
    return html`
      <footer
        style="
          padding: 48px 56px 28px;
          border-top: 1px solid var(--line-1);
          background: var(--ink-0);
        "
      >
        <div style="display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr; gap: 32px;">
          <div>
            <div
              style="
                font-family: var(--font-display); font-size: 17px;
                font-weight: 600; color: var(--fg-0); letter-spacing: -0.02em;
              "
            >Host UK</div>
            <p style="font-size: 13px; color: var(--fg-3); margin: 14px 0 0; line-height: 1.55; max-width: 320px;">
              Hosting and SaaS for UK businesses and creators. Owned by Lethean Studio.
            </p>
          </div>
          ${cols.map(
            ([h, items]) => html`
              <div>
                <div
                  style="
                    font-size: 11px; font-family: var(--font-mono);
                    color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 14px;
                  "
                >${h.toUpperCase()}</div>
                <ul
                  style="
                    list-style: none; padding: 0; margin: 0;
                    display: flex; flex-direction: column; gap: 8px;
                  "
                >
                  ${items.map((i) => html`<li style="font-size: 13px; color: var(--fg-2);">${i}</li>`)}
                </ul>
              </div>
            `
          )}
        </div>
        <div
          style="
            display: flex; justify-content: space-between; align-items: center;
            padding-top: 28px; margin-top: 28px;
            border-top: 1px solid var(--line-1);
            font-size: 11.5px; color: var(--fg-4); font-family: var(--font-mono);
          "
        >
          <span>© Host UK 2026 · a Lethean studio brand</span>
          <span>Built with ☕ in Manchester</span>
        </div>
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
        ${this._renderSpecSheet()}
        ${this._renderRuntimes()}
        ${this._renderMigration()}
        ${this._renderProofStrip()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-product-hosting-page': LetheanProductHostingPage;
  }
}
