// <lethean-native-profiles-page> — design-canon reference for the
// per-platform "native profiles" applied at the artboard root via
// [data-platform]. Token-swap table, 4-column type ladder, 3-platform
// chrome-rules grid (with "Don't" callouts), 3-platform component
// contrast (Renew/Cancel pair rendered three ways).
//
// Ported from native-profiles.jsx > NativeProfilesReference. The full
// platform-specific control-panel mocks (~900 lines of source) are
// covered by sibling <lethean-control-panel-page> + <lethean-native-
// shells-page>; this page captures the canon, not the mocks.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

const TOKEN_ROWS: string[][] = [
  ['sans', '"Geist"', 'SF Pro Text', 'SF Pro Text', 'SF Pro Text'],
  ['mono', '"Geist Mono"', 'SF Mono', 'SF Mono', 'SF Mono'],
  ['display', '"Geist" 600', 'SF Pro Display', 'SF Pro Display', 'SF Pro Display'],
  ['body size', '14px', '13px', '17pt', '15pt'],
  ['base radius (--r-md)', '8px', '6px', '10px', '10px'],
  ['row height', '44px', '30px', '50px', '44px'],
  ['min hit target', '32px', '22px', '44pt', '44pt'],
  ['chrome', 'browser nav', 'NSToolbar + traffic lights + status bar', 'Large title + tab bar + sheets', '3-column split + sidebar'],
];

interface TypeSample {
  plat: string;
  platTag: string | null;
  fontFamily: string;
  display: string;
  body: string;
  displaySize: number;
  bodySize: number;
}

const TYPE_SAMPLES: TypeSample[] = [
  { plat: 'Web · default', platTag: null, fontFamily: 'var(--font-sans)', display: 'Geist 600 · 32 / -2.5%', body: 'Geist 400 · 14 / 1.55', displaySize: 26, bodySize: 13.5 },
  { plat: 'Darwin', platTag: 'darwin', fontFamily: '-apple-system, "SF Pro Text", sans-serif', display: 'SF Pro Display · 22 / -2.5%', body: 'SF Pro Text · 13 / 1.45', displaySize: 19, bodySize: 12 },
  { plat: 'iOS', platTag: 'ios', fontFamily: '-apple-system, "SF Pro Text", sans-serif', display: 'SF Pro Display · 34 / -2%', body: 'SF Pro Text · 17 / 1.4', displaySize: 28, bodySize: 15 },
  { plat: 'iPadOS', platTag: 'ipad', fontFamily: '-apple-system, "SF Pro Text", sans-serif', display: 'SF Pro Display · 26 / -2.5%', body: 'SF Pro Text · 15 / 1.45', displaySize: 22, bodySize: 13.5 },
];

const CHROME_RULES = [
  {
    plat: 'Darwin',
    body: 'Unified toolbar with traffic lights and segmented control. NSVisualEffectView vibrancy on the sidebar. ⌘-key shortcuts visible on hover. 30px row height. Status bar at the bottom shows version + Vi connection.',
    forbid: 'No big rounded buttons. No bottom tab bar. No large titles.',
  },
  {
    plat: 'iOS',
    body: 'Large title navigation bar. Grouped-inset tables (14px radius). Tab bar pinned to bottom with 4 destinations. Sheets for detail. 44pt minimum hit targets. Home indicator preserved.',
    forbid: 'No sidebar. No keyboard shortcuts. No menu bars.',
  },
  {
    plat: 'iPadOS',
    body: 'Three-column split view: primary sidebar, secondary list, detail. Toolbar shows ⌘-shortcuts because external keyboards are common. Density between Darwin and iOS — comfortable for both touch and trackpad.',
    forbid: 'No tab bar. No native iPhone-style navigation.',
  },
];

