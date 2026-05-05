import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-android-frame')
export class LetheanAndroidFrame extends LitElement {
  @property({ type: Number }) width = 290;
  @property({ type: Number }) height = 600;
  @property() time = '9:41';
  @property({ type: Boolean }) dark = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const fg = this.dark ? '#fff' : 'var(--fg-0)';
    const bg = this.dark ? '#000' : 'var(--ink-0)';
    return html`
      <div
        style="
          width: ${this.width}px;
          height: ${this.height}px;
          background: ${bg};
          border-radius: 28px;
          border: 4px solid #1a1a1f;
          box-shadow:
            0 0 0 2px #2a2a30 inset,
            0 24px 64px rgba(0, 0, 0, 0.6);
          padding: 0;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        "
      >
        <div
          style="
            height: 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 16px;
            font-size: 13px;
            font-family: var(--font-sans);
            color: ${fg};
            font-weight: 500;
            flex-shrink: 0;
          "
        >
          <span>${this.time}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <i class="fa-solid fa-signal" style="font-size: 11px;"></i>
            <i class="fa-solid fa-wifi" style="font-size: 11px;"></i>
            <span style="width: 22px; height: 10px; border: 1.5px solid ${fg}; border-radius: 2px; position: relative; display: inline-block;">
              <span style="position: absolute; inset: 1px; width: 70%; background: ${fg}; display: block;"></span>
            </span>
          </div>
        </div>

        <div style="flex: 1; overflow: hidden;">
          <slot></slot>
        </div>

        <div style="height: 24px; flex-shrink: 0; display: grid; place-items: center; background: ${bg};">
          <span style="width: 104px; height: 4px; border-radius: 2px; background: ${fg};"></span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-android-frame': LetheanAndroidFrame;
  }
}
