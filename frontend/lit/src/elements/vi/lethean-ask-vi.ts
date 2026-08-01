// <lethean-ask-vi> — fullscreen cmd-K command surface. Dimmed canvas
// (dot-grid + brand-glow) behind a centered panel containing composer
// + slotted answer + status footer. Below the panel: optional
// suggestion chips ("TRY ASKING:" + a row of phrasings).
//
// Slots:
//   composer  — typically <lethean-ask-vi-composer query="...">
//   default   — answer content; one or more <lethean-ask-vi-answer>
//   chips     — suggestion-chip row (consumer's choice of <button>s)
//
// Source: ask-vi.jsx > AskVi.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-ask-vi')
export class LetheanAskVi extends LitElement {
  @property() footerStatus = 'Vi is reading account · not site content';
  @property({ type: Boolean, attribute: 'no-status-dot' }) noStatusDot = false;
  @property() chipsLabel = 'TRY ASKING:';

  // Shadow DOM intentionally — needs proper named slots (composer,
  // default answer, chips). Per feedback_lit_shadow_dom_rules.md:
  // tokens.css custom properties (var(--ink-0) etc.) inherit through
  // the shadow boundary; slotted children stay in the consumer's
  // light tree so .btn / .num / .pill / .editorial atoms still apply
  // to anything passed in via slots. .surface and .dot-grid classes
  // would NOT penetrate, so the wrapper styles below are inline
  // equivalents.

  render() {
    return html`
      <div
        style="
          width: 100%;
          min-height: 100%;
          background: var(--ink-0);
          position: relative;
          overflow: hidden;
        "
      >
        <!-- Dimmed canvas behind, suggesting context (.dot-grid inlined) -->
        <div
          style="
            position: absolute; inset: 0; opacity: 0.4;
            background-image: radial-gradient(circle at 1px 1px, var(--line-2) 1px, transparent 0);
            background-size: 24px 24px;
          "
        ></div>
        <div
          style="
            position: absolute; inset: 0;
            background: radial-gradient(ellipse 50% 60% at 50% 30%, color-mix(in oklch, var(--brand-500) 18%, transparent), transparent 60%);
            pointer-events: none;
          "
        ></div>

        <!-- Ask-Vi panel -->
        <div
          style="
            position: relative;
            z-index: 2;
            max-width: 760px;
            margin: 60px auto 0;
            background: var(--ink-1);
            border: 1px solid var(--line-2);
            border-radius: 18px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in oklch, var(--brand-500) 18%, transparent);
            overflow: hidden;
          "
        >
          <!-- Composer (slotted) -->
          <slot name="composer"></slot>

          <!-- Streaming answer area -->
          <div
            style="
              padding: 20px 24px 24px;
              border-top: 1px solid var(--line-1);
              display: flex; flex-direction: column; gap: 18px;
            "
          >
            <slot></slot>
          </div>

          <!-- Footer -->
          <div
            style="
              padding: 12px 20px;
              border-top: 1px solid var(--line-1);
              background: var(--ink-0);
              display: flex; align-items: center; justify-content: space-between;
              font-size: 11px; color: var(--fg-4);
            "
          >
            <div style="display: flex; gap: 14px; align-items: center;">
              <span><kbd style="${KBD_STYLE}">↑↓</kbd> Navigate</span>
              <span><kbd style="${KBD_STYLE}">↵</kbd> Run</span>
              <span><kbd style="${KBD_STYLE}">esc</kbd> Close</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${this.noStatusDot
                ? html``
                : html`<span
                    style="width: 5px; height: 5px; border-radius: 50%; background: var(--success-400);"
                  ></span>`}
              <span>${this.footerStatus}</span>
            </div>
          </div>
        </div>

        <!-- Suggestion chips below the panel -->
        <div
          style="
            max-width: 760px; margin: 16px auto 0;
            display: flex; flex-wrap: wrap; gap: 8px;
            padding: 0 4px;
            position: relative; z-index: 2;
          "
        >
          <div
            style="
              font-size: 11px; color: var(--fg-4);
              letter-spacing: 0.05em; margin-right: 4px;
              align-self: center; font-family: var(--font-mono);
            "
          >${this.chipsLabel}</div>
          <slot name="chips"></slot>
        </div>
      </div>
    `;
  }
}

const KBD_STYLE = `
  display: inline-block;
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--ink-3);
  border: 1px solid var(--line-2);
  color: var(--fg-2);
  margin-right: 4px;
`;

declare global {
  interface HTMLElementTagNameMap {
    'lethean-ask-vi': LetheanAskVi;
  }
}
