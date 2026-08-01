import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type ViStatus = 'connected' | 'idle' | 'offline';

@customElement('lethean-statusbar')
export class LetheanStatusbar extends LitElement {
  @property({ attribute: 'vi-status' }) viStatus: ViStatus = 'connected';
  @property() latency = '12ms';
  @property({ attribute: 'sites-watched' }) sitesWatched = '3 sites watched';
  @property({ attribute: 'cost-line' }) costLine = '£14.40 used this month';
  @property() version = '0.42.7';
  @property() runtime = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private statusColor(): string {
    if (this.viStatus === 'connected') return 'var(--success-400)';
    if (this.viStatus === 'idle') return 'var(--fg-4)';
    return 'var(--warning-400)';
  }

  private statusLabel(): string {
    if (this.viStatus === 'connected') return `Vi connected · ${this.latency}`;
    if (this.viStatus === 'idle') return 'Vi idle';
    return 'Vi offline';
  }

  render() {
    return html`
      <div
        style="
          height: 22px;
          flex-shrink: 0;
          border-top: 1px solid var(--line-1);
          background: color-mix(in oklch, var(--ink-1) 92%, transparent);
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 12px;
          font-size: 10.5px;
          color: var(--fg-3);
          font-family: var(--font-mono);
        "
      >
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: ${this.statusColor()};"></span>
          ${this.statusLabel()}
        </div>
        ${this.sitesWatched
          ? html`
              <span style="color: var(--fg-4);">·</span>
              <span>${this.sitesWatched}</span>
            `
          : html``}
        ${this.costLine
          ? html`
              <span style="color: var(--fg-4);">·</span>
              <span>${this.costLine}</span>
            `
          : html``}
        <div style="margin-left: auto; display: flex; align-items: center; gap: 6px;">
          <span>v${this.version}</span>
          ${this.runtime
            ? html`
                <span style="color: var(--fg-4);">·</span>
                <span>${this.runtime}</span>
              `
            : html``}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-statusbar': LetheanStatusbar;
  }
}
