// <lethean-emails-page> — 3-up grid of 6 transactional email
// templates. Welcome / Renewal warning / Receipt / Security alert /
// Incident resolved / Weekly brief. Each composed with
// <lethean-email-frame> (envelope chrome) wrapping a hero zone +
// body content (key-value table, buttons, list items, Vi sig).
//
// Ported from emails-invoice.jsx > EmailGrid. The hero/body atoms
// (EmailHero / EmailKeyValue / EmailButton / EmailListItem /
// EmailSig) are inlined here as render methods rather than separate
// primitives — they're tightly coupled to the email-frame layout.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../atoms/lethean-vi';
import '../commerce/lethean-email-frame';

type HeroTone = 'neutral' | 'warning' | 'success';

const HERO_BG: Record<HeroTone, string> = {
  warning: 'linear-gradient(180deg, color-mix(in oklch, var(--warning-500) 12%, var(--ink-1)), var(--ink-2))',
  success: 'linear-gradient(180deg, color-mix(in oklch, var(--success-500) 10%, var(--ink-1)), var(--ink-2))',
  neutral: 'linear-gradient(180deg, color-mix(in oklch, var(--brand-500) 10%, var(--ink-1)), var(--ink-2))',
};

const H1_STYLE = 'font-size: 22px; line-height: 1.15; letter-spacing: -0.02em; color: var(--fg-0); margin: 0;';
const LEAD_STYLE = 'font-size: 13.5px; color: var(--fg-2); line-height: 1.55; margin: 8px 0 0;';

type ListTone = 'success' | 'warning' | 'info';

