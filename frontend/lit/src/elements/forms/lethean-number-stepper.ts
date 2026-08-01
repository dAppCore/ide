import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lethean-number-stepper')
export class LetheanNumberStepper extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min: number | null = null;
  @property({ type: Number }) max: number | null = null;
  @property({ type: Number }) step = 1;
  @property() unit = '';
  @property() label = '';
  @property() name = '';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .label {
      font-size: 12px;
      color: var(--fg-2);
      cursor: ew-resize;
      user-select: none;
    }
    .group {
      display: inline-flex;
      align-items: stretch;
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      border-radius: 6px;
      overflow: hidden;
    }
    button {
      width: 24px;
      background: transparent;
      border: none;
      color: var(--fg-2);
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
    }
    button:hover {
      background: var(--ink-3);
      color: var(--fg-0);
    }
    button.minus {
      border-right: 1px solid var(--line-1);
    }
    button.plus {
      border-left: 1px solid var(--line-1);
    }
    input {
      width: 56px;
      background: transparent;
      border: none;
      color: var(--fg-0);
      font-family: var(--font-mono);
      font-size: 12.5px;
      text-align: center;
      outline: none;
      -moz-appearance: textfield;
    }
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .unit {
      font-size: 11px;
      color: var(--fg-4);
      font-family: var(--font-mono);
    }
  `;

  private clamp(n: number): number {
    if (this.min !== null && n < this.min) return this.min;
    if (this.max !== null && n > this.max) return this.max;
    return n;
  }

  private decimals(): number {
    return (String(this.step).split('.')[1] || '').length;
  }

  private setValue(n: number) {
    const clamped = this.clamp(n);
    const decimals = this.decimals();
    const snapped = Number((Math.round(clamped / this.step) * this.step).toFixed(decimals));
    if (snapped !== this.value) {
      this.value = snapped;
      this.dispatchEvent(
        new CustomEvent('lethean-number-change', {
          detail: { value: this.value, name: this.name },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private dec = () => this.setValue(this.value - this.step);
  private inc = () => this.setValue(this.value + this.step);

  private onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    const n = Number(t.value);
    if (!Number.isNaN(n)) this.setValue(n);
  };

  private onScrubStart = (e: PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = this.value;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      this.setValue(startVal + dx * this.step);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  render() {
    return html`
      ${this.label
        ? html`<span class="label" @pointerdown=${this.onScrubStart}>${this.label}</span>`
        : html``}
      <div class="group">
        <button class="minus" type="button" @click=${this.dec}>−</button>
        <input
          type="number"
          .value=${String(this.value)}
          min=${this.min ?? ''}
          max=${this.max ?? ''}
          step=${this.step}
          @input=${this.onInput}
        />
        <button class="plus" type="button" @click=${this.inc}>+</button>
      </div>
      ${this.unit ? html`<span class="unit">${this.unit}</span>` : html``}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-number-stepper': LetheanNumberStepper;
  }
}
