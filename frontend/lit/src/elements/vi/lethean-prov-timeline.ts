import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './lethean-prov-step';

interface Step {
  id: string;
  icon: string;
  label: string;
  detail?: string;
  state?: 'pending' | 'active' | 'done' | 'failed';
}

@customElement('lethean-prov-timeline')
export class LetheanProvTimeline extends LitElement {
  @property({ attribute: false }) steps: Step[] = [];
  @property({ type: Number }) progress = 0;
  @property() elapsed = '';
  @property() remaining = '';
  @property() eyebrow = 'PROVISIONING · LIVE';
  @property() heading = '';
  @property() narration = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <div
        style="
          background: var(--ink-1);
          border: 1px solid var(--line-2);
          border-radius: 14px;
          padding: 24px;
          display: grid;
          grid-template-columns: 1fr minmax(280px, 1.1fr);
          gap: 28px;
          position: relative;
          overflow: hidden;
        "
      >
        ${this.eyebrow || this.heading || this.narration
          ? html`
              <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0;">
                ${this.eyebrow
                  ? html`<div
                      style="
                        font-size: 11px;
                        font-family: var(--font-mono);
                        color: var(--brand-300);
                        letter-spacing: 0.1em;
                      "
                    >${this.eyebrow}</div>`
                  : html``}
                ${this.heading
                  ? html`<h1
                      style="
                        font-size: 28px;
                        line-height: 1.1;
                        letter-spacing: -0.025em;
                        color: var(--fg-0);
                        margin: 0;
                      "
                    >${this.heading}</h1>`
                  : html``}
                ${this.narration
                  ? html`<p
                      style="
                        font-size: 14px;
                        color: var(--fg-2);
                        line-height: 1.55;
                        max-width: 440px;
                        margin: 0;
                      "
                    >${this.narration}</p>`
                  : html``}
                <div style="margin-top: auto;"><slot name="actions"></slot></div>
              </div>
            `
          : html``}

        <div style="display: flex; flex-direction: column; gap: 10px; min-width: 0;">
          ${this.steps.map(
            (s) => html`
              <lethean-prov-step
                icon=${s.icon}
                label=${s.label}
                detail=${s.detail || ''}
                state=${s.state || 'pending'}
              ></lethean-prov-step>
            `
          )}
          <div
            style="
              margin-top: 6px;
              height: 3px;
              border-radius: 999px;
              background: var(--ink-3);
              overflow: hidden;
              position: relative;
            "
          >
            <div
              style="
                position: absolute;
                top: 0; left: 0; bottom: 0;
                width: ${Math.max(0, Math.min(1, this.progress)) * 100}%;
                background: linear-gradient(90deg, var(--brand-500), var(--brand-300));
                box-shadow: 0 0 12px color-mix(in oklch, var(--brand-400) 60%, transparent);
                transition: width 200ms linear;
              "
            ></div>
          </div>
          <div
            style="
              display: flex;
              justify-content: space-between;
              font-size: 10.5px;
              color: var(--fg-4);
              font-family: var(--font-mono);
              letter-spacing: 0.05em;
            "
          >
            <span>${this.elapsed}</span>
            <span>${this.remaining}</span>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-prov-timeline': LetheanProvTimeline;
  }
}
