import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-search-field')
export class LetheanSearchField extends LitElement {
  @property() value = '';
  @property() placeholder = 'Search…';
  @property() kbd = '';
  @property({ type: Boolean }) large = false;

  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .icon {
      position: absolute;
      left: 14px;
      color: var(--fg-3);
      pointer-events: none;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 0 14px 0 40px;
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      border-radius: 8px;
      color: var(--fg-0);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    :host(:not([large])) input {
      height: 38px;
    }
    :host([large]) input {
      height: 56px;
      font-size: 18px;
      padding-left: 50px;
      letter-spacing: -0.01em;
    }
    :host([large]) .icon {
      left: 18px;
    }
    input:focus {
      border-color: var(--brand-400);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--brand-500) 18%, transparent);
    }
    input::placeholder {
      color: var(--fg-4);
    }
    kbd {
      position: absolute;
      right: 14px;
      padding: 2px 7px;
      background: var(--ink-3);
      border: 1px solid var(--line-2);
      border-radius: 4px;
      color: var(--fg-3);
      font-family: var(--font-mono);
      font-size: 11px;
      pointer-events: none;
    }
  `;

  private onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    this.value = t.value;
    this.dispatchEvent(
      new CustomEvent('lethean-search', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`
      <div class="wrap">
        <svg
          class="icon"
          width=${this.large ? 18 : 14}
          height=${this.large ? 18 : 14}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M11 11 L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
        <input
          type="search"
          .value=${this.value}
          placeholder=${this.placeholder}
          @input=${this.onInput}
        />
        ${this.kbd ? html`<kbd>${this.kbd}</kbd>` : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-search-field': LetheanSearchField;
  }
}
