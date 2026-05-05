// <lethean-image-sprite> — image that scales+fades in on entry, holds with
// optional Ken Burns drift, fades out on exit. Falls back to a striped
// placeholder div when no `src` is set (or `placeholder` attr is on).

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { spriteContext, type SpriteState } from './context';
import { Easing, clamp } from './easing';

@customElement('lethean-image-sprite')
export class LetheanImageSprite extends LitElement {
  @property({ type: String }) src = '';
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;
  @property({ type: Number }) width = 400;
  @property({ type: Number }) height = 300;
  @property({ type: Number, attribute: 'entry-dur' }) entryDur = 0.6;
  @property({ type: Number, attribute: 'exit-dur' }) exitDur = 0.4;
  @property({ type: Boolean, attribute: 'ken-burns' }) kenBurns = false;
  @property({ type: Number, attribute: 'ken-burns-scale' }) kenBurnsScale = 1.08;
  @property({ type: Number }) radius = 12;
  @property({ type: String }) fit: 'cover' | 'contain' = 'cover';
  @property({ type: String, attribute: 'placeholder-label' }) placeholderLabel = '';

  @consume({ context: spriteContext, subscribe: true })
  @state()
  private _sprite: SpriteState = { localTime: 0, progress: 0, duration: 0, visible: false };

  static styles = css`
    :host {
      position: absolute;
      overflow: hidden;
      will-change: transform, opacity;
    }
    img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: repeating-linear-gradient(
        135deg,
        #e9e6df 0 10px,
        #dcd8cf 10px 20px
      );
      color: #6b6458;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `;

  render() {
    const { localTime, duration } = this._sprite;
    const exitStart = Math.max(0, duration - this.exitDur);

    let opacity = 1;
    let scale = 1;
    if (localTime < this.entryDur) {
      const t = Easing.easeOutCubic(clamp(localTime / this.entryDur, 0, 1));
      opacity = t;
      scale = 0.96 + 0.04 * t;
    } else if (localTime > exitStart) {
      const t = Easing.easeInCubic(clamp((localTime - exitStart) / this.exitDur, 0, 1));
      opacity = 1 - t;
      scale = (this.kenBurns ? this.kenBurnsScale : 1) + 0.02 * t;
    } else if (this.kenBurns) {
      const holdSpan = exitStart - this.entryDur;
      const holdT = holdSpan > 0 ? (localTime - this.entryDur) / holdSpan : 0;
      scale = 1 + (this.kenBurnsScale - 1) * holdT;
    }

    const usePlaceholder = !this.src || this.placeholderLabel;

    const hostStyle = [
      `left:${this.x}px`,
      `top:${this.y}px`,
      `width:${this.width}px`,
      `height:${this.height}px`,
      `opacity:${opacity}`,
      `transform:scale(${scale})`,
      `transform-origin:center`,
      `border-radius:${this.radius}px`,
    ].join(';');

    return html`
      <div style=${hostStyle}>
        ${usePlaceholder
          ? html`<div class="placeholder">${this.placeholderLabel || 'image'}</div>`
          : html`<img src=${this.src} alt="" style=${`object-fit:${this.fit}`} />`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-image-sprite': LetheanImageSprite;
  }
}
