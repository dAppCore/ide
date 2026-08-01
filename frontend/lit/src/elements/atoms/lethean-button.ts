import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

@customElement('lethean-button')
export class LetheanButton extends LitElement {
  @property() variant: Variant = 'secondary';
  @property() size: Size = 'md';
  @property({ type: Boolean }) disabled = false;
  @property() type: 'button' | 'submit' = 'button';

  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  private styles() {
    const sizes: Record<Size, { h: number; px: number; fs: number }> = {
      sm: { h: 24, px: 10, fs: 11.5 },
      md: { h: 32, px: 14, fs: 13 },
      lg: { h: 40, px: 18, fs: 14 },
    };
    const s = sizes[this.size] || sizes.md;
    let bg = 'var(--ink-3)';
    let bd = 'var(--line-1)';
    let fg = 'var(--fg-1)';
    if (this.variant === 'primary') {
      bg = 'var(--brand-500)';
      bd = 'var(--brand-400)';
      fg = 'var(--fg-0)';
    } else if (this.variant === 'ghost') {
      bg = 'transparent';
      bd = 'var(--line-2)';
      fg = 'var(--fg-1)';
    } else if (this.variant === 'danger') {
      bg = 'transparent';
      bd = 'color-mix(in oklch, var(--danger-500) 50%, var(--line-2))';
      fg = 'var(--danger-400)';
    }
    return `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: ${s.h}px;
      padding: 0 ${s.px}px;
      background: ${bg};
      border: 1px solid ${bd};
      color: ${fg};
      font-size: ${s.fs}px;
      font-weight: 500;
      font-family: inherit;
      border-radius: 6px;
      cursor: ${this.disabled ? 'not-allowed' : 'pointer'};
      opacity: ${this.disabled ? 0.5 : 1};
      letter-spacing: -0.005em;
      white-space: nowrap;
    `;
  }

  render() {
    return html`
      <button
        type=${this.type}
        ?disabled=${this.disabled}
        style=${this.styles()}
      >
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-button': LetheanButton;
  }
}
