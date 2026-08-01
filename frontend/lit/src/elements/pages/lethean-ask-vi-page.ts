// <lethean-ask-vi-page> — demo of the Ask-Vi command-palette surface.
// Renders the renewal-query example from ask-vi.jsx verbatim:
// composer with "renew lethean.host" + Vi prose answer + inline
// renewal action card + Vi follow-up about bundling.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../vi/lethean-ask-vi';
import '../vi/lethean-ask-vi-composer';
import '../vi/lethean-ask-vi-answer';

const SUGGESTIONS = [
  'renew lethean.host',
  "what's slow on hookway.co.uk",
  'spin up staging from main',
  'what did you do overnight',
  "show last month's bill",
  'is my mail working',
];

const CHIP_STYLE = `
  padding: 5px 11px; border-radius: 999px;
  background: var(--ink-2);
  border: 1px solid var(--line-2);
  color: var(--fg-2);
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
`;

@customElement('lethean-ask-vi-page')
export class LetheanAskViPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _renewalCard() {
    return html`
      <div
        style="
          margin-left: 34px;
          background: var(--ink-2);
          border: 1px solid var(--line-2);
          border-radius: 12px;
          overflow: hidden;
        "
      >
        <div
          style="
            padding: 14px 16px;
            display: grid; grid-template-columns: 1fr auto; gap: 16px;
            align-items: center;
          "
        >
          <div>
            <div
              style="
                font-size: 11px; color: var(--brand-300);
                font-family: var(--font-mono); letter-spacing: 0.06em;
                margin-bottom: 4px;
              "
            >RENEWAL · 12 MONTHS</div>
            <div
              style="
                font-size: 18px; color: var(--fg-0);
                letter-spacing: -0.02em;
                font-family: var(--font-mono); font-weight: 500;
              "
            >lethean.host</div>
            <div style="font-size: 12px; color: var(--fg-3); margin-top: 4px;">
              Expires 10 Oct 2025 → <span style="color: var(--fg-1);">10 Oct 2026</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div
              class="num tnum"
              style="font-size: 24px; color: var(--fg-0); letter-spacing: -0.02em;"
            >£18.40</div>
            <div style="font-size: 11px; color: var(--fg-4); margin-top: 2px;">
              inc. VAT
            </div>
          </div>
        </div>
        <div
          style="
            border-top: 1px solid var(--line-1);
            background: var(--ink-1);
            padding: 10px 16px;
            display: flex; justify-content: space-between; align-items: center;
          "
        >
          <div style="font-size: 12px; color: var(--fg-3); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-credit-card" style="font-size: 11px;"></i>
            Mastercard ·· 4421
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm" style="border: 1px solid var(--line-2);">
              Set auto-renew
            </button>
            <button class="btn btn-primary btn-sm">
              Confirm &amp; renew
              <i class="fa-solid fa-arrow-right" style="font-size: 10px; margin-left: 4px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <lethean-ask-vi>
        <!-- Composer slot -->
        <lethean-ask-vi-composer
          slot="composer"
          query="renew lethean.host"
        ></lethean-ask-vi-composer>

        <!-- Answer body: prose, then inline action card, then follow-up -->
        <lethean-ask-vi-answer>
          <p style="margin: 0;">
            <span class="num" style="color: var(--fg-0);">lethean.host</span> renews on
            <span style="color: var(--fg-0); font-weight: 500;">10 October</span>
            — that's 6 days. Auto-renew is off.
          </p>
          <p style="margin: 8px 0 0;">
            Renewing for 12 months at today's price is
            <span class="num" style="color: var(--fg-0);">£18.40</span>. I'll charge
            the Mastercard ending <span class="num">·· 4421</span>. Confirm and
            I'll do it now.
          </p>
        </lethean-ask-vi-answer>

        ${this._renewalCard()}

        <lethean-ask-vi-answer no-avatar mute>
          <span class="editorial" style="font-style: italic; color: var(--fg-2);">
            One more thing —
          </span>
          your Lethean Core subscription on this domain renews 14 days later.
          Bundle them and save
          <span style="color: var(--success-400); font-weight: 500;">£3.80/year</span>?
          <button
            style="
              background: none; border: none; padding: 0;
              color: var(--brand-300); font-size: 13px; cursor: pointer;
              text-decoration: underline; text-decoration-style: dotted;
              text-underline-offset: 3px;
              font-family: inherit;
            "
          >Show me the bundle</button>
        </lethean-ask-vi-answer>

        <!-- Suggestion chips slot -->
        ${SUGGESTIONS.map(
          (q) => html`<button slot="chips" style=${CHIP_STYLE}>${q}</button>`
        )}
      </lethean-ask-vi>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-ask-vi-page': LetheanAskViPage;
  }
}
