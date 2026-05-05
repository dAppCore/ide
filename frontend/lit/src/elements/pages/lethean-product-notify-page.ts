// <lethean-product-notify-page> — notify.host.uk.com push product page.
// Timeline-led: hero, 8-event delivery timeline, composer + 3-device
// preview, deliverability stats, CTA. Inlines minimal nav + footer.
// Ported from products-set2.jsx > ProductNotify.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const TIMELINE_EVENTS: Array<{ t: string; actor: string; line: string; state: 'queued' | 'ok' | 'sending' }> = [
  { t: 'T+0ms', actor: 'api', line: 'POST /v1/messages · campaign=order_shipped · audience=12,847', state: 'queued' },
  { t: 'T+12ms', actor: 'vi', line: 'deduped 314 unsubscribed · validated payload · split by platform', state: 'ok' },
  { t: 'T+84ms', actor: 'fcm', line: 'batched 8 412 → fcm.googleapis.com · 6 batches × 1 500', state: 'sending' },
  { t: 'T+117ms', actor: 'apns', line: 'batched 4 121 → api.push.apple.com · ECDSA P-256 token', state: 'sending' },
  { t: 'T+342ms', actor: 'fcm', line: '8 412 sent · 8 402 accepted · 10 invalid (auto-pruned)', state: 'ok' },
  { t: 'T+412ms', actor: 'apns', line: '4 121 sent · 4 098 accepted · 23 BadDeviceToken (auto-pruned)', state: 'ok' },
  { t: 'T+1.4s', actor: 'client', line: '7 281 delivered · ack within 1 200ms', state: 'ok' },
  { t: 'T+12s', actor: 'vi', line: '98.4% delivery rate · CTR running at 4.2% · sample size 12 500+', state: 'ok' },
];

const COMPOSER_FIELDS: Array<[string, string]> = [
  ['TITLE', "Your order's left the warehouse"],
  ['BODY', "Track it from the email, or open the app — Vi will tell you when it's near."],
  ['URL', '{{app_url}}/orders/{{order_id}}'],
  ['ICON', '/static/icon-192.png'],
  ['AUDIENCE', 'segment: customers WHERE last_order > 7d'],
];

const DEVICES = ['iOS', 'Android', 'Web · Chrome'];

const STATE_COLOR: Record<string, string> = {
  ok: 'var(--success-400)',
  sending: 'var(--brand-400)',
  queued: 'var(--fg-4)',
};

