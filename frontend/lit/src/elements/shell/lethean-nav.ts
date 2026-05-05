import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-nav-group')
export class LetheanNavGroup extends LitElement {
  @property() label = '';

  render() {
    return html`
      <div style="margin-bottom: 14px;">
        ${this.label
          ? html`<div
              style="
                padding: 6px 12px 4px;
                font-size: 10.5px;
                font-family: var(--font-mono);
                color: var(--fg-4);
                letter-spacing: 0.08em;
              "
            >${this.label.toUpperCase()}</div>`
          : html``}
        <slot></slot>
      </div>
    `;
  }
}

@customElement('lethean-nav-item')
export class LetheanNavItem extends LitElement {
  @property() icon = '';
  @property() label = '';
  @property({ type: Boolean, reflect: true }) active = false;
  @property() k = '';
  @property() count: string | null = null;
  @property({ attribute: 'dot-color' }) dotColor = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private onClick = () => {
    this.dispatchEvent(new CustomEvent('lethean-nav-select', {
      detail: { label: this.label, icon: this.icon },
      bubbles: true,
      composed: true,
    }));
  };

  render() {
    return html`
      <button
        @click=${this.onClick}
        style="
          width: calc(100% - 8px);
          display: grid;
          grid-template-columns: 16px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 5px 12px;
          background: ${this.active ? 'var(--ink-3)' : 'transparent'};
          color: ${this.active ? 'var(--fg-0)' : 'var(--fg-2)'};
          border: none;
          border-radius: 4px;
          text-align: left;
          margin: 1px 4px;
          font-size: 12.5px;
          font-weight: ${this.active ? 500 : 400};
          cursor: pointer;
          font-family: inherit;
        "
      >
        ${this.dotColor
          ? html`<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${this.dotColor}; margin: 0 auto 0 3px;"></span>`
          : html`<i class="fa-solid fa-${this.icon}" style="font-size: 11px; color: ${this.active ? 'var(--brand-300)' : 'var(--fg-3)'};"></i>`}
        <span>${this.label}</span>
        ${this.count !== null
          ? html`<span style="font-size: 10px; font-family: var(--font-mono); color: var(--fg-4);">${this.count}</span>`
          : html`<span style="font-size: 9.5px; font-family: var(--font-mono); color: var(--fg-4);">${this.k}</span>`}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-nav-group': LetheanNavGroup;
    'lethean-nav-item': LetheanNavItem;
  }
}
