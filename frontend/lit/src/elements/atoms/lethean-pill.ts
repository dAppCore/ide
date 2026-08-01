import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'info' | 'danger';

@customElement('lethean-pill')
export class LetheanPill extends LitElement {
  @property() tone: Tone = 'neutral';
  @property({ type: Boolean }) dot = false;

  private colors() {
    switch (this.tone) {
      case 'brand':
        return { fg: 'var(--brand-200)', bg: 'color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))', bd: 'color-mix(in oklch, var(--brand-500) 28%, transparent)' };
      case 'success':
        return { fg: 'var(--success-400)', bg: 'color-mix(in oklch, var(--success-500) 18%, var(--ink-3))', bd: 'color-mix(in oklch, var(--success-500) 28%, transparent)' };
      case 'warning':
        return { fg: 'var(--warning-400)', bg: 'color-mix(in oklch, var(--warning-500) 18%, var(--ink-3))', bd: 'color-mix(in oklch, var(--warning-500) 28%, transparent)' };
      case 'info':
        return { fg: 'var(--info-400)', bg: 'color-mix(in oklch, var(--info-500) 18%, var(--ink-3))', bd: 'color-mix(in oklch, var(--info-500) 28%, transparent)' };
      case 'danger':
        return { fg: 'var(--danger-400)', bg: 'color-mix(in oklch, var(--danger-500) 18%, var(--ink-3))', bd: 'color-mix(in oklch, var(--danger-500) 28%, transparent)' };
      default:
        return { fg: 'var(--fg-2)', bg: 'var(--ink-3)', bd: 'var(--line-1)' };
    }
  }

  render() {
    const c = this.colors();
    return html`
      <span
        style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          border-radius: 999px;
          background: ${c.bg};
          border: 1px solid ${c.bd};
          color: ${c.fg};
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
        "
      >
        ${this.dot
          ? html`<span style="width: 5px; height: 5px; border-radius: 50%; background: ${c.fg};"></span>`
          : html``}
        <slot></slot>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-pill': LetheanPill;
  }
}
