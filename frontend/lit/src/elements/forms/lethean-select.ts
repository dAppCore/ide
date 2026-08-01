import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface Option {
  value: string;
  label: string;
}

@customElement('lethean-select')
export class LetheanSelect extends LitElement {
  @property({ attribute: false }) options: (string | Option)[] = [];
  @property() value = '';
  @property() name = '';
  @property({ type: Boolean }) disabled = false;

  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      position: relative;
    }
    select {
      width: 100%;
      box-sizing: border-box;
      height: 34px;
      padding: 0 32px 0 12px;
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      border-radius: 6px;
      color: var(--fg-0);
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    select:focus {
      border-color: var(--brand-400);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--brand-500) 18%, transparent);
    }
    select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .chev {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--fg-4);
    }
  `;

  private onChange = (e: Event) => {
    const t = e.target as HTMLSelectElement;
    this.value = t.value;
    this.dispatchEvent(
      new CustomEvent('lethean-select', {
        detail: { value: this.value, name: this.name },
        bubbles: true,
        composed: true,
      })
    );
  };

  private opts(): Option[] {
    return this.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  }

  render() {
    return html`
      <div class="wrap">
        <select ?disabled=${this.disabled} .value=${this.value} @change=${this.onChange}>
          ${this.opts().map(
            (o) => html`<option value=${o.value} ?selected=${o.value === this.value}>${o.label}</option>`
          )}
        </select>
        <svg class="chev" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-select': LetheanSelect;
  }
}
