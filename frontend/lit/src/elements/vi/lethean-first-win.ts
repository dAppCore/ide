import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

interface Stat {
  value: string;
  suffix?: string;
  label: string;
  detail?: string;
}

@customElement('lethean-first-win')
export class LetheanFirstWin extends LitElement {
  @property() eyebrow = 'FIRST WIN';
  @property() heading = '';
  @property() body = '';
  @property() footnote = '';
  @property() pose = 'master';
  @property({ attribute: false }) stats: Stat[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <div
        class="brand-glow"
        style="
          width: 100%;
          min-height: 100%;
          background: var(--ink-1);
          display: grid;
          place-items: center;
          padding: 56px 32px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        "
      >
        <div
          style="
            max-width: 720px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 20px;
            position: relative;
            z-index: 1;
          "
        >
          <div
            style="
              width: 140px;
              height: 140px;
              border-radius: 18px;
              background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              display: grid;
              place-items: center;
              overflow: hidden;
            "
          >
            <lethean-vi pose=${this.pose} size="160"></lethean-vi>
          </div>

          ${this.eyebrow
            ? html`<div
                style="
                  font-size: 11px;
                  font-family: var(--font-mono);
                  color: var(--brand-300);
                  letter-spacing: 0.1em;
                "
              >${this.eyebrow}</div>`
            : html``}

          <h1
            style="
              font-family: var(--font-display, inherit);
              font-size: clamp(28px, 4vw, 36px);
              margin: 0;
              letter-spacing: -0.03em;
              line-height: 1.1;
              color: var(--fg-0);
            "
          >${this.heading}</h1>

          ${this.body
            ? html`<p
                style="
                  font-size: 15px;
                  color: var(--fg-2);
                  line-height: 1.6;
                  margin: 0;
                  max-width: 540px;
                "
              >${this.body}</p>`
            : html``}

          ${this.stats.length
            ? html`<div
                style="
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                  gap: 14px;
                  width: 100%;
                  margin-top: 14px;
                "
              >
                ${this.stats.map(
                  (s) => html`
                    <div
                      style="
                        background: var(--ink-2);
                        border: 1px solid var(--line-1);
                        border-radius: 10px;
                        padding: 14px 16px;
                        text-align: left;
                      "
                    >
                      <div
                        style="
                          font-size: 24px;
                          font-family: var(--font-mono);
                          color: var(--fg-0);
                          letter-spacing: -0.025em;
                        "
                      >${s.value}${s.suffix
                        ? html`<span style="font-size: 14px; color: var(--fg-3); margin-left: 2px;">${s.suffix}</span>`
                        : html``}</div>
                      <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 4px; letter-spacing: 0.04em; text-transform: uppercase; font-family: var(--font-mono);">${s.label}</div>
                      ${s.detail
                        ? html`<div style="font-size: 11.5px; color: var(--fg-2); margin-top: 6px; line-height: 1.45;">${s.detail}</div>`
                        : html``}
                    </div>
                  `
                )}
              </div>`
            : html``}

          <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 6px;">
            <slot name="actions"></slot>
          </div>

          ${this.footnote
            ? html`<div
                style="
                  font-size: 11.5px;
                  color: var(--fg-4);
                  font-family: var(--font-mono);
                  margin-top: 8px;
                "
              >${this.footnote}</div>`
            : html``}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-first-win': LetheanFirstWin;
  }
}
