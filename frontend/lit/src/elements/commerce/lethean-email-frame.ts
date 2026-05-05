// <lethean-email-frame> — tone-aware transactional email frame.
// Envelope chrome (eyebrow + timestamp + subject + from + preview) +
// slotted body. Sized to fit a 3-up email-grid demo. Ported from
// emails-invoice.jsx > EmailFrame (with EmailHero / EmailBody / etc.
// either reused via slots or rendered in the demo page directly).
//
// This is the SHELL only. Body content (hero, key-value table,
// buttons, sig) is composed by the consumer inside the default slot.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Tone = 'neutral' | 'warning' | 'success' | 'danger';

@customElement('lethean-email-frame')
export class LetheanEmailFrame extends LitElement {
  @property() subject = '';
  @property() from = '';
  @property() preview = '';
  @property() eyebrow = '';
  @property() timestamp = '04 Oct · 09:14';
  @property() tone: Tone = 'neutral';

  protected createRenderRoot() {
    return this;
  }

  private _toneColor(): string {
    switch (this.tone) {
      case 'warning': return 'var(--warning-400)';
      case 'success': return 'var(--success-400)';
      case 'danger': return 'var(--danger-400)';
      default: return 'var(--brand-300)';
    }
  }

  render() {
    const eyebrowColor = this._toneColor();
    return html`
      <article
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 12px;
          overflow: hidden;
          display: flex; flex-direction: column;
          height: 100%;
        "
      >
        <!-- envelope chrome -->
        <header
          style="
            padding: 10px 14px;
            background: var(--ink-1);
            border-bottom: 1px solid var(--line-1);
            display: flex; flex-direction: column; gap: 2px;
          "
        >
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span
              style="
                font-size: 10px; color: ${eyebrowColor};
                font-family: var(--font-mono); letter-spacing: 0.06em;
              "
            >${this.eyebrow}</span>
            <span style="font-size: 10px; color: var(--fg-4); font-family: var(--font-mono);">
              ${this.timestamp}
            </span>
          </div>
          <div
            style="
              font-size: 13px; color: var(--fg-0);
              font-weight: 500; letter-spacing: -0.005em;
              margin-top: 4px;
            "
          >${this.subject}</div>
          <div style="font-size: 11px; color: var(--fg-3);">
            <span class="num">${this.from}</span>
          </div>
          <div
            style="
              font-size: 11px; color: var(--fg-4);
              margin-top: 4px; line-height: 1.4;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            "
          >${this.preview}</div>
        </header>
        <div style="flex: 1; display: flex; flex-direction: column;">
          <slot></slot>
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-email-frame': LetheanEmailFrame;
  }
}
