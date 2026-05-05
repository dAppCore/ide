// <lethean-splash-page> — demo of the splash + icon family. Two
// device-shaped frames showing iOS + Android splash side-by-side
// (rendered inside the existing iOS / Android frame primitives), then
// the IconShowcase plate below for the dock + construction notes.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../showcase/lethean-app-icon-eye';
import '../showcase/lethean-ios-splash';
import '../showcase/lethean-android-splash';
import '../showcase/lethean-icon-showcase';
import '../showcase/lethean-ios-frame';
import '../showcase/lethean-android-frame';

@customElement('lethean-splash-page')
export class LetheanSplashPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div style="background: var(--ink-0); min-height: 100%; padding: 36px; display: flex; flex-direction: column; gap: 36px;">
        <div>
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em;
            "
          >SPLASH SCREENS · APP ICONS</div>
          <h2 style="font-size: 24px; letter-spacing: -0.02em; margin-top: 6px;">
            Same eye, three brands —
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              one geometry across every store
            </span>
          </h2>
        </div>

        <!-- iOS + Android splash side-by-side, three brands -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
          ${[
            { brand: 'hostuk', name: 'Host UK', tag: 'hosting · made calm', corner: 'host.uk' },
            { brand: 'lethean', name: 'Lethean', tag: 'open source · ethically built', corner: 'lethean' },
            { brand: 'ofm', name: 'OFM', tag: 'creator agency · confident roster', corner: 'ofm' },
          ].map(
            (b) => html`
              <div data-brand=${b.brand} style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">
                  ${b.name.toUpperCase()} · iOS
                </div>
                <div style="width: 280px;">
                  <lethean-ios-frame>
                    <lethean-ios-splash
                      brand-name=${b.name}
                      tagline=${b.tag}
                      icon-corner=${b.corner}
                    ></lethean-ios-splash>
                  </lethean-ios-frame>
                </div>
              </div>
            `
          )}
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
          ${[
            { brand: 'hostuk', name: 'Host UK' },
            { brand: 'lethean', name: 'Lethean' },
            { brand: 'ofm', name: 'OFM' },
          ].map(
            (b) => html`
              <div data-brand=${b.brand} style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">
                  ${b.name.toUpperCase()} · Android
                </div>
                <div style="width: 280px;">
                  <lethean-android-frame>
                    <lethean-android-splash brand-name=${b.name}></lethean-android-splash>
                  </lethean-android-frame>
                </div>
              </div>
            `
          )}
        </div>

        <!-- Icon family + dock + construction notes -->
        <lethean-icon-showcase></lethean-icon-showcase>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-splash-page': LetheanSplashPage;
  }
}
