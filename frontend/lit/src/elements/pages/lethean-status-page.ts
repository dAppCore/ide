// <lethean-status-page> — public status page (status.host.uk.com).
// Header (brand-mark + RSS), big calm headline (Vi-narrated), all-systems
// table (status-dot + name + uptime-strip + uptime%), incident timeline,
// post-mortem footer.
//
// Ported from status-errors.jsx > StatusPage. Component data is inlined
// as the example "elevated mail latency" scenario; consumers can fork
// or pass `components` / `incidents` properties for live data.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';
import '../atoms/lethean-status-dot';
import '../atoms/lethean-vi';

type CompState = 'ok' | 'warn' | 'err';
type IncidentState = 'investigating' | 'identified' | 'monitoring' | 'resolved';

interface StatusComponent {
  name: string;
  state: CompState;
  uptime: string;
  note?: string;
}

interface IncidentEntry {
  at: string;
  who: string;
  state: IncidentState;
  body: string;
}

const DEFAULT_COMPONENTS: StatusComponent[] = [
  { name: 'host.uk.com (marketing)', state: 'ok', uptime: '100.00' },
  { name: 'control panel · API', state: 'ok', uptime: '99.998' },
  { name: 'Hosting · UK-South', state: 'ok', uptime: '99.994' },
  { name: 'Hosting · EU-West', state: 'ok', uptime: '99.987' },
  { name: 'Mail · UK-South', state: 'ok', uptime: '99.998' },
  { name: 'Mail · EU-West', state: 'warn', uptime: '99.91', note: 'Elevated latency · investigating' },
  { name: 'DNS · global anycast', state: 'ok', uptime: '100.00' },
  { name: 'Object storage', state: 'ok', uptime: '99.999' },
  { name: 'Stripe payments', state: 'ok', uptime: '100.00', note: 'third-party' },
];

const DEFAULT_INCIDENTS: IncidentEntry[] = [
  { at: '14:22', who: 'Vi', state: 'investigating', body: 'Rollout is at 65%. The slowest queue is draining — average is now 42s, down from 90s peak. Will keep going.' },
  { at: '14:12', who: 'Vi', state: 'identified', body: "I traced it to a misconfigured SPF batch in the new outbound worker. We're rolling back that worker now. Mail will catch up in waves." },
  { at: '14:02', who: 'Vi', state: 'investigating', body: 'I noticed SMTP delivery times in EU-West climbed past my alert threshold. Looking now. UK-South is unaffected.' },
];

@customElement('lethean-status-page')
export class LetheanStatusPage extends LitElement {
  @property() brandName = 'Host UK';
  @property() subdomain = 'status';
  @property() headlineEyebrow = 'ELEVATED LATENCY · MAIL EU-WEST · 14:02 UTC';
  @property() headlineLeader = 'Mail is slow in EU-West.';
  @property() headlineRest = ' Everything else is fine.';
  @property() viNarration = 'SMTP delivery is taking up to 90 seconds — normal is <5. The fix is mid-rollout. I\'ll update this page every 10 minutes until we\'re back to green.';
  @property() nextUpdate = '14:32';
  @property({ attribute: false }) components: StatusComponent[] = DEFAULT_COMPONENTS;
  @property({ attribute: false }) incidents: IncidentEntry[] = DEFAULT_INCIDENTS;

  protected createRenderRoot() {
    return this;
  }

  private _stateToTone(s: CompState): 'success' | 'warning' | 'danger' {
    return s === 'warn' ? 'warning' : s === 'err' ? 'danger' : 'success';
  }

  private _miniStrip(state: CompState) {
    // 60-tick uptime strip; if `warn`, last few ticks flicker amber.
    return html`
      <div style="display: flex; gap: 1.5px; align-items: center;">
        ${Array.from({ length: 60 }).map((_, i) => {
          const isRecentWarn = state === 'warn' && i > 56;
          return html`<div
            style="
              width: 3px; height: 18px; border-radius: 1px;
              background: ${isRecentWarn
                ? 'var(--warning-500)'
                : 'color-mix(in oklch, var(--success-500) 70%, var(--ink-3))'};
              opacity: ${isRecentWarn ? 1 : 0.85};
            "
          ></div>`;
        })}
      </div>
    `;
  }

