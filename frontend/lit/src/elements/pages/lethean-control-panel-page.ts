// <lethean-control-panel-page> — host.uk.com signed-in control panel.
// 280px left rail (brand mark · Vi status · cmd+K · 7-item nav ·
// account at bottom) + main canvas (greeting · brief 3-up · sites
// 3-up with sparklines · activity feed + quick actions split) +
// optional 380px Vi conversation panel (header · messages · composer).
//
// Toggle Vi panel via the `vi-open` attribute. Ported from
// control-panel.jsx — single page-element with private renderers.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface BriefAction {
  label: string;
  primary?: boolean;
}

const BRIEF_CARDS: Array<{
  tone: 'warning' | 'success' | 'info';
  time: string;
  title: string;
  body: string;
  actions: BriefAction[];
  done?: boolean;
}> = [
  {
    tone: 'warning',
    time: '06:42',
    title: 'lethean.host renews in 6 days',
    body: "Auto-renew is off. £18.40 for 12 months at current rate. I won't act unless you say.",
    actions: [
      { label: 'Renew now', primary: true },
      { label: 'Turn auto-renew on' },
      { label: 'Let it lapse' },
    ],
  },
  {
    tone: 'success',
    time: '03:11',
    title: 'SSL renewed on 3 sites',
    body: 'Cert-bot ran clean for hookway.co.uk, lethean.host, and ofm-staging. New certs valid through Jan 2026.',
    actions: [{ label: 'View certs' }],
    done: true,
  },
  {
    tone: 'info',
    time: '02:30',
    title: 'Traffic up 34% on hookway.co.uk',
    body: 'Spike came from a Hacker News thread. I scaled the worker pool from 2→4. Costs +£0.80/day. Will scale back at quiet.',
    actions: [{ label: 'See thread' }, { label: 'Pin scale' }],
    done: true,
  },
];

const TONE_COLOR: Record<'warning' | 'success' | 'info', string> = {
  warning: 'var(--warning-400)',
  success: 'var(--success-400)',
  info: 'var(--info-400)',
};

const SITES = [
  { domain: 'hookway.co.uk', stack: 'Host UK · Mail · Analytics', uptime: '99.998', response: 114, sparkData: [80, 60, 90, 70, 85, 95, 65, 75, 88, 92, 70, 85], lastDeploy: '2d ago', warn: '' },
  { domain: 'lethean.host', stack: 'Lethean Core · Forge', uptime: '99.94', response: 203, sparkData: [60, 65, 80, 75, 70, 60, 55, 65, 72, 80, 78, 70], lastDeploy: '6h ago', warn: 'Renewal in 6 days' },
  { domain: 'ofm-staging.host.uk.com', stack: 'OFM Studio · staging', uptime: '99.87', response: 92, sparkData: [40, 50, 45, 60, 55, 70, 65, 60, 55, 50, 60, 55], lastDeploy: '14m ago', warn: '' },
];

const NAV_ITEMS = [
  { icon: 'house', label: 'Today', active: true, count: null as number | null },
  { icon: 'globe', label: 'Sites', active: false, count: 3 },
  { icon: 'at', label: 'Domains', active: false, count: 5 },
  { icon: 'envelope', label: 'Email', active: false, count: 12 },
  { icon: 'credit-card', label: 'Billing', active: false, count: null },
  { icon: 'wave-pulse', label: 'Activity', active: false, count: null },
  { icon: 'circle-question', label: 'Help', active: false, count: null },
];

interface ActivityItem {
  who: 'vi' | 'you';
  time: string;
  text: string;
  icon: string;
}

const ACTIVITY: ActivityItem[] = [
  { who: 'vi', time: '09:08', text: 'Renewed SSL on hookway.co.uk · valid through 02 Jan 2026', icon: 'shield-check' },
  { who: 'vi', time: '06:42', text: 'Drafted renewal reminder for lethean.host · waiting on you', icon: 'clock' },
  { who: 'vi', time: '03:11', text: 'Scaled hookway.co.uk worker pool 2→4 · traffic spike', icon: 'wave-pulse' },
  { who: 'you', time: 'Yesterday 17:22', text: 'Deployed ofm-staging.host.uk.com from main · 14m ago', icon: 'code-branch' },
  { who: 'vi', time: 'Yesterday 09:00', text: 'Sent invoice INV-2025-0094 to hello@hookway.co.uk · paid', icon: 'envelope' },
  { who: 'vi', time: 'Yesterday 04:00', text: 'Backed up 3 sites · 412 MB total · stored 14d', icon: 'database' },
];

