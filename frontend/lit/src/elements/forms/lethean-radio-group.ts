import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface Option {
  value: string;
  label: string;
}

@customElement('lethean-radio-group')
export class LetheanRadioGroup extends LitElement {
  @property({ attribute: false }) options: (string | Option)[] = [];
  @property() value = '';
  @property() name = '';

  @state() private trackWidth = 0;

  static styles = css`
    :host {
      display: inline-block;
    }
    .track {
      position: relative;
      display: inline-flex;
      padding: 2px;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: 7px;
      gap: 0;
    }
    .thumb {
      position: absolute;
      top: 2px;
      bottom: 2px;
      background: var(--ink-3);
      border-radius: 5px;
      box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.25);
      transition: left 160ms ease, width 160ms ease;
      pointer-events: none;
    }
    button {
      position: relative;
      z-index: 1;
      height: 24px;
      padding: 0 12px;
      background: transparent;
      border: none;
      color: var(--fg-2);
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: -0.005em;
      cursor: pointer;
      white-space: nowrap;
    }
    button[aria-checked='true'] {
      color: var(--fg-0);
    }
  `;

  private opts(): Option[] {
    return this.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  }

  private select(option: Option) {
    if (option.value === this.value) return;
    this.value = option.value;
    this.dispatchEvent(
      new CustomEvent('lethean-radio-change', {
        detail: { value: option.value, name: this.name },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const opts = this.opts();
    const idx = Math.max(0, opts.findIndex((o) => o.value === this.value));
    const n = opts.length;
    const thumbStyle = `left: calc(2px + ${idx} * ((100% - 4px) / ${n})); width: calc((100% - 4px) / ${n});`;
    return html`
      <div role="radiogroup" class="track">
        ${n > 0 ? html`<span class="thumb" style=${thumbStyle}></span>` : html``}
        ${opts.map(
          (o) => html`
            <button
              type="button"
              role="radio"
              aria-checked=${o.value === this.value ? 'true' : 'false'}
              @click=${() => this.select(o)}
            >${o.label}</button>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-radio-group': LetheanRadioGroup;
  }
}
