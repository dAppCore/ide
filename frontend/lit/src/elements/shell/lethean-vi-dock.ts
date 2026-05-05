import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type ViStatus = 'idle' | 'listening' | 'working' | 'offline';

@customElement('lethean-vi-dock')
export class LetheanViDock extends LitElement {
  @property() status: ViStatus = 'idle';
  @property() subtitle = '';
  @property({ type: Boolean, attribute: 'no-border' }) noBorder = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private statusLabel(): string {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  private statusColor(): string {
    switch (this.status) {
      case 'listening':
      case 'working':
        return 'var(--success-400)';
      case 'offline':
        return 'var(--warning-400)';
      default:
        return 'var(--fg-4)';
    }
  }

  render() {
    return html`
      <div
        style="
          padding: 10px 12px;
          ${this.noBorder ? '' : 'border-top: 1px solid var(--line-1);'}
          display: flex;
          align-items: center;
          gap: 10px;
        "
      >
        <div
          style="
            width: 28px; height: 28px; border-radius: 6px;
            background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2));
            border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
            overflow: hidden;
            display: grid; place-items: center;
          "
        >
          <i class="fa-solid fa-feather" style="font-size: 13px; color: var(--brand-200);"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 11.5px; color: var(--fg-1);">Vi · ${this.statusLabel()}</div>
          ${this.subtitle
            ? html`<div style="font-size: 10px; color: var(--fg-4); font-family: var(--font-mono);">${this.subtitle}</div>`
            : html``}
        </div>
        <i class="fa-solid fa-circle" style="font-size: 6px; color: ${this.statusColor()};"></i>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-vi-dock': LetheanViDock;
  }
}
