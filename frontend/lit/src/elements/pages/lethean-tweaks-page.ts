// <lethean-tweaks-page> — demo of the full tweaks-panel family. Panel
// always-open (no host-protocol gating), preview surface behind shows
// what the controls would govern in a real design-tool context.

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '../forms/lethean-tweaks-panel';
import '../forms/lethean-tweak-section';
import '../forms/lethean-tweak-slider';
import '../forms/lethean-tweak-toggle';
import '../forms/lethean-tweak-radio';
import '../forms/lethean-tweak-select';
import '../forms/lethean-tweak-text';
import '../forms/lethean-tweak-number';
import '../forms/lethean-tweak-color';
import '../forms/lethean-tweak-button';

@customElement('lethean-tweaks-page')
export class LetheanTweaksPage extends LitElement {
  @state() private _fontSize = 16;
  @state() private _density: 'compact' | 'regular' | 'comfy' = 'regular';
  @state() private _primary = '#D97757';
  @state() private _dark = false;
  @state() private _label = 'Hello world';
  @state() private _padding = 16;
  @state() private _theme = 'classic';

  protected createRenderRoot() {
    return this;
  }

  render() {
    const padBy: Record<string, number> = { compact: 8, regular: 16, comfy: 24 };
    const previewBg = this._dark ? '#1a1a1a' : '#fafaf6';
    const previewFg = this._dark ? '#f6f4ef' : '#29261b';

    return html`
      <div
        style="
          width: 100%; min-height: 100%;
          background: ${previewBg};
          color: ${previewFg};
          padding: 36px;
          font-family: 'Inter', system-ui, sans-serif;
          box-sizing: border-box;
        "
      >
        <div style="max-width: 720px; margin: 0 auto;">
          <h1 style="margin: 0 0 16px; letter-spacing: -0.02em;">Tweaks panel demo</h1>
          <p style="font-size: 13px; opacity: 0.7; margin: 0 0 24px;">
            Drag the panel header to move it. Drag the segmented control by
            pointer, scrub the number-label horizontally, twiddle the slider
            and toggle. The preview card on the left reflects every change.
          </p>

          <!-- preview card driven by tweak state -->
          <div
            style="
              padding: ${padBy[this._density] || this._padding}px;
              border-radius: 12px;
              background: ${this._dark ? '#252525' : '#fff'};
              border: 1px solid ${this._dark ? '#333' : '#eee'};
              font-size: ${this._fontSize}px;
            "
          >
            <div
              style="
                display: inline-block;
                padding: 4px 10px;
                border-radius: 999px;
                background: ${this._primary};
                color: #fff;
                font-size: ${this._fontSize * 0.7}px;
                margin-bottom: 10px;
              "
            >${this._theme}</div>
            <div style="font-weight: 600;">${this._label}</div>
            <div style="opacity: 0.65; margin-top: 6px; font-size: ${this._fontSize * 0.85}px;">
              Density · ${this._density} · padding ${padBy[this._density] || this._padding}px
            </div>
          </div>
        </div>

        <lethean-tweaks-panel always-open>
          <lethean-tweak-section label="Typography"></lethean-tweak-section>
          <lethean-tweak-slider
            label="Font size"
            .value=${this._fontSize}
            min="10"
            max="32"
            unit="px"
            @tweak-change=${(e: CustomEvent<number>) => (this._fontSize = e.detail)}
          ></lethean-tweak-slider>
          <lethean-tweak-text
            label="Label"
            .value=${this._label}
            @tweak-change=${(e: CustomEvent<string>) => (this._label = e.detail)}
          ></lethean-tweak-text>

          <lethean-tweak-section label="Layout"></lethean-tweak-section>
          <lethean-tweak-radio
            label="Density"
            .value=${this._density}
            .options=${['compact', 'regular', 'comfy']}
            @tweak-change=${(e: CustomEvent<string>) =>
              (this._density = e.detail as 'compact' | 'regular' | 'comfy')}
          ></lethean-tweak-radio>
          <lethean-tweak-number
            label="Padding"
            .value=${this._padding}
            min="0"
            max="64"
            unit="px"
            @tweak-change=${(e: CustomEvent<number>) => (this._padding = e.detail)}
          ></lethean-tweak-number>

          <lethean-tweak-section label="Theme"></lethean-tweak-section>
          <lethean-tweak-color
            label="Primary"
            .value=${this._primary}
            @tweak-change=${(e: CustomEvent<string>) => (this._primary = e.detail)}
          ></lethean-tweak-color>
          <lethean-tweak-toggle
            label="Dark mode"
            .value=${this._dark}
            @tweak-change=${(e: CustomEvent<boolean>) => (this._dark = e.detail)}
          ></lethean-tweak-toggle>
          <lethean-tweak-select
            label="Theme preset"
            .value=${this._theme}
            .options=${['classic', 'editorial', 'mono']}
            @tweak-change=${(e: CustomEvent<string>) => (this._theme = e.detail)}
          ></lethean-tweak-select>

          <lethean-tweak-section label="Actions"></lethean-tweak-section>
          <lethean-tweak-button label="Save preset"></lethean-tweak-button>
          <lethean-tweak-button label="Reset" secondary></lethean-tweak-button>
        </lethean-tweaks-panel>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-tweaks-page': LetheanTweaksPage;
  }
}
