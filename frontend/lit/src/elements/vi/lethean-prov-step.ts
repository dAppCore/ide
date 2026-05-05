import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type StepState = 'pending' | 'active' | 'done' | 'failed';

const CHECK = svg`
  <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
    <path d="M3 8 L7 12 L13 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;
const SPINNER = svg`
  <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-opacity="0.25"/>
    <path d="M8 2 a6 6 0 0 1 6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/>
    </path>
  </svg>
`;

@customElement('lethean-prov-step')
export class LetheanProvStep extends LitElement {
  @property() icon = '';
  @property() label = '';
  @property() detail = '';
  @property() state: StepState = 'pending';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private accent(): string {
    switch (this.state) {
      case 'active': return 'var(--brand-300)';
      case 'done': return 'var(--success-400)';
      case 'failed': return 'var(--danger-400)';
      default: return 'var(--fg-4)';
    }
  }

  private bg(): string {
    switch (this.state) {
      case 'active': return 'color-mix(in oklch, var(--brand-500) 18%, var(--ink-2))';
      case 'done': return 'color-mix(in oklch, var(--success-500) 12%, var(--ink-2))';
      case 'failed': return 'color-mix(in oklch, var(--danger-500) 12%, var(--ink-2))';
      default: return 'var(--ink-2)';
    }
  }

  private renderStateBadge() {
    if (this.state === 'done') {
      return html`<span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--success-400); color: var(--ink-0);">${CHECK}</span>`;
    }
    if (this.state === 'active') {
      return html`<span style="display: inline-flex; color: var(--brand-300);">${SPINNER}</span>`;
    }
    if (this.state === 'failed') {
      return html`<span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--danger-400); color: var(--ink-0); font-size: 11px; font-weight: 700;">!</span>`;
    }
    return html`<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--fg-4);"></span>`;
  }

  render() {
    const accent = this.accent();
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: 36px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: ${this.bg()};
          border: 1px solid color-mix(in oklch, ${accent} ${this.state === 'pending' ? '14%' : '32%'}, var(--line-1));
          border-radius: 8px;
          transition: background 200ms ease, border-color 200ms ease;
        "
      >
        <div
          style="
            width: 32px; height: 32px;
            border-radius: 8px;
            background: color-mix(in oklch, ${accent} ${this.state === 'pending' ? '12%' : '24%'}, var(--ink-3));
            border: 1px solid color-mix(in oklch, ${accent} ${this.state === 'pending' ? '20%' : '40%'}, var(--line-1));
            display: grid; place-items: center;
            color: ${accent};
          "
        >
          <i class="fa-solid fa-${this.icon}" style="font-size: 13px;"></i>
        </div>
        <div style="min-width: 0;">
          <div
            style="
              font-size: 12.5px;
              font-weight: 500;
              color: ${this.state === 'pending' ? 'var(--fg-3)' : 'var(--fg-0)'};
              letter-spacing: -0.005em;
            "
          >${this.label}</div>
          ${this.detail
            ? html`<div style="font-size: 11px; color: var(--fg-3); margin-top: 2px; font-family: var(--font-mono);">${this.detail}</div>`
            : html``}
        </div>
        ${this.renderStateBadge()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-prov-step': LetheanProvStep;
  }
}
