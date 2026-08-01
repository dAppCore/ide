import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './lethean-raven';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { font: number; dot: number }> = {
  sm: { font: 14, dot: 8 },
  md: { font: 17, dot: 10 },
  lg: { font: 22, dot: 12 },
};

@customElement('lethean-brand-mark')
export class LetheanBrandMark extends LitElement {
  @property() size: Size = 'md';
  @property() name = 'Host UK';
  @property() subdomain = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const s = SIZES[this.size] || SIZES.md;
    return html`
      <div style="display: inline-flex; align-items: center; gap: 10px;">
        <div
          style="
            width: ${s.font + 8}px;
            height: ${s.font + 8}px;
            border-radius: 6px;
            background: var(--brand-500);
            display: grid;
            place-items: center;
            box-shadow: inset 0 1px 0 var(--line-2);
          "
        >
          <lethean-raven size=${s.font - 2} color="var(--fg-0)"></lethean-raven>
        </div>
        <div style="display: inline-flex; align-items: baseline; gap: 6px;">
          <span
            style="
              font-weight: 600;
              font-size: ${s.font}px;
              letter-spacing: -0.02em;
              color: var(--fg-0);
            "
          >${this.name}</span>
          ${this.subdomain
            ? html`<span style="font-family: var(--font-mono); font-size: ${s.font - 4}px; color: var(--fg-3);">/${this.subdomain}</span>`
            : html``}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-brand-mark': LetheanBrandMark;
  }
}
