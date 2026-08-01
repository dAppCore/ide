// <lethean-plan-card> — pricing plan card. Name + tagline + price +
// feature list + limits footer + CTA. Optional `featured` boolean for
// the highlighted middle plan ("MOST POPULAR" tag, brand-tinted bg,
// shadow).
//
// Ported from pricing.jsx > PlanCard.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-plan-card')
export class LetheanPlanCard extends LitElement {
  @property() name = '';
  @property() tagline = '';
  @property({ type: Number }) price = 0;
  @property() priceSuffix = '/month, billed yearly';
  @property({ type: Boolean }) featured = false;
  @property({ attribute: false }) features: string[] = [];
  @property() limits = '';
  @property() cta = 'Start 30-day trial';

  protected createRenderRoot() {
    return this;
  }

  render() {
    const f = this.featured;
    const articleStyle = [
      `background: ${f ? 'color-mix(in oklch, var(--brand-500) 8%, var(--ink-2))' : 'var(--ink-2)'}`,
      `border: 1px solid ${f ? 'color-mix(in oklch, var(--brand-500) 38%, var(--line-2))' : 'var(--line-1)'}`,
      'border-radius: 16px',
      'padding: 24px',
      'display: flex; flex-direction: column; gap: 16px',
      'position: relative',
      'box-sizing: border-box',
      `box-shadow: ${f ? '0 0 0 1px color-mix(in oklch, var(--brand-400) 22%, transparent), 0 18px 50px color-mix(in oklch, var(--brand-700) 14%, transparent)' : 'none'}`,
    ].join(';');
    const checkColor = f ? 'var(--brand-300)' : 'var(--success-400)';

    return html`
      <article style=${articleStyle}>
        ${f
          ? html`<div
              style="
                position: absolute; top: -10px; left: 24px;
                padding: 3px 10px; border-radius: 999px;
                background: var(--brand-500); color: var(--fg-0);
                font-size: 10.5px; letter-spacing: 0.06em; font-weight: 500;
              "
            >MOST POPULAR</div>`
          : html``}

        <div>
          <div
            style="
              font-size: 17px; font-weight: 600; color: var(--fg-0);
              letter-spacing: -0.015em;
            "
          >${this.name}</div>
          <div style="font-size: 12.5px; color: var(--fg-3); margin-top: 4px;">
            ${this.tagline}
          </div>
        </div>

        <div style="display: flex; align-items: baseline; gap: 6px;">
          <span style="font-size: 18px; color: var(--fg-3);">£</span>
          <span
            class="num tnum"
            style="
              font-size: 44px; color: var(--fg-0);
              letter-spacing: -0.04em; font-weight: 600;
            "
          >${this.price}</span>
          <span style="font-size: 13px; color: var(--fg-3);">${this.priceSuffix}</span>
        </div>

        <div class="divider"></div>

        <ul
          style="
            list-style: none; padding: 0; margin: 0;
            display: flex; flex-direction: column; gap: 10px;
          "
        >
          ${this.features.map(
            (feature) => html`
              <li
                style="
                  display: flex; gap: 10px;
                  font-size: 13px; color: var(--fg-1); line-height: 1.5;
                "
              >
                <i
                  class="fa-solid fa-check"
                  style="font-size: 11px; color: ${checkColor}; margin-top: 4px;"
                ></i>
                <span>${feature}</span>
              </li>
            `
          )}
        </ul>

        ${this.limits
          ? html`<div
              style="
                font-size: 11.5px; color: var(--fg-4);
                line-height: 1.5; margin-top: auto;
              "
            >${this.limits}</div>`
          : html``}

        <button class=${f ? 'btn btn-primary btn-lg' : 'btn btn-secondary btn-lg'}>
          ${this.cta}
        </button>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-plan-card': LetheanPlanCard;
  }
}
