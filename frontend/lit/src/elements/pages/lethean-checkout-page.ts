// <lethean-checkout-page> — single-page checkout with progressive
// disclosure. 3 sections (account, billing address, payment method)
// each in a card with status pill, plus terms note, plus sticky
// "paying today" sidebar. Ported from cart-checkout.jsx > CheckoutView
// (+ Section helper inlined).

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../commerce/lethean-order-topbar';

@customElement('lethean-checkout-page')
export class LetheanCheckoutPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _section(icon: string, title: string, status: string, statusKind: 'muted' | 'success', body: TemplateResult) {
    return html`
      <div class="card" style="padding: 22px;">
        <div
          style="
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 16px;
          "
        >
          <div style="display: flex; align-items: center; gap: 12px;">
            <div
              style="
                width: 32px; height: 32px; border-radius: 8px;
                background: var(--ink-3);
                display: grid; place-items: center;
                border: 1px solid var(--line-2);
              "
            >
              <i class="fa-solid fa-${icon}" style="font-size: 13px; color: var(--fg-1);"></i>
            </div>
            <div style="font-size: 14px; font-weight: 600; color: var(--fg-0);">${title}</div>
          </div>
          ${status
            ? html`<span
                class=${statusKind === 'success' ? 'pill pill-success' : 'pill'}
                style="font-size: 11.5px;"
              >
                ${statusKind === 'success'
                  ? html`<i class="fa-solid fa-check" style="font-size: 9px; margin-right: 4px;"></i>`
                  : html``}
                ${status}
              </span>`
            : html``}
        </div>
        ${body}
      </div>
    `;
  }

  private _field(label: string, span: number, content: TemplateResult) {
    return html`
      <div style="grid-column: span ${span};">
        <label
          style="
            display: block;
            font-size: 11.5px; color: var(--fg-3);
            margin-bottom: 6px;
          "
        >${label}</label>
        ${content}
      </div>
    `;
  }

  render() {
    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <lethean-order-topbar step="2"></lethean-order-topbar>

        <div style="padding: 32px 56px; display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px;">
          <div style="display: flex; flex-direction: column; gap: 18px;">
            <h1 style="font-size: 28px; letter-spacing: -0.025em; margin: 0 0 4px;">Almost there.</h1>
            <p style="font-size: 13.5px; color: var(--fg-3); margin: 0;">
              You can change everything later from your dashboard. We don't store
              card numbers — Stripe does.
            </p>

            <!-- 1. Account -->
            ${this._section(
              'circle-user',
              '1 · Your account',
              'Signed in as alex@littlewavestudio.uk',
              'success',
              html`
                <div
                  style="
                    display: flex; gap: 14px; align-items: center;
                    padding: 14px;
                    background: var(--ink-1); border-radius: 10px;
                    border: 1px solid var(--line-1);
                  "
                >
                  <div
                    style="
                      width: 36px; height: 36px; border-radius: 50%;
                      background: var(--brand-700);
                      display: grid; place-items: center;
                      color: var(--fg-0); font-size: 13px; font-weight: 600;
                    "
                  >AL</div>
                  <div style="flex: 1;">
                    <div style="font-size: 13.5px; font-weight: 500; color: var(--fg-0);">
                      Alex Linton · Little Wave Studio
                    </div>
                    <div style="font-size: 12px; color: var(--fg-3);">
                      alex@littlewavestudio.uk · VAT GB 4827 11 89
                    </div>
                  </div>
                  <a href="#" style="font-size: 12px; color: var(--brand-200); text-decoration: none;">
                    Switch account
                  </a>
                </div>
              `
            )}

            <!-- 2. Billing address -->
            ${this._section(
              'building',
              '2 · Billing address',
              'Edit',
              'muted',
              html`
                <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px;">
                  ${this._field('Company (optional)', 12, html`<input class="input" value="Little Wave Studio Ltd" />`)}
                  ${this._field('Address', 12, html`<input class="input" value="Unit 4, The Old Print Works" />`)}
                  ${this._field('Town / City', 6, html`<input class="input" value="Bristol" />`)}
                  ${this._field('Postcode', 3, html`<input class="input" value="BS5 9TJ" />`)}
                  ${this._field('Country', 3, html`<select class="input"><option>United Kingdom</option></select>`)}
                </div>
              `
            )}

            <!-- 3. Payment -->
            ${this._section(
              'credit-card',
              '3 · Payment method',
              '3-D Secure ready',
              'success',
              html`
                <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                  ${['Card', 'Bacs Direct Debit', 'PayPal'].map(
                    (m, i) => html`<button class=${i === 0 ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>${m}</button>`
                  )}
                </div>
                <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px;">
                  ${this._field(
                    'Card number',
                    12,
                    html`
                      <div style="position: relative;">
                        <input class="input tnum" value="4242 4242 4242 4242" style="padding-left: 38px; padding-right: 50px;" />
                        <span
                          style="
                            position: absolute; left: 12px; top: 50%;
                            transform: translateY(-50%);
                            width: 22px; height: 14px; background: var(--brand-500);
                            border-radius: 3px; display: inline-block;
                          "
                        ></span>
                        <span
                          style="
                            position: absolute; right: 12px; top: 50%;
                            transform: translateY(-50%);
                            font-size: 11px; color: var(--fg-4);
                            font-family: var(--font-mono);
                          "
                        >VISA</span>
                      </div>
                    `
                  )}
                  ${this._field('Expiry', 4, html`<input class="input tnum" value="12 / 28" />`)}
                  ${this._field('CVC', 4, html`<input class="input tnum" value="•••" />`)}
                  ${this._field('Postcode', 4, html`<input class="input" value="BS5 9TJ" />`)}
                </div>
                <label style="display: flex; gap: 10px; align-items: center; margin-top: 14px; font-size: 13px; color: var(--fg-2);">
                  <input type="checkbox" checked style="accent-color: var(--brand-500);" />
                  Save this card for renewals.
                </label>
              `
            )}

            <div
              style="
                font-size: 12px; color: var(--fg-3);
                line-height: 1.6;
                padding: 12px 16px;
                border: 1px dashed var(--line-2);
                border-radius: 10px;
              "
            >
              By continuing you agree to the Host UK
              <a href="#" style="color: var(--brand-200); text-decoration: none;">Terms</a>,
              <a href="#" style="color: var(--brand-200); text-decoration: none;">Privacy</a>
              and
              <a href="#" style="color: var(--brand-200); text-decoration: none;">DPA</a>.
              You can cancel any time from
              <span style="font-family: var(--font-mono); color: var(--fg-1);">order.host.uk.com / account</span>.
            </div>
          </div>

          <!-- Sticky summary -->
          <div>
            <div class="card-elev" style="padding: 22px; position: sticky; top: 24px;">
              <div style="font-size: 14px; font-weight: 600; color: var(--fg-0); margin-bottom: 16px;">
                Paying today
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${[
                  ['Host UK Family', 24],
                  ['Analytics — extra domains', 4],
                  ['Storage top-up · 50 GB', 6],
                ].map(
                  ([n, p]) => html`
                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                      <span style="color: var(--fg-1);">${n}</span>
                      <span class="tnum" style="color: var(--fg-1);">£${(p as number).toFixed(2)}</span>
                    </div>
                  `
                )}
                <div class="divider"></div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; color: var(--fg-3);">
                  <span>Subtotal · monthly</span><span class="tnum">£34.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; color: var(--fg-3);">
                  <span>VAT 20%</span><span class="tnum">£6.80</span>
                </div>
                <div
                  style="
                    display: flex; justify-content: space-between;
                    align-items: baseline;
                    padding-top: 8px; border-top: 1px solid var(--line-1);
                  "
                >
                  <span style="color: var(--fg-0); font-weight: 600; font-size: 14px;">Charged today</span>
                  <span class="tnum" style="font-size: 22px; font-weight: 600; color: var(--fg-0);">£40.80</span>
                </div>
                <div style="font-size: 11.5px; color: var(--fg-3); text-align: right;">
                  Then £40.80 / month. Cancel any time.
                </div>
              </div>
              <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 18px;">
                <i class="fa-solid fa-lock" style="font-size: 12px; margin-right: 6px;"></i>
                Pay £40.80 now
              </button>
              <div
                style="
                  display: flex; justify-content: center; gap: 12px;
                  margin-top: 14px; color: var(--fg-4); font-size: 11px;
                "
              >
                <i class="fa-solid fa-shield" style="font-size: 11px;"></i>
                Stripe · 3DS-2 · GDPR
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-checkout-page': LetheanCheckoutPage;
  }
}
