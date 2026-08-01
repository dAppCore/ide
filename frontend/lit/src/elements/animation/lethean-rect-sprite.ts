// <lethean-rect-sprite> — simple rectangle that scales/fades in with a
// back overshoot, holds, fades out. Demo primitive — useful for blocking
// out scenes while real assets are being made. Position absolute against
// the nearest positioned ancestor.

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { spriteContext, type SpriteState } from './context';
import { Easing, clamp } from './easing';

@customElement('lethean-rect-sprite')
export class LetheanRectSprite extends LitElement {
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;
  @property({ type: Number }) width = 100;
  @property({ type: Number }) height = 100;
  @property({ type: String }) color = '#111';
  @property({ type: Number }) radius = 8;
  @property({ type: Number, attribute: 'entry-dur' }) entryDur = 0.4;
  @property({ type: Number, attribute: 'exit-dur' }) exitDur = 0.3;

  @consume({ context: spriteContext, subscribe: true })
  @state()
  private _sprite: SpriteState = { localTime: 0, progress: 0, duration: 0, visible: false };

  static styles = css`
    :host {
      position: absolute;
      will-change: transform, opacity;
    }
  `;

  render() {
    const { localTime, duration } = this._sprite;
    const exitStart = Math.max(0, duration - this.exitDur);

    let opacity = 1;
    let scale = 1;
    if (localTime < this.entryDur) {
      const t = Easing.easeOutBack(clamp(localTime / this.entryDur, 0, 1));
      opacity = clamp(localTime / this.entryDur, 0, 1);
      scale = 0.4 + 0.6 * t;
    } else if (localTime > exitStart) {
      const t = Easing.easeInQuad(clamp((localTime - exitStart) / this.exitDur, 0, 1));
      opacity = 1 - t;
      scale = 1 - 0.15 * t;
    }

    const style = [
      `left:${this.x}px`,
      `top:${this.y}px`,
      `width:${this.width}px`,
      `height:${this.height}px`,
      `background:${this.color}`,
      `border-radius:${this.radius}px`,
      `opacity:${opacity}`,
      `transform:scale(${scale})`,
      `transform-origin:center`,
    ].join(';');

    return html`<div style=${style}></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-rect-sprite': LetheanRectSprite;
  }
}
