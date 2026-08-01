import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const REAL_POSES: Record<string, string> = {
  master: '/lethean-3/assets/vi/vi-master.png',
  'peek-right': '/lethean-3/assets/vi/vi-peek-1.png',
  'peek-left': '/lethean-3/assets/vi/vi-peek-2.png',
};

const FEATHER = svg`
  <svg viewBox="0 0 16 16" width="100%" height="100%" aria-hidden="true">
    <path d="M11 2 C 7 2 4 5 4 9 L 4 13 L 11 6 Z M 4 13 L 8 9 M 6 11 L 9 11 M 5 12 L 7 12"
      stroke="currentColor" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

@customElement('lethean-vi')
export class LetheanVi extends LitElement {
  @property() pose = 'master';
  @property({ type: Number }) size = 64;
  @property() label = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const realSrc = REAL_POSES[this.pose];
    if (realSrc) {
      return html`
        <img
          src=${realSrc}
          alt=${this.label || `Vi (${this.pose})`}
          style="width: ${this.size}px; height: auto; display: block;"
          @error=${this.onImageFail}
        />
      `;
    }
    return this.renderPlaceholder();
  }

  private onImageFail = (e: Event) => {
    // Replace failed image with the placeholder via property toggle
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    this.requestUpdate();
  };

  private renderPlaceholder() {
    return html`
      <div
        style="
          width: ${this.size}px;
          height: ${this.size}px;
          border-radius: 16px;
          border: 1px dashed var(--line-3, var(--line-2));
          background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2));
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; padding: 12px; text-align: center;
          color: var(--brand-200);
        "
      >
        <div style="width: ${Math.max(20, this.size * 0.45)}px; height: ${Math.max(20, this.size * 0.45)}px;">${FEATHER}</div>
        <div style="font-size: ${Math.max(9, this.size * 0.08)}px; font-family: var(--font-mono); letter-spacing: 0.05em;">
          VI · ${this.pose.toUpperCase()}
        </div>
        ${this.label
          ? html`<div style="font-size: 11px; color: var(--fg-3); line-height: 1.3;">${this.label}</div>`
          : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-vi': LetheanVi;
  }
}
