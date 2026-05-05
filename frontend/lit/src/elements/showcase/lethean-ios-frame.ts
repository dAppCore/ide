import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-ios-frame')
export class LetheanIosFrame extends LitElement {
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
          border-radius: 38px;
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
            height: 47px;
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            padding: 0 28px;
            font-size: 15px;
            font-weight: 600;
            color: ${fg};
            flex-shrink: 0;
          "
        >
          <span style="text-align: left; font-family: -apple-system, 'SF Pro Display', system-ui;">${this.time}</span>
          <span style="width: 96px; height: 30px; background: #000; border-radius: 18px;"></span>
          <div style="display: flex; justify-content: flex-end; gap: 5px; align-items: center;">
            <i class="fa-solid fa-signal" style="font-size: 11px;"></i>
            <i class="fa-solid fa-wifi" style="font-size: 11px;"></i>
            <span style="font-size: 11px; font-family: var(--font-mono);">87%</span>
            <span style="width: 22px; height: 11px; border: 1.5px solid ${fg}; border-radius: 3px; position: relative; display: inline-block;">
              <span style="position: absolute; inset: 1.5px; width: 80%; background: ${fg}; border-radius: 1px; display: block;"></span>
            </span>
          </div>
        </div>

        <div style="flex: 1; overflow: hidden;">
          <slot></slot>
        </div>

        <div style="height: 30px; flex-shrink: 0; display: grid; place-items: center; background: ${bg};">
          <span style="width: 134px; height: 5px; border-radius: 3px; background: ${fg};"></span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-ios-frame': LetheanIosFrame;
  }
}
