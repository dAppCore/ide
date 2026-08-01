import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type IconStyle = 'solid' | 'regular' | 'light' | 'duotone' | 'brands';

@customElement('lethean-icon')
export class LetheanIcon extends LitElement {
  @property() name = '';
  @property({ attribute: 'icon-style' }) iconStyle: IconStyle = 'solid';
  @property({ type: Number }) size = 14;
  @property() color = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private prefix(): string {
    switch (this.iconStyle) {
      case 'regular': return 'far';
      case 'light': return 'fal';
      case 'duotone': return 'fad';
      case 'brands': return 'fab';
      default: return 'fa-solid';
    }
  }

  render() {
    const cls = this.iconStyle === 'solid' ? 'fa-solid' : this.prefix();
    return html`<i
      class="${cls} fa-${this.name}"
      style="font-size: ${this.size}px; color: ${this.color || 'currentColor'}; line-height: 1; display: inline-block;"
      aria-hidden="true"
    ></i>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-icon': LetheanIcon;
  }
}
