// <lethean-product-social-page> — social.host.uk.com social scheduling
// product page. Calendar-led: hero with full week grid, networks
// (6 brands), analytics table, teams audit log, CTA. Inlines minimal
// nav + footer. Ported from products-set2.jsx > ProductSocial.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const POSTS: Array<{ d: number; h: number; net: string; title: string }> = [
  { d: 0, h: 9, net: 'ma', title: 'Behind the scenes' },
  { d: 0, h: 14, net: 'li', title: 'Hiring update' },
  { d: 1, h: 11, net: 'bs', title: "Friday's recap" },
  { d: 2, h: 8, net: 'ig', title: 'New menu drop' },
  { d: 2, h: 15, net: 'x', title: 'Quote of the week' },
  { d: 3, h: 10, net: 'li', title: 'Case study · Lethean' },
  { d: 4, h: 12, net: 'th', title: "Friday's drop" },
  { d: 4, h: 17, net: 'ma', title: 'Long-read' },
  { d: 6, h: 10, net: 'ig', title: 'Sunday menu' },
];

const NET_COLOR: Record<string, string> = {
  ma: '#6364FF',
  li: '#0A66C2',
  bs: '#1185FE',
  ig: '#E1306C',
  x: '#FFFFFF',
  th: '#FFFFFF',
};

const NETWORKS = [
  { name: 'Mastodon', icon: 'mastodon', note: 'OAuth, custom instance, CW + alt-text required' },
  { name: 'Bluesky', icon: 'bluesky', note: 'AT Protocol, custom domain handles' },
  { name: 'LinkedIn', icon: 'linkedin', note: 'Personal + company pages' },
  { name: 'Instagram', icon: 'instagram', note: 'Posts, Reels, Stories · Business accounts' },
  { name: 'X', icon: 'x-twitter', note: 'Posts + threads · API v2' },
  { name: 'Threads', icon: 'threads', note: 'Posts · official API' },
];

const ANALYTICS_ROWS: Array<[string, string, number, number, number, string]> = [
  ['Behind the scenes · the test kitchen', 'Mastodon', 4218, 312, 84, '3.8%'],
  ['Hiring · senior platform engineer', 'LinkedIn', 12842, 184, 64, '1.2%'],
  ["New menu · Tuesday's photoshoot", 'Instagram', 8421, 642, 28, '4.4%'],
  ["Friday's recap thread", 'Bluesky', 2849, 264, 142, '5.2%'],
  ['Quote of the week', 'X', 6128, 412, 88, '2.1%'],
];

const TEAM_LOG: Array<[string, string, string]> = [
  ['14:02', 'lina@', 'drafted: "Hiring · senior platform engineer"'],
  ['14:08', 'vi', "flagged: 'remote-first' isn't quite right per your hiring page · suggest 'UK remote'"],
  ['14:11', 'lina@', "edited: 'remote-first' → 'UK remote'"],
  ['14:14', 'anson@', "approved · 'looks great, ship it'"],
  ['14:14', 'vi', 'scheduled: LinkedIn (10:00 Tue), Mastodon (10:30 Tue)'],
];

const HOURS = [8, 10, 12, 14, 16, 18];

@customElement('lethean-product-social-page')
export class LetheanProductSocialPage extends LitElement {
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

