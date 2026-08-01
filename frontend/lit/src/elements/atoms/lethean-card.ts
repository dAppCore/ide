import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-card')
export class LetheanCard extends LitElement {
  @property({ type: Boolean, attribute: 'no-padding' }) noPadding = false;
  @property({ type: Boolean }) flush = false;
  @property() tone = '';

  render() {
    const borderColor = this.tone
      ? `color-mix(in oklch, ${this.toneVar()} 28%, var(--line-1))`
      : 'var(--line-1)';
    return html`
      <article
        style="
          background: var(--ink-2);
          border: ${this.flush ? 'none' : `1px solid ${borderColor}`};
          border-radius: ${this.flush ? '0' : '10px'};
          padding: ${this.noPadding ? '0' : '14px 16px'};
          overflow: hidden;
        "
      >
        <slot></slot>
      </article>
    `;
  }

  private toneVar(): string {
    switch (this.tone) {
      case 'brand': return 'var(--brand-500)';
      case 'success': return 'var(--success-500)';
      case 'warning': return 'var(--warning-500)';
      case 'info': return 'var(--info-500)';
      case 'danger': return 'var(--danger-500)';
      default: return 'var(--line-1)';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-card': LetheanCard;
  }
}