@customElement('lethean-native-profiles-page')
export class LetheanNativeProfilesPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _sectionTitle(eyebrow: string, title: string) {
    return html`
      <div>
        <div
          style="
            font-size: 11px; color: var(--brand-300);
            font-family: var(--font-mono); letter-spacing: 0.06em;
          "
        >${eyebrow}</div>
        <h2
          style="
            font-size: 22px; font-weight: 600;
            letter-spacing: -0.022em; color: var(--fg-0);
            margin: 4px 0 0;
          "
        >${title}</h2>
      </div>
    `;
  }

  private _renderTokenTable() {
    return html`
      <section>
        ${this._sectionTitle('TOKENS', 'What changes per platform')}
        <div
          style="
            margin-top: 14px;
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 8px; overflow: hidden;
          "
        >
          <div
            style="
              display: grid; grid-template-columns: 180px 1fr 1.2fr 1fr 1fr;
              padding: 10px 16px;
              background: var(--ink-1);
              border-bottom: 1px solid var(--line-1);
              font-size: 11px; font-family: var(--font-mono);
              letter-spacing: 0.04em;
              color: var(--fg-3); text-transform: uppercase;
            "
          >
            <div>TOKEN</div>
            <div>WEB · DEFAULT</div>
            <div>DARWIN</div>
            <div>iOS</div>
            <div>iPADOS</div>
          </div>
          ${TOKEN_ROWS.map(
            (r, i) => html`
              <div
                style="
                  display: grid; grid-template-columns: 180px 1fr 1.2fr 1fr 1fr;
                  padding: 10px 16px;
                  border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                  font-size: 13px; align-items: center;
                "
              >
                <div style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">${r[0]}</div>
                <div style="color: var(--fg-1);">${r[1]}</div>
                <div style="color: var(--fg-1);">${r[2]}</div>
                <div style="color: var(--fg-1);">${r[3]}</div>
                <div style="color: var(--fg-1);">${r[4]}</div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderTypeLadder() {
    return html`
      <section>
        ${this._sectionTitle('TYPE', 'The same words, four times')}
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px;">
          ${TYPE_SAMPLES.map(
            (s) => html`
              <div
                style="
                  padding: 18px;
                  background: var(--ink-2);
                  border: 1px solid var(--line-1);
                  border-radius: 8px;
                  font-family: ${s.fontFamily};
                  display: flex; flex-direction: column; gap: 12px;
                "
              >
                <div
                  style="
                    font-size: 11px; font-family: var(--font-mono);
                    letter-spacing: 0.04em;
                    color: var(--brand-300); text-transform: uppercase;
                  "
                >${s.plat}</div>
                <div
                  style="
                    font-size: ${s.displaySize}px;
                    font-weight: 700; letter-spacing: -0.025em;
                    color: var(--fg-0); line-height: 1.05;
                  "
                >Good morning, Sam.</div>
                <p style="font-size: ${s.bodySize}px; line-height: 1.5; color: var(--fg-2); margin: 0;">
                  <span class="editorial" style="font-style: italic; color: var(--fg-1);">Quiet night.</span>
                  One thing needs you, two I handled, four I'm watching. Here's the brief.
                </p>
                <div
                  style="
                    font-size: 10.5px; font-family: var(--font-mono);
                    color: var(--fg-4);
                    margin-top: auto; padding-top: 6px;
                    border-top: 1px solid var(--line-1);
                  "
                >
                  <div>display · ${s.display}</div>
                  <div>body · ${s.body}</div>
                </div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderChromeRules() {
    return html`
      <section>
        ${this._sectionTitle('CHROME', 'Platform grammar — what each surface owes the user')}
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 14px;">
          ${CHROME_RULES.map(
            (r) => html`
              <div
                style="
                  padding: 18px;
                  background: var(--ink-2); border: 1px solid var(--line-1);
                  border-radius: 8px;
                  display: flex; flex-direction: column; gap: 10px;
                "
              >
                <div style="font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--fg-0); letter-spacing: -0.015em;">
                  ${r.plat}
                </div>
                <p style="font-size: 13.5px; color: var(--fg-1); line-height: 1.5; margin: 0;">${r.body}</p>
                <div
                  style="
                    font-size: 12px; color: var(--warning-400);
                    padding: 8px 10px; border-radius: 6px;
                    background: color-mix(in oklch, var(--warning-500) 10%, transparent);
                    border: 1px solid color-mix(in oklch, var(--warning-500) 22%, transparent);
                    line-height: 1.45;
                  "
                >
                  <strong style="font-weight: 600;">Don't:</strong> ${r.forbid}
                </div>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  private _contrastFrame(label: string, body: TemplateResult) {
    return html`
      <div
        style="
          padding: 22px;
          background: var(--ink-2); border: 1px solid var(--line-1);
          border-radius: 8px;
          display: flex; flex-direction: column; gap: 14px;
          min-height: 160px;
        "
      >
        <div
          style="
            font-size: 11px; font-family: var(--font-mono); letter-spacing: 0.04em;
            color: var(--brand-300); text-transform: uppercase;
          "
        >${label}</div>
        <div
          style="
            flex: 1; display: flex; align-items: center; justify-content: center;
            background: var(--ink-1); border-radius: 6px;
            border: 1px solid var(--line-1); padding: 16px;
          "
        >${body}</div>
      </div>
    `;
  }

  private _renderComponentContrast() {
    return html`
      <section>
        ${this._sectionTitle('COMPONENTS', 'Same intent, native expression')}
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 14px;">
          ${this._contrastFrame(
            'Web · default',
            html`
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary">Renew now</button>
                <button class="btn btn-ghost">Cancel</button>
              </div>
            `
          )}
          ${this._contrastFrame(
            'Darwin · NSToolbar action',
            html`
              <div style="display: flex; gap: 6px;">
                <button
                  style="
                    height: 22px; padding: 0 10px; font-size: 11.5px; border-radius: 4px;
                    background: var(--brand-500); color: var(--fg-0);
                    border: 1px solid var(--brand-400); font-weight: 500;
                    display: inline-flex; align-items: center; gap: 6px;
                  "
                >
                  Renew now
                  <kbd style="font-family: var(--font-mono); font-size: 10px; opacity: 0.7;">⌘1</kbd>
                </button>
                <button
                  style="
                    height: 22px; padding: 0 10px; font-size: 11.5px; border-radius: 4px;
                    background: var(--ink-3); color: var(--fg-1);
                    border: 1px solid var(--line-1);
                    display: inline-flex; align-items: center; gap: 6px;
                  "
                >
                  Cancel
                  <kbd style="font-family: var(--font-mono); font-size: 10px; opacity: 0.7;">⎋</kbd>
                </button>
              </div>
            `
          )}
          ${this._contrastFrame(
            'iOS · sheet primary action',
            html`
              <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                <button
                  style="
                    height: 50px; border-radius: 12px;
                    background: var(--brand-500); color: var(--fg-0);
                    border: none; font-size: 17px; font-weight: 600;
                  "
                >Renew now</button>
                <button
                  style="
                    height: 50px; border-radius: 12px;
                    background: var(--ink-3); color: var(--brand-300);
                    border: none; font-size: 17px; font-weight: 500;
                  "
                >Cancel</button>
              </div>
            `
          )}
        </div>
      </section>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        data-brand="hostuk"
        style="
          width: 100%; min-height: 100%;
          padding: 32px;
          background: var(--ink-0);
          display: flex; flex-direction: column; gap: 28px;
          box-sizing: border-box;
          overflow: auto;
        "
      >
        <header style="max-width: 760px;">
          <div
            style="
              font-size: 11px; color: var(--brand-300);
              font-family: var(--font-mono); letter-spacing: 0.06em; margin-bottom: 8px;
            "
          >NATIVE PROFILES · v0.1</div>
          <h1
            style="
              font-size: 36px; font-weight: 700; letter-spacing: -0.025em;
              color: var(--fg-0); margin: 0; line-height: 1.05;
            "
          >
            Same brand, four platforms.
            <span class="editorial" style="font-style: italic; font-weight: 400; color: var(--fg-2);">
              The chrome changes; Vi doesn't.
            </span>
          </h1>
          <p style="font-size: 15px; color: var(--fg-2); margin-top: 12px; line-height: 1.55; max-width: 640px;">
            Our apps ship as native binaries — Wails on macOS/Windows, real native shells on
            iOS/iPadOS — not Electron, not a PWA. The brand palette and Vi's voice stay
            constant. Type, density, and chrome swap to feel native on each platform.
          </p>
        </header>

        ${this._renderTokenTable()}
        ${this._renderTypeLadder()}
        ${this._renderChromeRules()}
        ${this._renderComponentContrast()}

        <footer
          style="
            margin-top: 8px; padding: 16px 0 0;
            border-top: 1px solid var(--line-1);
            display: flex; justify-content: space-between; align-items: center;
            font-size: 12px; color: var(--fg-3);
            font-family: var(--font-mono);
          "
        >
          <span>tokens.css · [data-platform="…"] applied at the artboard root</span>
          <span>handoff for Claude Code · week of 11 Oct</span>
        </footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-native-profiles-page': LetheanNativeProfilesPage;
  }
}
