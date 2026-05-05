import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-mkt-section')
export class LetheanMktSection extends LitElement {
  @property() eyebrow = '';
  @property() title = '';
  @property() body = '';
  @property() align: 'left' | 'center' = 'left';
  @property({ type: Number, attribute: 'max-body' }) maxBody = 580;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const center = this.align === 'center';
    return html`
      <section style="padding: 56px 24px;">
        <div
          style="
            max-width: 1100px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 22px;
            ${center ? 'align-items: center; text-align: center;' : ''}
          "
        >
          <div
            style="
              display: flex;
              flex-direction: column;
              gap: 10px;
              max-width: ${this.maxBody}px;
              ${center ? 'margin: 0 auto;' : ''}
            "
          >
            ${this.eyebrow
              ? html`<div
                  style="
                    font-size: 11px;
                    font-family: var(--font-mono);
                    color: var(--brand-300);
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                  "
                >${this.eyebrow}</div>`
              : html``}
            ${this.title
              ? html`<h2
                  style="
                    font-family: var(--font-display, inherit);
                    font-size: clamp(24px, 3vw, 32px);
                    margin: 0;
                    letter-spacing: -0.025em;
                    line-height: 1.1;
                    color: var(--fg-0);
                  "
                >${this.title}</h2>`
              : html``}
            ${this.body
              ? html`<p
                  style="
                    font-size: 15px;
                    color: var(--fg-2);
                    line-height: 1.6;
                    margin: 0;
                  "
                >${this.body}</p>`
              : html``}
          </div>
          <div><slot></slot></div>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-section': LetheanMktSection;
  }
}
