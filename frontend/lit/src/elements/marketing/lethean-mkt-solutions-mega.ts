// <lethean-mkt-solutions-mega> — solutions dropdown panel for the
// marketing nav. Multi-column link grid (typically "by role / by need /
// by industry"). Ported from marketing-shared.jsx > SolutionsMega.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface MktSolutionColumn {
  title: string;
  items: Array<{ label: string; href?: string }>;
}

@customElement('lethean-mkt-solutions-mega')
export class LetheanMktSolutionsMega extends LitElement {
  @property({ attribute: false }) columns: MktSolutionColumn[] = [];

  protected createRenderRoot() {
    return this;
  }

  render() {
    const cols = this.columns.length || 1;
    return html`
      <div
        style="
          background: var(--ink-1);
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-2);
          box-shadow: var(--shadow-3);
          padding: 24px 56px 28px;
        "
      >
        <div style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 36px;">
          ${this.columns.map(
            (c) => html`
              <div>
                <div
                  style="
                    font-size: 11px;
                    font-family: var(--font-mono);
                    color: var(--fg-4);
                    letter-spacing: 0.08em;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                  "
                >${c.title}</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${c.items.map(
                    (it) => html`<a
                      href=${it.href || '#'}
                      style="
                        font-size: 13px;
                        color: var(--fg-1);
                        text-decoration: none;
                      "
                    >${it.label}</a>`
                  )}
                </div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mkt-solutions-mega': LetheanMktSolutionsMega;
  }
}
