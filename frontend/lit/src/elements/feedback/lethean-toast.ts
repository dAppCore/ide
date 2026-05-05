import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type ToastTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const X_MARK = svg`
  <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true">
    <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </svg>
`;

@customElement('lethean-toast')
export class LetheanToast extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() tone: ToastTone = 'neutral';
  @property() heading = '';
  @property() body = '';
  @property() icon = '';
  @property({ type: Number, attribute: 'auto-dismiss' }) autoDismiss = 0;

  private timer: number | null = null;

  updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      if (this.open && this.autoDismiss > 0) {
        if (this.timer) window.clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.dismiss(), this.autoDismiss);
      } else if (!this.open && this.timer) {
        window.clearTimeout(this.timer);
        this.timer = null;
      }
    }
  }

  private dismiss = () => {
    this.open = false;
    this.dispatchEvent(new CustomEvent('lethean-toast-dismiss', { bubbles: true, composed: true }));
  };

  private accent(): string {
    switch (this.tone) {
      case 'brand': return 'var(--brand-300)';
      case 'success': return 'var(--success-400)';
      case 'warning': return 'var(--warning-400)';
      case 'danger': return 'var(--danger-400)';
      case 'info': return 'var(--info-400)';
      default: return 'var(--fg-3)';
    }
  }

  render() {
    if (!this.open) return html``;
    return html`
      <div
        role="status"
        aria-live="polite"
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-2);
          border-left: 3px solid ${this.accent()};
          border-radius: 8px;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: start;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
          max-width: 380px;
        "
      >
        ${this.icon
          ? html`<i class="fa-solid fa-${this.icon}" style="font-size: 14px; color: ${this.accent()}; margin-top: 2px;"></i>`
          : html`<span></span>`}
        <div style="min-width: 0;">
          ${this.heading
            ? html`<div style="font-size: 13px; font-weight: 500; color: var(--fg-0); letter-spacing: -0.005em;">${this.heading}</div>`
            : html``}
          ${this.body
            ? html`<div style="font-size: 12px; color: var(--fg-2); margin-top: ${this.heading ? 3 : 0}px; line-height: 1.5;">${this.body}</div>`
            : html``}
          <slot></slot>
        </div>
        <button
          @click=${this.dismiss}
          aria-label="Dismiss"
          style="
            width: 22px; height: 22px;
            background: transparent;
            border: none;
            color: var(--fg-3);
            cursor: pointer;
            display: grid; place-items: center;
            border-radius: 4px;
          "
        >${X_MARK}</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-toast': LetheanToast;
  }
}