@customElement('lethean-product-notify-page')
export class LetheanProductNotifyPage extends LitElement {
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
        <div style="display: flex; gap: 8px;">
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
        style="padding: 72px 56px 48px; position: relative; overflow: hidden;"
      >
        <div style="max-width: 720px; display: flex; flex-direction: column; gap: 22px;">
          <div
            style="
              display: inline-flex; align-self: flex-start; align-items: center; gap: 8px;
              padding: 5px 12px; border-radius: 999px;
              background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              font-size: 11.5px; color: var(--brand-200);
              font-family: var(--font-mono); letter-spacing: 0.04em;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300);"></span>
            HOST NOTIFY · WEB + APP PUSH · DELIVERABILITY YOU CAN AUDIT
          </div>
          <h1 style="font-size: 56px; letter-spacing: -0.04em; line-height: 1.04; margin: 0;">
            Push, that arrives.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              And tells you why if it doesn't.
            </span>
          </h1>
          <p style="font-size: 17px; color: var(--fg-2); line-height: 1.55; max-width: 580px; margin: 0;">
            Web push, iOS, Android. APNs and FCM under the hood, with a delivery timeline
            so honest your support team can copy-paste it back to a customer.
          </p>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-primary btn-lg">Send your first push</button>
            <button class="btn btn-secondary btn-lg">See sample timeline</button>
          </div>
          <div style="display: flex; gap: 22px; margin-top: 8px; font-size: 12px; color: var(--fg-3); font-family: var(--font-mono);">
            ${['98.4% delivery · last 30 days', 'GDPR consent baked in', '10k free pushes / month'].map(
              (p) => html`<span>
                <i class="fa-solid fa-circle-check" style="font-size: 11px; color: var(--success-400); margin-right: 6px;"></i>
                ${p}
              </span>`
            )}
          </div>
        </div>
      </section>
    `;
  }

  private _renderTimeline() {
    return html`
      <section style="padding: 80px 56px;">
        <div style="max-width: 720px; margin-bottom: 36px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >THE DELIVERY TIMELINE</div>
          <h2 style="font-size: 36px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            You can see every push.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              Including why one didn't make it.
            </span>
          </h2>
        </div>
        <div
          style="
            background: var(--ink-2); border: 1px solid var(--line-2);
            border-radius: 14px; padding: 24px;
            font-family: var(--font-mono);
          "
        >
          <div style="font-size: 11px; color: var(--fg-4); letter-spacing: 0.06em; margin-bottom: 18px;">
            CAMPAIGN · order_shipped · 17 Mar 14:32:08
          </div>
          <ol
            style="
              list-style: none; padding: 0; margin: 0;
              display: flex; flex-direction: column; gap: 10px;
              position: relative;
            "
          >
            <div style="position: absolute; left: 78px; top: 0; bottom: 0; width: 1px; background: var(--line-2);"></div>
            ${TIMELINE_EVENTS.map(
              (e) => html`
                <li
                  style="
                    display: grid; grid-template-columns: 70px 24px 1fr 80px;
                    gap: 12px; align-items: center; position: relative;
                  "
                >
                  <span style="color: var(--fg-4); font-size: 11.5px; text-align: right;">${e.t}</span>
                  <span
                    style="
                      width: 12px; height: 12px; border-radius: 999px; justify-self: center;
                      background: ${STATE_COLOR[e.state]};
                      box-shadow: ${e.state === 'sending' ? '0 0 12px var(--brand-400)' : 'none'};
                    "
                  ></span>
                  <span style="font-size: 12.5px; color: var(--fg-1);">
                    <span style="color: var(--brand-300);">${e.actor}</span>
                    <span style="color: var(--fg-4);"> · </span>${e.line}
                  </span>
                  <span
                    style="
                      font-size: 10.5px;
                      color: ${e.state === 'ok' ? 'var(--success-400)' : e.state === 'sending' ? 'var(--brand-300)' : 'var(--fg-4)'};
                      letter-spacing: 0.04em; text-align: right;
                    "
                  >● ${e.state.toUpperCase()}</span>
                </li>
              `
            )}
          </ol>
        </div>
      </section>
    `;
  }

  private _renderComposer() {
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
          >THE COMPOSER</div>
          <h2 style="font-size: 30px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Write once. Show on every device, properly.
          </h2>
          <p style="font-size: 14.5px; color: var(--fg-2); margin: 12px 0 0; line-height: 1.6;">
            One composer, automatic preview for web/iOS/Android. Variables, conditional
            content, A/B at the row level.
          </p>
        </div>
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 28px;">
          <div
            style="
              background: var(--ink-2); border: 1px solid var(--line-2);
              border-radius: 14px; padding: 22px;
            "
          >
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${COMPOSER_FIELDS.map(
                ([k, v]) => html`
                  <div>
                    <div
                      style="
                        font-size: 10.5px; font-family: var(--font-mono);
                        color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 6px;
                      "
                    >${k}</div>
                    <div
                      style="
                        padding: 10px 14px;
                        background: var(--ink-1); border: 1px solid var(--line-1);
                        border-radius: 8px; font-size: 13px; color: var(--fg-0);
                        font-family: ${k === 'URL' || k === 'AUDIENCE' || k === 'ICON'
                          ? 'var(--font-mono)'
                          : 'inherit'};
                      "
                    >${v}</div>
                  </div>
                `
              )}
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${DEVICES.map(
              (os) => html`
                <div style="display: grid; grid-template-columns: 70px 1fr; gap: 12px; align-items: center;">
                  <div
                    style="
                      font-size: 11px; font-family: var(--font-mono);
                      color: var(--fg-4); letter-spacing: 0.06em; text-align: right;
                    "
                  >${os}</div>
                  <div
                    style="
                      background: var(--ink-3);
                      padding: 10px 12px; border-radius: 12px;
                      border: 1px solid var(--line-2);
                      display: grid; grid-template-columns: 32px 1fr 50px;
                      gap: 10px; align-items: center;
                    "
                  >
                    <div style="width: 32px; height: 32px; border-radius: 7px; background: var(--brand-500);"></div>
                    <div>
                      <div style="font-size: 12px; color: var(--fg-0); font-weight: 600;">
                        Your order's left the warehouse
                      </div>
                      <div style="font-size: 11.5px; color: var(--fg-2); margin-top: 2px;">
                        Track it from the email, or open the app…
                      </div>
                    </div>
                    <span style="font-size: 10px; color: var(--fg-4); font-family: var(--font-mono); text-align: right;">now</span>
                  </div>
                </div>
              `
            )}
          </div>
        </div>
      </section>
    `;
  }

  private _renderStrip() {
    const stats: Array<[string, string]> = [
      ['98.4%', 'delivery · 30d'],
      ['12 ms', 'median enqueue'],
      ['6', 'channels per SDK'],
      ['10k', 'free pushes / month'],
    ];
    return html`
      <section style="padding: 48px 56px; background: var(--ink-1);">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; text-align: center;">
          ${stats.map(
            ([n, l]) => html`
              <div>
                <div class="num tnum" style="font-size: 38px; color: var(--fg-0); letter-spacing: -0.03em; font-weight: 600;">${n}</div>
                <div style="font-size: 12px; color: var(--fg-3); margin-top: 6px; font-family: var(--font-mono);">${l}</div>
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
            display: grid; grid-template-columns: 1fr auto;
            gap: 32px; align-items: center;
            position: relative; overflow: hidden;
          "
        >
          <div class="brand-glow" style="position: absolute; inset: 0; opacity: 0.6; pointer-events: none;"></div>
          <div style="position: relative; z-index: 1;">
            <h2 style="font-size: 30px; letter-spacing: -0.025em; max-width: 580px; line-height: 1.15; margin: 0;">
              One SDK.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">Six channels.</span>
            </h2>
            <p style="font-size: 14.5px; color: var(--fg-2); margin: 10px 0 0; line-height: 1.55; max-width: 580px;">
              Web push, iOS, Android, email fallback, in-app inbox, SMS. Pick what you need.
            </p>
          </div>
          <div style="position: relative; z-index: 1;">
            <button class="btn btn-primary btn-lg">Read the SDK docs</button>
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
        ${this._renderTimeline()}
        ${this._renderComposer()}
        ${this._renderStrip()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-product-notify-page': LetheanProductNotifyPage;
  }
}
