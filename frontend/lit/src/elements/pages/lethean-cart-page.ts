// <lethean-cart-page> — order.host.uk.com basket. Topbar (step 1),
// 3-line cart with quantity steppers + per-line totals, upsell row,
// trust strip, sticky order-summary card with Vi peek + bundle-saving
// callout + continue-to-payment CTA. Ported from cart-checkout.jsx >
// CartView (+ Row + UpsellRow inlined as private renderers).

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../atoms/lethean-vi';
import '../commerce/lethean-order-topbar';

interface CartItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  qty: number;
  icon: string;
}

const ITEMS: CartItem[] = [
  { id: 'family', name: 'Host UK Family', desc: 'All six products · 5 seats · 10 GB', price: 24, qty: 1, icon: 'boxes-stacked' },
  { id: 'analytics-bump', name: 'Host Analytics — extra domains', desc: '5 additional domains, no cookies', price: 4, qty: 1, icon: 'chart-line' },
  { id: 'addon-storage', name: 'Storage top-up', desc: '+50 GB pooled across services', price: 6, qty: 1, icon: 'database' },
];

const UPSELLS = [
  { name: 'Host Trust', desc: 'Add social proof on top of any site', price: 7, icon: 'shield-check' },
  { name: 'Host Notify', desc: 'Push without an email address', price: 6, icon: 'bell' },
];

const gbp = (n: number) => `£${n.toFixed(2)}`;