  private _incidentPill(s: IncidentState) {
    const isInfo = s === 'identified' || s === 'monitoring' || s === 'resolved';
    const bg = isInfo
      ? 'color-mix(in oklch, var(--info-500) 18%, var(--ink-3))'
      : 'color-mix(in oklch, var(--warning-500) 18%, var(--ink-3))';
    const color = isInfo ? 'var(--info-400)' : 'var(--warning-400)';
    const border = isInfo
      ? 'color-mix(in oklch, var(--info-500) 30%, transparent)'
      : 'color-mix(in oklch, var(--warning-500) 30%, transparent)';
    return html`
      <span
        style="
          display: inline-flex; align-items: center; gap: 5px;
          align-self: flex-start;
          padding: 2px 8px; border-radius: 999px;
          font-size: 10.5px; letter-spacing: 0.04em;
          font-weight: 500;
          background: ${bg}; color: ${color};
          border: 1px solid ${border};
          width: fit-content;
          text-transform: uppercase;
        "
      >${s}</span>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          padding: 32px 48px 60px;
          display: flex; flex-direction: column; gap: 28px;
          box-sizing: border-box;
        "
      >
        <!-- Header -->
        <header style="display: flex; align-items: center; justify-content: space-between;">
          <lethean-brand-mark size="sm" name=${this.brandName} subdomain=${this.subdomain}></lethean-brand-mark>
          <div style="display: flex; gap: 16px; align-items: center;">
            <span style="font-size: 12px; color: var(--fg-3);">Subscribe to updates</span>
            <button class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-rss" style="font-size: 11px; margin-right: 4px;"></i>RSS
            </button>
          </div>
        </header>

        <!-- Calm headline -->
        <section
          style="
            background: var(--ink-2);
            border: 1px solid color-mix(in oklch, var(--warning-500) 30%, var(--line-2));
            border-radius: 16px;
            padding: 28px 32px;
            position: relative; overflow: hidden;
          "
        >
          <div
            style="
              position: absolute; top: 0; right: 0;
              width: 320px; height: 100%;
              background: radial-gradient(ellipse 60% 80% at 80% 50%, color-mix(in oklch, var(--warning-500) 18%, transparent), transparent);
              pointer-events: none;
            "
          ></div>
          <div
            style="
              position: relative;
              display: grid; grid-template-columns: auto 1fr auto;
              gap: 24px; align-items: center;
            "
          >
            <div
              style="
                width: 72px; height: 72px; border-radius: 16px;
                background: color-mix(in oklch, var(--warning-500) 18%, var(--ink-3));
                border: 1px solid color-mix(in oklch, var(--warning-500) 32%, transparent);
                display: grid; place-items: center; overflow: hidden;
              "
            >
              <lethean-vi pose="peek-left" size="88" style="margin-top: 10px;"></lethean-vi>
            </div>
            <div>
              <div
                style="
                  font-size: 11px; font-family: var(--font-mono);
                  color: var(--warning-400); letter-spacing: 0.08em;
                "
              >${this.headlineEyebrow}</div>
              <h1
                style="
                  font-size: 32px; margin: 6px 0 0;
                  letter-spacing: -0.025em; color: var(--fg-0);
                "
              >
                <span class="editorial" style="font-style: italic;">${this.headlineLeader}</span>${this.headlineRest}
              </h1>
              <p
                style="
                  font-size: 14.5px; color: var(--fg-2);
                  margin: 8px 0 0; line-height: 1.55; max-width: 720px;
                "
              >
                <span style="color: var(--fg-1);">Vi:</span> ${this.viNarration}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: var(--fg-4); letter-spacing: 0.04em;">NEXT UPDATE</div>
              <div class="num tnum" style="font-size: 22px; color: var(--fg-0); margin-top: 2px;">
                ${this.nextUpdate}
              </div>
            </div>
          </div>
        </section>

        <!-- Components grid -->
        <section>
          <div
            style="
              display: flex; justify-content: space-between;
              align-items: baseline; margin-bottom: 14px;
            "
          >
            <h2 style="font-size: 18px; letter-spacing: -0.015em; margin: 0;">All systems</h2>
            <span style="font-size: 12px; color: var(--fg-4);">Updated 30s ago · auto-refresh on</span>
          </div>
          <div
            style="
              background: var(--ink-2); border: 1px solid var(--line-1);
              border-radius: 12px; overflow: hidden;
            "
          >
            ${this.components.map(
              (c, i) => html`
                <div
                  style="
                    display: grid; grid-template-columns: auto 1fr auto auto;
                    gap: 16px; align-items: center;
                    padding: 12px 18px;
                    border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                  "
                >
                  <lethean-status-dot tone=${this._stateToTone(c.state)} pulse size="10"></lethean-status-dot>
                  <div>
                    <div style="font-size: 13.5px; color: var(--fg-0);">${c.name}</div>
                    <div
                      style="
                        font-size: 11.5px;
                        color: ${c.state === 'warn' ? 'var(--warning-400)' : 'var(--fg-4)'};
                        margin-top: 2px;
                      "
                    >${c.note || '—'}</div>
                  </div>
                  ${this._miniStrip(c.state)}
                  <div
                    class="num tnum"
                    style="font-size: 12px; color: var(--fg-2); text-align: right; min-width: 60px;"
                  >
                    ${c.uptime}<span style="color: var(--fg-4);">%</span>
                  </div>
                </div>
              `
            )}
          </div>
        </section>

        <!-- Incident timeline -->
        <section>
          <h2 style="font-size: 18px; letter-spacing: -0.015em; margin: 0 0 14px;">
            Today's incident · ongoing
          </h2>
          <div
            style="
              background: var(--ink-2); border: 1px solid var(--line-1);
              border-radius: 12px;
              padding: 0 22px;
            "
          >
            ${this.incidents.map(
              (row, i) => html`
                <div
                  style="
                    display: grid; grid-template-columns: 70px 110px 1fr;
                    gap: 16px;
                    padding: 16px 0;
                    border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                  "
                >
                  <div
                    class="num"
                    style="font-size: 12px; color: var(--fg-3); font-family: var(--font-mono);"
                  >${row.at}</div>
                  ${this._incidentPill(row.state)}
                  <div style="font-size: 13.5px; color: var(--fg-1); line-height: 1.55;">
                    <span style="color: var(--brand-300); font-weight: 500;">${row.who}:</span>
                    ${row.body}
                  </div>
                </div>
              `
            )}
          </div>
        </section>

        <!-- Footer note -->
        <p
          style="
            font-size: 12.5px; color: var(--fg-3);
            text-align: center; line-height: 1.55;
            max-width: 640px; margin: 0 auto;
          "
        >
          <span class="editorial" style="font-style: italic;">We post-mortem every incident.</span>
          If this affected you and you'd like a credit,
          <a href="#" style="color: var(--brand-300);">tell us</a>. We'll get to it.
        </p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-status-page': LetheanStatusPage;
  }
}
