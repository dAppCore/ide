import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const CHEVRON_DOWN = svg`
  <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const FEATHER = svg`
  <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
    <path d="M11 2 C 7 2 4 5 4 9 L 4 13 L 11 6 Z M 4 13 L 8 9 M 6 11 L 9 11 M 5 12 L 7 12"
      stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

type SidebarLayout = 'default' | 'vi-spine';

@customElement('lethean-sidebar')
export class LetheanSidebar extends LitElement {
  @property() workspace = '';
  @property() plan = '';
  @property({ attribute: 'workspace-initials' }) workspaceInitials = '';
  @property({ type: Number }) width = 240;
  @property() layout: SidebarLayout = 'default';
  @property({ attribute: 'vi-status' }) viStatus = 'always on';
  @property({ attribute: 'vi-status-line' }) viStatusLine =
    'Watching 3 sites · all green · 1 thing waits on you';

  render() {
    const isViSpine = this.layout === 'vi-spine';
    return html`
      <aside
        style="
          width: ${this.width}px;
          background: var(--ink-0);
          border-right: 1px solid var(--line-1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        "
      >
        ${isViSpine ? this.renderViPresence() : this.renderWorkspaceSwitcher()}

        <div style="flex: 1; min-height: 0; overflow: hidden auto; padding: ${isViSpine ? '4px 0 14px' : '8px 4px'};">
          <slot></slot>
        </div>

        ${isViSpine ? html`` : html`<slot name="dock"></slot>`}
      </aside>
    `;
  }

  private renderWorkspaceSwitcher() {
    if (!this.workspace) return html``;
    return html`
      <button
        style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin: 8px 8px 4px;
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 6px;
          text-align: left;
          color: inherit;
          cursor: pointer;
          font-family: inherit;
        "
      >
        ${this.workspaceInitials
          ? html`<span
              style="
                width: 22px; height: 22px; border-radius: 4px;
                background: var(--brand-500);
                display: grid; place-items: center;
                font-size: 11px; font-weight: 600; color: var(--fg-0);
              "
            >${this.workspaceInitials}</span>`
          : html``}
        <span style="flex: 1; min-width: 0;">
          <span
            style="display: block; font-size: 12.5px; color: var(--fg-0); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >${this.workspace}</span>
          ${this.plan
            ? html`<span style="display: block; font-size: 10.5px; color: var(--fg-4); font-family: var(--font-mono);">${this.plan}</span>`
            : html``}
        </span>
        <span style="color: var(--fg-4); display: inline-flex;">${CHEVRON_DOWN}</span>
      </button>
    `;
  }

  private renderViPresence() {
    return html`
      <div
        style="
          margin: 10px 12px 12px;
          padding: 10px;
          background: color-mix(in oklch, var(--brand-500) 12%, transparent);
          border: 1px solid color-mix(in oklch, var(--brand-500) 28%, transparent);
          border-radius: 8px;
          display: flex;
          gap: 9px;
          align-items: flex-start;
        "
      >
        <div
          style="
            width: 28px; height: 28px; border-radius: 8px;
            flex-shrink: 0;
            background: color-mix(in oklch, var(--brand-500) 24%, var(--ink-3));
            display: grid; place-items: center;
            color: var(--brand-200);
          "
        >${FEATHER}</div>
        <div style="min-width: 0;">
          <div
            style="
              font-size: 12px;
              font-weight: 600;
              color: var(--fg-0);
              letter-spacing: -0.01em;
            "
          >Vi · ${this.viStatus}</div>
          <div
            style="
              font-size: 11px;
              color: var(--fg-3);
              margin-top: 2px;
              line-height: 1.4;
            "
          >${this.viStatusLine}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-sidebar': LetheanSidebar;
  }
}
