import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-site-card')
export class LetheanSiteCard extends LitElement {
  @property() domain = '';
  @property() stack = '';
  @property() status: 'green' | 'amber' | 'red' = 'green';
  @property() uptime = '';
  @property({ type: Number }) response = 0;
  @property({ attribute: false }) sparkData: number[] = [];
  @property({ attribute: 'last-deploy' }) lastDeploy = '';
  @property() warn = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private statusBg(): string {
    switch (this.status) {
      case 'amber': return 'color-mix(in oklch, var(--warning-500) 18%, var(--ink-3))';
      case 'red': return 'color-mix(in oklch, var(--danger-500) 18%, var(--ink-3))';
      default: return 'color-mix(in oklch, var(--success-500) 18%, var(--ink-3))';
    }
  }
  private statusBd(): string {
    switch (this.status) {
      case 'amber': return 'color-mix(in oklch, var(--warning-500) 28%, transparent)';
      case 'red': return 'color-mix(in oklch, var(--danger-500) 28%, transparent)';
      default: return 'color-mix(in oklch, var(--success-500) 28%, transparent)';
    }
  }
  private statusFg(): string {
    switch (this.status) {
      case 'amber': return 'var(--warning-400)';
      case 'red': return 'var(--danger-400)';
      default: return 'var(--success-400)';
    }
  }
  private statusLabel(): string {
    switch (this.status) {
      case 'amber': return 'WARN';
      case 'red': return 'DOWN';
      default: return 'LIVE';
    }
  }

  private renderSparkline() {
    const data = this.sparkData;
    if (!data.length) return svg``;
    const max = Math.max(...data);
    if (max === 0) return svg``;
    const points = data
      .map((v, i) => {
        const x = (i / Math.max(1, data.length - 1)) * 100;
        const y = 24 - (v / max) * 22;
        return `${x},${y}`;
      })
      .join(' ');
    const id = `spark-${this.domain.replace(/[^a-z0-9]/gi, '-')}`;
    return svg`
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" style="width: 100%; height: 24px;">
        <defs>
          <linearGradient id=${id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--brand-400)" stop-opacity="0.35" />
            <stop offset="100%" stop-color="var(--brand-400)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <polyline points=${points} fill="none" stroke="var(--brand-300)" stroke-width="1.2" />
        <polygon points=${`0,24 ${points} 100,24`} fill=${`url(#${id})`} />
      </svg>
    `;
  }

  render() {
    return html`
      <article
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        "
      >
        <header style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <div style="min-width: 0;">
            <div
              style="
                font-size: 14px;
                color: var(--fg-0);
                font-weight: 500;
                font-family: var(--font-mono);
                letter-spacing: -0.01em;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              "
            >${this.domain}</div>
            <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 3px;">${this.stack}</div>
          </div>
          <span
            style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              padding: 3px 8px;
              border-radius: 999px;
              background: ${this.statusBg()};
              border: 1px solid ${this.statusBd()};
              color: ${this.statusFg()};
              font-size: 10.5px;
              letter-spacing: 0.04em;
              font-weight: 500;
              flex-shrink: 0;
            "
          >
            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${this.statusFg()};"></span>
            ${this.statusLabel()}
          </span>
        </header>

        ${this.renderSparkline()}

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 12px;">
          <div>
            <div style="color: var(--fg-4); font-size: 10.5px; letter-spacing: 0.04em;">UPTIME</div>
            <div style="color: var(--fg-0); font-size: 15px; margin-top: 2px; font-family: var(--font-mono);">${this.uptime}<span style="color: var(--fg-3); font-size: 11px;">%</span></div>
          </div>
          <div>
            <div style="color: var(--fg-4); font-size: 10.5px; letter-spacing: 0.04em;">RESPONSE</div>
            <div style="color: var(--fg-0); font-size: 15px; margin-top: 2px; font-family: var(--font-mono);">${this.response}<span style="color: var(--fg-3); font-size: 11px;">ms</span></div>
          </div>
          <div>
            <div style="color: var(--fg-4); font-size: 10.5px; letter-spacing: 0.04em;">DEPLOY</div>
            <div style="color: var(--fg-0); font-size: 15px; margin-top: 2px; font-family: var(--font-mono);">${this.lastDeploy}</div>
          </div>
        </div>

        ${this.warn
          ? html`
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  font-size: 11.5px;
                  color: var(--warning-400);
                  padding: 6px 10px;
                  border-radius: 6px;
                  background: color-mix(in oklch, var(--warning-500) 12%, transparent);
                  border: 1px solid color-mix(in oklch, var(--warning-500) 28%, transparent);
                "
              >
                <i class="fa-solid fa-circle-exclamation" style="font-size: 11px;"></i>
                ${this.warn}
              </div>
            `
          : html``}
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-site-card': LetheanSiteCard;
  }
}
