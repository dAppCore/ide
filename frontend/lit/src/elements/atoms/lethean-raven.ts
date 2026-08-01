import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-raven')
export class LetheanRaven extends LitElement {
  @property({ type: Number }) size = 14;
  @property() color = 'var(--fg-0)';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <svg
        width=${this.size}
        height=${this.size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 14c0-3.5 2.5-6 6.5-6.5 0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5l4 1.5c0 .8-.5 1.5-1.3 1.7l1 1.3-1.7.3.7 2-2-.7c-.8 1.5-2.5 2.4-4.7 2.4H8l-2 4-1-2 1-3c-1.6-.5-3-1.5-3-3.5z"
          fill=${this.color}
          opacity="0.95"
        ></path>
        <circle cx="13.5" cy="9" r="0.9" fill="var(--ink-1)"></circle>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-raven': LetheanRaven;
  }
}