  private _renderCalendarMock() {
    return html`
      <div
        style="
          background: var(--ink-2); border: 1px solid var(--line-2);
          border-radius: 14px; padding: 18px;
          box-shadow: 0 16px 40px color-mix(in oklch, #000 28%, transparent);
        "
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div style="font-size: 13px; color: var(--fg-0);">
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">Week of</span>
            17 March
          </div>
          <div style="display: flex; gap: 6px;">
            <button style="width: 22px; height: 22px; border: 1px solid var(--line-2); background: var(--ink-3); border-radius: 5px; color: var(--fg-2); font-size: 11px;">‹</button>
            <button style="width: 22px; height: 22px; border: 1px solid var(--line-2); background: var(--ink-3); border-radius: 5px; color: var(--fg-2); font-size: 11px;">›</button>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 40px repeat(7, 1fr); gap: 4px;">
          <div></div>
          ${DAYS.map(
            (d, i) => html`
              <div
                style="
                  font-size: 11px; font-family: var(--font-mono);
                  color: ${i === 4 ? 'var(--brand-300)' : 'var(--fg-4)'};
                  text-align: center; padding: 4px 0; letter-spacing: 0.04em;
                "
              >${d.toUpperCase()} ${17 + i}</div>
            `
          )}
          ${HOURS.flatMap((h) => [
            html`<div style="font-size: 10px; font-family: var(--font-mono); color: var(--fg-4); text-align: right; padding-top: 14px;">${h}:00</div>`,
            ...Array.from({ length: 7 }).map((_, d) => {
              const here = POSTS.find((p) => p.d === d && p.h >= h && p.h < h + 2);
              return html`
                <div
                  style="
                    height: 38px; background: var(--ink-1);
                    border: 1px solid var(--line-1); border-radius: 4px;
                    padding: 4px; position: relative; overflow: hidden;
                  "
                >
                  ${here
                    ? html`
                        <div
                          style="
                            padding: 3px 5px; height: 100%;
                            background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2));
                            border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
                            border-radius: 3px;
                            display: flex; flex-direction: column; gap: 2px;
                            box-sizing: border-box;
                          "
                        >
                          <div style="display: flex; gap: 3px; align-items: center;">
                            <span style="width: 5px; height: 5px; border-radius: 999px; background: ${NET_COLOR[here.net]};"></span>
                            <span style="font-size: 8.5px; font-family: var(--font-mono); color: var(--fg-3); text-transform: uppercase;">${here.net}</span>
                          </div>
                          <span style="font-size: 10px; color: var(--fg-0); line-height: 1.1; overflow: hidden;">${here.title}</span>
                        </div>
                      `
                    : html``}
                </div>
              `;
            }),
          ])}
        </div>
        <div
          style="
            margin-top: 14px; padding: 10px 12px;
            background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2));
            border: 1px solid color-mix(in oklch, var(--brand-500) 22%, var(--line-2));
            border-radius: 8px;
            display: flex; gap: 10px; align-items: center;
          "
        >
          <div
            style="
              width: 28px; height: 28px; border-radius: 50%;
              background: linear-gradient(135deg, var(--brand-400), var(--brand-700));
              display: grid; place-items: center;
            "
          >
            <i class="fa-solid fa-feather" style="font-size: 12px; color: var(--fg-0);"></i>
          </div>
          <span style="font-size: 12px; color: var(--fg-1);">
            Tuesday's draft is missing alt-text on the menu image. Want me to draft one?
          </span>
        </div>
      </div>
    `;
  }

  private _renderHero() {
    return html`
      <section style="padding: 72px 56px 48px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center;">
          <div style="display: flex; flex-direction: column; gap: 22px;">
            <div
              style="
                display: inline-flex; align-self: flex-start; gap: 8px;
                align-items: center;
                padding: 5px 12px; border-radius: 999px;
                background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
                border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
                font-size: 11.5px; color: var(--brand-200);
                font-family: var(--font-mono); letter-spacing: 0.04em;
              "
            >
              <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
              HOST SOCIAL · SCHEDULING · ANALYTICS · INBOX
            </div>
            <h1 style="font-size: 56px; letter-spacing: -0.04em; line-height: 1.04; margin: 0;">
              A calmer<br />
              <span class="editorial" style="font-style: italic; color: var(--brand-200); font-size: 58px;">
                social calendar.
              </span>
            </h1>
            <p style="font-size: 17px; color: var(--fg-2); line-height: 1.55; max-width: 480px; margin: 0;">
              Schedule across Mastodon, Bluesky, LinkedIn, Instagram, X, Threads.
              Vi sweeps for typos, missing alt-text, broken links — before they go out.
            </p>
            <div style="display: flex; gap: 12px;">
              <button class="btn btn-primary btn-lg">Try free for 30 days</button>
              <button class="btn btn-secondary btn-lg">
                Watch the demo
                <i class="fa-solid fa-arrow-right" style="font-size: 11px; margin-left: 8px;"></i>
              </button>
            </div>
          </div>
          ${this._renderCalendarMock()}
        </div>
      </section>
    `;
  }

