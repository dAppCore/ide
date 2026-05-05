import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const X_MARK = svg`
  <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
    <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </svg>
`;

type DialogTone = 'neutral' | 'brand' | 'warning' | 'danger' | 'success';

@customElement('lethean-dialog')
export class LetheanDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() heading = '';
  @property() subhead = '';
  @property() tone: DialogTone = 'neutral';
  @property({ type: Boolean, attribute: 'no-close' }) noClose = false;
  @property({ type: Number }) width = 480;

  private close = () => {
    this.open = false;
    this.dispatchEvent(new CustomEvent('lethean-dialog-close', { bubbles: true, composed: true }));
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open && !this.noClose) this.close();
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.onKey);
    super.disconnectedCallback();
  }

  private toneAccent(): string {
    switch (this.tone) {
      case 'brand': return 'var(--brand-300)';
      case 'warning': return 'var(--warning-400)';
      case 'danger': return 'var(--danger-400)';
      case 'success': return 'var(--success-400)';
      default: return 'var(--fg-3)';
    }
  }

  render() {
    if (!this.open) return html``;
    return html`
      <div
        @click=${(e: MouseEvent) => {
          if (e.target === e.currentTarget && !this.noClose) this.close();
        }}
        style="
          position: fixed;
          inset: 0;
          z-index: 300;
          background: color-mix(in oklch, var(--ink-0) 70%, transparent);
          backdrop-filter: blur(6px) saturate(120%);
          -webkit-backdrop-filter: blur(6px) saturate(120%);
          display: grid;
          place-items: center;
          padding: 24px;
        "
      >
        <div
          role="dialog"
          aria-modal="true"
          style="
            width: 100%;
            max-width: ${this.width}px;
            background: var(--ink-1);
            border: 1px solid var(--line-2);
            border-radius: 12px;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            border-top: 3px solid ${this.toneAccent()};
          "
        >
          <header
            style="
              padding: 16px 20px 12px;
              border-bottom: 1px solid var(--line-1);
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 12px;
              align-items: start;
            "
          >
            <div>
              <div
                style="
                  font-size: 15px;
                  font-weight: 600;
                  color: var(--fg-0);
                  letter-spacing: -0.015em;
                "
              >${this.heading}</div>
              ${this.subhead
                ? html`<div style="font-size: 12.5px; color: var(--fg-3); margin-top: 4px; line-height: 1.45;">${this.subhead}</div>`
                : html``}
            </div>
            ${this.noClose
              ? html``
              : html`<button
                  @click=${this.close}
                  aria-label="Close"
                  style="
                    width: 26px; height: 26px; border-radius: 6px;
                    background: transparent;
                    border: 1px solid var(--line-2);
                    color: var(--fg-3);
                    cursor: pointer;
                    display: grid; place-items: center;
                  "
                >${X_MARK}</button>`}
          </header>
          <div style="padding: 18px 20px; font-size: 13px; color: var(--fg-1); line-height: 1.5;">
            <slot></slot>
          </div>
          <footer
            style="
              padding: 12px 20px;
              border-top: 1px solid var(--line-1);
              background: var(--ink-0);
              display: flex;
              justify-content: flex-end;
              gap: 8px;
            "
          >
            <slot name="actions"></slot>
          </footer>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-dialog': LetheanDialog;
  }
}
