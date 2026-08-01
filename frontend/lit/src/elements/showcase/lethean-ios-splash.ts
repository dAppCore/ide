// <lethean-ios-splash> — iOS launch screen. Status bar (9:41 + Dynamic
// Island + signal/wifi/battery), brand glow, centered app icon + brand
// wordmark + tagline, "a lethean studio" footer, home indicator.
//
// Ported from splash-icons.jsx > IOSSplash.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './lethean-app-icon-eye';

@customElement('lethean-ios-splash')
export class LetheanIOSSplash extends LitElement {
  @property() brandName = 'Host UK';
  @property() tagline = 'hosting · made calm';
  @property() footer = 'a lethean studio';
  /** Optional corner caption on the icon (matches source's brand label). */
  @property() iconCorner = 'host.uk';

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        style="
          width: 100%;
          height: 100%;
          background: var(--ink-0);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        "
      >
        <!-- faux status bar -->
        <div
          style="
            height: 47px; flex-shrink: 0;
            display: grid; grid-template-columns: 1fr auto 1fr;
            align-items: center; padding: 0 28px;
            font-size: 15px; font-weight: 600; color: var(--fg-0);
          "
        >
          <span style="text-align: left; font-family: -apple-system, 'SF Pro Display', system-ui;">9:41</span>
          <span style="width: 96px; height: 30px; background: #000; border-radius: 18px;"></span>
          <div style="display: flex; justify-content: flex-end; gap: 5px; align-items: center;">
            <i class="fa-solid fa-signal" style="font-size: 13px; color: var(--fg-0);"></i>
            <i class="fa-solid fa-wifi" style="font-size: 13px; color: var(--fg-0);"></i>
            <span
              style="
                width: 24px; height: 11px;
                border: 1.5px solid var(--fg-0);
                border-radius: 3px;
                position: relative;
                display: inline-block;
              "
            >
              <span
                style="
                  position: absolute; inset: 1.5px;
                  width: 82%; background: var(--fg-0);
                  border-radius: 1px;
                "
              ></span>
            </span>
          </div>
        </div>

        <!-- brand glow (radial wash from upper-right of brand-500) -->
        <div
          style="
            position: absolute; inset: 0;
            opacity: 0.4;
            background:
              radial-gradient(ellipse 60% 80% at 70% 20%, color-mix(in oklch, var(--brand-500) 22%, transparent), transparent 60%);
          "
        ></div>

        <!-- centered mark + word -->
        <div
          style="
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 24px;
            position: relative;
            z-index: 1;
          "
        >
          <lethean-app-icon-eye size="108" corner=${this.iconCorner}></lethean-app-icon-eye>
          <div style="text-align: center;">
            <div
              style="
                font-size: 24px; color: var(--fg-0);
                font-weight: 600; letter-spacing: -0.02em;
              "
            >${this.brandName}</div>
            <div
              style="
                font-size: 13px; color: var(--fg-3);
                margin-top: 4px; font-family: var(--font-mono);
              "
            >${this.tagline}</div>
          </div>
        </div>

        <!-- footer mark -->
        <div
          style="
            padding: 16px 0 28px; text-align: center;
            font-size: 11px; color: var(--fg-4);
            font-family: var(--font-mono); letter-spacing: 0.06em;
            position: relative; z-index: 1;
          "
        >${this.footer}</div>

        <!-- home indicator -->
        <div
          style="
            height: 34px; flex-shrink: 0;
            display: grid; place-items: center;
            position: relative; z-index: 1;
          "
        >
          <span
            style="
              width: 134px; height: 5px; border-radius: 3px;
              background: var(--fg-0);
            "
          ></span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-ios-splash': LetheanIOSSplash;
  }
}
