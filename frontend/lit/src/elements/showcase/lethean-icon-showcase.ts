// <lethean-icon-showcase> — design-system display plate showing the
// app icon at multiple sizes across multiple brands, plus a macOS-dock
// row contrasting our icons against generic placeholders, plus three
// construction-note cards explaining the geometry / brand wash / pupil.
//
// Ported from splash-icons.jsx > IconShowcase + Note.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './lethean-app-icon-eye';

export interface IconShowcaseBrand {
  /** Value for `data-brand` (must match a tokens.css selector — `hostuk`, `lethean`, `ofm`). */
  brand: string;
  label: string;
}

const DEFAULT_BRANDS: IconShowcaseBrand[] = [
  { brand: 'hostuk', label: 'Host UK' },
  { brand: 'lethean', label: 'Lethean' },
  { brand: 'ofm', label: 'OFM' },
];

const SIZES = [16, 32, 64, 128] as const;

const NOTES: Array<{ title: string; body: string }> = [
  {
    title: 'Geometry',
    body: 'Squircle (iOS 23.4% radius). Eye occupies central 62% × 42%. Iris is 22% diameter.',
  },
  {
    title: 'Brand wash',
    body: 'Radial gradient brand-500 → brand-800 from top-left. Hue is the only thing that changes between brands.',
  },
  {
    title: 'Pupil',
    body: "Iris uses gold-300 hot-spot fading to brand-500/700. Same geometry as Vi's eye — the studio mark.",
  },
];

@customElement('lethean-icon-showcase')
export class LetheanIconShowcase extends LitElement {
  @property({ attribute: false }) brands: IconShowcaseBrand[] = DEFAULT_BRANDS;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        style="
          width: 100%; height: 100%;
          background: var(--ink-0);
          padding: 36px;
          display: flex; flex-direction: column; gap: 28px;
          box-sizing: border-box;
        "
      >
        <div>
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em;
            "
          >APP ICONS · THREE BRANDS · ONE GEOMETRY</div>
          <h2 style="font-size: 24px; letter-spacing: -0.02em; margin-top: 6px;">
            Same eye.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              Different cast.
            </span>
          </h2>
        </div>

        <!-- brand rows: 3 brands × 4 sizes -->
        <div
          style="
            display: grid;
            grid-template-columns: 100px 1fr 1fr 1fr 1fr;
            gap: 24px; align-items: center;
          "
        >
          <div></div>
          ${SIZES.map(
            (s) => html`<div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--fg-4); text-align: center;
              "
            >${s}px</div>`
          )}

          ${this.brands.map(
            (b) => html`
              <div data-brand=${b.brand} style="font-size: 13px; color: var(--fg-1); font-weight: 500;">
                ${b.label}
              </div>
              ${SIZES.map(
                (s) => html`
                  <div data-brand=${b.brand} style="display: grid; place-items: center;">
                    <lethean-app-icon-eye size=${String(s)}></lethean-app-icon-eye>
                  </div>
                `
              )}
            `
          )}
        </div>

        <!-- macOS dock row -->
        <div
          style="
            margin-top: 8px;
            padding: 16px 22px;
            background: color-mix(in oklch, var(--ink-3) 70%, transparent);
            border: 1px solid var(--line-2);
            border-radius: 16px;
            backdrop-filter: blur(20px);
            display: flex; align-items: center; gap: 14px; justify-content: center;
          "
        >
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); margin-right: 10px;
            "
          >macOS dock · 64px</div>
          ${this.brands.map(
            (b) => html`
              <div data-brand=${b.brand}>
                <lethean-app-icon-eye size="56"></lethean-app-icon-eye>
              </div>
            `
          )}
          <span style="width: 1px; height: 32px; background: var(--line-2); margin: 0 6px;"></span>
          <!-- "other apps" for visual contrast -->
          <div
            style="
              width: 56px; height: 56px; border-radius: 13px;
              background: linear-gradient(135deg, #2af, #06f);
              display: grid; place-items: center;
              color: #fff; font-size: 18px; font-weight: 700;
            "
          >S</div>
          <div
            style="
              width: 56px; height: 56px; border-radius: 13px;
              background: #1a1a1a;
              display: grid; place-items: center;
              color: #fff; font-size: 18px; font-weight: 700;
            "
          >X</div>
        </div>

        <!-- construction notes -->
        <div
          style="
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;
            font-size: 12px; color: var(--fg-2); line-height: 1.55;
          "
        >
          ${NOTES.map(
            (n) => html`
              <div
                style="
                  padding: 12px 14px;
                  background: var(--ink-2);
                  border: 1px solid var(--line-1);
                  border-radius: 8px;
                "
              >
                <div
                  style="
                    font-size: 11px; font-family: var(--font-mono);
                    color: var(--brand-300); letter-spacing: 0.06em;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                  "
                >${n.title}</div>
                <div>${n.body}</div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-icon-showcase': LetheanIconShowcase;
  }
}
