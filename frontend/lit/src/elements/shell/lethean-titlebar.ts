import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-titlebar')
export class LetheanTitlebar extends LitElement {
  @property() user = '';
  @property({ attribute: 'brand-label' }) brandLabel = 'Lethean';
  @property({ attribute: 'sidebar-width', type: Number }) sidebarWidth = 240;
  @property() title = '';
  @property({ type: Boolean, attribute: 'no-traffic-lights' }) noTrafficLights = false;
  @property({ type: Boolean, attribute: 'no-ask-vi' }) noAskVi = false;

  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }
    .bar {
      height: 52px;
      display: grid;
      border-bottom: 1px solid var(--line-1);
      background: color-mix(in oklch, var(--ink-1) 92%, transparent);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      -webkit-app-region: drag;
    }
    .left {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 0 14px;
      min-width: 0;
    }
    .traffic {
      display: inline-flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .traffic span {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      border: 0.5px solid rgba(0, 0, 0, 0.2);
    }
    .red { background: #ff5f57; }
    .yellow { background: #febc2e; }
    .green { background: #28c840; }

    .brand-line {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--fg-2);
      font-size: 12.5px;
      font-weight: 500;
      min-width: 0;
    }
    .brand-mark {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: var(--brand-500);
      flex-shrink: 0;
      display: grid;
      place-items: center;
      font-size: 10px;
      color: var(--fg-0);
      font-weight: 600;
    }
    .brand-name { color: var(--fg-1); }
    .sep { color: var(--fg-3); margin: 0 4px; }
    .user { color: var(--fg-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .right {
      display: flex;
      align-items: center;
      padding: 0 14px;
      gap: 12px;
      min-width: 0;
      -webkit-app-region: no-drag;
    }
    .title {
      font-family: var(--font-display, inherit);
      font-size: 14.5px;
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--fg-0);
      white-space: nowrap;
    }
    .seg-wrap {
      flex: 1;
      display: flex;
      justify-content: center;
      min-width: 0;
    }
    .tool-row {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    }
    .ask-vi {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 24px;
      padding: 0 8px;
      background: color-mix(in oklch, var(--brand-500) 22%, transparent);
      border: 1px solid color-mix(in oklch, var(--brand-500) 38%, transparent);
      border-radius: 5px;
      color: var(--brand-200);
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }
    .ask-vi kbd {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--brand-200);
      opacity: 0.7;
    }
    .feather {
      stroke: currentColor;
      fill: none;
    }

    @media (max-width: 900px) {
      .seg-wrap { display: none; }
      .ask-vi span.label { display: none; }
    }
  `;

  private fireAskVi = () => {
    this.dispatchEvent(
      new CustomEvent('lethean-ask-vi', { bubbles: true, composed: true })
    );
  };

  render() {
    return html`
      <div
        class="bar"
        style=${`grid-template-columns: ${this.sidebarWidth}px 1fr;`}
      >
        <div class="left">
          ${this.noTrafficLights
            ? html``
            : html`
                <span class="traffic">
                  <span class="red"></span>
                  <span class="yellow"></span>
                  <span class="green"></span>
                </span>
              `}
          <div class="brand-line">
            <span class="brand-mark">L</span>
            <span class="brand-name">${this.brandLabel}</span>
            ${this.user
              ? html`<span class="sep">·</span><span class="user">${this.user}</span>`
              : html``}
          </div>
        </div>
        <div class="right">
          ${this.title ? html`<span class="title">${this.title}</span>` : html``}
          <div class="seg-wrap">
            <slot name="segmented"></slot>
          </div>
          <div class="tool-row">
            <slot name="tools"></slot>
            ${this.noAskVi
              ? html``
              : html`
                  <button class="ask-vi" type="button" @click=${this.fireAskVi}>
                    <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true" class="feather">
                      <path d="M11 2 C 7 2 4 5 4 9 L 4 13 L 11 6 Z M 4 13 L 8 9 M 6 11 L 9 11 M 5 12 L 7 12"
                        stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="label">Ask Vi</span>
                    <kbd>⌘K</kbd>
                  </button>
                `}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-titlebar': LetheanTitlebar;
  }
}
