// <lethean-callout> — info / warn / vi callout box used inside help
// articles + product docs. Tone-tinted background, icon (or Vi avatar
// for kind="vi"), title + slot for body content.
//
// Ported from help-blog-changelog.jsx > Callout.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '../atoms/lethean-vi';

type Kind = 'info' | 'warn' | 'vi' | 'success' | 'danger';

@customElement('lethean-callout')
export class LetheanCallout extends LitElement {
  @property() kind: Kind = 'info';
  @property() title = '';

  protected createRenderRoot() {
    return this;
  }

  private _palette() {
    switch (this.kind) {
      case 'warn':
        return {
          bg: 'color-mix(in oklch, var(--gold-500) 9%, var(--ink-2))',
          border: 'color-mix(in oklch, var(--gold-500) 26%, var(--line-2))',
          icon: 'triangle-exclamation',
          iconColor: 'var(--gold-400)',
        };
      case 'vi':
        return {
          bg: 'color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))',
          border: 'color-mix(in oklch, var(--brand-500) 32%, var(--line-2))',
          icon: null,
          iconColor: 'var(--brand-200)',
        };
      case 'success':
        return {
          bg: 'color-mix(in oklch, var(--success-500) 9%, var(--ink-2))',
          border: 'color-mix(in oklch, var(--success-500) 26%, var(--line-2))',
          icon: 'circle-check',
          iconColor: 'var(--success-400)',
        };
      case 'danger':
        return {
          bg: 'color-mix(in oklch, var(--danger-500) 9%, var(--ink-2))',
          border: 'color-mix(in oklch, var(--danger-500) 26%, var(--line-2))',
          icon: 'circle-exclamation',
          iconColor: 'var(--danger-400)',
        };
      default:
        return {
          bg: 'color-mix(in oklch, var(--brand-500) 9%, var(--ink-2))',
          border: 'color-mix(in oklch, var(--brand-500) 26%, var(--line-2))',
          icon: 'circle-info',
          iconColor: 'var(--brand-300)',
        };
    }
  }

  render() {
    const p = this._palette();
    return html`
      <div
        style="
          padding: 18px;
          border-radius: 10px;
          background: ${p.bg};
          border: 1px solid ${p.border};
          display: grid; grid-template-columns: auto 1fr; gap: 14px;
          margin-bottom: 22px;
        "
      >
        <div
          style="
            width: 28px; height: 28px; border-radius: 6px;
            background: var(--ink-2);
            border: 1px solid var(--line-2);
            display: grid; place-items: center;
          "
        >
          ${this.kind === 'vi'
            ? html`<lethean-vi pose="master" size="20"></lethean-vi>`
            : html`<i class="fa-solid fa-${p.icon}" style="font-size: 13px; color: ${p.iconColor};"></i>`}
        </div>
        <div>
          ${this.title
            ? html`<div
                style="
                  font-size: 13px; color: var(--fg-0);
                  font-weight: 500; letter-spacing: -0.005em;
                "
              >${this.title}</div>`
            : html``}
          <div
            style="
              font-size: 13px; color: var(--fg-1);
              line-height: 1.6; margin-top: 4px;
            "
          >
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-callout': LetheanCallout;
  }
}
