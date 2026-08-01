// <lethean-sprite> — renders slotted children only when the timeline
// playhead is within [start, end]. Provides SpriteContext with localTime
// (seconds since start) and progress (0..1) so child sprites can animate.
//
// Usage:
//   <lethean-sprite start="2" end="5">
//     <lethean-text-sprite text="Hello"/>
//   </lethean-sprite>

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume, provide } from '@lit/context';
import {
  timelineContext,
  spriteContext,
  type TimelineState,
  type SpriteState,
} from './context';
import { clamp } from './easing';

@customElement('lethean-sprite')
export class LetheanSprite extends LitElement {
  @property({ type: Number }) start = 0;
  @property({ type: Number }) end = Infinity;
  @property({ type: Boolean, attribute: 'keep-mounted' }) keepMounted = false;

  // Subscribe = re-render whenever the timeline updates.
  @consume({ context: timelineContext, subscribe: true })
  @state()
  private _timeline: TimelineState = { time: 0, duration: 0, playing: false };

  // Provide our derived sprite state to descendants. Updated in willUpdate.
  @provide({ context: spriteContext })
  @state()
  private _sprite: SpriteState = {
    localTime: 0,
    progress: 0,
    duration: 0,
    visible: false,
  };

  willUpdate() {
    const time = this._timeline.time;
    const visible = time >= this.start && time <= this.end;
    const dur = this.end - this.start;
    const localTime = Math.max(0, time - this.start);
    const progress =
      dur > 0 && isFinite(dur) ? clamp(localTime / dur, 0, 1) : 0;
    this._sprite = {
      localTime,
      progress,
      duration: isFinite(dur) ? dur : 0,
      visible,
    };
  }

  // Light DOM so absolute-positioned children stack inside the parent
  // <lethean-stage> canvas rather than against the sprite's shadow root.
  protected createRenderRoot() {
    return this;
  }

  render() {
    if (!this._sprite.visible && !this.keepMounted) return html``;
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-sprite': LetheanSprite;
  }
}
