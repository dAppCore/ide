import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-browser-window')
export class LetheanBrowserWindow extends LitElement {
  @property() url = 'https://example.com';
  @property() tabTitle = 'New tab';
  @property({ type: Number }) height = 480;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <div
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-2);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          height: ${this.height}px;
        "
      >
        <div
          style="
            padding: 8px 12px 0;
            background: var(--ink-2);
            border-bottom: 1px solid var(--line-1);
          "
        >
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
              <span style="width: 11px; height: 11px; border-radius: 50%; background: #ff5f57;"></span>
              <span style="width: 11px; height: 11px; border-radius: 50%; background: #febc2e;"></span>
              <span style="width: 11px; height: 11px; border-radius: 50%; background: #28c840;"></span>
            </div>
            <div
              style="
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 14px 6px 10px;
                background: var(--ink-1);
                border-radius: 8px 8px 0 0;
                font-size: 12px;
                color: var(--fg-0);
                border: 1px solid var(--line-1);
                border-bottom: none;
              "
            >
              <span style="width: 12px; height: 12px; background: var(--brand-500); border-radius: 2px;"></span>
              <span>${this.tabTitle}</span>
              <span style="color: var(--fg-4); font-size: 11px;">×</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; padding: 8px 4px 10px;">
            <div style="display: flex; gap: 8px; color: var(--fg-3); font-size: 12px;">
              <span>‹</span><span>›</span><span>↻</span>
            </div>
            <div
              style="
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 5px 12px;
                background: var(--ink-1);
                border: 1px solid var(--line-1);
                border-radius: 999px;
                font-size: 12px;
                font-family: var(--font-mono);
                color: var(--fg-1);
              "
            >
              <span style="color: var(--success-400);">🔒</span>
              <span style="color: var(--fg-4);">${this.url.replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
        </div>
        <div style="flex: 1; overflow: hidden; background: var(--ink-1);">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-browser-window': LetheanBrowserWindow;
  }
}
