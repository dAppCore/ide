import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-color-picker')
export class LetheanColorPicker extends LitElement {
  @property() value = '#000000';
  @property() name = '';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    label {
      position: relative;
      width: 36px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid var(--line-2);
      cursor: pointer;
      overflow: hidden;
      background-color: var(--lethean-color-current, #000);
    }
    input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      border: none;
      padding: 0;
    }
    .hex {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-2);
    }
  `;

  private onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    this.value = t.value;
    this.dispatchEvent(
      new CustomEvent('lethean-color', {
        detail: { value: this.value, name: this.name },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`
      <label style="--lethean-color-current: ${this.value};">
        <input type="color" .value=${this.value} @input=${this.onInput} />
      </label>
      <span class="hex">${this.value.toUpperCase()}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-color-picker': LetheanColorPicker;
  }
}
