import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './lethean-vi-message';

type ViStatus = 'idle' | 'listening' | 'working' | 'offline';

const FEATHER = svg`
  <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
    <path d="M11 2 C 7 2 4 5 4 9 L 4 13 L 11 6 Z M 4 13 L 8 9 M 6 11 L 9 11 M 5 12 L 7 12"
      stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;
const X_MARK = svg`
  <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
    <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </svg>
`;
const PAPERCLIP = svg`
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <path d="M9 5 L5 9 a2 2 0 1 1 -3 -3 L 7 1 a3 3 0 1 1 4 4 L 6 10"
      stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  </svg>
`;
const MIC = svg`
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <rect x="4.5" y="2" width="3" height="6" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
    <path d="M3 6 a3 3 0 0 0 6 0 M6 9 L 6 11 M 4 11 L 8 11"
      stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  </svg>
`;
const ARROW_UP = svg`
  <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
    <path d="M5 2 L5 8 M2 5 L5 2 L8 5"
      stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

@customElement('lethean-vi-panel')
export class LetheanViPanel extends LitElement {
  @property() status: ViStatus = 'listening';
  @property({ type: Number }) width = 380;
  @property({ attribute: 'placeholder' }) placeholder = 'Ask Vi to do something…';
  @property({ attribute: 'footer-note' }) footerNote =
    'Vi reads your account data only. She never reads site content unless you ask.';

  private close = () => {
    this.dispatchEvent(new CustomEvent('lethean-vi-close', { bubbles: true, composed: true }));
  };

  private send = () => {
    const ta = this.renderRoot.querySelector('textarea') as HTMLTextAreaElement | null;
    const text = (ta?.value || '').trim();
    if (!text) return;
    this.dispatchEvent(
      new CustomEvent('lethean-vi-send', {
        detail: { text },
        bubbles: true,
        composed: true,
      }),
    );
    if (ta) ta.value = '';
  };

  private onComposerKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  };

  override render() {
    return html`
      <aside
        style="
          width: ${this.width}px;
          flex-shrink: 0;
          border-left: 1px solid var(--line-1);
          background: var(--ink-1);
          display: flex;
          flex-direction: column;
          min-height: 100%;
          height: 100%;
        "
      >
        ${this.renderHeader()}
        ${this.renderMessages()}
        ${this.renderComposer()}
      </aside>
    `;
  }

  private renderHeader() {
    const dotColor =
      this.status === 'listening' || this.status === 'working' ? 'var(--success-400)' : 'var(--fg-4)';
    const label = this.status.charAt(0).toUpperCase() + this.status.slice(1);
    return html`
      <header
        style="
          padding: 14px 18px;
          border-bottom: 1px solid var(--line-1);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        "
      >
        <div
          style="
            width: 30px; height: 30px; border-radius: 8px;
            background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-3));
            border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
            display: grid; place-items: center;
            color: var(--brand-200);
          "
        >${FEATHER}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; font-weight: 500; color: var(--fg-0);">Vi</div>
          <div
            style="
              font-size: 11px;
              color: ${dotColor};
              display: inline-flex;
              align-items: center;
              gap: 5px;
            "
          >
            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${dotColor};"></span>
            ${label}
          </div>
        </div>
        <button
          @click=${this.close}
          aria-label="Close Vi panel"
          style="
            width: 28px; height: 28px; border-radius: 6px;
            background: transparent;
            border: 1px solid var(--line-2);
            display: grid; place-items: center;
            color: var(--fg-3);
            cursor: pointer;
          "
        >${X_MARK}</button>
      </header>
    `;
  }

  private renderMessages() {
    return html`
      <div
        style="
          flex: 1;
          padding: 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow: auto;
        "
      >
        <slot></slot>
      </div>
    `;
  }

  private renderComposer() {
    return html`
      <div style="padding: 12px 14px; border-top: 1px solid var(--line-1); flex-shrink: 0;">
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-2);
            border-radius: 10px;
            padding: 10px 12px;
          "
        >
          <textarea
            placeholder=${this.placeholder}
            rows="2"
            @keydown=${this.onComposerKey}
            style="
              width: 100%;
              background: transparent;
              border: none;
              color: var(--fg-0);
              font-family: inherit;
              font-size: 13px;
              resize: none;
              outline: none;
              padding: 0;
              line-height: 1.4;
            "
          ></textarea>
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 6px;
            "
          >
            <div style="display: flex; gap: 6px;">
              ${this.composerIconButton(PAPERCLIP, 'Attach file')}
              ${this.composerIconButton(MIC, 'Voice')}
            </div>
            <button
              @click=${this.send}
              style="
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 10px;
                background: var(--brand-500);
                color: var(--fg-0);
                border: 1px solid var(--brand-400);
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                font-family: inherit;
                cursor: pointer;
              "
            >
              Send ${ARROW_UP}
            </button>
          </div>
        </div>
        <div
          style="
            font-size: 10.5px;
            color: var(--fg-4);
            margin-top: 6px;
            text-align: center;
            line-height: 1.4;
          "
        >${this.footerNote}</div>
      </div>
    `;
  }

  private composerIconButton(icon: ReturnType<typeof svg>, label: string) {
    return html`
      <button
        aria-label=${label}
        style="
          width: 24px; height: 24px; border-radius: 5px;
          background: transparent;
          border: 1px solid var(--line-2);
          display: grid; place-items: center;
          color: var(--fg-3);
          cursor: pointer;
        "
      >${icon}</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-vi-panel': LetheanViPanel;
  }
}
