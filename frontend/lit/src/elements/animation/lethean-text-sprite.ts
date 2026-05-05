// <lethean-text-sprite> — text that fades/slides in on entry, holds, then
// fades out on exit. Consumes SpriteContext. Position is absolute against
// the nearest positioned ancestor (typically the Stage canvas).

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { spriteContext, type SpriteState } from './context';
import { Easing, clamp, type EasingFn } from './easing';

const EASING_BY_NAME: Record<string, EasingFn> = Easing;

@customElement('lethean-text-sprite')
export class LetheanTextSprite extends LitElement {
  @property({ type: String }) text = '';
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;
  @property({ type: Number }) size = 48;
  @property({ type: String }) color = '#111';
  @property({ type: String }) font = 'Inter, system-ui, sans-serif';
  @property({ type: Number }) weight = 600;
  @property({ type: Number, attribute: 'entry-dur' }) entryDur = 0.45;
  @property({ type: Number, attribute: 'exit-dur' }) exitDur = 0.35;
  @property({ type: String, attribute: 'entry-ease' }) entryEase = 'easeOutBack';
  @property({ type: String, attribute: 'exit-ease' }) exitEase = 'easeInCubic';
  @property({ type: String }) align: 'left' | 'center' | 'right' = 'left';
  @property({ type: String, attribute: 'letter-spacing' }) letterSpacing = '-0.01em';

  @consume({ context: spriteContext, subscribe: true })
  @state()
  private _sprite: SpriteState = { localTime: 0, progress: 0, duration: 0, visible: false };

  static styles = css`
    :host {
      position: absolute;
      white-space: pre;
      line-height: 1.1;
      will-change: transform, opacity;
    }
  `;

  render() {
    const { localTime, duration } = this._sprite;
    const exitStart = Math.max(0, duration - this.exitDur);
    const entryEase = EASING_BY_NAME[this.entryEase] ?? Easing.easeOutBack;
    const exitEase = EASING_BY_NAME[this.exitEase] ?? Easing.easeInCubic;

    let opacity = 1;
    let ty = 0;
    if (localTime < this.entryDur) {
      const t = entryEase(clamp(localTime / this.entryDur, 0, 1));
      opacity = t;
      ty = (1 - t) * 16;
    } else if (localTime > exitStart) {
      const t = exitEase(clamp((localTime - exitStart) / this.exitDur, 0, 1));
      opacity = 1 - t;
      ty = -t * 8;
    }

    const translateX =
      this.align === 'center' ? '-50%' : this.align === 'right' ? '-100%' : '0';

    const style = [
      `left:${this.x}px`,
      `top:${this.y}px`,
      `transform:translate(${translateX},${ty}px)`,
      `opacity:${opacity}`,
      `font-family:${this.font}`,
      `font-size:${this.size}px`,
      `font-weight:${this.weight}`,
      `color:${this.color}`,
      `letter-spacing:${this.letterSpacing}`,
    ].join(';');

    return html`<div style=${style}>${this.text}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-text-sprite': LetheanTextSprite;
  }
}
