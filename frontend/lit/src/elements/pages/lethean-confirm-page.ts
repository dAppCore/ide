// <lethean-confirm-page> — checkout success / confirmation. Topbar
// (step 3), big "Welcome to the flock" headline + Vi note, 3-row
// provisioning state list, dashboard + invoice CTAs, large Vi mascot
// with welcome speech card.
//
// Ported from cart-checkout.jsx > ConfirmView.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../atoms/lethean-vi';
import '../commerce/lethean-order-topbar';

interface ProductState {
  name: string;
  state: 'ready' | 'provisioning';
  domain: string;
}

const PRODUCTS: ProductState[] = [
  { name: 'Host UK Family', state: 'ready', domain: 'hub.host.uk.com' },
  { name: 'Analytics — extra domains', state: 'ready', domain: 'analytics.host.uk.com' },
  { name: 'Storage top-up', state: 'provisioning', domain: '—' },
];

@customElement('lethean-confirm-page')
export class LetheanConfirmPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <lethean-order-topbar step="3"></lethean-order-topbar>

        <div
          style="
            padding: 60px 56px;
            display: grid; grid-template-columns: 1.2fr 1fr;
            gap: 48px; align-items: start;
          "
        >
          <div>
            <div class="pill pill-success" style="margin-bottom: 18px;">
              <i class="fa-solid fa-check" style="font-size: 9px; margin-right: 4px;"></i>
              Payment received · £40.80
            </div>
            <h1 style="font-size: 44px; letter-spacing: -0.03em; margin: 0 0 14px; line-height: 1.05;">
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">
                Welcome to the flock.
              </span>
              Right then, let's get you set up.
            </h1>
            <p
              style="
                font-size: 16px; color: var(--fg-2);
                max-width: 560px; margin: 0 0 28px; line-height: 1.55;
              "
            >
              Your invoice has gone to
              <span style="font-family: var(--font-mono); color: var(--fg-0); font-size: 14px;">
                alex@littlewavestudio.uk
              </span>.
              Three products are provisioning now — usually takes about a minute.
            </p>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px;">
              ${PRODUCTS.map(
                (p) => html`
                  <div
                    style="
                      display: flex; align-items: center; gap: 14px;
                      padding: 14px 16px;
                      background: var(--ink-2);
                      border: 1px solid var(--line-1);
                      border-radius: 10px;
                    "
                  >
                    ${p.state === 'ready'
                      ? html`<i class="fa-solid fa-circle-check" style="font-size: 16px; color: var(--success-400);"></i>`
                      : html`<div
                          style="
                            width: 14px; height: 14px; border-radius: 50%;
                            border: 2px solid var(--line-3);
                            border-top-color: var(--brand-300);
                            animation: leConfirmSpin 1s linear infinite;
                          "
                        ></div>`}
                    <div style="flex: 1; font-size: 14px; color: var(--fg-0);">${p.name}</div>
                    <span style="font-size: 12px; font-family: var(--font-mono); color: var(--fg-3);">
                      ${p.domain}
                    </span>
                    <span class=${p.state === 'ready' ? 'pill pill-success' : 'pill pill-warn'}>
                      ${p.state}
                    </span>
                  </div>
                `
              )}
            </div>

            <div style="display: flex; gap: 10px;">
              <a href="#" class="btn btn-primary btn-lg">
                Go to your dashboard
                <i class="fa-solid fa-arrow-right" style="font-size: 12px; margin-left: 4px;"></i>
              </a>
              <a href="#" class="btn btn-secondary btn-lg">
                <i class="fa-solid fa-receipt" style="font-size: 13px; margin-right: 4px;"></i>
                View invoice (PDF)
              </a>
            </div>
          </div>

          <div
            style="
              position: relative;
              display: flex; flex-direction: column;
              align-items: center; gap: 18px;
            "
          >
            <lethean-vi
              pose="master"
              size="340"
              style="filter: drop-shadow(0 30px 50px rgba(0,0,0,0.5));"
            ></lethean-vi>
            <div class="card-elev" style="padding: 18px; max-width: 320px; position: relative;">
              <div
                style="
                  font-size: 11px; font-family: var(--font-mono);
                  color: var(--brand-200); margin-bottom: 6px;
                "
              >VI · welcome note</div>
              <div style="font-size: 13.5px; color: var(--fg-1); line-height: 1.55;">
                "I'll be popping up occasionally with tips and the odd bit of corvid wisdom.
                Your scheduled posts are waiting. Now go do something more interesting —
                we've got this covered."
              </div>
            </div>
          </div>
        </div>

        <style>@keyframes leConfirmSpin { to { transform: rotate(360deg); } }</style>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-confirm-page': LetheanConfirmPage;
  }
}
