// <lethean-onboarding-page> — demo of the conversational onboarding
// surface. Renders the full Host UK onboarding flow: 3 Vi questions,
// 2 user answers, an inline domain-availability card, an inline plan
// summary card with line items + price + CTAs. Ported from
// onboarding.jsx > OnboardingChat verbatim where reasonable.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../vi/lethean-onboarding-chat';
import '../shell/lethean-vi-message';

const PLAN_LINES = [
  { icon: 'globe', label: 'hookway.co.uk', detail: 'Domain · 12 months' },
  { icon: 'server', label: 'Standard hosting', detail: '20 GB · UK' },
  { icon: 'envelope', label: 'sam@hookway.co.uk', detail: 'Mailbox · 5 GB' },
  { icon: 'chart-line', label: 'Host Analytics', detail: 'Privacy-first · cookieless' },
  { icon: 'link', label: 'Host Link', detail: 'One link, your everything' },
];

@customElement('lethean-onboarding-page')
export class LetheanOnboardingPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _domainAvailabilityCard() {
    return html`
      <div
        style="
          background: var(--ink-1);
          border: 1px solid color-mix(in oklch, var(--success-500) 30%, var(--line-2));
          border-radius: 10px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        "
      >
        <div
          style="
            width: 32px; height: 32px; border-radius: 8px;
            background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3));
            border: 1px solid color-mix(in oklch, var(--success-500) 30%, transparent);
            display: grid; place-items: center;
            flex-shrink: 0;
          "
        >
          <i class="fa-solid fa-check" style="font-size: 12px; color: var(--success-400);"></i>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 13.5px; color: var(--fg-0); font-family: var(--font-mono); font-weight: 500;">
            hookway.co.uk
          </div>
          <div style="font-size: 11.5px; color: var(--success-400); margin-top: 2px;">
            Available · £8.40/yr after first year (£0 first year on Standard)
          </div>
        </div>
        <span class="pill pill-success">CLAIMABLE</span>
      </div>
    `;
  }

  private _planSummaryCard() {
    return html`
      <div
        style="
          margin-top: 12px;
          background: var(--ink-1);
          border: 1px solid var(--line-2);
          border-radius: 10px;
          padding: 14px;
        "
      >
        <div
          style="
            font-size: 11px;
            color: var(--brand-300);
            font-family: var(--font-mono);
            letter-spacing: 0.06em;
            margin-bottom: 8px;
          "
        >YOUR FIRST SITE</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${PLAN_LINES.map(
            (row) => html`
              <div style="display: flex; align-items: center; gap: 10px; padding: 5px 0;">
                <i
                  class="fa-solid fa-${row.icon}"
                  style="font-size: 11px; color: var(--brand-300);"
                ></i>
                <span style="font-size: 12.5px; color: var(--fg-0); font-family: var(--font-mono);">${row.label}</span>
                <span style="font-size: 11.5px; color: var(--fg-4); margin-left: auto;">${row.detail}</span>
              </div>
            `
          )}
        </div>
        <div
          style="
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid var(--line-1);
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
        >
          <div>
            <div style="font-size: 11px; color: var(--fg-4);">30-day trial · then</div>
            <div
              class="num tnum"
              style="font-size: 18px; color: var(--fg-0); letter-spacing: -0.02em;"
            >
              £12.00<span style="font-size: 11px; color: var(--fg-3);">/mo</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button
              class="btn btn-ghost btn-sm"
              style="border: 1px solid var(--line-2);"
            >Adjust</button>
            <button class="btn btn-primary btn-sm">
              Start trial &amp; provision
              <i class="fa-solid fa-arrow-right" style="font-size: 10px; margin-left: 4px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <lethean-onboarding-chat
        brand="Host UK"
        subdomain="control"
        crumb="First site"
      >
        <!-- Vi: opening -->
        <lethean-vi-message size="chat" who="vi">
          <p style="margin: 0;">Right. Let's get your first site live.</p>
          <p style="margin: 8px 0 0; color: var(--fg-2); font-size: 13.5px;">
            <span class="editorial" style="font-style: italic;">Three quick questions</span>
            and I'll have it up in a minute.
          </p>
        </lethean-vi-message>

        <!-- Vi: ask domain -->
        <lethean-vi-message size="chat" who="vi">
          <p style="margin: 0;">
            What domain do you want? Type it however you say it —
            <span class="num" style="color: var(--fg-0);">hookway.co.uk</span> or
            <span class="num" style="color: var(--fg-0);">hookway</span>, I'll figure it out.
          </p>
        </lethean-vi-message>

        <!-- You: answer domain -->
        <lethean-vi-message size="chat" who="you" initials="SM">
          hookway.co.uk
        </lethean-vi-message>

        <!-- Vi: domain available + ask use -->
        <lethean-vi-message size="chat" who="vi">
          ${this._domainAvailabilityCard()}
          <p style="margin: 0;">Yours, free for the first year. What's it for?</p>
        </lethean-vi-message>

        <!-- You: answer use -->
        <lethean-vi-message size="chat" who="you" initials="SM">
          Personal site + a small blog. Need email too.
        </lethean-vi-message>

        <!-- Vi: plan summary -->
        <lethean-vi-message size="chat" who="vi">
          <p style="margin: 0;">
            Got it. I'll spin up <span class="num" style="color: var(--fg-0);">Standard</span>
            — that's hosting, one mailbox, analytics, and the bio-link page.
            <span class="num">£12/mo</span> after the 30-day trial.
          </p>
          ${this._planSummaryCard()}
          <p style="margin: 8px 0 0; font-size: 12.5px; color: var(--fg-3); line-height: 1.5;">
            <span class="editorial" style="font-style: italic;">No card today.</span>
            I'll ask 5 days before the trial ends. You can change anything before then.
          </p>
        </lethean-vi-message>
      </lethean-onboarding-chat>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-onboarding-page': LetheanOnboardingPage;
  }
}
