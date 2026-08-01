// <lethean-native-shells-page> — proves the design system holds across
// surfaces. Three frames side-by-side (Desktop · iOS · Web), each
// wrapping the same shared "Account settings" body with surface-
// appropriate density, chrome, and affordances.
//
// Ported from native-shells.jsx as a single composite demo page.
// Simplified vs the source: 3 surfaces (not 4), no Android frame, no
// Empty-state variant; the source's full sidebar nav is replaced by a
// minimal entry-list to keep the demo page legible at side-by-side
// scale.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

interface SettingsRowSpec {
  label: string;
  value?: TemplateResult | string;
  action?: string;
  toggle?: boolean;
}

interface SettingsSectionSpec {
  tag: string;
  rows: SettingsRowSpec[];
}

@customElement('lethean-native-shells-page')
export class LetheanNativeShellsPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _sections(): SettingsSectionSpec[] {
    return [
      {
        tag: 'Profile',
        rows: [
          { label: 'Name', value: 'Ada Patel', action: 'edit' },
          { label: 'Email', value: 'ada@northnotes.co.uk', action: 'edit' },
          { label: 'Workspace', value: 'North Notes Ltd', action: 'switch' },
        ],
      },
      {
        tag: 'Security',
        rows: [
          {
            label: 'Two-factor authentication',
            value: html`<span class="pill pill-success" style="font-size: 11px;">On · Authenticator</span>`,
            action: 'manage',
          },
          {
            label: 'Recovery codes',
            value: html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">10 unused</span>`,
            action: 'view',
          },
          {
            label: 'Active sessions',
            value: html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">3 devices</span>`,
            action: 'review',
          },
        ],
      },
      {
        tag: 'Subscription',
        rows: [
          { label: 'Current plan', value: 'Standard · annual', action: 'change' },
          {
            label: 'Renews',
            value: html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">14 Mar 2027 · £144/yr</span>`,
          },
          {
            label: 'Payment method',
            value: html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">Visa · 4242</span>`,
            action: 'update',
          },
        ],
      },
      {
        tag: 'Notifications',
        rows: [
          { label: 'Email alerts', toggle: true },
          { label: 'Push (mobile)', toggle: false },
          { label: 'Slack channel', toggle: true },
        ],
      },
    ];
  }

  private _toggle(on: boolean, surface: 'desktop' | 'ios' | 'web') {
    const w = surface === 'web' || surface === 'desktop' ? 36 : 44;
    const h = surface === 'web' || surface === 'desktop' ? 20 : 24;
    const knob = h - 4;
    return html`
      <div
        style="
          width: ${w}px; height: ${h}px; border-radius: 999px;
          background: ${on ? 'var(--brand-500)' : 'var(--ink-4)'};
          border: 1px solid ${on ? 'var(--brand-400)' : 'var(--line-2)'};
          position: relative;
        "
      >
        <div
          style="
            position: absolute; top: 1px;
            left: ${on ? w - knob - 3 : 1}px;
            width: ${knob}px; height: ${knob}px;
            border-radius: 999px; background: var(--fg-0);
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          "
        ></div>
      </div>
    `;
  }

  private _row(r: SettingsRowSpec, surface: 'desktop' | 'ios' | 'web', isLast: boolean) {
    const dense = surface === 'desktop' || surface === 'web';
    const rowH = dense ? 40 : 56;
    const fontBody = dense ? 13 : 15;
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: ${dense ? '160px 1fr auto' : '1fr auto'};
          align-items: center;
          min-height: ${rowH}px;
          padding: ${dense ? '0 14px' : '0 18px'};
          border-bottom: ${isLast ? 'none' : '1px solid var(--line-1)'};
          gap: 12px;
        "
      >
        <div
          style="
            font-size: ${fontBody}px;
            color: ${dense ? 'var(--fg-2)' : 'var(--fg-0)'};
          "
        >${r.label}</div>
        ${dense
          ? html`
              <div style="font-size: ${fontBody}px; color: var(--fg-0); display: flex; align-items: center; gap: 10px;">
                ${r.toggle === undefined ? r.value ?? '' : ''}
              </div>
              ${r.toggle === undefined && r.action
                ? html`
                    <button
                      style="
                        background: transparent; border: 1px solid var(--line-2);
                        color: var(--fg-1); padding: 4px 10px;
                        border-radius: 5px; font-size: 12px;
                      "
                    >${r.action}</button>
                  `
                : html``}
              ${r.toggle !== undefined ? this._toggle(r.toggle, surface) : html``}
            `
          : html`
              ${r.toggle === undefined && r.value !== undefined
                ? html`
                    <div style="font-size: 13.5px; color: var(--fg-3); display: flex; align-items: center; gap: 8px;">
                      ${r.value}
                      ${r.action ? html`<i class="fa-solid fa-chevron-right" style="font-size: 11px; color: var(--fg-4);"></i>` : html``}
                    </div>
                  `
                : html``}
              ${r.toggle !== undefined ? this._toggle(r.toggle, surface) : html``}
            `}
      </div>
    `;
  }

  private _settingsBody(surface: 'desktop' | 'ios' | 'web') {
    const dense = surface === 'desktop' || surface === 'web';
    const padX = dense ? 22 : 16;
    return html`
      <div
        style="
          display: flex; flex-direction: column;
          background: var(--ink-1);
          width: 100%; height: 100%;
          overflow: hidden; box-sizing: border-box;
        "
      >
        <div
          style="
            padding: ${dense ? '16px 22px 12px' : '14px 18px 10px'};
            border-bottom: 1px solid var(--line-1);
            flex-shrink: 0;
          "
        >
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.06em;
            "
          >${dense ? 'ACCOUNT · SETTINGS' : 'Settings'}</div>
          ${dense
            ? html`<h1 style="font-size: 20px; letter-spacing: -0.02em; color: var(--fg-0); margin: 4px 0 0;">Account settings</h1>`
            : html`<div style="font-size: 22px; color: var(--fg-0); font-weight: 600; letter-spacing: -0.015em; margin-top: 4px;">Settings</div>`}
        </div>
        <div style="flex: 1; overflow: auto; padding: ${dense ? '16px 0 24px' : '10px 0 60px'};">
          ${this._sections().map(
            (s, idx) => html`
              <section style="margin-top: ${idx === 0 ? '0' : dense ? '18px' : '24px'}; padding: ${dense ? `0 ${padX}px` : '0'};">
                <div
                  style="
                    font-size: 11px; font-family: var(--font-mono);
                    color: var(--fg-4); letter-spacing: 0.08em;
                    padding: ${dense ? '0 4px 8px' : `4px ${padX}px 8px`};
                  "
                >${s.tag.toUpperCase()}</div>
                <div
                  style="
                    background: var(--ink-2);
                    border: 1px solid var(--line-1);
                    border-left: ${surface === 'ios' ? 'none' : '1px solid var(--line-1)'};
                    border-right: ${surface === 'ios' ? 'none' : '1px solid var(--line-1)'};
                    border-radius: ${surface === 'ios' ? '0' : '10px'};
                    overflow: hidden;
                  "
                >
                  ${s.rows.map((r, i) => this._row(r, surface, i === s.rows.length - 1))}
                </div>
              </section>
            `
          )}
        </div>
        ${surface === 'desktop' ? this._desktopStatusBar() : html``}
      </div>
    `;
  }

  private _desktopStatusBar() {
    return html`
      <div
        style="
          height: 26px; flex-shrink: 0;
          border-top: 1px solid var(--line-1);
          background: var(--ink-2);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 14px;
          font-size: 11px; font-family: var(--font-mono); color: var(--fg-3);
        "
      >
        <div style="display: flex; gap: 14px;">
          <span>
            <i class="fa-solid fa-circle-check" style="font-size: 9px; color: var(--success-400); margin-right: 4px;"></i>
            Synced · 14:02
          </span>
          <span style="color: var(--fg-4);">·</span>
          <span>v0.42.7</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="color: var(--fg-4);">Press</span>
          <kbd style="padding: 1px 6px; background: var(--ink-3); border: 1px solid var(--line-2); border-radius: 3px; font-size: 10px;">⌘K</kbd>
          <span style="color: var(--fg-4);">for Vi</span>
        </div>
      </div>
    `;
  }

  private _renderDesktopFrame() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div
          style="
            font-size: 11px; font-family: var(--font-mono);
            color: var(--fg-4); letter-spacing: 0.04em; padding-left: 4px;
          "
        >MACOS · WAILS · 720×460</div>
        <div
          style="
            width: 720px; height: 460px;
            background: var(--ink-0); border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--line-2);
            box-shadow: 0 28px 56px color-mix(in oklch, #000 35%, transparent);
            display: flex; flex-direction: column;
          "
        >
          <div
            style="
              height: 32px; flex-shrink: 0;
              background: var(--ink-2);
              border-bottom: 1px solid var(--line-1);
              display: grid; grid-template-columns: auto 1fr auto;
              align-items: center; padding: 0 12px;
            "
          >
            <div style="display: flex; gap: 8px;">
              <span style="width: 12px; height: 12px; border-radius: 999px; background: #ff5f57; border: 0.5px solid rgba(0,0,0,0.2);"></span>
              <span style="width: 12px; height: 12px; border-radius: 999px; background: #febc2e; border: 0.5px solid rgba(0,0,0,0.2);"></span>
              <span style="width: 12px; height: 12px; border-radius: 999px; background: #28c840; border: 0.5px solid rgba(0,0,0,0.2);"></span>
            </div>
            <div style="text-align: center; font-size: 12px; color: var(--fg-2); font-weight: 500;">
              Lethean Desktop — Account
            </div>
            <div></div>
          </div>
          <div style="flex: 1; display: grid; grid-template-columns: 180px 1fr; min-height: 0;">
            <div
              style="
                background: var(--ink-2);
                border-right: 1px solid var(--line-1);
                padding: 14px 10px;
                display: flex; flex-direction: column; gap: 2px;
              "
            >
              ${[
                ['gauge', 'Today', false],
                ['globe', 'Sites', false],
                ['envelope', 'Email', false],
                ['credit-card', 'Billing', false],
                ['user', 'Account', true],
                ['gear', 'Preferences', false],
              ].map(
                ([icon, label, active]) => html`
                  <a
                    style="
                      display: flex; align-items: center; gap: 10px;
                      padding: 7px 10px; border-radius: 5px;
                      background: ${active ? 'var(--ink-3)' : 'transparent'};
                      color: ${active ? 'var(--fg-0)' : 'var(--fg-2)'};
                      font-size: 12.5px; font-weight: ${active ? 500 : 400};
                    "
                  >
                    <i class="fa-solid fa-${icon}" style="font-size: 11px; color: ${active ? 'var(--brand-300)' : 'var(--fg-3)'};"></i>
                    ${label}
                  </a>
                `
              )}
            </div>
            ${this._settingsBody('desktop')}
          </div>
        </div>
      </div>
    `;
  }

  private _renderIosFrame() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div
          style="
            font-size: 11px; font-family: var(--font-mono);
            color: var(--fg-4); letter-spacing: 0.04em; padding-left: 4px;
          "
        >iOS · 390×680</div>
        <div
          style="
            width: 390px; height: 680px;
            background: #000;
            border-radius: 44px;
            padding: 12px;
            box-shadow: 0 28px 56px color-mix(in oklch, #000 45%, transparent);
            border: 2px solid var(--ink-4);
            box-sizing: border-box;
            position: relative;
          "
        >
          <div
            style="
              width: 100%; height: 100%;
              background: var(--ink-0); border-radius: 32px;
              overflow: hidden;
              display: flex; flex-direction: column;
              position: relative;
            "
          >
            <div
              style="
                height: 44px; flex-shrink: 0;
                display: flex; justify-content: space-between; align-items: center;
                padding: 0 24px;
                font-size: 14px; color: var(--fg-0); font-weight: 600;
                background: var(--ink-1);
              "
            >
              <span>9:41</span>
              <span style="display: flex; gap: 6px; align-items: center; font-size: 12px;">
                <i class="fa-solid fa-signal"></i>
                <i class="fa-solid fa-wifi"></i>
                <i class="fa-solid fa-battery-full"></i>
              </span>
            </div>
            <div style="flex: 1; overflow: hidden;">${this._settingsBody('ios')}</div>
            <div
              style="
                height: 78px; flex-shrink: 0;
                border-top: 1px solid var(--line-1);
                background: color-mix(in oklch, var(--ink-1) 95%, transparent);
                backdrop-filter: blur(10px);
                display: grid; grid-template-columns: repeat(4, 1fr);
                padding: 0;
              "
            >
              ${[
                ['house', 'Home', false],
                ['globe', 'Sites', false],
                ['user', 'Account', true],
                ['ellipsis', 'More', false],
              ].map(
                ([icon, label, active]) => html`
                  <div
                    style="
                      display: flex; flex-direction: column; align-items: center;
                      justify-content: center; gap: 4px;
                      color: ${active ? 'var(--brand-300)' : 'var(--fg-3)'};
                    "
                  >
                    <i class="fa-solid fa-${icon}" style="font-size: 18px;"></i>
                    <span style="font-size: 10.5px;">${label}</span>
                  </div>
                `
              )}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _renderWebFrame() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div
          style="
            font-size: 11px; font-family: var(--font-mono);
            color: var(--fg-4); letter-spacing: 0.04em; padding-left: 4px;
          "
        >WEB · BROWSER TAB · 720×460</div>
        <div
          style="
            width: 720px; height: 460px;
            background: var(--ink-0); border-radius: 10px;
            overflow: hidden;
            border: 1px solid var(--line-2);
            box-shadow: 0 28px 56px color-mix(in oklch, #000 35%, transparent);
            display: flex; flex-direction: column;
          "
        >
          <div
            style="
              height: 36px; flex-shrink: 0;
              background: var(--ink-2);
              border-bottom: 1px solid var(--line-1);
              display: flex; align-items: center; gap: 12px;
              padding: 0 12px;
            "
          >
            <div style="display: flex; gap: 6px;">
              <span style="width: 10px; height: 10px; border-radius: 999px; background: var(--ink-4);"></span>
              <span style="width: 10px; height: 10px; border-radius: 999px; background: var(--ink-4);"></span>
              <span style="width: 10px; height: 10px; border-radius: 999px; background: var(--ink-4);"></span>
            </div>
            <div
              style="
                flex: 1; height: 22px;
                background: var(--ink-3); border-radius: 5px;
                display: flex; align-items: center; gap: 8px;
                padding: 0 12px;
                font-size: 11.5px; color: var(--fg-3);
                font-family: var(--font-mono);
              "
            >
              <i class="fa-solid fa-lock" style="font-size: 9px; color: var(--success-400);"></i>
              host.uk.com / control / account
            </div>
          </div>
          ${this._settingsBody('web')}
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        data-brand="hostuk"
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          padding: 32px 36px 64px;
          overflow: auto;
        "
      >
        <header style="margin-bottom: 32px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >NATIVE SHELLS · DESIGN-SYSTEM PROOF</div>
          <h1 style="font-size: 36px; letter-spacing: -0.03em; margin: 0;">
            One settings body.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">
              Three native shells.
            </span>
          </h1>
          <p style="font-size: 15px; color: var(--fg-2); margin: 12px 0 0; max-width: 720px; line-height: 1.55;">
            Density-aware rows (180px label column on desktop/web, full-width on iOS),
            surface-appropriate row height (44px dense, 56px touch), section borders that
            edge-to-edge on iOS but pull-in to round corners on desktop, status bar where
            the platform expects one.
          </p>
        </header>
        <div style="display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap;">
          ${this._renderDesktopFrame()}
          ${this._renderIosFrame()}
          ${this._renderWebFrame()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-native-shells-page': LetheanNativeShellsPage;
  }
}
