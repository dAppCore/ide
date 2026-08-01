// <lethean-dc-post-it> — rotated post-it note callout for the design
// canvas. Position via top/left/right/bottom (in canvas space when
// inside DCViewport), rotate slightly for the hand-pinned look,
// configurable width.
//
// Ported from design-canvas.jsx > DCPostIt.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-dc-post-it')
export class LetheanDcPostIt extends LitElement {
  @property() top = '';
  @property() left = '';
  @property() right = '';
  @property() bottom = '';
  @property({ type: Number }) rotate = -2;
  @property({ type: Number }) width = 180;

  protected createRenderRoot() {
    return this;
  }

  render() {
    const pos: string[] = [];
    if (this.top) pos.push(`top: ${this.top}`);
    if (this.left) pos.push(`left: ${this.left}`);
    if (this.right) pos.push(`right: ${this.right}`);
    if (this.bottom) pos.push(`bottom: ${this.bottom}`);
    return html`
      <div
        style="
          position: absolute;
          ${pos.join(';')};
          width: ${this.width}px;
          padding: 14px 16px;
          background: #fffce0;
          color: #2b2718;
          border-radius: 4px;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.18),
            0 12px 28px rgba(0,0,0,0.25);
          transform: rotate(${this.rotate}deg);
          font-family: 'Caveat', 'Indie Flower', cursive, sans-serif;
          font-size: 16px; line-height: 1.3;
          z-index: 5;
        "
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-dc-post-it': LetheanDcPostIt;
  }
}
