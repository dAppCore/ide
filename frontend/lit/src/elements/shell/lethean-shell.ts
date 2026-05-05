import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './lethean-titlebar';
import './lethean-statusbar';
import './lethean-vi-dock';
import './lethean-sidebar';
import './lethean-nav';

type Brand = 'hostuk' | 'lethean' | 'ofm';
type Platform = 'darwin' | 'ios' | 'ipad' | 'android' | 'web';

@customElement('lethean-shell')
export class LetheanShell extends LitElement {
  @property() brand: Brand = 'hostuk';
  @property() platform: Platform = 'darwin';

  render() {
    return html`
      <div
        data-brand=${this.brand}
        data-platform=${this.platform}
        class="surface"
        style="
          width: 100%;
          height: 100%;
          background: var(--ink-0);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--line-2);
          box-shadow: var(--shadow-3);
          display: flex;
          flex-direction: column;
        "
      >
        <slot name="titlebar"></slot>

        <div
          style="
            flex: 1;
            display: grid;
            grid-template-columns: auto 1fr auto;
            overflow: hidden;
            min-height: 0;
          "
        >
          <slot name="sidebar"></slot>
          <main
            style="
              display: flex;
              flex-direction: column;
              background: var(--ink-1);
              overflow: hidden auto;
              min-width: 0;
            "
          >
            <slot></slot>
          </main>
          <slot name="vi-panel"></slot>
        </div>

        <slot name="statusbar"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-shell': LetheanShell;
  }
}
