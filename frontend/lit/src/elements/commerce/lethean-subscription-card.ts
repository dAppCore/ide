import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface UsageLine {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}

@customElement('lethean-subscription-card')
export class LetheanSubscriptionCard extends LitElement {
  @property() name = '';
  @property() plan = '';
  @property() icon = '';
  @property() status: 'active' | 'paused' | 'cancelled' = 'active';
  @property() renews = '';
  @property({ type: Number }) price = 0;
  @property() currency = '£';
  @property() cadence = '/ month';
  @property({ attribute: false }) usage: UsageLine[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private statusColor(): string {
    switch (this.status) {
      case 'paused': return 'var(--warning-400)';
      case 'cancelled': return 'var(--danger-400)';
      default: return 'var(--success-400)';
    }
  }

  private statusLabel(): string {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
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
        <header style="display: flex; align-items: flex-start; gap: 12px;">
          <div
            style="
              width: 36px; height: 36px;
              border-radius: 8px;
              background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
              border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-1));
              display: grid; place-items: center;
              color: var(--brand-200);
              flex-shrink: 0;
            "
          >${this.icon ? html`<i class="fa-solid fa-${this.icon}" style="font-size: 14px;"></i>` : html``}</div>

          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px; color: var(--fg-0); font-weight: 500; letter-spacing: -0.01em;">${this.name}</span>
              <span
                style="
                  display: inline-flex; align-items: center; gap: 5px;
                  padding: 2px 7px; border-radius: 999px;
                  background: color-mix(in oklch, ${this.statusColor()} 18%, var(--ink-3));
                  border: 1px solid color-mix(in oklch, ${this.statusColor()} 28%, transparent);
                  color: ${this.statusColor()};
                  font-size: 10px; font-weight: 500;
                  letter-spacing: 0.04em;
                "
              ><span style="width: 5px; height: 5px; border-radius: 50%; background: ${this.statusColor()};"></span>${this.statusLabel().toUpperCase()}</span>
            </div>
            <div style="font-size: 11.5px; color: var(--fg-3); margin-top: 3px;">${this.plan}</div>
          </div>

          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 18px; color: var(--fg-0); font-family: var(--font-mono); letter-spacing: -0.02em;">${this.currency}${this.price.toFixed(2)}</div>
            <div style="font-size: 10.5px; color: var(--fg-4);">${this.cadence}</div>
          </div>
        </header>

        ${this.usage.length
          ? html`
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${this.usage.map((u) => {
                  const pct = u.limit > 0 ? Math.min(100, (u.used / u.limit) * 100) : 0;
                  const tone = pct >= 90 ? 'var(--warning-400)' : pct >= 75 ? 'var(--info-400)' : 'var(--brand-400)';
                  return html`
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--fg-3); margin-bottom: 3px;">
                        <span>${u.label}</span>
                        <span style="font-family: var(--font-mono); color: var(--fg-1);">${u.used}<span style="color: var(--fg-4);"> / ${u.limit}${u.unit ?? ''}</span></span>
                      </div>
                      <div style="height: 4px; background: var(--ink-3); border-radius: 999px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: ${tone}; transition: width 200ms ease;"></div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `
          : html``}

        <footer style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="font-size: 11.5px; color: var(--fg-4); font-family: var(--font-mono);">
            ${this.renews ? `Renews ${this.renews}` : ''}
          </div>
          <div style="display: flex; gap: 6px;">
            <slot name="actions"></slot>
          </div>
        </footer>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-subscription-card': LetheanSubscriptionCard;
  }
}
