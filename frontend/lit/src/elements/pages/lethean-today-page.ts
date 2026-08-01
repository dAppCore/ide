import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../shell/lethean-section-header';
import '../shell/lethean-brief-card';
import '../shell/lethean-mac-segmented';

interface Site {
  domain: string;
  stack: string;
  uptime: string;
  response: string;
  deploy: string;
  warn?: string;
}

interface Activity {
  who: 'Vi' | 'You';
  time: string;
  text: string;
}

const BRIEFS = [
  {
    tone: 'warning' as const,
    time: '06:42',
    heading: 'lethean.host renews in 6 days',
    body: 'Auto-renew is off. £18.40 for 12 months at the current rate.',
    actions: [
      { label: 'Renew now', primary: true },
      { label: 'Auto-renew' },
      { label: 'Let lapse' },
    ],
    shortcut: '⌘1',
    done: false,
  },
  {
    tone: 'success' as const,
    time: '03:11',
    heading: 'SSL renewed on 3 sites · cert-bot ran clean',
    body: 'hookway.co.uk · lethean.host · ofm-staging — valid through 02 Jan 2026.',
    actions: [{ label: 'View certs' }],
    shortcut: '⌘2',
    done: true,
  },
  {
    tone: 'info' as const,
    time: '02:30',
    heading: 'Traffic up 34% on hookway.co.uk',
    body: 'Spike from a Hacker News thread. I scaled workers 2→4 (+£0.80/day). Will scale back at quiet.',
    actions: [{ label: 'See thread' }, { label: 'Pin scale' }],
    shortcut: '⌘3',
    done: true,
  },
];

const SITES: Site[] = [
  {
    domain: 'hookway.co.uk',
    stack: 'Host UK · Mail · Analytics',
    uptime: '99.998',
    response: '114ms',
    deploy: '2d ago',
  },
  {
    domain: 'lethean.host',
    stack: 'Lethean Core · Forge',
    uptime: '99.94',
    response: '203ms',
    deploy: '6h ago',
    warn: 'Renewal in 6d',
  },
  {
    domain: 'ofm-staging.host.uk.com',
    stack: 'OFM Studio · staging',
    uptime: '99.87',
    response: '92ms',
    deploy: '14m ago',
  },
];

const ACTIVITY: Activity[] = [
  { who: 'Vi', time: '09:08', text: 'Renewed SSL on hookway.co.uk · valid through 02 Jan 2026' },
  { who: 'Vi', time: '06:42', text: 'Drafted renewal reminder for lethean.host · waiting on you' },
  { who: 'Vi', time: '03:11', text: 'Scaled hookway.co.uk worker pool 2→4 · traffic spike' },
  { who: 'You', time: 'Yesterday 17:22', text: 'Deployed ofm-staging.host.uk.com from main' },
  { who: 'Vi', time: 'Yesterday 09:00', text: 'Sent invoice INV-2025-0094 · paid' },
];

