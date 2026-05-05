import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-toggle')
export class LetheanToggle extends LitElement {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property() name = '';

  static styles = css`
    :host {
      display: inline-block;
    }
    button {
      width: 44px;
      height: 24px;
      border-radius: 999px;
      background: var(--ink-3);
      border: 1px solid var(--line-2);
      position: relative;
      cursor: pointer;
      padding: 0;
      transition: background 120ms ease, border-color 120ms ease;
    }
    :host([checked]) button {
      background: var(--brand-500);
      border-color: var(--brand-400);
    }
    .knob {
      position: absolute;
      top: 1px;
      left: 1px;
      width: 20px;
      height: 20px;
      border-radius: 999px;
      background: var(--fg-0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      transition: left 120ms ease;
    }
    :host([checked]) .knob {
      left: 23px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  private toggle = () => {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(
      new CustomEvent('lethean-toggle', {
        detail: { checked: this.checked, name: this.name },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`
      <button
        type="button"
        role="switch"
        aria-checked=${this.checked ? 'true' : 'false'}
        ?disabled=${this.disabled}
        @click=${this.toggle}
      >
        <span class="knob"></span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-toggle': LetheanToggle;
  }
}
