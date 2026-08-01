// <lethean-mobile-checkout-page> — touch-density mobile checkout for
// order.host.uk.com. Top bar (back, title, lock), 3-step progress
// pill, scrollable body (summary card + Apple Pay + or-divider + card
// form + save-card checkbox + reassurance strip), sticky pay CTA.
//
// Designed to render inside <lethean-ios-frame> at narrow widths.
// Ported from mobile.jsx > MobileCheckout.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-raven';
import '../forms/lethean-input';

@customElement('lethean-mobile-checkout-page')
export class LetheanMobileCheckoutPage extends LitElement {
  @property({ type: Number }) step = 2;
  @property({ type: Number }) totalSteps = 3;
  @property() stepLabel = 'PAYMENT';
  @property({ type: Number }) total = 40.8;
  @property() summaryItems = '3 items · monthly';
  @property() summaryDetail = 'Family · Analytics extra · Storage 50 GB';

  protected createRenderRoot() {
    return this;
  }

  render() {
    const formattedTotal = this.total.toFixed(2);
    return html`
      <div
        class="surface"
        style="
          width: 100%; height: 100%;
          background: var(--ink-0);
          overflow: hidden;
          display: flex; flex-direction: column;
          box-sizing: border-box;
        "
      >
        <!-- Mobile top bar -->
        <div
          style="
            padding: 10px 16px;
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid var(--line-1);
          "
        >
          <button
            style="
              width: 32px; height: 32px; border-radius: 8px;
              background: var(--ink-2); border: 1px solid var(--line-1);
              display: grid; place-items: center; color: var(--fg-1);
              cursor: pointer; padding: 0;
            "
          >
            <i class="fa-solid fa-chevron-left" style="font-size: 13px;"></i>
          </button>
          <div style="display: flex; align-items: center; gap: 6px;">
            <lethean-raven size="12" color="var(--brand-300)"></lethean-raven>
            <span style="font-size: 13px; font-weight: 600;">Checkout</span>
          </div>
          <button
            style="
              width: 32px; height: 32px; border-radius: 8px;
              background: transparent; border: 0; color: var(--fg-2);
              cursor: pointer; padding: 0;
            "
          >
            <i class="fa-solid fa-lock" style="font-size: 12px;"></i>
          </button>
        </div>

        <!-- Step pill -->
        <div style="padding: 12px 16px 0;">
          <div style="display: flex; gap: 6px;">
            ${Array.from({ length: this.totalSteps }, (_, i) => i + 1).map(
              (s) => html`<div
                style="
                  flex: 1; height: 3px; border-radius: 2px;
                  background: ${s <= this.step ? 'var(--brand-400)' : 'var(--ink-3)'};
                "
              ></div>`
            )}
          </div>
          <div
            style="
              font-size: 11.5px; color: var(--fg-3);
              margin-top: 8px; font-family: var(--font-mono);
            "
          >STEP ${this.step} OF ${this.totalSteps} · ${this.stepLabel}</div>
        </div>

        <!-- Body — scrollable -->
        <div style="flex: 1; overflow-y: auto; padding: 12px 16px 16px;">
          <h1 style="font-size: 22px; letter-spacing: -0.02em; margin: 0 0 4px;">
            Almost there.
          </h1>
          <p style="font-size: 12.5px; color: var(--fg-3); margin: 0 0 18px;">
            You can change everything later from your dashboard.
          </p>

          <!-- Summary card collapsed -->
          <div
            style="
              background: var(--ink-2);
              border: 1px solid var(--line-1);
              border-radius: 12px;
              padding: 14px;
              margin-bottom: 18px;
            "
          >
            <div
              style="
                display: flex; justify-content: space-between;
                align-items: center; margin-bottom: 8px;
              "
            >
              <div style="font-size: 12.5px; font-weight: 500; color: var(--fg-1);">
                ${this.summaryItems}
              </div>
              <span class="tnum" style="font-size: 17px; font-weight: 600; color: var(--fg-0);">
                £${formattedTotal}
              </span>
            </div>
            <div style="font-size: 11px; color: var(--fg-3);">${this.summaryDetail}</div>
          </div>

          <!-- Apple Pay -->
          <button
            style="
              width: 100%; height: 48px;
              background: var(--fg-0); color: var(--ink-0);
              border-radius: 10px; border: 0;
              font-weight: 600; font-size: 14px;
              display: flex; align-items: center; justify-content: center; gap: 6px;
              margin-bottom: 14px;
              cursor: pointer; font-family: inherit;
            "
          >
            <i class="fa-brands fa-apple" style="font-size: 16px;"></i> Pay
          </button>

          <div
            style="
              display: flex; align-items: center; gap: 10px;
              font-size: 11px; color: var(--fg-4);
              margin: 0 auto 14px; justify-content: center;
            "
          >
            <div style="flex: 1; height: 1px; background: var(--line-1);"></div>
            or pay by card
            <div style="flex: 1; height: 1px; background: var(--line-1);"></div>
          </div>

          <!-- Card form mobile -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label class="label">Card number</label>
              <div style="position: relative;">
                <input
                  class="input tnum"
                  value="4242 4242 4242 4242"
                  style="height: 48px; font-size: 15px; padding-right: 50px;"
                />
                <span
                  style="
                    position: absolute; right: 12px; top: 50%;
                    transform: translateY(-50%);
                    font-size: 10px; color: var(--fg-4);
                    font-family: var(--font-mono);
                  "
                >VISA</span>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label class="label">Expiry</label>
                <input class="input tnum" value="12 / 28" style="height: 48px; font-size: 15px;" />
              </div>
              <div>
                <label class="label">CVC</label>
                <input class="input tnum" value="•••" style="height: 48px; font-size: 15px;" />
              </div>
            </div>
            <div>
              <label class="label">Postcode</label>
              <input class="input" value="BS5 9TJ" style="height: 48px; font-size: 15px;" />
            </div>
          </div>

          <label
            style="
              display: flex; gap: 10px; align-items: flex-start;
              margin-top: 14px;
              font-size: 12.5px; color: var(--fg-2); line-height: 1.4;
            "
          >
            <input
              type="checkbox"
              checked
              style="accent-color: var(--brand-500); margin-top: 2px;"
            />
            Save this card for renewals.
          </label>

          <div
            style="
              margin-top: 18px; padding: 12px;
              background: color-mix(in oklch, var(--success-500) 7%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--success-500) 22%, transparent);
              border-radius: 10px;
              font-size: 11.5px; color: var(--fg-2); line-height: 1.5;
              display: flex; gap: 10px;
            "
          >
            <i
              class="fa-solid fa-shield-check"
              style="font-size: 14px; color: var(--success-400); margin-top: 1px;"
            ></i>
            14-day money back. Cancel any time. UK consumer rights respected.
          </div>
        </div>

        <!-- Sticky CTA -->
        <div
          style="
            padding: 12px 16px;
            border-top: 1px solid var(--line-1);
            background: var(--ink-1);
          "
        >
          <button
            class="btn btn-primary"
            style="width: 100%; height: 50px; font-size: 15px; border-radius: 12px;"
          >
            <i class="fa-solid fa-lock" style="font-size: 12px; margin-right: 4px;"></i>
            Pay £${formattedTotal} now
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mobile-checkout-page': LetheanMobileCheckoutPage;
  }
}
