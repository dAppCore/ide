import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const FEATHER = svg`
  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
    <path d="M11 2 C 7 2 4 5 4 9 L 4 13 L 11 6 Z M 4 13 L 8 9 M 6 11 L 9 11 M 5 12 L 7 12"
      stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

type Who = 'vi' | 'you';

@customElement('lethean-vi-message')
export class LetheanViMessage extends LitElement {
  @property() who: Who = 'vi';
  @property() initials = 'SM';

  render() {
    const isVi = this.who === 'vi';
    return html`
      <div
        style="
          display: flex;
          gap: 10px;
          flex-direction: ${isVi ? 'row' : 'row-reverse'};
        "
      >
        ${isVi ? this.renderViAvatar() : this.renderYouAvatar()}
        <div
          style="
            max-width: 82%;
            background: ${isVi
              ? 'var(--ink-2)'
              : 'color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))'};
            border: 1px solid ${isVi
              ? 'var(--line-1)'
              : 'color-mix(in oklch, var(--brand-500) 25%, var(--line-2))'};
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 13px;
            color: var(--fg-1);
            line-height: 1.5;
          "
        >
          <slot></slot>
        </div>
      </div>
    `;
  }

  private renderViAvatar() {
    return html`
      <div
        style="
          width: 24px; height: 24px; border-radius: 6px;
          background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-3));
          border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
          flex-shrink: 0;
          display: grid; place-items: center;
          color: var(--brand-200);
        "
      >
        ${FEATHER}
      </div>
    `;
  }

  private renderYouAvatar() {
    return html`
      <div
        style="
          width: 24px; height: 24px; border-radius: 6px;
          background: var(--ink-3);
          border: 1px solid var(--line-2);
          display: grid; place-items: center;
          font-size: 9.5px; font-weight: 600;
          color: var(--fg-2);
          flex-shrink: 0;
        "
      >${this.initials}</div>
    `;
  }
}

@customElement('lethean-vi-typing')
export class LetheanViTyping extends LitElement {
  render() {
    return html`
      <span
        style="
          display: inline-flex;
          gap: 3px;
          align-items: center;
        "
      >
        ${[0, 1, 2].map(
          (i) => html`<span
            style="
              width: 5px; height: 5px; border-radius: 50%;
              background: var(--brand-300);
              opacity: 0.4;
              animation: viDot 1.2s ${i * 0.15}s infinite;
            "
          ></span>`
        )}
        <style>
          @keyframes viDot {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
            40% { opacity: 1; transform: scale(1); }
          }
        </style>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-vi-message': LetheanViMessage;
    'lethean-vi-typing': LetheanViTyping;
  }
}
