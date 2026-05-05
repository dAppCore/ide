import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const FEATHER = svg`
  <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true">
    <path d="M11 2 C 7 2 4 5 4 9 L 4 13 L 11 6 Z M 4 13 L 8 9 M 6 11 L 9 11 M 5 12 L 7 12"
      stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const SUGGESTIONS_DEFAULT = [
  'renew lethean.host',
  "what's slow on hookway.co.uk",
  'spin up staging from main',
  'what did you do overnight',
  "show last month's bill",
  'is my mail working',
];

@customElement('lethean-vi-overlay')
export class LetheanViOverlay extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() query = '';
  @property({ attribute: false }) suggestions: string[] = SUGGESTIONS_DEFAULT;

  private close = () => {
    this.open = false;
    this.dispatchEvent(new CustomEvent('lethean-vi-close', { bubbles: true, composed: true }));
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.close();
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.onKey);
    super.disconnectedCallback();
  }

  render() {
    if (!this.open) return html``;
    return html`
      <div
        @click=${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.close();
        }}
        style="
          position: fixed;
          inset: 0;
          z-index: 200;
          background: color-mix(in oklch, var(--ink-0) 70%, transparent);
          backdrop-filter: blur(6px) saturate(120%);
          -webkit-backdrop-filter: blur(6px) saturate(120%);
          overflow: auto;
          padding: 60px 24px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
        "
      >
        ${this.renderBackdropGlow()}
        ${this.renderPanel()}
        ${this.renderSuggestions()}
      </div>
    `;
  }

  private renderBackdropGlow() {
    return html`
      <div
        style="
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse 50% 60% at 50% 30%, color-mix(in oklch, var(--brand-500) 18%, transparent), transparent 60%);
        "
      ></div>
    `;
  }

  private renderPanel() {
    return html`
      <div
        style="
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 760px;
          background: var(--ink-1);
          border: 1px solid var(--line-2);
          border-radius: 18px;
          box-shadow:
            0 24px 80px rgba(0,0,0,0.5),
            0 0 0 1px color-mix(in oklch, var(--brand-500) 18%, transparent);
          overflow: hidden;
        "
      >
        ${this.renderComposer()}
        <div
          style="
            padding: 20px 24px 24px;
            border-top: 1px solid var(--line-1);
            display: flex;
            flex-direction: column;
            gap: 18px;
          "
        >
          <slot></slot>
        </div>
        ${this.renderFooter()}
      </div>
    `;
  }

  private renderComposer() {
    return html`
      <div style="padding: 20px 24px 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div
            style="
              width: 36px; height: 36px; border-radius: 10px;
              background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 38%, var(--line-2));
              display: grid; place-items: center;
              color: var(--brand-200);
              flex-shrink: 0;
            "
          >${FEATHER}</div>
          <div
            style="
              flex: 1;
              font-size: 22px;
              color: var(--fg-0);
              letter-spacing: -0.02em;
              font-weight: 400;
              min-height: 28px;
            "
          >
            ${this.query
              ? html`${this.query}<span
                  style="
                    display: inline-block;
                    width: 2px;
                    height: 22px;
                    margin-left: 3px;
                    background: var(--brand-300);
                    vertical-align: middle;
                    animation: askViBlink 1s infinite;
                  "
                ></span>`
              : html`<span style="color: var(--fg-4);">Ask Vi anything…</span>`}
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

  private renderFooter() {
    const kbd = (label: string) => html`
      <kbd
        style="
          display: inline-block;
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 1px 6px;
          border-radius: 4px;
          background: var(--ink-3);
          border: 1px solid var(--line-2);
          color: var(--fg-2);
          margin-right: 4px;
        "
      >${label}</kbd>
    `;
    return html`
      <div
        style="
          padding: 12px 20px;
          border-top: 1px solid var(--line-1);
          background: var(--ink-0);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: var(--fg-4);
        "
      >
        <div style="display: flex; gap: 14px; align-items: center;">
          <span>${kbd('↑↓')} Navigate</span>
          <span>${kbd('↵')} Run</span>
          <span>${kbd('esc')} Close</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--success-400);"></span>
          <span>Vi is reading account · not site content</span>
        </div>
      </div>
    `;
  }

  private renderSuggestions() {
    return html`
      <div
        style="
          width: 100%;
          max-width: 760px;
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 4px;
          position: relative;
          z-index: 2;
        "
      >
        <div
          style="
            font-size: 11px;
            color: var(--fg-4);
            letter-spacing: 0.05em;
            margin-right: 4px;
            align-self: center;
            font-family: var(--font-mono);
          "
        >TRY ASKING:</div>
        ${this.suggestions.map(
          (q) => html`
            <button
              @click=${() => (this.query = q)}
              style="
                padding: 5px 11px;
                border-radius: 999px;
                background: var(--ink-2);
                border: 1px solid var(--line-2);
                color: var(--fg-2);
                font-size: 12px;
                font-family: inherit;
                cursor: pointer;
              "
            >${q}</button>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-vi-overlay': LetheanViOverlay;
  }
}
