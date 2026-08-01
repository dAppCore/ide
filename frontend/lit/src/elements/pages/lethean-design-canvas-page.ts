// <lethean-design-canvas-page> — design canvas demo. Shows the
// section / artboard-frame / post-it primitives composed together,
// the way design-canvas.jsx exemplifies the design system on the
// React side. Visual structure only — pan/zoom + drag-reorder + inline
// edit from the source are not ported (they're canvas tooling, not
// component-library shape).

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../showcase/lethean-dc-section';
import '../showcase/lethean-dc-artboard-frame';
import '../showcase/lethean-dc-post-it';

const MARKETING = [
  { label: 'host.uk.com / home', w: 320, h: 480, brand: 'hostuk' as const },
  { label: 'host.uk.com / pricing', w: 320, h: 480, brand: 'hostuk' as const },
  { label: 'host.uk.com / for-creators', w: 320, h: 480, brand: 'hostuk' as const },
  { label: 'lthn.ai / home', w: 320, h: 480, brand: 'lethean' as const },
  { label: 'lthn.ai / lemma', w: 320, h: 480, brand: 'lethean' as const },
  { label: 'ofm.app / home', w: 320, h: 480, brand: 'ofm' as const },
];

const ONBOARDING = [
  { label: 'onboarding · welcome', w: 280, h: 420 },
  { label: 'onboarding · domain', w: 280, h: 420 },
  { label: 'onboarding · email', w: 280, h: 420 },
  { label: 'provisioning · live', w: 280, h: 420 },
  { label: 'order · confirm', w: 280, h: 420 },
];

const DASHBOARD = [
  { label: 'dashboard · summary', w: 360, h: 460 },
  { label: 'dashboard · subscriptions', w: 360, h: 460 },
  { label: 'dashboard · invoices', w: 360, h: 460 },
  { label: 'help · article', w: 360, h: 460 },
];

const COMMERCE = [
  { label: 'cart', w: 320, h: 460 },
  { label: 'checkout', w: 320, h: 460 },
  { label: 'confirm', w: 320, h: 460 },
  { label: 'transactional emails', w: 320, h: 460 },
];

const FRAME_BG: Record<'hostuk' | 'lethean' | 'ofm', string> = {
  hostuk: 'linear-gradient(135deg, color-mix(in oklch, oklch(0.78 0.18 38) 22%, var(--ink-1)), var(--ink-2))',
  lethean: 'linear-gradient(135deg, color-mix(in oklch, oklch(0.65 0.22 290) 22%, var(--ink-1)), var(--ink-2))',
  ofm: 'linear-gradient(135deg, color-mix(in oklch, oklch(0.72 0.20 200) 22%, var(--ink-1)), var(--ink-2))',
};

@customElement('lethean-design-canvas-page')
export class LetheanDesignCanvasPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _placeholder(label: string, brand?: 'hostuk' | 'lethean' | 'ofm') {
    const bg = brand ? FRAME_BG[brand] : 'var(--ink-2)';
    return html`
      <div
        style="
          width: 100%; height: 100%;
          background: ${bg};
          display: grid; place-items: center;
          padding: 24px; box-sizing: border-box;
        "
      >
        <div style="text-align: center;">
          <div
            style="
              font-size: 10.5px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.08em;
              margin-bottom: 14px;
            "
          >ARTBOARD</div>
          <div
            class="editorial"
            style="
              font-style: italic; font-size: 24px;
              color: var(--fg-1); letter-spacing: -0.01em;
              line-height: 1.2;
            "
          >${label}</div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          background-image:
            radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--fg-0) 6%, transparent) 1px, transparent 0);
          background-size: 24px 24px;
          padding-bottom: 96px;
        "
      >
        <!-- Title bar -->
        <div
          style="
            padding: 36px 56px 28px;
            border-bottom: 1px solid var(--line-1);
            display: flex; justify-content: space-between; align-items: baseline;
          "
        >
          <div>
            <div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--brand-300); letter-spacing: 0.1em;
                margin-bottom: 12px;
              "
            >DESIGN CANVAS · STATIC EXPORT</div>
            <h1 style="font-size: 36px; letter-spacing: -0.03em; margin: 0;">
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">All</span>
              the surfaces, in one room.
            </h1>
            <p style="font-size: 14px; color: var(--fg-3); margin: 8px 0 0;">
              Sections group surfaces by purpose. Frames hold per-surface
              artboards. Post-it notes annotate the design. Pan/zoom +
              drag-reorder are canvas-tool concerns, not component shape.
            </p>
          </div>
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.06em;
            "
          >
            ${MARKETING.length + ONBOARDING.length + DASHBOARD.length + COMMERCE.length}
            ARTBOARDS · 4 SECTIONS
          </div>
        </div>

        <!-- Sections -->
        <div style="padding-top: 56px; position: relative;">
          <lethean-dc-section
            title="Marketing surfaces"
            subtitle="The public-facing brand pages — hostuk / lethean / ofm."
          >
            ${MARKETING.map(
              (a) => html`
                <lethean-dc-artboard-frame .label=${a.label} .width=${a.w} .height=${a.h}>
                  ${this._placeholder(a.label, a.brand)}
                </lethean-dc-artboard-frame>
              `
            )}
          </lethean-dc-section>

          <div style="position: relative;">
            <lethean-dc-section
              title="Onboarding"
              subtitle="From signed-up to first-render. Vi narrates the gap."
            >
              ${ONBOARDING.map(
                (a) => html`
                  <lethean-dc-artboard-frame .label=${a.label} .width=${a.w} .height=${a.h}>
                    ${this._placeholder(a.label)}
                  </lethean-dc-artboard-frame>
                `
              )}
            </lethean-dc-section>
            <lethean-dc-post-it top="32px" right="80px" rotate="3">
              Provisioning is theatre.<br />
              Vi talks. The bar moves.<br />
              Time fills the silence.
            </lethean-dc-post-it>
          </div>

          <lethean-dc-section
            title="Dashboard + help"
            subtitle="The signed-in surfaces — running an account, reading the docs."
          >
            ${DASHBOARD.map(
              (a) => html`
                <lethean-dc-artboard-frame .label=${a.label} .width=${a.w} .height=${a.h}>
                  ${this._placeholder(a.label)}
                </lethean-dc-artboard-frame>
              `
            )}
          </lethean-dc-section>

          <div style="position: relative;">
            <lethean-dc-section
              title="Commerce"
              subtitle="Cart → checkout → confirm. Plus the transactional emails."
            >
              ${COMMERCE.map(
                (a) => html`
                  <lethean-dc-artboard-frame .label=${a.label} .width=${a.w} .height=${a.h}>
                    ${this._placeholder(a.label)}
                  </lethean-dc-artboard-frame>
                `
              )}
            </lethean-dc-section>
            <lethean-dc-post-it bottom="40px" left="120px" rotate="-4">
              Checkout is three calm<br />
              steps, never four.
            </lethean-dc-post-it>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-design-canvas-page': LetheanDesignCanvasPage;
  }
}