  private _renderNetworks() {
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
            WHERE IT POSTS
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Six networks. Including the ones you actually use.
          </h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          ${NETWORKS.map(
            (n) => html`
              <div
                style="
                  padding: 16px 18px; border-radius: 10px;
                  background: var(--ink-2); border: 1px solid var(--line-1);
                  display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: center;
                "
              >
                <div
                  style="
                    width: 36px; height: 36px; border-radius: 7px;
                    background: var(--ink-3);
                    display: grid; place-items: center;
                    border: 1px solid var(--line-2);
                  "
                >
                  <i class="fa-brands fa-${n.icon}" style="font-size: 16px; color: var(--brand-200);"></i>
                </div>
                <div>
                  <div style="font-size: 13.5px; color: var(--fg-0); font-weight: 500;">${n.name}</div>
                  <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 2px;">${n.note}</div>
                </div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderAnalytics() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="max-width: 580px; margin-bottom: 36px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;">
            THE NUMBERS
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Engagement, by network, by post.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            Click any post for the full audit — when it went out, who shared it, where it landed.
          </p>
        </div>
        <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 12px; overflow: hidden;">
          <div
            style="
              display: grid; grid-template-columns: 2fr 80px 80px 80px 80px 80px;
              padding: 10px 18px;
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.06em;
              border-bottom: 1px solid var(--line-1);
            "
          >
            <span>POST</span>
            <span style="text-align: right;">NET</span>
            <span style="text-align: right;">IMPR.</span>
            <span style="text-align: right;">LIKES</span>
            <span style="text-align: right;">SHARES</span>
            <span style="text-align: right;">CTR</span>
          </div>
          ${ANALYTICS_ROWS.map(
            (r) => html`
              <div
                style="
                  display: grid; grid-template-columns: 2fr 80px 80px 80px 80px 80px;
                  padding: 11px 18px; font-size: 13px;
                  border-top: 1px solid var(--line-1);
                "
              >
                <span style="color: var(--fg-1);">${r[0]}</span>
                <span style="color: var(--fg-3); font-family: var(--font-mono); font-size: 11.5px; text-align: right;">${r[1]}</span>
                <span class="num tnum" style="color: var(--fg-1); text-align: right;">${r[2].toLocaleString()}</span>
                <span class="num tnum" style="color: var(--fg-1); text-align: right;">${r[3]}</span>
                <span class="num tnum" style="color: var(--fg-1); text-align: right;">${r[4]}</span>
                <span class="num tnum" style="color: var(--success-400); text-align: right;">${r[5]}</span>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderTeams() {
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
            FOR TEAMS
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Drafts. Approvals.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">Without the Slack tax.</span>
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            Marketing drafts, founder approves, Vi schedules. Audit log on every edit.
          </p>
        </div>
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 12px; padding: 24px;
            display: flex; flex-direction: column; gap: 12px;
          "
        >
          ${TEAM_LOG.map(
            (r) => html`
              <div style="display: grid; grid-template-columns: 60px 90px 1fr; gap: 14px; font-size: 13px; font-family: var(--font-mono);">
                <span style="color: var(--fg-4);">${r[0]}</span>
                <span style="color: ${r[1] === 'vi' ? 'var(--brand-300)' : 'var(--fg-1)'};">${r[1]}</span>
                <span style="color: var(--fg-1);">${r[2]}</span>
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
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 18px; padding: 44px;
            display: grid; grid-template-columns: 1fr auto; gap: 32px;
            align-items: center; position: relative; overflow: hidden;
          "
        >
          <div class="brand-glow" style="position: absolute; inset: 0; opacity: 0.6; pointer-events: none;"></div>
          <div style="position: relative; z-index: 1;">
            <h2 style="font-size: 30px; letter-spacing: -0.025em; max-width: 580px; line-height: 1.15; margin: 0;">
              Six networks. One queue.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">Sleeps when you do.</span>
            </h2>
            <p style="font-size: 14.5px; color: var(--fg-2); margin: 10px 0 0; line-height: 1.55; max-width: 580px;">
              Buffer-style scheduling, calmly. Vi reads your draft and asks the awkward
              questions before your followers do.
            </p>
          </div>
          <div style="position: relative; z-index: 1;">
            <button class="btn btn-primary btn-lg">Schedule your week</button>
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
        ${this._renderNetworks()}
        ${this._renderAnalytics()}
        ${this._renderTeams()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-product-social-page': LetheanProductSocialPage;
  }
}