const QUICK_ACTIONS = [
  { icon: 'circle-plus', label: 'New site', hint: 'Domain + hosting in one go' },
  { icon: 'envelope-circle-check', label: 'Add mailbox', hint: 'On any domain you own' },
  { icon: 'code-branch', label: 'Deploy from Git', hint: 'Connect a repo' },
  { icon: 'database', label: 'Restore backup', hint: 'Last 14 days available' },
  { icon: 'users', label: 'Invite teammate', hint: 'Up to 5 on Standard' },
];

@customElement('lethean-control-panel-page')
export class LetheanControlPanelPage extends LitElement {
  @property({ type: Boolean, attribute: 'vi-open' }) viOpen = true;

  protected createRenderRoot() {
    return this;
  }

  private _viAvatar(size = 44) {
    return html`
      <div
        style="
          width: ${size}px; height: ${size}px; border-radius: ${Math.round(size * 0.27)}px;
          background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
          border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2));
          display: grid; place-items: center; overflow: hidden; flex-shrink: 0;
        "
      >
        <i class="fa-solid fa-feather" style="font-size: ${Math.round(size * 0.55)}px; color: var(--brand-300);"></i>
      </div>
    `;
  }

  private _renderLeftRail() {
    return html`
      <aside
        style="
          border-right: 1px solid var(--line-1);
          background: var(--ink-1);
          padding: 20px 16px;
          display: flex; flex-direction: column; gap: 20px;
          position: sticky; top: 0; align-self: start;
          min-height: 100%;
        "
      >
        <div
          style="
            padding: 0 4px;
            font-family: var(--font-display); font-size: 16px;
            font-weight: 600; color: var(--fg-0); letter-spacing: -0.02em;
          "
        >
          Host UK
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--fg-4); margin-left: 6px;">/ control</span>
        </div>

        <div
          style="
            background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2));
            border: 1px solid color-mix(in oklch, var(--brand-500) 24%, var(--line-1));
            border-radius: 12px;
            padding: 14px 14px 12px;
            position: relative;
          "
        >
          <div
            style="
              position: absolute; top: 12px; right: 12px;
              width: 7px; height: 7px; border-radius: 50%;
              background: var(--success-400);
              box-shadow: 0 0 0 3px color-mix(in oklch, var(--success-500) 24%, transparent);
            "
          ></div>
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            ${this._viAvatar(44)}
            <div style="min-width: 0;">
              <div style="font-size: 13px; font-weight: 600; color: var(--fg-0); letter-spacing: -0.01em;">
                Vi · always on
              </div>
              <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 2px; line-height: 1.45;">
                Watching 3 sites. All green.
                <span style="color: var(--warning-400);">1 thing waits on you.</span>
              </div>
            </div>
          </div>
        </div>

        <button
          style="
            display: flex; align-items: center; gap: 10px;
            height: 38px; padding: 0 12px;
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 8px; color: var(--fg-3);
            font-size: 13px; text-align: left;
          "
        >
          <i class="fa-solid fa-sparkles" style="font-size: 13px; color: var(--brand-300);"></i>
          <span style="flex: 1;">Ask Vi anything…</span>
          <kbd
            style="
              font-size: 10.5px; padding: 2px 6px; border-radius: 4px;
              background: var(--ink-3); border: 1px solid var(--line-2);
              color: var(--fg-3); font-family: var(--font-mono);
            "
          >⌘K</kbd>
        </button>

        <nav style="display: flex; flex-direction: column; gap: 1px;">
          <div
            style="
              font-size: 10.5px; font-weight: 500; color: var(--fg-4);
              text-transform: uppercase; letter-spacing: 0.08em;
              padding: 0 8px; margin-bottom: 6px;
            "
          >Workspace</div>
          ${NAV_ITEMS.map(
            (item) => html`
              <a
                style="
                  display: flex; align-items: center; gap: 11px;
                  padding: 8px 10px; border-radius: 6px;
                  background: ${item.active ? 'var(--ink-3)' : 'transparent'};
                  color: ${item.active ? 'var(--fg-0)' : 'var(--fg-2)'};
                  font-size: 13.5px; font-weight: ${item.active ? 500 : 400};
                "
              >
                <i
                  class="fa-solid fa-${item.icon}"
                  style="font-size: 13px; color: ${item.active ? 'var(--brand-300)' : 'var(--fg-3)'};"
                ></i>
                <span style="flex: 1;">${item.label}</span>
                ${item.count != null
                  ? html`<span style="font-size: 11px; color: var(--fg-4); font-family: var(--font-mono); font-variant-numeric: tabular-nums;">${item.count}</span>`
                  : html``}
              </a>
            `
          )}
        </nav>

        <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
          <div class="divider"></div>
          <div style="display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 6px;">
            <div
              style="
                width: 28px; height: 28px; border-radius: 50%;
                background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
                display: grid; place-items: center;
                font-size: 11px; font-weight: 600; color: var(--brand-200);
                border: 1px solid var(--line-2);
              "
            >SM</div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 12.5px; font-weight: 500; color: var(--fg-0);">Sam Mooney</div>
              <div style="font-size: 11px; color: var(--fg-4);">Hookway Limited</div>
            </div>
            <i class="fa-solid fa-ellipsis" style="font-size: 12px; color: var(--fg-4);"></i>
          </div>
        </div>
      </aside>
    `;
  }

