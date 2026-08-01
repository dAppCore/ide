// <lethean-product-mail-page> — mail.host.uk.com webmail product page.
// Inbox-mock led: hero with full inbox layout (sidebar / list /
// preview), deliverability proof (SPF/DKIM/DMARC/MX cards), Vi
// assistant 3-up (triage/draft/audit), domains pill row, CTA.
// Inlines minimal nav + footer. Ported from products-set2.jsx >
// ProductMail.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const MAILS = [
  { from: 'Lina Holm', subj: "Re: Tuesday's brief", time: '09:42', unread: true, label: 'Team' },
  { from: 'Vi · Host UK', subj: 'Your DMARC record passed alignment', time: '09:18', unread: true, label: 'Vi' },
  { from: 'Patel & Co invoice', subj: 'Invoice #INV-2026-0124 due', time: '08:31', unread: false, label: 'Finance' },
  { from: 'Newsletter · Stratechery', subj: "AI's new bottlenecks", time: '07:00', unread: false, label: '' },
  { from: 'Anson Le', subj: 'weekend reading', time: 'Yest', unread: false, label: '' },
  { from: 'GitHub', subj: '[host-uk/platform] PR #2841 merged', time: 'Yest', unread: false, label: 'Eng' },
];

const FOLDERS = [
  { name: 'Inbox', count: 4, active: true },
  { name: 'Sent', count: 0 },
  { name: 'Drafts', count: 2 },
  { name: 'Archive', count: 0 },
  { name: 'Spam', count: 0 },
  { name: 'Trash', count: 0 },
];

const LABELS: Array<[string, string]> = [
  ['Team', 'var(--brand-400)'],
  ['Vi', 'var(--brand-300)'],
  ['Finance', 'var(--gold-400)'],
  ['Eng', 'var(--success-400)'],
];

const DELIVERABILITY = [
  { tag: 'SPF', state: 'PASS', note: 'v=spf1 include:_spf.host.uk.com ~all' },
  { tag: 'DKIM', state: 'PASS', note: 'key=2048 · selector=hk1 · rotation: monthly' },
  { tag: 'DMARC', state: 'PASS', note: 'p=quarantine · pct=100 · 100% alignment 7d' },
  { tag: 'MX', state: 'PASS', note: 'mx1.host.uk.com · mx2.host.uk.com' },
];

const VI_HELPS = [
  { title: 'Triage', body: "Vi proposes labels, archives the obvious, and surfaces what's actually for you." },
  { title: 'Draft', body: 'Reply in your voice. She studies your last 200 sent emails and matches the tone.' },
  { title: 'Audit', body: 'Catches phishy senders, broken DKIM, and forwarded credentials before you click.' },
];

const DOMAINS = ['@yourcompany.com', '@yourname.uk', '@yourshop.co.uk', '@yourbrand.studio', '@host.uk.com'];

@customElement('lethean-product-mail-page')
export class LetheanProductMailPage extends LitElement {
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

