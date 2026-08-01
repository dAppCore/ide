import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-email-template')
export class LetheanEmailTemplate extends LitElement {
  @property() subject = '';
  @property() from = '';
  @property() to = '';
  @property() preview = '';
  @property() eyebrow = '';
  @property({ type: Number, attribute: 'max-width' }) maxWidth = 540;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <article
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          overflow: hidden;
          max-width: ${this.maxWidth}px;
        "
      >
        <header
          style="
            padding: 12px 16px;
            background: var(--ink-3);
            border-bottom: 1px solid var(--line-1);
            display: flex; flex-direction: column; gap: 4px;
          "
        >
          ${this.eyebrow
            ? html`<div
                style="
                  font-size: 10px;
                  font-family: var(--font-mono);
                  color: var(--brand-300);
                  letter-spacing: 0.08em;
                  text-transform: uppercase;
                "
              >${this.eyebrow}</div>`
            : html``}
          <div style="font-size: 14px; color: var(--fg-0); font-weight: 500; letter-spacing: -0.01em;">${this.subject}</div>
          <div style="font-size: 11.5px; color: var(--fg-3); font-family: var(--font-mono);">
            From <span style="color: var(--fg-1);">${this.from}</span>${this.to ? html` · To <span style="color: var(--fg-1);">${this.to}</span>` : html``}
          </div>
          ${this.preview
            ? html`<div style="font-size: 11.5px; color: var(--fg-3); margin-top: 4px; font-style: italic;">${this.preview}</div>`
            : html``}
        </header>

        <div
          style="
            padding: 22px 18px;
            background: var(--ink-1);
            font-size: 13px;
            color: var(--fg-1);
            line-height: 1.6;
          "
        >
          <slot></slot>
        </div>

        <footer
          style="
            padding: 10px 16px;
            background: var(--ink-2);
            border-top: 1px solid var(--line-1);
            font-size: 10.5px;
            color: var(--fg-4);
            font-family: var(--font-mono);
            letter-spacing: 0.04em;
            display: flex;
            justify-content: space-between;
            gap: 10px;
          "
        >
          <slot name="footer">
            <span>Host UK · 7 Bridge Street, Taunton TA1 1TG · UK</span>
            <span>Unsubscribe</span>
          </slot>
        </footer>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-email-template': LetheanEmailTemplate;
  }
}
