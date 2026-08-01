import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-mkt-cta')
export class LetheanMktCta extends LitElement {
  @property() title = '';
  @property() body = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <section
        class="brand-glow"
        style="
          padding: 56px 24px;
          background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1));
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-1);
        "
      >
        <div
          style="
            max-width: 760px;
            margin: 0 auto;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 18px;
            align-items: center;
          "
        >
          ${this.title
            ? html`<h2
                style="
                  font-family: var(--font-display, inherit);
                  font-size: clamp(28px, 4vw, 36px);
                  margin: 0;
                  letter-spacing: -0.03em;
                  line-height: 1.1;
                  color: var(--fg-0);
                "
              >${this.title}</h2>`
            : html``}
          ${this.body
            ? html`<p
                style="
                  font-size: 16px;
                  color: var(--fg-2);
                  line-height: 1.6;
                  margin: 0;
                  max-width: 560px;
                "
              >${this.body}</p>`
            : html``}
          <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 6px;">
            <slot name="actions"></slot>
          </div>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-cta': LetheanMktCta;
  }
}
