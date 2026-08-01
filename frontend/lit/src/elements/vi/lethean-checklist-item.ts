import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type ChecklistState = 'pending' | 'current' | 'done';

const CHECK = svg`
  <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
    <path d="M3 8 L7 12 L13 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

@customElement('lethean-checklist-item')
export class LetheanChecklistItem extends LitElement {
  @property() label = '';
  @property() detail = '';
  @property() state: ChecklistState = 'pending';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private renderBadge() {
    if (this.state === 'done') {
      return html`<span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--success-400); color: var(--ink-0);">${CHECK}</span>`;
    }
    if (this.state === 'current') {
      return html`<span
        style="
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--brand-500);
          color: var(--fg-0);
          font-size: 11px; font-weight: 600;
          font-family: var(--font-mono);
          box-shadow: 0 0 0 4px color-mix(in oklch, var(--brand-500) 25%, transparent);
        "
      >→</span>`;
    }
    return html`<span
      style="
        display: inline-block;
        width: 22px; height: 22px;
        border-radius: 50%;
        border: 1px dashed var(--line-2);
        background: transparent;
      "
    ></span>`;
  }

  render() {
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: 22px 1fr;
          gap: 12px;
          padding: 10px 0;
          align-items: start;
        "
      >
        ${this.renderBadge()}
        <div style="min-width: 0; padding-top: 2px;">
          <div
            style="
              font-size: 13px;
              font-weight: ${this.state === 'current' ? 500 : 400};
              color: ${this.state === 'pending' ? 'var(--fg-3)' : 'var(--fg-0)'};
              text-decoration: ${this.state === 'done' ? 'line-through' : 'none'};
              text-decoration-color: var(--fg-4);
              letter-spacing: -0.005em;
            "
          >${this.label}</div>
          ${this.detail
            ? html`<div style="font-size: 11.5px; color: var(--fg-3); margin-top: 3px; line-height: 1.4;">${this.detail}</div>`
            : html``}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-checklist-item': LetheanChecklistItem;
  }
}
