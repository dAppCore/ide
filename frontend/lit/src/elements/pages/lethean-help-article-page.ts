// <lethean-help-article-page> — long-form help article template.
// Breadcrumb · 240px sticky TOC sidebar · 720px article body · 240px
// "on this page + related" right rail. Article body content is inlined
// from help-blog-changelog.jsx > HelpArticle (DKIM/SPF/DMARC writeup)
// to demonstrate typography + callouts + code blocks.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../feedback/lethean-callout';

const SIDEBAR_ITEMS: Array<[string, boolean]> = [
  ['Email basics', false],
  ['MX records explained', false],
  ['Setting up DKIM, SPF, DMARC', true],
  ['DMARC reporting & alignment', false],
  ['Custom domain mailboxes', false],
  ['Forwarders & aliases', false],
  ['Catch-all addresses', false],
  ['Migrating from cPanel mail', false],
  ['Migrating from Google Workspace', false],
];

@customElement('lethean-help-article-page')
export class LetheanHelpArticlePage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _codeBlock(content: string) {
    return html`
      <pre
        style="
          padding: 16px 20px;
          background: var(--ink-2); border: 1px solid var(--line-2);
          border-radius: 8px;
          font-family: var(--font-mono); font-size: 12.5px; color: var(--fg-0);
          overflow: auto; line-height: 1.6;
          margin: 0 0 22px;
        "
      >${content}</pre>
    `;
  }

  private _inlineCode(text: string) {
    return html`<code
      style="
        font-family: var(--font-mono); color: var(--brand-200);
        background: var(--ink-2); padding: 2px 6px; border-radius: 3px;
      "
    >${text}</code>`;
  }

  render() {
    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <!-- breadcrumb -->
        <div
          style="
            padding: 20px 56px 0;
            font-size: 12px; color: var(--fg-3);
            display: flex; gap: 8px;
            font-family: var(--font-mono); letter-spacing: 0.04em;
          "
        >
          <a href="#" style="color: var(--fg-4);">HELP</a>
          <span style="color: var(--fg-5);">/</span>
          <a href="#" style="color: var(--fg-4);">EMAIL & DNS</a>
          <span style="color: var(--fg-5);">/</span>
          <span style="color: var(--fg-1);">SETTING UP DKIM, SPF, DMARC</span>
        </div>

        <section
          style="
            padding: 32px 56px 64px;
            display: grid; grid-template-columns: 240px 1fr 240px;
            gap: 48px;
          "
        >
          <!-- sidebar TOC -->
          <aside style="position: sticky; top: 90px; align-self: flex-start;">
            <div
              style="
                font-size: 10.5px; font-family: var(--font-mono);
                color: var(--fg-4); letter-spacing: 0.08em;
                margin-bottom: 12px;
              "
            >EMAIL & DNS</div>
            <ul
              style="
                list-style: none; padding: 0; margin: 0;
                display: flex; flex-direction: column; gap: 4px;
              "
            >
              ${SIDEBAR_ITEMS.map(
                ([t, active]) => html`
                  <li>
                    <a
                      href="#"
                      style="
                        display: block; padding: 6px 12px; border-radius: 5px;
                        font-size: 13px;
                        color: ${active ? 'var(--fg-0)' : 'var(--fg-2)'};
                        background: ${active ? 'var(--ink-2)' : 'transparent'};
                        border-left: 2px solid ${active ? 'var(--brand-400)' : 'transparent'};
                        text-decoration: none;
                      "
                    >${t}</a>
                  </li>
                `
              )}
            </ul>
          </aside>

          <!-- body -->
          <article style="max-width: 720px; min-width: 0;">
            <div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--brand-300); letter-spacing: 0.08em;
                margin-bottom: 14px;
              "
            >EMAIL & DNS · 6 MIN READ · UPDATED 14 MAR 2026</div>

            <h1
              style="
                font-size: 40px; letter-spacing: -0.03em;
                line-height: 1.1; margin: 0 0 18px;
              "
            >
              Setting up DKIM, SPF, and DMARC
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">
                properly.
              </span>
            </h1>

            <p style="font-size: 16px; color: var(--fg-1); line-height: 1.7; margin: 0 0 18px;">
              Three records, three jobs. SPF tells the world which servers are
              allowed to send email on your behalf. DKIM signs each outgoing
              message. DMARC tells receiving servers what to do if SPF or DKIM
              fails — and asks them to email you reports.
            </p>
            <p style="font-size: 16px; color: var(--fg-1); line-height: 1.7; margin: 0 0 26px;">
              If you set Host Mail up through onboarding, Vi has already done
              all three. This article is for people who want to know what was
              added and why — or who are setting up a custom sending domain
              by hand.
            </p>

            <h2 style="font-size: 22px; color: var(--fg-0); margin: 36px 0 10px; letter-spacing: -0.02em;">
              1 · The SPF record
            </h2>
            <p style="font-size: 15.5px; color: var(--fg-1); line-height: 1.7; margin: 0 0 16px;">
              Add a single TXT record at the apex of your domain (the bare
              ${this._inlineCode('@')} entry):
            </p>
            ${this._codeBlock('@   TXT   "v=spf1 include:_spf.host.uk.com ~all"')}

            <lethean-callout kind="vi" title="Vi adds this for you">
              If you connected your domain in onboarding, this record is already in place.
              You can verify it in Settings → Email → Sending domain.
            </lethean-callout>

            <h2 style="font-size: 22px; color: var(--fg-0); margin: 36px 0 10px; letter-spacing: -0.02em;">
              2 · The DKIM record
            </h2>
            <p style="font-size: 15.5px; color: var(--fg-1); line-height: 1.7; margin: 0 0 16px;">
              DKIM uses a public key. We generate one per sending domain and
              rotate monthly. The DNS record points at our key server:
            </p>
            ${this._codeBlock('hk1._domainkey   CNAME   hk1._domainkey.host.uk.com.')}

            <h2 style="font-size: 22px; color: var(--fg-0); margin: 36px 0 10px; letter-spacing: -0.02em;">
              3 · The DMARC record
            </h2>
            <p style="font-size: 15.5px; color: var(--fg-1); line-height: 1.7; margin: 0 0 16px;">
              We start everyone at ${this._inlineCode('p=quarantine')} with a 100% sample.
              Once we've watched alignment hold for two weeks, Vi will offer to bump
              you to ${this._inlineCode('p=reject')}.
            </p>
            ${this._codeBlock(`_dmarc   TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@host.uk.com;
                 pct=100; aspf=s; adkim=s"`)}

            <lethean-callout kind="warn" title="Don't paste two SPF records">
              DNS only allows one SPF record per domain. If you already send via
              Mailgun or Postmark, merge the includes into a single record. Vi
              will spot the conflict during the connect step and offer the
              merged version.
            </lethean-callout>

            <h2 style="font-size: 22px; color: var(--fg-0); margin: 36px 0 10px; letter-spacing: -0.02em;">
              Verifying it worked
            </h2>
            <p style="font-size: 15.5px; color: var(--fg-1); line-height: 1.7; margin: 0 0 16px;">
              Send a test email to ${this._inlineCode('check@host.uk.com')}.
              Vi replies in under a minute with a per-record breakdown.
            </p>

            <!-- feedback -->
            <div
              style="
                margin-top: 48px; padding-top: 24px;
                border-top: 1px solid var(--line-1);
                display: flex; justify-content: space-between; align-items: center;
              "
            >
              <div style="font-size: 13px; color: var(--fg-2);">Was this helpful?</div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm">👍 Yes</button>
                <button class="btn btn-secondary btn-sm">👎 No, suggest an edit</button>
              </div>
            </div>
          </article>

          <!-- right rail -->
          <aside style="position: sticky; top: 90px; align-self: flex-start;">
            <div
              style="
                font-size: 10.5px; font-family: var(--font-mono);
                color: var(--fg-4); letter-spacing: 0.08em;
                margin-bottom: 12px;
              "
            >ON THIS PAGE</div>
            <ul
              style="
                list-style: none; padding: 0; margin: 0;
                display: flex; flex-direction: column; gap: 6px;
                font-size: 12.5px; color: var(--fg-3);
              "
            >
              <li>1 · The SPF record</li>
              <li>2 · The DKIM record</li>
              <li style="color: var(--brand-300);">3 · The DMARC record</li>
              <li>Verifying it worked</li>
            </ul>
            <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid var(--line-1);">
              <div
                style="
                  font-size: 10.5px; font-family: var(--font-mono);
                  color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 10px;
                "
              >RELATED</div>
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
                <a href="#" style="color: var(--fg-2); text-decoration: none;">DMARC reporting & alignment</a>
                <a href="#" style="color: var(--fg-2); text-decoration: none;">Custom domain mailboxes</a>
                <a href="#" style="color: var(--fg-2); text-decoration: none;">Migrating from Google Workspace</a>
              </div>
            </div>
          </aside>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-help-article-page': LetheanHelpArticlePage;
  }
}
