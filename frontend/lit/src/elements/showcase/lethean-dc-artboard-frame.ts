// <lethean-dc-artboard-frame> — titled artboard card inside a
// <lethean-dc-section>. Label header (with grip-handle hint) + framed
// content area sized to the configured width × height. Slot for the
// artboard content (typically a scaled-down rendering of an actual
// page surface).
//
// Ported from design-canvas.jsx > DCArtboardFrame, visual-only — drag
// reorder + rename mechanics are not implemented.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-dc-artboard-frame')
export class LetheanDcArtboardFrame extends LitElement {
  @property() label = '';
  @property({ type: Number }) width = 260;
  @property({ type: Number }) height = 480;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        style="
          display: flex; flex-direction: column; gap: 8px;
          flex-shrink: 0;
          width: ${this.width}px;
        "
      >
        <div
          style="
            display: flex; align-items: center; gap: 8px;
            font-size: 12px; color: var(--fg-3);
            font-family: var(--font-mono); letter-spacing: 0.04em;
          "
        >
          <i class="fa-solid fa-grip-vertical" style="font-size: 11px; color: var(--fg-4);"></i>
          ${this.label}
        </div>
        <div
          style="
            width: ${this.width}px; height: ${this.height}px;
            background: var(--ink-1);
            border: 1px solid var(--line-2);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 12px 32px color-mix(in oklch, #000 18%, transparent);
          "
        >
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-dc-artboard-frame': LetheanDcArtboardFrame;
  }
}
