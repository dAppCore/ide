import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

type ErrorTone = 'neutral' | 'warning' | 'danger' | 'info';

@customElement('lethean-error-page')
export class LetheanErrorPage extends LitElement {
  @property() code = '404';
  @property() eyebrow = 'NOT FOUND';
  @property() heading = `I can't find that page.`;
  @property() body = '';
  @property() pose = 'master';
  @property() tone: ErrorTone = 'neutral';
  @property({ attribute: 'meta' }) meta = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private accent(): string {
    switch (this.tone) {
      case 'warning': return 'var(--warning-400)';
      case 'danger': return 'var(--danger-400)';
      case 'info': return 'var(--info-400)';
      default: return 'var(--fg-3)';
    }
  }

  render() {
    const accent = this.accent();
    return html`
      <div
        style="
          width: 100%;
          min-height: 100%;
          background: var(--ink-1);
          display: grid;
          place-items: center;
          padding: 48px 32px;
          box-sizing: border-box;
        "
      >
        <div
          style="
            max-width: 720px;
            width: 100%;
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 32px;
            align-items: center;
          "
        >
          <div
            style="
              width: 200px;
              height: 200px;
              border-radius: 18px;
              background: color-mix(in oklch, ${accent} 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, ${accent} 24%, var(--line-2));
              display: grid;
              place-items: center;
              overflow: hidden;
            "
          >
            <lethean-vi pose=${this.pose} size="180"></lethean-vi>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0;">
            <div style="display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;">
              <span
                style="
                  font-size: 56px;
                  font-family: var(--font-mono);
                  color: ${accent};
                  letter-spacing: -0.04em;
                  line-height: 1;
                "
              >${this.code}</span>
              <span
                style="
                  font-size: 11px;
                  font-family: var(--font-mono);
                  color: var(--fg-4);
                  letter-spacing: 0.08em;
                "
              >${this.eyebrow}</span>
            </div>
            <h1
              style="
                font-size: 26px;
                letter-spacing: -0.025em;
                color: var(--fg-0);
                margin: 0;
                font-family: var(--font-display, inherit);
                font-weight: 600;
              "
            >${this.heading}</h1>
            ${this.body
              ? html`<p
                  style="
                    font-size: 14px;
                    color: var(--fg-2);
                    line-height: 1.55;
                    margin: 0;
                  "
                >${this.body}</p>`
              : html``}
            ${this.meta
              ? html`<div
                  style="
                    font-size: 11.5px;
                    font-family: var(--font-mono);
                    color: var(--fg-4);
                    padding: 8px 12px;
                    background: var(--ink-2);
                    border: 1px solid var(--line-1);
                    border-radius: 6px;
                  "
                >${this.meta}</div>`
              : html``}
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;">
              <slot name="actions"></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-error-page': LetheanErrorPage;
  }
}
