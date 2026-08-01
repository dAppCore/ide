import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-slider')
export class LetheanSlider extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property() unit = '';
  @property() name = '';
  @property() label = '';
  @property({ type: Boolean, attribute: 'show-value' }) showValue = true;

  static styles = css`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .label-col {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .label {
      font-size: 12.5px;
      color: var(--fg-1);
    }
    .value {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--fg-3);
      margin-top: 2px;
    }
    .track-wrap {
      flex: 1;
      min-width: 120px;
    }
    input[type='range'] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 18px;
      background: transparent;
      cursor: pointer;
      margin: 0;
    }
    input[type='range']::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(
        to right,
        var(--brand-500) 0%,
        var(--brand-500) var(--lethean-slider-pct, 50%),
        var(--ink-3) var(--lethean-slider-pct, 50%),
        var(--ink-3) 100%
      );
    }
    input[type='range']::-moz-range-track {
      height: 4px;
      border-radius: 999px;
      background: var(--ink-3);
    }
    input[type='range']::-moz-range-progress {
      height: 4px;
      border-radius: 999px;
      background: var(--brand-500);
    }
    input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--fg-0);
      border: 2px solid var(--brand-400);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      margin-top: -5px;
      cursor: grab;
    }
    input[type='range']::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--fg-0);
      border: 2px solid var(--brand-400);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      cursor: grab;
    }
  `;

  private onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    this.value = Number(t.value);
    this.dispatchEvent(
      new CustomEvent('lethean-slider', {
        detail: { value: this.value, name: this.name },
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    const pct = ((this.value - this.min) / (this.max - this.min)) * 100;
    return html`
      <div class="row">
        ${this.label || this.showValue
          ? html`
              <div class="label-col">
                ${this.label ? html`<span class="label">${this.label}</span>` : html``}
                ${this.showValue
                  ? html`<span class="value">${this.value}${this.unit}</span>`
                  : html``}
              </div>
            `
          : html``}
        <div class="track-wrap">
          <input
            type="range"
            min=${this.min}
            max=${this.max}
            step=${this.step}
            .value=${String(this.value)}
            @input=${this.onInput}
            style="--lethean-slider-pct: ${pct}%;"
          />
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-slider': LetheanSlider;
  }
}
