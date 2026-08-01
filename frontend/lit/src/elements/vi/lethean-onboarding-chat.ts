// <lethean-onboarding-chat> — conversational onboarding shell. Header
// (brand-mark + breadcrumb + close), centered conversation column for
// slotted <lethean-vi-message> bubbles, composer at the bottom.
//
// Ported from onboarding.jsx > OnboardingChat. The chat itself is
// content-agnostic — consumers slot whatever message bubbles they want
// (use `<lethean-vi-message size="chat" who="vi|you">`). The container
// only owns the page-level shell + composer affordance.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';

@customElement('lethean-onboarding-chat')
export class LetheanOnboardingChat extends LitElement {
  @property() brand = 'Host UK';
  @property() subdomain = 'control';
  @property() crumb = 'First site';
  @property() composerPlaceholder = 'Reply or just say "go"…';
  @property({ type: Boolean, attribute: 'no-composer' }) noComposer = false;
  @property({ type: Boolean, attribute: 'no-close' }) noClose = false;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        class="surface"
        style="
          width: 100%;
          min-height: 100%;
          background: var(--ink-0);
          padding: 32px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-sizing: border-box;
        "
      >
        <header
          style="display: flex; align-items: center; justify-content: space-between;"
        >
          <div style="display: flex; align-items: center; gap: 10px;">
            <lethean-brand-mark
              size="sm"
              name=${this.brand}
              subdomain=${this.subdomain}
            ></lethean-brand-mark>
            <span style="color: var(--fg-4); font-size: 12px;">/</span>
            <span style="font-size: 12px; color: var(--fg-3);">${this.crumb}</span>
          </div>
          ${this.noClose
            ? html``
            : html`
                <button
                  style="
                    background: transparent;
                    border: none;
                    color: var(--fg-3);
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    font-family: inherit;
                  "
                >
                  <i class="fa-solid fa-xmark" style="font-size: 11px;"></i>
                  Close · resume later
                </button>
              `}
        </header>

        <!-- Conversation feed — slotted bubbles -->
        <div
          style="
            flex: 1;
            max-width: 720px;
            margin: 8px auto 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 18px;
          "
        >
          <slot></slot>

          ${this.noComposer
            ? html``
            : html`
                <div style="margin-top: 8px;">
                  <div
                    style="
                      background: var(--ink-2);
                      border: 1px solid var(--line-2);
                      border-radius: 12px;
                      padding: 10px 14px;
                      display: flex;
                      align-items: center;
                      gap: 10px;
                    "
                  >
                    <i
                      class="fa-solid fa-sparkles"
                      style="font-size: 13px; color: var(--brand-300);"
                    ></i>
                    <span style="font-size: 13.5px; color: var(--fg-3); flex: 1;">
                      ${this.composerPlaceholder}
                    </span>
                    <kbd
                      style="
                        font-size: 10.5px;
                        padding: 2px 6px;
                        border-radius: 4px;
                        background: var(--ink-3);
                        border: 1px solid var(--line-2);
                        color: var(--fg-3);
                        font-family: var(--font-mono);
                      "
                    >↵</kbd>
                  </div>
                </div>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-onboarding-chat': LetheanOnboardingChat;
  }
}