  private _renderInboxMock() {
    return html`
      <div
        style="
          background: var(--ink-2); border: 1px solid var(--line-2);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 16px 40px color-mix(in oklch, #000 28%, transparent);
        "
      >
        <div style="display: grid; grid-template-columns: 180px 1fr 280px; height: 460px;">
          <div
            style="
              background: var(--ink-1);
              border-right: 1px solid var(--line-1);
              padding: 14px;
              display: flex; flex-direction: column; gap: 4px;
            "
          >
            ${FOLDERS.map(
              (f) => html`
                <div
                  style="
                    padding: 6px 10px; border-radius: 5px;
                    background: ${f.active ? 'var(--ink-3)' : 'transparent'};
                    color: ${f.active ? 'var(--fg-0)' : 'var(--fg-2)'};
                    font-size: 12.5px;
                    display: flex; justify-content: space-between; align-items: center;
                  "
                >
                  <span>${f.name}</span>
                  ${f.count
                    ? html`<span class="num tnum" style="font-size: 11px; color: var(--fg-4); font-family: var(--font-mono);">${f.count}</span>`
                    : html``}
                </div>
              `
            )}
            <div
              style="
                margin-top: 14px; font-size: 10px;
                font-family: var(--font-mono); color: var(--fg-4);
                letter-spacing: 0.06em; padding: 0 10px 6px;
              "
            >LABELS</div>
            ${LABELS.map(
              ([n, c]) => html`
                <div style="padding: 5px 10px; font-size: 12px; color: var(--fg-2); display: flex; gap: 8px; align-items: center;">
                  <span style="width: 7px; height: 7px; border-radius: 2px; background: ${c};"></span>
                  ${n}
                </div>
              `
            )}
          </div>
          <div style="border-right: 1px solid var(--line-1); overflow: hidden;">
            ${MAILS.map(
              (m, i) => html`
                <div
                  style="
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--line-1);
                    background: ${i === 1 ? 'color-mix(in oklch, var(--brand-500) 8%, transparent)' : 'transparent'};
                    display: grid; grid-template-columns: 1fr 60px; gap: 10px;
                  "
                >
                  <div>
                    <div
                      style="
                        font-size: 12.5px;
                        color: ${m.unread ? 'var(--fg-0)' : 'var(--fg-2)'};
                        font-weight: ${m.unread ? 600 : 400};
                      "
                    >${m.from}</div>
                    <div style="font-size: 12px; color: var(--fg-2); margin-top: 2px;">${m.subj}</div>
                    ${m.label
                      ? html`
                          <span
                            style="
                              margin-top: 4px; display: inline-block;
                              padding: 1px 7px; border-radius: 3px;
                              background: var(--ink-3); border: 1px solid var(--line-2);
                              font-size: 10px; color: var(--fg-3); font-family: var(--font-mono);
                            "
                          >${m.label}</span>
                        `
                      : html``}
                  </div>
                  <div style="font-size: 10.5px; color: var(--fg-4); font-family: var(--font-mono); text-align: right;">${m.time}</div>
                </div>
              `
            )}
          </div>
          <div style="padding: 18px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 13px; color: var(--fg-0); font-weight: 500;">
              Your DMARC record passed alignment
            </div>
            <div style="font-size: 11px; color: var(--fg-4); font-family: var(--font-mono);">
              vi@host.uk.com · 09:18
            </div>
            <div style="font-size: 12px; color: var(--fg-1); line-height: 1.55;">
              Hi Anson — your DMARC record now reports 100% alignment for the past 7 days.
              SPF passing, DKIM passing, p=quarantine in effect. Nothing for you to do.
              <br /><br />
              Want me to bump it to p=reject next week?
            </div>
            <div
              style="
                margin-top: 8px; padding: 10px;
                background: var(--ink-1); border: 1px solid var(--line-1);
                border-radius: 6px;
                font-family: var(--font-mono); font-size: 10.5px;
                color: var(--fg-3); line-height: 1.6;
              "
            >
              v=DMARC1; p=quarantine;<br />
              rua=mailto:dmarc@host.uk.com;<br />
              pct=100; aspf=s; adkim=s
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _renderHero() {
    return html`
      <section style="padding: 72px 56px 48px;">
        <div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 56px; align-items: center;">
          <div style="display: flex; flex-direction: column; gap: 22px;">
            <div
              style="
                display: inline-flex; align-self: flex-start; gap: 8px; align-items: center;
                padding: 5px 12px; border-radius: 999px;
                background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
                border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
                font-size: 11.5px; color: var(--brand-200);
                font-family: var(--font-mono); letter-spacing: 0.04em;
              "
            >
              <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
              HOST MAIL · WEBMAIL · DELIVERABILITY YOU CAN AUDIT
            </div>
            <h1 style="font-size: 54px; letter-spacing: -0.04em; line-height: 1.04; margin: 0;">
              Email that arrives.<br />
              <span class="editorial" style="font-style: italic; color: var(--brand-200); font-size: 56px;">
                And looks like work.
              </span>
            </h1>
            <p style="font-size: 17px; color: var(--fg-2); line-height: 1.55; max-width: 480px; margin: 0;">
              Webmail with proper DKIM/SPF/DMARC. Vi checks your sending domain on day one
              and writes you the DNS records.
            </p>
            <div style="display: flex; gap: 12px;">
              <button class="btn btn-primary btn-lg">Set up a mailbox</button>
              <button class="btn btn-secondary btn-lg">See deliverability</button>
            </div>
          </div>
          ${this._renderInboxMock()}
        </div>
      </section>
    `;
  }

  private _renderDeliverability() {
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
            DELIVERABILITY
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            The boring stuff,
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">set up properly.</span>
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            Vi runs DKIM, SPF, DMARC checks on every domain you connect, and writes you the
            exact DNS records to paste.
          </p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
          ${DELIVERABILITY.map(
            (c) => html`
              <div
                style="
                  padding: 18px; border-radius: 10px;
                  background: var(--ink-2); border: 1px solid var(--line-1);
                "
              >
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-size: 13px; color: var(--fg-0); font-family: var(--font-mono); font-weight: 600;">${c.tag}</span>
                  <span style="font-size: 10.5px; color: var(--success-400); font-family: var(--font-mono); letter-spacing: 0.06em;">● ${c.state}</span>
                </div>
                <div
                  style="
                    font-size: 11px; color: var(--fg-3);
                    font-family: var(--font-mono); line-height: 1.5;
                    word-break: break-all;
                  "
                >${c.note}</div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderViAssistant() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="max-width: 580px; margin-bottom: 36px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;">
            VI IN MAIL
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            An assistant that lives in your inbox.
          </h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
          ${VI_HELPS.map(
            (c) => html`
              <article
                style="
                  padding: 22px; border-radius: 10px;
                  background: var(--ink-2); border: 1px solid var(--line-1);
                "
              >
                <div style="font-size: 16px; color: var(--fg-0); font-weight: 500; letter-spacing: -0.015em;">${c.title}</div>
                <p style="font-size: 13.5px; color: var(--fg-2); margin: 8px 0 0; line-height: 1.55;">${c.body}</p>
              </article>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderDomains() {
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
            DOMAINS
          </div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Your address, your domain.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            anson@yourcompany.com is included on every plan. We'll set the DNS up for you.
          </p>
        </div>
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 12px; padding: 24px;
            display: flex; justify-content: center; gap: 16px;
            font-size: 13px; color: var(--fg-1);
            font-family: var(--font-mono);
            flex-wrap: wrap;
          "
        >
          ${DOMAINS.map(
            (d) => html`
              <span
                style="
                  padding: 6px 14px;
                  background: var(--ink-3); border: 1px solid var(--line-2);
                  border-radius: 999px;
                "
              >${d}</span>
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
            display: grid; grid-template-columns: 1fr auto;
            gap: 32px; align-items: center;
            position: relative; overflow: hidden;
          "
        >
          <div class="brand-glow" style="position: absolute; inset: 0; opacity: 0.6; pointer-events: none;"></div>
          <div style="position: relative; z-index: 1;">
            <h2 style="font-size: 30px; letter-spacing: -0.025em; max-width: 580px; line-height: 1.15; margin: 0;">
              Plain mail.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">Properly delivered.</span>
            </h2>
            <p style="font-size: 14.5px; color: var(--fg-2); margin: 10px 0 0; line-height: 1.55; max-width: 580px;">
              DKIM, SPF, DMARC set up correctly. From £4 per box.
            </p>
          </div>
          <div style="position: relative; z-index: 1;">
            <button class="btn btn-primary btn-lg">Set up your mail</button>
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
        ${this._renderDeliverability()}
        ${this._renderViAssistant()}
        ${this._renderDomains()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-product-mail-page': LetheanProductMailPage;
  }
}
