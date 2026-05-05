// <lethean-ask-vi-composer> — the query input area at the top of the
// Ask-Vi panel. Vi mascot on the left, current query text in the
// middle, blinking cursor at the end, ⌘K hint on the right.
//
// Display-only for this iteration: `query` is just text, no real input
// state. When wired to actual cmd-K, replace the static <span> with a
// real <input> + bind to component state.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

@customElement('lethean-ask-vi-composer')
export class LetheanAskViComposer extends LitElement {
  @property() query = '';
  @property({ type: Boolean, attribute: 'no-cursor' }) noCursor = false;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div style="padding: 20px 24px 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div
            style="
              width: 36px; height: 36px; border-radius: 10px;
              background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 38%, var(--line-2));
              display: grid; place-items: center; overflow: hidden;
              flex-shrink: 0;
            "
          >
            <lethean-vi pose="master" size="42" style="margin-top: 4px;"></lethean-vi>
          </div>
          <div
            style="
              flex: 1;
              font-size: 22px;
              color: var(--fg-0);
              letter-spacing: -0.02em;
              font-weight: 400;
            "
          >
            ${this.query}
            ${this.noCursor
              ? html``
              : html`<span
                  style="
                    display: inline-block;
                    width: 2px; height: 22px; margin-left: 3px;
                    background: var(--brand-300);
                    vertical-align: middle;
                    animation: askViBlink 1s infinite;
                  "
                ></span>`}
          </div>
          <div
            style="
              font-size: 11px;
              color: var(--fg-4);
              font-family: var(--font-mono);
              letter-spacing: 0.05em;
              flex-shrink: 0;
            "
          >⌘K</div>
        </div>
        <style>
          @keyframes askViBlink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
        </style>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-ask-vi-composer': LetheanAskViComposer;
  }
}
