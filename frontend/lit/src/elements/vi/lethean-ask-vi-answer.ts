// <lethean-ask-vi-answer> — Vi-prefixed answer block for inside the
// Ask-Vi panel. Renders a small Vi mascot avatar at the top-left and
// slots the answer content (prose, action cards, follow-ups) to its
// right with consistent indentation.
//
// Use multiple in sequence inside <lethean-ask-vi> to build up the
// streaming-answer pattern — Vi prose, then an inline action card
// (slotted with no-avatar attribute so it indents under the Vi marker),
// then a follow-up Vi line.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

@customElement('lethean-ask-vi-answer')
export class LetheanAskViAnswer extends LitElement {
  /**
   * When true, hides the Vi avatar marker and only renders the indent
   * gutter. Use for follow-up paragraphs / inline cards that should
   * sit under the same Vi attribution.
   */
  @property({ type: Boolean, attribute: 'no-avatar' }) noAvatar = false;
  /**
   * Mute the body color (use for soft follow-up lines like "One more thing —").
   */
  @property({ type: Boolean }) mute = false;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div style="display: flex; gap: 12px;">
        ${this.noAvatar
          ? html`<div style="width: 22px; flex-shrink: 0;"></div>`
          : html`
              <div
                style="
                  width: 22px; height: 22px; border-radius: 6px;
                  background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-3));
                  border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
                  display: grid; place-items: center; overflow: hidden;
                  flex-shrink: 0; margin-top: 2px;
                "
              >
                <lethean-vi pose="master" size="26" style="margin-top: 3px;"></lethean-vi>
              </div>
            `}
        <div
          style="
            font-size: ${this.mute ? '13px' : '14px'};
            color: ${this.mute ? 'var(--fg-3)' : 'var(--fg-1)'};
            line-height: 1.55;
            flex: 1;
          "
        >
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-ask-vi-answer': LetheanAskViAnswer;
  }
}
