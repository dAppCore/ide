import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-raven';

@customElement('lethean-app-icon')
export class LetheanAppIcon extends LitElement {
  @property({ type: Number }) size = 128;
  @property() label = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const radius = Math.round(this.size * 0.234);
    const ravenSize = Math.round(this.size * 0.55);
    const shadow =
      this.size >= 64
        ? `inset 0 1px 0 0 color-mix(in oklch, var(--fg-0) 12%, transparent), 0 ${Math.round(this.size * 0.06)}px ${Math.round(this.size * 0.12)}px rgba(0, 0, 0, 0.32)`
        : 'none';
    return html`
      <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 8px;">
        <div
          style="
            width: ${this.size}px;
            height: ${this.size}px;
            border-radius: ${radius}px;
            background:
              radial-gradient(ellipse 70% 70% at 30% 25%, color-mix(in oklch, var(--brand-300) 36%, transparent), transparent 65%),
              var(--brand-700, var(--brand-500));
            position: relative;
            overflow: hidden;
            box-shadow: ${shadow};
            display: grid;
            place-items: center;
          "
        >
          <lethean-raven size=${ravenSize} color="rgba(255, 255, 255, 0.95)"></lethean-raven>
        </div>
        ${this.label
          ? html`<div
              style="
                font-size: 11px;
                font-family: var(--font-mono);
                color: var(--fg-3);
                letter-spacing: 0.04em;
              "
            >${this.label}</div>`
          : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-app-icon': LetheanAppIcon;
  }
}