@customElement('lethean-emails-page')
export class LetheanEmailsPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _hero(tone: HeroTone, content: TemplateResult) {
    return html`
      <div
        style="
          padding: 20px 22px 16px;
          background: ${HERO_BG[tone]};
          border-bottom: 1px solid var(--line-1);
          position: relative; overflow: hidden;
        "
      >
        <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; opacity: 0.4;">
          <div
            style="
              width: 56px; height: 56px; border-radius: 12px;
              background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-3));
              display: grid; place-items: center; overflow: hidden;
            "
          >
            <lethean-vi pose="master" size="64" style="margin-top: 6px;"></lethean-vi>
          </div>
        </div>
        <div style="position: relative; z-index: 1; padding-right: 56px;">${content}</div>
      </div>
    `;
  }

  private _body(content: TemplateResult) {
    return html`<div style="padding: 18px; display: flex; flex-direction: column; gap: 8px;">${content}</div>`;
  }

  private _kv(rows: Array<[string, string]>) {
    return html`
      <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 10px;">
        <tbody>
          ${rows.map(
            ([k, v], i) => html`
              <tr style="border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};">
                <td style="padding: 7px 0; color: var(--fg-3); width: 38%;">${k}</td>
                <td
                  style="
                    padding: 7px 0; color: var(--fg-0);
                    font-family: ${/[£\d]/.test(v) ? 'var(--font-mono)' : 'inherit'};
                  "
                >${v}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private _btn(label: string, primary = false, icon?: string) {
    const cls = primary ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    const extra = primary ? '' : 'border: 1px solid var(--line-2);';
    return html`
      <button class=${cls} style="width: 100%; justify-content: center; ${extra}">
        ${icon ? html`<i class="fa-solid fa-${icon}" style="font-size: 11px; margin-right: 4px;"></i>` : ''}
        ${label}
      </button>
    `;
  }

  private _listItem(icon: string, tone: ListTone, content: TemplateResult | string) {
    const color = tone === 'success' ? 'var(--success-400)' : tone === 'warning' ? 'var(--warning-400)' : 'var(--info-400)';
    return html`
      <div
        style="
          display: flex; gap: 10px; padding: 10px 0;
          border-top: 1px solid var(--line-1);
          font-size: 13px; color: var(--fg-1); line-height: 1.5;
        "
      >
        <i class="fa-solid fa-${icon}" style="font-size: 12px; color: ${color}; margin-top: 4px;"></i>
        <span>${content}</span>
      </div>
    `;
  }

  private _sig() {
    return html`
      <div
        style="
          margin-top: 12px; padding-top: 12px;
          border-top: 1px solid var(--line-1);
          display: flex; align-items: center; gap: 10px;
        "
      >
        <div
          style="
            width: 26px; height: 26px; border-radius: 7px;
            background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-3));
            border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
            display: grid; place-items: center; overflow: hidden;
          "
        >
          <lethean-vi pose="master" size="32" style="margin-top: 3px;"></lethean-vi>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11.5px; color: var(--fg-1); font-weight: 500;">Vi · Host UK</div>
          <div style="font-size: 10px; color: var(--fg-4);">Reply to this email to talk back. I read everything.</div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          padding: 28px;
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 18px; box-sizing: border-box;
        "
      >
        <!-- 1. Welcome -->
        <lethean-email-frame
          subject="Welcome to Host UK, Sam"
          from="vi@host.uk.com"
          preview="Your sites are live, your mailbox is ready, and I'll be here whenever you need me."
          eyebrow="ONBOARDING"
        >
          ${this._hero('neutral', html`
            <h1 style=${H1_STYLE}>You're in.</h1>
            <p style=${LEAD_STYLE}>
              Welcome, Sam. Everything you bought is set up — <span class="num">hookway.co.uk</span>
              is live, your mailbox is ready, your bio-link page is at
              <span class="num">link.host.uk.com/sam</span>.
            </p>
          `)}
          ${this._body(html`
            ${this._kv([
              ['Site', 'hookway.co.uk · Standard hosting'],
              ['Mail', 'sam@hookway.co.uk · 5 GB'],
              ['Trial ends', "03 Nov 2025 · I'll remind you"],
            ])}
            ${this._btn('Open your control panel', true)}
            ${this._sig()}
          `)}
        </lethean-email-frame>

        <!-- 2. Renewal warning -->
        <lethean-email-frame
          subject="Your domain renews in 7 days"
          from="vi@host.uk.com"
          preview="lethean.host · £18.40 · auto-renew is off · acting only on your say-so"
          eyebrow="RENEWAL"
          tone="warning"
        >
          ${this._hero('warning', html`
            <h1 style=${H1_STYLE}>One thing waits on you.</h1>
            <p style=${LEAD_STYLE}>
              <span class="num">lethean.host</span> renews on <strong>10 October</strong>.
              Auto-renew is off, so I'll let it lapse unless you tell me otherwise.
            </p>
          `)}
          ${this._body(html`
            <div
              style="
                background: var(--ink-1); border: 1px solid var(--line-2);
                border-radius: 8px; padding: 14px; margin-bottom: 16px;
              "
            >
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <div>
                  <div style="color: var(--fg-3); font-size: 11.5px;">12-month renewal</div>
                  <div class="num" style="color: var(--fg-0); margin-top: 2px;">lethean.host</div>
                </div>
                <div class="num tnum" style="color: var(--fg-0); font-size: 18px;">£18.40</div>
              </div>
            </div>
            ${this._btn('Renew now', true)}
            ${this._btn('Turn auto-renew on')}
            ${this._sig()}
          `)}
        </lethean-email-frame>

        <!-- 3. Receipt -->
        <lethean-email-frame
          subject="Receipt · INV-2025-0094 · £24.40"
          from="billing@host.uk.com"
          preview="Paid 04 Oct 2025 · Mastercard ·· 4421 · attached PDF"
          eyebrow="RECEIPT"
        >
          ${this._hero('neutral', html`
            <h1 style=${H1_STYLE}>Paid. Thanks, Sam.</h1>
            <p style=${LEAD_STYLE}>
              <span class="num">£24.40</span> charged to Mastercard ending
              <span class="num">4421</span>. Full PDF attached for your records.
            </p>
          `)}
          ${this._body(html`
            ${this._kv([
              ['Invoice', 'INV-2025-0094'],
              ['Period', '01 Oct – 31 Oct 2025'],
              ['Sites', 'hookway.co.uk · ofm-staging'],
              ['VAT (20%)', '£4.07'],
              ['Total', '£24.40'],
            ])}
            ${this._btn('Download PDF', true, 'download')}
            ${this._sig()}
          `)}
        </lethean-email-frame>

        <!-- 4. Security alert -->
        <lethean-email-frame
          subject="Your password was reset"
          from="vi@host.uk.com"
          preview="From a new device · 04 Oct 14:22 · London IP · was this you?"
          eyebrow="SECURITY"
          tone="warning"
        >
          ${this._hero('warning', html`
            <h1 style=${H1_STYLE}>Was this you?</h1>
            <p style=${LEAD_STYLE}>
              Someone reset your password from <strong>Chrome on macOS · London</strong>
              at <span class="num">14:22 BST today</span>.
            </p>
          `)}
          ${this._body(html`
            ${this._kv([
              ['When', '04 Oct 2025 · 14:22 BST'],
              ['Where', 'London, UK · 81.140.42.18'],
              ['Device', 'Chrome 129 · macOS'],
            ])}
            ${this._btn('Yes, that was me', true)}
            ${this._btn("It wasn't me — secure my account")}
            ${this._sig()}
          `)}
        </lethean-email-frame>

        <!-- 5. Incident resolved -->
        <lethean-email-frame
          subject="hookway.co.uk is back up"
          from="vi@host.uk.com"
          preview="Down for 2m 14s · failed health check on worker-3 · auto-failover engaged"
          eyebrow="INCIDENT · RESOLVED"
          tone="success"
        >
          ${this._hero('success', html`
            <h1 style=${H1_STYLE}>Back to green.</h1>
            <p style=${LEAD_STYLE}>
              <span class="num">hookway.co.uk</span> was down for
              <strong>2 minutes 14 seconds</strong> just now. I noticed at the first
              failed check and failed over to the standby — everything's serving normally again.
            </p>
          `)}
          ${this._body(html`
            ${this._kv([
              ['Outage start', '14:02:11 BST'],
              ['Resolved', '14:04:25 BST'],
              ['Cause', 'worker-3 ran out of memory · auto-restarted'],
              ['Visitors affected', '≈ 18 (3 saw a 503)'],
            ])}
            ${this._btn('Read the post-mortem', true)}
            ${this._sig()}
          `)}
        </lethean-email-frame>

        <!-- 6. Weekly brief -->
        <lethean-email-frame
          subject="Vi's weekly brief · 04 Oct"
          from="vi@host.uk.com"
          preview="3 things I did, 1 thing waits on you, 0 things to worry about"
          eyebrow="WEEKLY"
        >
          ${this._hero('neutral', html`
            <h1 style=${H1_STYLE}>The week, briefly.</h1>
            <p style=${LEAD_STYLE}>
              <span class="editorial" style="font-style: italic;">Quiet week.</span>
              Three sites, all green, no surprises.
            </p>
          `)}
          ${this._body(html`
            ${this._listItem('shield-check', 'success', 'Renewed SSL on 3 sites · valid through Jan 2026')}
            ${this._listItem('wave-pulse', 'info', 'Scaled hookway.co.uk 2→4 workers during a HN spike · scaled back at quiet')}
            ${this._listItem('database', 'info', 'Backed up everything · 412 MB total · stored 14 days')}
            ${this._listItem('clock', 'warning', html`
              <strong style="color: var(--fg-0);">lethean.host renews in 6 days.</strong>
              Auto-renew is off — you'll need to act.
            `)}
            ${this._btn('Open the brief', true)}
            ${this._sig()}
          `)}
        </lethean-email-frame>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-emails-page': LetheanEmailsPage;
  }
}
