import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-mac-segmented')
export class LetheanMacSegmented extends LitElement {
  @property({ attribute: false }) items: string[] = [];
  @property() value = '';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: 6px;
    }
    button {
      height: 22px;
      padding: 0 10px;
      background: transparent;
      border: none;
      color: var(--fg-2);
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 500;
      letter-spacing: -0.005em;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }
    button[aria-selected='true'] {
      background: var(--ink-3);
      color: var(--fg-0);
      box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.25);
    }
  `;

  private select(item: string) {
    this.value = item;
    this.dispatchEvent(
      new CustomEvent('lethean-segmented-select', {
        detail: { value: item },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      ${this.items.map(
        (item) => html`
          <button
            type="button"
            aria-selected=${item === this.value ? 'true' : 'false'}
            @click=${() => this.select(item)}
          >${item}</button>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-mac-segmented': LetheanMacSegmented;
  }
}