@customElement('lethean-today-page')
export class LetheanTodayPage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      ${this.renderHeader()}
      <div style="flex: 1; overflow: auto; padding: 0 22px 22px;">
        <div style="padding-top: 14px; display: flex; flex-direction: column; gap: 16px;">
          ${this.renderBriefSection()}
          ${this.renderSitesTable()}
          ${this.renderActivity()}
        </div>
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div
        style="
          padding: 16px 22px 12px;
          border-bottom: 1px solid var(--line-1);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-shrink: 0;
          gap: 12px;
          flex-wrap: wrap;
        "
      >
        <div>
          <div
            style="
              font-size: 11px;
              color: var(--fg-3);
              font-family: var(--font-mono);
              letter-spacing: 0.04em;
            "
          >FRIDAY · 4 OCT · 09:14 GMT</div>
          <h1
            style="
              font-family: var(--font-display, inherit);
              font-size: 22px;
              margin: 4px 0 0;
              font-weight: 600;
              letter-spacing: -0.025em;
              color: var(--fg-0);
            "
          >Good morning, Sam.</h1>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="font-size: 11.5px; color: var(--fg-3);">Sort by</span>
          <lethean-mac-segmented
            .items=${['Time', 'Priority']}
            value="Time"
          ></lethean-mac-segmented>
        </div>
      </div>
    `;
  }

  private renderBriefSection() {
    return html`
      <section>
        <lethean-section-header heading="Vi's brief" subtitle="last 12 hours"></lethean-section-header>
        <div
          class="brief-grid"
          style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;"
        >
          ${BRIEFS.map(
            (b) => html`
              <lethean-brief-card
                tone=${b.tone}
                time=${b.time}
                heading=${b.heading}
                body=${b.body}
                shortcut=${b.shortcut}
                ?done=${b.done}
                .actions=${b.actions}
              ></lethean-brief-card>
            `
          )}
        </div>
      </section>
    `;
  }

  private renderSitesTable() {
    return html`
      <section>
        <lethean-section-header heading="Sites">
          <a slot="trailing" style="font-size: 11.5px; color: var(--brand-300); cursor: pointer;">View all (3)</a>
        </lethean-section-header>
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 6px;
            overflow: hidden;
          "
        >
          <div
            class="sites-row sites-head"
            style="
              display: grid;
              grid-template-columns: 1.4fr 1.6fr 70px 70px 80px 90px;
              font-size: 10.5px;
              font-family: var(--font-mono);
              letter-spacing: 0.04em;
              color: var(--fg-4);
              padding: 7px 12px;
              border-bottom: 1px solid var(--line-1);
              background: var(--ink-1);
            "
          >
            <div>DOMAIN</div>
            <div>STACK</div>
            <div>UPTIME</div>
            <div>RESP.</div>
            <div>DEPLOY</div>
            <div></div>
          </div>
          ${SITES.map(
            (s, i) => html`
              <div
                class="sites-row"
                style="
                  display: grid;
                  grid-template-columns: 1.4fr 1.6fr 70px 70px 80px 90px;
                  font-size: 12px;
                  padding: 8px 12px;
                  align-items: center;
                  border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                "
              >
                <div style="display: flex; align-items: center; gap: 7px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--success-400);"></span>
                  <span style="font-family: var(--font-mono); color: var(--fg-0);">${s.domain}</span>
                </div>
                <div style="color: var(--fg-2);">${s.stack}</div>
                <div style="font-family: var(--font-mono); color: var(--fg-1);">
                  ${s.uptime}<span style="color: var(--fg-4);">%</span>
                </div>
                <div style="font-family: var(--font-mono); color: var(--fg-1);">${s.response}</div>
                <div style="font-family: var(--font-mono); color: var(--fg-2);">${s.deploy}</div>
                <div>
                  ${s.warn
                    ? html`<span
                        style="
                          font-size: 10.5px;
                          padding: 2px 7px;
                          border-radius: 3px;
                          background: color-mix(in oklch, var(--warning-500) 18%, transparent);
                          color: var(--warning-400);
                          border: 1px solid color-mix(in oklch, var(--warning-500) 30%, transparent);
                        "
                      >${s.warn}</span>`
                    : html``}
                </div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private renderActivity() {
    return html`
      <section>
        <lethean-section-header heading="Activity" subtitle="last 24h"></lethean-section-header>
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 6px;
            overflow: hidden;
          "
        >
          ${ACTIVITY.map(
            (it, i) => html`
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 7px 12px;
                  border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                  font-size: 12px;
                "
              >
                <span
                  style="
                    font-family: var(--font-mono);
                    font-size: 10px;
                    color: ${it.who === 'Vi' ? 'var(--brand-300)' : 'var(--fg-3)'};
                    padding: 1px 6px;
                    border-radius: 3px;
                    background: ${it.who === 'Vi'
                      ? 'color-mix(in oklch, var(--brand-500) 14%, transparent)'
                      : 'var(--ink-3)'};
                    border: 1px solid ${it.who === 'Vi'
                      ? 'color-mix(in oklch, var(--brand-500) 28%, transparent)'
                      : 'var(--line-1)'};
                    letter-spacing: 0.04em;
                    flex-shrink: 0;
                  "
                >${it.who.toUpperCase()}</span>
                <span
                  style="
                    color: var(--fg-1);
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  "
                >${it.text}</span>
                <span
                  style="
                    font-family: var(--font-mono);
                    font-size: 11px;
                    color: var(--fg-4);
                    flex-shrink: 0;
                  "
                >${it.time}</span>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-today-page': LetheanTodayPage;
  }
}
