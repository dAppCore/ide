import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-mkt-hero')
export class LetheanMktHero extends LitElement {
  @property() eyebrow = '';
  @property() title = '';
  @property() italics = '';
  @property() body = '';
  @property() align: 'left' | 'center' = 'center';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const center = this.align === 'center';
    return html`
      <section
        class="brand-glow"
        style="
          padding: 64px 24px 56px;
          position: relative;
          overflow: hidden;
        "
      >
        <div
          style="
            max-width: 760px;
            margin: 0 auto;
            text-align: ${center ? 'center' : 'left'};
            display: flex;
            flex-direction: column;
            gap: 0;
            ${center ? 'align-items: center;' : ''}
          "
        >
          ${this.eyebrow
            ? html`<span
                class="pill pill-brand"
                style="
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  margin-bottom: 22px;
                  padding: 4px 11px;
                  border-radius: 999px;
                  background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-3));
                  border: 1px solid color-mix(in oklch, var(--brand-500) 30%, transparent);
                  color: var(--brand-200);
                  font-size: 11px;
                  font-weight: 500;
                  align-self: ${center ? 'center' : 'flex-start'};
                "
              ><slot name="eyebrow-icon"></slot>${this.eyebrow}</span>`
            : html``}

          <h1
            style="
              font-size: clamp(40px, 6vw, 56px);
              line-height: 1.04;
              letter-spacing: -0.035em;
              margin: 0 0 22px;
              color: var(--fg-0);
            "
          >${this.title}
            ${this.italics
              ? html` <span
                  class="editorial"
                  style="font-style: italic; color: var(--brand-200); font-weight: 400;"
                >${this.italics}</span>.`
              : html`.`}
          </h1>

          ${this.body
            ? html`<p
                style="
                  font-size: 18px;
                  color: var(--fg-2);
                  max-width: 560px;
                  ${center ? 'margin: 0 auto 32px;' : 'margin: 0 0 32px;'}
                  line-height: 1.5;
                "
              >${this.body}</p>`
            : html``}

          <div
            style="
              display: flex;
              gap: 12px;
              ${center ? 'justify-content: center;' : ''}
              align-items: center;
              flex-wrap: wrap;
            "
          >
            <slot name="actions"></slot>
          </div>

          <div style="margin-top: 24px;">
            <slot name="footer"></slot>
          </div>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-hero': LetheanMktHero;
  }
}
