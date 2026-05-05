// <lethean-android-splash> — Android launch screen. Smaller status bar
// (no Dynamic Island), centered icon + wordmark, indeterminate spinner,
// home pill at the bottom. No "studio" footer — Android splash
// convention is sparser than iOS.
//
// Ported from splash-icons.jsx > AndroidSplash.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './lethean-app-icon-eye';

@customElement('lethean-android-splash')
export class LetheanAndroidSplash extends LitElement {
  @property() brandName = 'Host UK';

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
        <!-- status bar -->
        <div
          style="
            height: 32px; flex-shrink: 0;
            display: flex; justify-content: space-between; align-items: center;
            padding: 0 16px;
            font-size: 13px; color: var(--fg-0); font-weight: 500;
          "
        >
          <span>9:41</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <i class="fa-solid fa-signal" style="font-size: 11px; color: var(--fg-0);"></i>
            <i class="fa-solid fa-wifi" style="font-size: 11px; color: var(--fg-0);"></i>
            <span
              style="
                width: 22px; height: 10px;
                border: 1.5px solid var(--fg-0);
                border-radius: 2px;
                position: relative;
                display: inline-block;
              "
            >
              <span
                style="
                  position: absolute; inset: 1px;
                  width: 70%; background: var(--fg-0);
                "
              ></span>
            </span>
          </div>
        </div>

        <div
          style="
            flex: 1;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 18px; position: relative;
          "
        >
          <!-- brand glow -->
          <div
            style="
              position: absolute; inset: 0; opacity: 0.5;
              background:
                radial-gradient(ellipse 60% 80% at 70% 20%, color-mix(in oklch, var(--brand-500) 22%, transparent), transparent 60%);
            "
          ></div>

          <lethean-app-icon-eye
            size="96"
            style="position: relative; z-index: 1;"
          ></lethean-app-icon-eye>

          <div style="position: relative; z-index: 1; text-align: center;">
            <div
              style="
                font-size: 22px; color: var(--fg-0);
                font-weight: 500; letter-spacing: -0.015em;
              "
            >${this.brandName}</div>
          </div>

          <!-- indeterminate progress -->
          <div
            style="
              position: relative; z-index: 1;
              width: 32px; height: 32px; margin-top: 16px;
              border-radius: 999px;
              border: 2px solid var(--line-2);
              border-top-color: var(--brand-300);
              animation: leAndroidSpin 1s linear infinite;
            "
          ></div>
        </div>

        <div style="height: 24px; flex-shrink: 0; display: grid; place-items: center;">
          <span
            style="
              width: 104px; height: 4px; border-radius: 2px;
              background: var(--fg-1);
            "
          ></span>
        </div>

        <style>
          @keyframes leAndroidSpin {
            to { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-android-splash': LetheanAndroidSplash;
  }
}
