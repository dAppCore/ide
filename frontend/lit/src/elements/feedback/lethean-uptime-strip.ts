import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type DayState = 'up' | 'partial' | 'down' | 'unknown';

@customElement('lethean-uptime-strip')
export class LetheanUptimeStrip extends LitElement {
  @property({ attribute: false }) days: DayState[] = [];
  @property() label = '';
  @property() summary = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private color(s: DayState): string {
    switch (s) {
      case 'down': return 'var(--danger-400)';
      case 'partial': return 'var(--warning-400)';
      case 'unknown': return 'var(--ink-3)';
      default: return 'var(--success-400)';
    }
  }

  render() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 11.5px;">
          <span style="color: var(--fg-1);">${this.label}</span>
          <span style="color: var(--fg-3); font-family: var(--font-mono);">${this.summary}</span>
        </div>
        <div
          style="
            display: flex;
            gap: 2px;
            height: 22px;
            align-items: stretch;
          "
        >
          ${this.days.map(
            (d) => html`
              <span
                title=${d}
                style="
                  flex: 1;
                  background: ${this.color(d)};
                  border-radius: 1px;
                  opacity: ${d === 'unknown' ? 0.3 : 0.85};
                "
              ></span>
            `
          )}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--fg-4); font-family: var(--font-mono); letter-spacing: 0.05em;">
          <span>${this.days.length} days ago</span>
          <span>today</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-uptime-strip': LetheanUptimeStrip;
  }
}
