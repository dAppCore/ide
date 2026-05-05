import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

@customElement('lethean-status-dot')
export class LetheanStatusDot extends LitElement {
  @property() tone: Tone = 'success';
  @property({ type: Boolean }) pulse = false;
  @property({ type: Number }) size = 7;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private color(): string {
    switch (this.tone) {
      case 'warning': return 'var(--warning-400)';
      case 'danger': return 'var(--danger-400)';
      case 'info': return 'var(--info-400)';
      case 'brand': return 'var(--brand-400)';
      case 'neutral': return 'var(--fg-4)';
      default: return 'var(--success-400)';
    }
  }

  render() {
    const c = this.color();
    return html`
      <span
        style="
          display: inline-block;
          width: ${this.size}px;
          height: ${this.size}px;
          border-radius: 50%;
          background: ${c};
          ${this.pulse
            ? `box-shadow: 0 0 0 3px color-mix(in oklch, ${c} 24%, transparent);`
            : ''}
        "
      ></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-status-dot': LetheanStatusDot;
  }
}
