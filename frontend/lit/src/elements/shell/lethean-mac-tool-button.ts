import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-mac-tool-button')
export class LetheanMacToolButton extends LitElement {
  @property() icon = '';
  @property() hint = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <button
        type="button"
        title=${this.hint}
        aria-label=${this.hint}
        style="
          width: 24px; height: 24px;
          display: grid; place-items: center;
          background: transparent;
          border: 1px solid var(--line-1);
          border-radius: 5px;
          color: var(--fg-2);
          cursor: pointer;
          font-family: inherit;
        "
      >
        <i class="fa-solid fa-${this.icon}" style="font-size: 11px;"></i>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mac-tool-button': LetheanMacToolButton;
  }
}
