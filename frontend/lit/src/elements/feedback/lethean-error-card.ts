// <lethean-error-card> — smaller error-state card sized to fit a 2x2
// grid (vs the full-screen <lethean-error-page>). Tone-tinted glow,
// monospace error code on the left, eyebrow + heading + Vi-narrated
// body + meta + actions row.
//
// Ported from status-errors.jsx > ErrorCard. Use the existing
// <lethean-error-page> for full-page 404/500 surfaces; use this for
// dashboard-embedded error states or the design-system grid.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

type Tone = 'neutral' | 'warning' | 'danger' | 'info';

interface ErrorAction {
  label: string;
  icon?: string;
  primary?: boolean;
}

@customElement('lethean-error-card')
export class LetheanErrorCard extends LitElement {
  @property() code = '404';
  @property() eyebrow = '';
  @property() heading = '';
  @property() body = '';
  @property() pose = 'master';
  @property() tone: Tone = 'neutral';
  @property() meta = '';
  @property({ attribute: false }) actions: ErrorAction[] = [];

  protected createRenderRoot() {
    return this;
  }

  private _toneColor(): string {
    return this.tone === 'danger' ? 'var(--danger-400)'
      : this.tone === 'warning' ? 'var(--warning-400)'
      : this.tone === 'info' ? 'var(--info-400)'
      : 'var(--brand-300)';
  }

  private _toneBorder(): string {
    return this.tone === 'danger' ? 'color-mix(in oklch, var(--danger-500) 25%, var(--line-2))'
      : this.tone === 'warning' ? 'color-mix(in oklch, var(--warning-500) 25%, var(--line-2))'
      : this.tone === 'info' ? 'color-mix(in oklch, var(--info-500) 25%, var(--line-2))'
      : 'var(--line-2)';
  }

  render() {
    const c = this._toneColor();
    const border = this._toneBorder();
    return html`
      <article
        style="
          background: var(--ink-1);
          border: 1px solid ${border};
          border-radius: 16px;
          padding: 26px 28px;
          display: flex; gap: 20px;
          position: relative; overflow: hidden;
          box-sizing: border-box;
          height: 100%;
        "
      >
        <!-- tone glow -->
        <div
          style="
            position: absolute; inset: 0; pointer-events: none;
            background: radial-gradient(ellipse 50% 80% at 90% 0%, color-mix(in oklch, ${c} 14%, transparent), transparent 60%);
          "
        ></div>

        <!-- code -->
        <div style="position: relative; flex-shrink: 0;">
          <div
            style="
              font-family: var(--font-mono);
              font-size: 64px; font-weight: 500;
              color: ${c};
              line-height: 0.9;
              letter-spacing: -0.04em;
              opacity: 0.9;
            "
          >${this.code}</div>
        </div>

        <div style="flex: 1; position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 0;">
          <div
            style="
              font-size: 10.5px; font-family: var(--font-mono);
              color: ${c}; letter-spacing: 0.08em;
            "
          >${this.eyebrow}</div>

          <h2
            style="
              font-size: 22px; line-height: 1.15;
              letter-spacing: -0.02em; color: var(--fg-0);
              margin: 0;
            "
          >${this.heading}</h2>

          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div
              style="
                width: 26px; height: 26px; border-radius: 6px;
                background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
                border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2));
                display: grid; place-items: center; overflow: hidden;
                flex-shrink: 0; margin-top: 2px;
              "
            >
              <lethean-vi pose=${this.pose} size="32" style="margin-top: 3px;"></lethean-vi>
            </div>
            <p style="font-size: 13.5px; color: var(--fg-2); line-height: 1.55; flex: 1; margin: 0;">
              ${this.body}
            </p>
          </div>

          ${this.meta
            ? html`<div
                style="
                  font-size: 11.5px; color: var(--fg-4);
                  font-family: var(--font-mono);
                "
              >${this.meta}</div>`
            : html``}

          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 6px;">
            ${this.actions.map(
              (a) => html`
                <button
                  class=${a.primary ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  style=${a.primary ? '' : 'border: 1px solid var(--line-2);'}
                >
                  ${a.icon
                    ? html`<i class="fa-solid fa-${a.icon}" style="font-size: 11px; margin-right: 4px;"></i>`
                    : html``}
                  ${a.label}
                </button>
              `
            )}
          </div>
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-error-card': LetheanErrorCard;
  }
}