@customElement('lethean-cart-page')
export class LetheanCartPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    const sub = ITEMS.reduce((a, b) => a + b.price * b.qty, 0);
    const vat = sub * 0.2;
    const total = sub + vat;

    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <lethean-order-topbar step="1"></lethean-order-topbar>

        <div style="padding: 40px 56px; display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px;">
          <div>
            <div style="margin-bottom: 24px;">
              <div class="pill" style="margin-bottom: 10px;">Step 1 of 2 · Review</div>
              <h1 style="font-size: 32px; letter-spacing: -0.025em; margin: 0;">Your basket</h1>
              <p style="font-size: 14px; color: var(--fg-3); margin: 6px 0 0;">
                Three lines, monthly billing. Change anything before you continue.
              </p>
            </div>

            <div class="card" style="padding: 0;">
              ${ITEMS.map(
                (it, i) => html`
                  <div
                    style="
                      padding: 20px 22px;
                      display: grid; grid-template-columns: 44px 1fr auto auto;
                      gap: 18px; align-items: center;
                      border-bottom: ${i < ITEMS.length - 1 ? '1px solid var(--line-1)' : 'none'};
                    "
                  >
                    <div
                      style="
                        width: 44px; height: 44px; border-radius: 10px;
                        background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
                        display: grid; place-items: center;
                        border: 1px solid color-mix(in oklch, var(--brand-500) 30%, transparent);
                      "
                    >
                      <i class="fa-solid fa-${it.icon}" style="font-size: 16px; color: var(--brand-200);"></i>
                    </div>
                    <div>
                      <div style="font-size: 14.5px; font-weight: 500; color: var(--fg-0);">${it.name}</div>
                      <div style="font-size: 12.5px; color: var(--fg-3); margin-top: 2px;">${it.desc}</div>
                    </div>
                    <div
                      style="
                        display: flex; align-items: center;
                        border: 1px solid var(--line-2); border-radius: 8px; height: 32px;
                      "
                    >
                      <button class="btn-ghost" style="width: 30px; height: 30px; border-radius: 6px; background: transparent; border: 0; color: var(--fg-2); cursor: pointer;">
                        <i class="fa-solid fa-minus" style="font-size: 11px;"></i>
                      </button>
                      <div class="tnum" style="width: 28px; text-align: center; font-size: 13px;">${it.qty}</div>
                      <button class="btn-ghost" style="width: 30px; height: 30px; border-radius: 6px; background: transparent; border: 0; color: var(--fg-2); cursor: pointer;">
                        <i class="fa-solid fa-plus" style="font-size: 11px;"></i>
                      </button>
                    </div>
                    <div
                      class="tnum"
                      style="font-size: 14.5px; font-weight: 600; color: var(--fg-0); min-width: 80px; text-align: right;"
                    >
                      ${gbp(it.price * it.qty)}<span style="color: var(--fg-3); font-weight: 400; font-size: 12px;">
                        /mo
                      </span>
                    </div>
                  </div>
                `
              )}
            </div>

            <!-- Upsell row -->
            <div style="margin-top: 28px;">
              <div
                style="
                  font-size: 12px; font-weight: 500;
                  color: var(--fg-2); margin-bottom: 10px; letter-spacing: 0.02em;
                "
              >OFTEN ADDED · BUNDLE & SAVE 15%</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                ${UPSELLS.map(
                  (i) => html`
                    <div class="card" style="padding: 16px; display: flex; gap: 12px; align-items: center;">
                      <div
                        style="
                          width: 36px; height: 36px; border-radius: 8px;
                          background: var(--ink-3); border: 1px solid var(--line-2);
                          display: grid; place-items: center;
                        "
                      >
                        <i class="fa-solid fa-${i.icon}" style="font-size: 14px; color: var(--brand-200);"></i>
                      </div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; font-weight: 500; color: var(--fg-0);">${i.name}</div>
                        <div style="font-size: 11.5px; color: var(--fg-3);">${i.desc}</div>
                      </div>
                      <button class="btn btn-secondary btn-sm">+ ${gbp(i.price)}</button>
                    </div>
                  `
                )}
              </div>
            </div>

            <!-- Trust -->
            <div
              style="
                margin-top: 24px;
                display: flex; gap: 18px; align-items: center;
                padding: 16px 18px;
                background: color-mix(in oklch, var(--success-500) 7%, var(--ink-2));
                border: 1px solid color-mix(in oklch, var(--success-500) 22%, transparent);
                border-radius: 12px;
              "
            >
              <i class="fa-solid fa-shield-check" style="font-size: 20px; color: var(--success-400);"></i>
              <div>
                <div style="font-size: 13px; font-weight: 500; color: var(--fg-0);">14-day money back. No questions.</div>
                <div style="font-size: 12px; color: var(--fg-2); margin-top: 1px;">
                  UK consumer rights respected. Cancel from your dashboard, any time.
                </div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div style="position: relative;">
            <div class="card-elev" style="padding: 24px; position: sticky; top: 24px;">
              <div style="font-size: 14px; font-weight: 600; color: var(--fg-0); margin-bottom: 16px;">
                Order summary
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
                ${this._row('Subtotal', gbp(sub), false, true)}
                ${this._row('VAT (20%)', gbp(vat), false, true)}
                ${this._row('Discount', '—', false, true)}
                <div class="divider" style="margin: 6px 0;"></div>
                ${this._row('Total · monthly', gbp(total), true, false)}
              </div>
              <div
                style="
                  margin-top: 16px; padding: 12px 14px;
                  background: var(--ink-1); border-radius: 8px;
                  font-size: 12px; color: var(--fg-2);
                  border: 1px solid var(--line-1);
                "
              >
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
                  <i class="fa-solid fa-tag" style="font-size: 11px; color: var(--gold-400);"></i>
                  <span style="font-weight: 500; color: var(--fg-1);">Bundle saved you ${gbp(8)} /mo</span>
                </div>
                <span style="color: var(--fg-3);">Buying these three separately would be ${gbp(42)} /mo.</span>
              </div>
              <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 18px;">
                Continue to payment
                <i class="fa-solid fa-arrow-right" style="font-size: 12px; margin-left: 4px;"></i>
              </button>
              <div
                style="
                  display: flex; justify-content: center; gap: 10px;
                  margin-top: 14px; font-size: 11px; color: var(--fg-4);
                "
              >
                <i class="fa-solid fa-lock" style="font-size: 11px;"></i>
                Encrypted · Stripe · 3DS-2 ready
              </div>
            </div>

            <!-- Tiny Vi peek -->
            <div style="position: absolute; right: -10px; top: -42px; transform: rotate(8deg);">
              <lethean-vi pose="peek-right" size="88"></lethean-vi>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _row(label: string, value: string, bold: boolean, muted: boolean) {
    return html`
      <div style="display: flex; justify-content: space-between;">
        <span style="color: ${muted ? 'var(--fg-3)' : 'var(--fg-1)'};">${label}</span>
        <span
          class="tnum"
          style="
            color: ${bold ? 'var(--fg-0)' : 'var(--fg-1)'};
            font-weight: ${bold ? 600 : 400};
            font-size: ${bold ? '16px' : '13.5px'};
          "
        >${value}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-cart-page': LetheanCartPage;
  }
}