  private _sectionHeader(eyebrow: string, title: string, rightSlot?: TemplateResult) {
    return html`
      <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;">
        <div>
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              letter-spacing: 0.08em;
              color: var(--brand-300); font-weight: 500;
            "
          >${eyebrow}</div>
          <h2 style="font-size: 19px; margin: 4px 0 0; letter-spacing: -0.02em;">${title}</h2>
        </div>
        ${rightSlot ?? html``}
      </div>
    `;
  }

  private _briefCard(card: typeof BRIEF_CARDS[number]) {
    return html`
      <article
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 12px;
          padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
          position: relative; overflow: hidden;
        "
      >
        <div
          style="
            position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
            background: ${TONE_COLOR[card.tone]};
            opacity: ${card.done ? 0.4 : 1};
          "
        ></div>
        <header style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${TONE_COLOR[card.tone]};"></div>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-3);">${card.time}</span>
            ${card.done
              ? html`
                  <span
                    style="
                      font-size: 10.5px; padding: 1px 6px; border-radius: 4px;
                      background: var(--ink-3); color: var(--fg-3);
                      font-family: var(--font-mono); letter-spacing: 0.04em;
                    "
                  >DONE</span>
                `
              : html``}
          </div>
        </header>
        <div>
          <h3 style="font-size: 15px; line-height: 1.3; color: var(--fg-0); letter-spacing: -0.015em; margin: 0;">${card.title}</h3>
          <p style="font-size: 13px; color: var(--fg-2); margin: 6px 0 0; line-height: 1.5;">${card.body}</p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto;">
          ${card.actions.map(
            (a) => html`
              <button
                class=${a.primary ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                style="font-size: 12px; ${a.primary ? '' : 'border: 1px solid var(--line-2);'}"
              >${a.label}</button>
            `
          )}
        </div>
      </article>
    `;
  }

  private _siteCard(s: typeof SITES[number]) {
    const max = Math.max(...s.sparkData);
    const points = s.sparkData
      .map((v, i) => {
        const x = (i / (s.sparkData.length - 1)) * 100;
        const y = 24 - (v / max) * 22;
        return `${x},${y}`;
      })
      .join(' ');
    const gradId = `spark-${s.domain.replace(/[^a-z]+/g, '-')}`;
    return html`
      <article
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 12px;
          padding: 16px;
          display: flex; flex-direction: column; gap: 14px;
        "
      >
        <header style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <div style="min-width: 0;">
            <div
              style="
                font-size: 14px; color: var(--fg-0); font-weight: 500;
                font-family: var(--font-mono); letter-spacing: -0.01em;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
              "
            >${s.domain}</div>
            <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 3px;">${s.stack}</div>
          </div>
          <div
            style="
              display: flex; align-items: center; gap: 5px;
              padding: 3px 8px; border-radius: 999px;
              background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3));
              border: 1px solid color-mix(in oklch, var(--success-500) 28%, transparent);
            "
          >
            <div style="width: 5px; height: 5px; border-radius: 50%; background: var(--success-400);"></div>
            <span style="font-size: 10.5px; color: var(--success-400); letter-spacing: 0.04em; font-weight: 500;">LIVE</span>
          </div>
        </header>
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" style="width: 100%; height: 24px;">
          <defs>
            <linearGradient id=${gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="var(--brand-400)" stop-opacity="0.35"></stop>
              <stop offset="100%" stop-color="var(--brand-400)" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          <polyline points=${points} fill="none" stroke="var(--brand-300)" stroke-width="1.2"></polyline>
          <polygon points="0,24 ${points} 100,24" fill="url(#${gradId})"></polygon>
        </svg>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 12px;">
          <div>
            <div style="color: var(--fg-4); font-size: 10.5px; letter-spacing: 0.04em;">UPTIME</div>
            <div class="num tnum" style="color: var(--fg-0); font-size: 15px; margin-top: 2px;">
              ${s.uptime}<span style="color: var(--fg-3); font-size: 11px;">%</span>
            </div>
          </div>
          <div>
            <div style="color: var(--fg-4); font-size: 10.5px; letter-spacing: 0.04em;">RESPONSE</div>
            <div class="num tnum" style="color: var(--fg-0); font-size: 15px; margin-top: 2px;">
              ${s.response}<span style="color: var(--fg-3); font-size: 11px;">ms</span>
            </div>
          </div>
          <div>
            <div style="color: var(--fg-4); font-size: 10.5px; letter-spacing: 0.04em;">DEPLOY</div>
            <div class="num tnum" style="color: var(--fg-0); font-size: 15px; margin-top: 2px;">${s.lastDeploy}</div>
          </div>
        </div>
        ${s.warn
          ? html`
              <div
                style="
                  display: flex; align-items: center; gap: 6px;
                  font-size: 11.5px; color: var(--warning-400);
                  padding: 6px 10px; border-radius: 6px;
                  background: color-mix(in oklch, var(--warning-500) 12%, transparent);
                  border: 1px solid color-mix(in oklch, var(--warning-500) 28%, transparent);
                "
              >
                <i class="fa-solid fa-circle-exclamation" style="font-size: 11px;"></i>
                ${s.warn}
              </div>
            `
          : html``}
      </article>
    `;
  }

  private _renderActivity() {
    return html`
      <div>
        ${this._sectionHeader(
          'ACTIVITY',
          'Last 24 hours',
          html`<a style="font-size: 13px; color: var(--brand-300);">Full log →</a>`
        )}
        <div
          style="
            margin-top: 14px;
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 12px;
            overflow: hidden;
          "
        >
          ${ACTIVITY.map(
            (item, i) => html`
              <div
                style="
                  display: flex; gap: 12px; padding: 12px 16px;
                  border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                  align-items: center;
                "
              >
                <div
                  style="
                    width: 26px; height: 26px; border-radius: 6px;
                    background: ${item.who === 'vi'
                      ? 'color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))'
                      : 'var(--ink-3)'};
                    border: 1px solid var(--line-1);
                    display: grid; place-items: center; flex-shrink: 0;
                  "
                >
                  <i
                    class="fa-solid fa-${item.icon}"
                    style="font-size: 11px; color: ${item.who === 'vi' ? 'var(--brand-200)' : 'var(--fg-2)'};"
                  ></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 13px; color: var(--fg-1); line-height: 1.4;">
                    <span
                      style="
                        font-family: var(--font-mono); font-size: 11px;
                        color: ${item.who === 'vi' ? 'var(--brand-300)' : 'var(--fg-3)'};
                        margin-right: 8px; letter-spacing: 0.04em;
                      "
                    >${item.who === 'vi' ? 'VI' : 'YOU'}</span>
                    ${item.text}
                  </div>
                </div>
                <div style="font-size: 11px; color: var(--fg-4); font-family: var(--font-mono); flex-shrink: 0;">
                  ${item.time}
                </div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderQuickActions() {
    return html`
      <div>
        ${this._sectionHeader('QUICK', 'Common tasks')}
        <div
          style="
            margin-top: 14px;
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 12px;
            overflow: hidden;
          "
        >
          ${QUICK_ACTIONS.map(
            (a, i) => html`
              <button
                style="
                  display: flex; align-items: center; gap: 12px;
                  padding: 11px 14px; width: 100%;
                  background: transparent; border: none;
                  border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                  text-align: left; cursor: pointer;
                "
              >
                <div
                  style="
                    width: 28px; height: 28px; border-radius: 6px;
                    background: var(--ink-3);
                    border: 1px solid var(--line-1);
                    display: grid; place-items: center;
                  "
                >
                  <i class="fa-solid fa-${a.icon}" style="font-size: 12px; color: var(--fg-2);"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 13px; color: var(--fg-0); font-weight: 500;">${a.label}</div>
                  <div style="font-size: 11px; color: var(--fg-4); margin-top: 1px;">${a.hint}</div>
                </div>
                <i class="fa-solid fa-chevron-right" style="font-size: 11px; color: var(--fg-4);"></i>
              </button>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderMain() {
    return html`
      <main style="padding: 32px 36px 48px; display: flex; flex-direction: column; gap: 28px; min-width: 0;">
        <header style="display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;">
          <div>
            <div
              style="
                font-size: 12.5px; color: var(--fg-3);
                font-family: var(--font-mono); letter-spacing: 0.04em;
              "
            >FRIDAY · 4 OCT · 09:14 GMT</div>
            <h1 style="font-size: 32px; margin: 8px 0 0; letter-spacing: -0.03em;">Good morning, Sam.</h1>
            <p style="font-size: 15px; color: var(--fg-2); margin: 6px 0 0; max-width: 560px;">
              <span class="editorial" style="font-style: italic; color: var(--fg-1);">Quiet night.</span>
              One thing needs you, two I handled, four I'm watching. Here's the brief.
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-bell" style="font-size: 12px; margin-right: 6px;"></i>
              Quiet hours
            </button>
            <button class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-circle-plus" style="font-size: 12px; margin-right: 6px;"></i>
              New site
            </button>
          </div>
        </header>

        <section>
          ${this._sectionHeader(
            "VI'S BRIEF",
            'Overnight, this happened',
            html`
              <button class="btn btn-ghost btn-sm">
                <i class="fa-solid fa-arrow-rotate-right" style="font-size: 11px; margin-right: 6px;"></i>
                Refresh brief
              </button>
            `
          )}
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 14px;">
            ${BRIEF_CARDS.map((c) => this._briefCard(c))}
          </div>
        </section>

        <section>
          ${this._sectionHeader(
            'SITES',
            'Three sites, all green',
            html`<a style="font-size: 13px; color: var(--brand-300);">View all →</a>`
          )}
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 14px;">
            ${SITES.map((s) => this._siteCard(s))}
          </div>
        </section>

        <section style="display: grid; grid-template-columns: 2fr 1fr; gap: 18px;">
          ${this._renderActivity()}
          ${this._renderQuickActions()}
        </section>
      </main>
    `;
  }

  private _viMessage(who: 'vi' | 'you', body: TemplateResult) {
    const isVi = who === 'vi';
    return html`
      <div style="display: flex; gap: 10px; flex-direction: ${isVi ? 'row' : 'row-reverse'};">
        ${isVi
          ? this._viAvatar(24)
          : html`
              <div
                style="
                  width: 24px; height: 24px; border-radius: 6px;
                  background: var(--ink-3); border: 1px solid var(--line-2);
                  display: grid; place-items: center;
                  font-size: 9.5px; font-weight: 600; color: var(--fg-2); flex-shrink: 0;
                "
              >SM</div>
            `}
        <div
          style="
            max-width: 82%;
            background: ${isVi ? 'var(--ink-2)' : 'color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))'};
            border: 1px solid ${isVi
              ? 'var(--line-1)'
              : 'color-mix(in oklch, var(--brand-500) 25%, var(--line-2))'};
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 13px; color: var(--fg-1); line-height: 1.5;
          "
        >${body}</div>
      </div>
    `;
  }

  private _renderViPanel() {
    return html`
      <aside
        style="
          border-left: 1px solid var(--line-1);
          background: var(--ink-1);
          display: flex; flex-direction: column;
          min-height: 100%;
        "
      >
        <header
          style="
            padding: 16px 18px; border-bottom: 1px solid var(--line-1);
            display: flex; align-items: center; gap: 10px;
          "
        >
          ${this._viAvatar(30)}
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 500; color: var(--fg-0);">Vi</div>
            <div style="font-size: 11px; color: var(--success-400);">● Listening</div>
          </div>
          <button
            style="
              width: 28px; height: 28px; border-radius: 6px;
              background: transparent; border: 1px solid var(--line-2);
              display: grid; place-items: center; color: var(--fg-3);
              cursor: pointer;
            "
          >
            <i class="fa-solid fa-xmark" style="font-size: 11px;"></i>
          </button>
        </header>
        <div
          style="
            flex: 1; padding: 20px 18px;
            display: flex; flex-direction: column; gap: 16px;
            overflow: auto;
          "
        >
          ${this._viMessage('you', html`What's slow on hookway.co.uk?`)}
          ${this._viMessage(
            'vi',
            html`
              <p style="margin: 0 0 10px;">Two things stand out today:</p>
              <ul style="padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; margin: 0;">
                <li style="display: flex; gap: 8px;">
                  <span style="color: var(--warning-400); font-family: var(--font-mono); font-size: 12px; flex-shrink: 0;">1.</span>
                  <span>
                    <span class="num" style="color: var(--fg-0);">/blog/2024-recap</span> — image payload is 3.4MB.
                    Could be 280KB. I can convert to AVIF and ship it for you.
                  </span>
                </li>
                <li style="display: flex; gap: 8px;">
                  <span style="color: var(--info-400); font-family: var(--font-mono); font-size: 12px; flex-shrink: 0;">2.</span>
                  <span>
                    The <span class="num" style="color: var(--fg-0);">/api/comments</span> endpoint averages 412ms.
                    Database query — needs an index on
                    <span class="num">(post_id, created_at)</span>.
                  </span>
                </li>
              </ul>
              <div
                style="
                  margin-top: 14px;
                  background: var(--ink-2); border: 1px solid var(--line-2);
                  border-radius: 8px; padding: 12px;
                "
              >
                <div style="font-size: 12px; color: var(--fg-3); margin-bottom: 8px;">I can do both right now:</div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <button class="btn btn-primary btn-sm" style="justify-content: flex-start;">
                    <i class="fa-solid fa-image" style="font-size: 11px; margin-right: 6px;"></i>
                    Convert images on /blog/2024-recap
                  </button>
                  <button class="btn btn-secondary btn-sm" style="justify-content: flex-start;">
                    <i class="fa-solid fa-database" style="font-size: 11px; margin-right: 6px;"></i>
                    Add the index (needs ~30s downtime)
                  </button>
                </div>
              </div>
            `
          )}
          ${this._viMessage('you', html`Do the images. Schedule the index for Sunday 03:00.`)}
          ${this._viMessage(
            'vi',
            html`
              <div style="display: flex; align-items: center; gap: 8px; color: var(--fg-2); font-size: 13px;">
                <span style="display: inline-flex; gap: 3px;">
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--brand-300); opacity: 0.4;"></span>
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--brand-300); opacity: 0.7;"></span>
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--brand-300);"></span>
                </span>
                Converting 14 images…
              </div>
            `
          )}
        </div>
        <div style="padding: 14px; border-top: 1px solid var(--line-1);">
          <div
            style="
              background: var(--ink-2); border: 1px solid var(--line-2);
              border-radius: 10px; padding: 10px 12px;
            "
          >
            <textarea
              placeholder="Ask Vi to do something…"
              rows="2"
              style="
                width: 100%; background: transparent; border: none;
                color: var(--fg-0); font-family: inherit; font-size: 13.5px;
                resize: none; outline: none; box-sizing: border-box;
              "
            ></textarea>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <div style="display: flex; gap: 6px;">
                <button
                  style="
                    width: 24px; height: 24px; border-radius: 5px;
                    background: transparent; border: 1px solid var(--line-2);
                    display: grid; place-items: center; color: var(--fg-3); cursor: pointer;
                  "
                >
                  <i class="fa-solid fa-paperclip" style="font-size: 10px;"></i>
                </button>
                <button
                  style="
                    width: 24px; height: 24px; border-radius: 5px;
                    background: transparent; border: 1px solid var(--line-2);
                    display: grid; place-items: center; color: var(--fg-3); cursor: pointer;
                  "
                >
                  <i class="fa-solid fa-microphone" style="font-size: 10px;"></i>
                </button>
              </div>
              <button class="btn btn-primary btn-sm">
                Send
                <i class="fa-solid fa-arrow-up" style="font-size: 10px; margin-left: 6px;"></i>
              </button>
            </div>
          </div>
          <div style="font-size: 10.5px; color: var(--fg-4); margin-top: 6px; text-align: center; line-height: 1.4;">
            Vi reads your account data only. She never reads site content unless you ask.
          </div>
        </div>
      </aside>
    `;
  }

  render() {
    const cols = this.viOpen ? '280px 1fr 380px' : '280px 1fr';
    return html`
      <div
        class="surface"
        data-brand="hostuk"
        style="
          width: 100%; min-height: 100%;
          display: grid;
          grid-template-columns: ${cols};
          background: var(--ink-0);
        "
      >
        ${this._renderLeftRail()}
        ${this._renderMain()}
        ${this.viOpen ? this._renderViPanel() : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-control-panel-page': LetheanControlPanelPage;
  }
}
