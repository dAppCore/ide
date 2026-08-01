// <lethean-app-icon-eye> — geometric brand-colourable app icon based
// on the bird-eye motif (squircle with iris/pupil). Looks strong at
// every scale (16/32/64/128/512 etc.). Ported from
// splash-icons.jsx > AppIcon.
//
// Sibling to <lethean-app-icon> which uses the raven silhouette —
// both live in showcase/ for design-system exploration. The eye is
// what the splash screens (iOS, Android, dock showcase) use; the raven
// is for nav-bar brand-mark contexts. Snider can pick the canonical
// app-mark per surface.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-app-icon-eye')
export class LetheanAppIconEye extends LitElement {
  @property({ type: Number }) size = 128;
  /** Optional small mono caption shown in the bottom-left corner at sizes ≥96px. */
  @property() corner = '';

  protected createRenderRoot() {
    return this;
  }

  render() {
    const s = this.size;
    const r = Math.round(s * 0.234); // iOS squircle proportion
    const eyeShadowPx = Math.max(1, s * 0.012);
    const shadow =
      s >= 64
        ? `inset 0 1px 0 0 color-mix(in oklch, var(--fg-0) 12%, transparent), 0 ${Math.round(s * 0.06)}px ${Math.round(s * 0.12)}px rgba(0,0,0,0.32)`
        : 'none';
    return html`
      <div
        style="
          width: ${s}px;
          height: ${s}px;
          border-radius: ${r}px;
          background: var(--brand-700);
          position: relative;
          overflow: hidden;
          box-shadow: ${shadow};
        "
      >
        <!-- radial brand wash -->
        <div
          style="
            position: absolute; inset: 0;
            background: radial-gradient(circle at 30% 30%, var(--brand-500), var(--brand-800) 80%);
          "
        ></div>

        <!-- eye shape -->
        <div
          style="
            position: absolute;
            left: 50%; top: 50%;
            transform: translate(-50%, -50%);
            width: ${s * 0.62}px; height: ${s * 0.42}px;
            border-radius: 50%;
            background: var(--ink-0);
            box-shadow: inset 0 0 0 ${eyeShadowPx}px color-mix(in oklch, var(--brand-300) 50%, transparent);
            display: grid; place-items: center;
          "
        >
          <!-- iris -->
          <div
            style="
              width: ${s * 0.22}px; height: ${s * 0.22}px;
              border-radius: 50%;
              background: radial-gradient(circle at 35% 30%, var(--gold-300), var(--brand-500) 60%, var(--brand-700) 100%);
              box-shadow: 0 0 ${s * 0.06}px var(--brand-400);
              position: relative;
            "
          >
            <!-- highlight -->
            <span
              style="
                position: absolute; top: 18%; left: 22%;
                width: ${s * 0.05}px; height: ${s * 0.05}px;
                border-radius: 50%;
                background: var(--fg-0);
              "
            ></span>
          </div>
        </div>

        ${this.corner && s >= 96
          ? html`<div
              style="
                position: absolute;
                left: ${s * 0.1}px; bottom: ${s * 0.1}px;
                font-size: ${s * 0.07}px;
                font-family: var(--font-mono);
                color: color-mix(in oklch, var(--fg-0) 36%, transparent);
                letter-spacing: 0.06em;
              "
            >${this.corner}</div>`
          : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-app-icon-eye': LetheanAppIconEye;
  }
}
