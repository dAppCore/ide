import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface Crumb {
  label: string;
  href?: string;
}

@customElement('lethean-article')
export class LetheanArticle extends LitElement {
  @property() eyebrow = '';
  @property() title = '';
  @property() lede = '';
  @property() author = '';
  @property() avatar = '';
  @property() updated = '';
  @property() readMin = '';
  @property({ attribute: false }) breadcrumbs: Crumb[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <article style="max-width: 760px; margin: 0 auto; padding: 32px 24px 56px; display: flex; flex-direction: column; gap: 16px;">
        ${this.breadcrumbs.length
          ? html`
              <nav style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--fg-3); flex-wrap: wrap;">
                ${this.breadcrumbs.map(
                  (c, i) => html`
                    ${i > 0
                      ? html`<span style="color: var(--fg-4);">·</span>`
                      : html``}
                    <a
                      href=${c.href || '#'}
                      style="color: ${i === this.breadcrumbs.length - 1 ? 'var(--fg-1)' : 'var(--brand-300)'}; text-decoration: none;"
                    >${c.label}</a>
                  `
                )}
              </nav>
            `
          : html``}

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

        <h1
          style="
            font-family: var(--font-display, inherit);
            font-size: clamp(28px, 4vw, 38px);
            margin: 0;
            letter-spacing: -0.03em;
            line-height: 1.1;
            color: var(--fg-0);
          "
        >${this.title}</h1>

        ${this.lede
          ? html`<p
              style="
                font-size: 16px;
                color: var(--fg-2);
                line-height: 1.6;
                margin: 0;
              "
            >${this.lede}</p>`
          : html``}

        ${this.author || this.updated || this.readMin
          ? html`
              <div
                style="
                  display: flex;
                  gap: 14px;
                  align-items: center;
                  font-size: 12px;
                  color: var(--fg-3);
                  font-family: var(--font-mono);
                  padding: 10px 0 14px;
                  border-bottom: 1px solid var(--line-1);
                "
              >
                ${this.author
                  ? html`<span style="display: inline-flex; align-items: center; gap: 7px;">
                      ${this.avatar
                        ? html`<span
                            style="
                              width: 22px; height: 22px;
                              border-radius: 50%;
                              background: var(--brand-500);
                              display: grid; place-items: center;
                              font-size: 10px; font-weight: 600;
                              color: var(--fg-0);
                              font-family: var(--font-sans);
                            "
                          >${this.avatar}</span>`
                        : html``}
                      <span style="color: var(--fg-1);">${this.author}</span>
                    </span>`
                  : html``}
                ${this.updated
                  ? html`<span style="color: var(--fg-4);">·</span><span>${this.updated}</span>`
                  : html``}
                ${this.readMin
                  ? html`<span style="color: var(--fg-4);">·</span><span>${this.readMin} min read</span>`
                  : html``}
              </div>
            `
          : html``}

        <div style="font-size: 15px; color: var(--fg-1); line-height: 1.7;">
          <slot></slot>
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-article': LetheanArticle;
  }
}
