import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-input')
export class LetheanInput extends LitElement {
  @property() type = 'text';
  @property() value = '';
  @property() placeholder = '';
  @property({ type: Boolean }) disabled = false;
  @property() name = '';

  static styles = css`
    :host {
      display: block;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      height: 34px;
      padding: 0 12px;
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      border-radius: 6px;
      color: var(--fg-0);
      font-family: inherit;
      font-size: 13px;
      outline: none;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    input::placeholder {
      color: var(--fg-4);
    }
    input:focus {
      border-color: var(--brand-400);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--brand-500) 18%, transparent);
    }
    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  private onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    this.value = t.value;
    this.dispatchEvent(
      new CustomEvent('lethean-input', {
        detail: { value: t.value, name: this.name },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`
      <input
        type=${this.type}
        .value=${this.value}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        name=${this.name}
        @input=${this.onInput}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-input': LetheanInput;
  }
}
