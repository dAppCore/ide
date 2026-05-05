import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const FEATHER_LARGE = svg`
  <svg viewBox="0 0 16 16" width="56" height="56" aria-hidden="true">
    <path d="M11 2 C 7 2 4 5 4 9 L 4 13 L 11 6 Z M 4 13 L 8 9 M 6 11 L 9 11 M 5 12 L 7 12"
      stroke="currentColor" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

interface StubBullet {
  icon?: string;
  text: string;
  meta?: string;
}

@customElement('lethean-stub-page')
export class LetheanStubPage extends LitElement {
  @property() eyebrow = '';
  @property({ attribute: 'page-title' }) pageTitle = '';
  @property() subtitle = '';
  @property({ attribute: 'teaser-heading' }) teaserHeading = '';
  @property({ attribute: 'teaser-body' }) teaserBody = '';
  @property({ attribute: 'primary-action' }) primaryAction = '';
  @property({ attribute: 'secondary-action' }) secondaryAction = '';
  @property({ attribute: false }) bullets: StubBullet[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      ${this.renderHeader()}
      <div style="flex: 1; overflow: auto; padding: 22px;">
        ${this.renderTeaser()}
        ${this.bullets.length ? this.renderBullets() : html``}
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div
        style="
          padding: 16px 22px 12px;
          border-bottom: 1px solid var(--line-1);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-shrink: 0;
          gap: 12px;
          flex-wrap: wrap;
        "
      >
        <div style="min-width: 0;">
          <div
            style="
              font-size: 11px;
              color: var(--brand-300);
              font-family: var(--font-mono);
              letter-spacing: 0.06em;
              text-transform: uppercase;
            "
          >${this.eyebrow}</div>
          <h1
            style="
              font-family: var(--font-display, inherit);
              font-size: 22px;
              margin: 4px 0 0;
              font-weight: 600;
              letter-spacing: -0.025em;
              color: var(--fg-0);
            "
          >${this.pageTitle}</h1>
          ${this.subtitle
            ? html`<p style="margin: 6px 0 0; font-size: 13px; color: var(--fg-2); max-width: 640px;">${this.subtitle}</p>`
            : html``}
        </div>
      </div>
    `;
  }

  private renderTeaser() {
    return html`
      <div
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          padding: 32px 28px;
          display: grid;
          grid-template-columns: 80px 1fr auto;
          gap: 22px;
          align-items: center;
        "
      >
        <div
          style="
            width: 80px; height: 80px;
            border-radius: 16px;
            background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-3));
            border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
            display: grid; place-items: center;
            color: var(--brand-200);
          "
        >${FEATHER_LARGE}</div>

        <div style="min-width: 0;">
          <div
            style="
              font-size: 17px;
              color: var(--fg-0);
              letter-spacing: -0.015em;
              font-weight: 500;
            "
          >${this.teaserHeading}</div>
          <p
            style="
              margin: 6px 0 0;
              font-size: 13px;
              color: var(--fg-2);
              line-height: 1.55;
              max-width: 600px;
            "
          >${this.teaserBody}</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; align-items: stretch; flex-shrink: 0;">
          ${this.primaryAction
            ? html`<button
                style="
                  background: var(--brand-500);
                  border: 1px solid var(--brand-400);
                  color: var(--fg-0);
                  padding: 7px 14px;
                  border-radius: 6px;
                  font-size: 12.5px;
                  font-weight: 500;
                  cursor: pointer;
                  font-family: inherit;
                  white-space: nowrap;
                "
              >${this.primaryAction}</button>`
            : html``}
          ${this.secondaryAction
            ? html`<button
                style="
                  background: transparent;
                  border: 1px solid var(--line-2);
                  color: var(--fg-1);
                  padding: 7px 14px;
                  border-radius: 6px;
                  font-size: 12.5px;
                  cursor: pointer;
                  font-family: inherit;
                  white-space: nowrap;
                "
              >${this.secondaryAction}</button>`
            : html``}
        </div>
      </div>
    `;
  }

  private renderBullets() {
    return html`
      <div
        style="
          margin-top: 16px;
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          overflow: hidden;
        "
      >
        ${this.bullets.map(
          (b, i) => html`
            <div
              style="
                display: grid;
                grid-template-columns: ${b.icon ? '32px 1fr auto' : '1fr auto'};
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                font-size: 13px;
              "
            >
              ${b.icon
                ? html`<div
                    style="
                      width: 28px; height: 28px;
                      border-radius: 6px;
                      background: var(--ink-3);
                      border: 1px solid var(--line-1);
                      display: grid; place-items: center;
                    "
                  >
                    <i class="fa-solid fa-${b.icon}" style="font-size: 12px; color: var(--brand-300);"></i>
                  </div>`
                : html``}
              <span style="color: var(--fg-1); min-width: 0;">${b.text}</span>
              ${b.meta
                ? html`<span style="font-size: 11.5px; color: var(--fg-4); font-family: var(--font-mono);">${b.meta}</span>`
                : html``}
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-stub-page': LetheanStubPage;
  }
}
