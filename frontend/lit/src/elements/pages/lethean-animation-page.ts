// <lethean-animation-page> — demos the animation engine ported from
// frontend/design/lethean-3/animations.jsx. Multi-scene timeline showing
// the three sample sprites composing on a single 12s stage.

import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../animation/lethean-stage';
import '../animation/lethean-sprite';
import '../animation/lethean-text-sprite';
import '../animation/lethean-image-sprite';
import '../animation/lethean-rect-sprite';

@customElement('lethean-animation-page')
export class LetheanAnimationPage extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background: #0a0a0a;
    }
    .header {
      padding: 16px 24px;
      color: #f6f4ef;
      font-family: 'Inter', system-ui, sans-serif;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: rgba(246, 244, 239, 0.6);
    }
    .stage-wrap {
      position: absolute;
      inset: 64px 0 0 0;
    }
  `;

  render() {
    return html`
      <div class="header">
        <h1>Animation engine — Stage / Sprite demo</h1>
        <p>
          Space = play/pause, ← → = seek 0.1s (shift = 1s), 0 / Home = reset.
          Drag the timeline to scrub, hover for preview.
        </p>
      </div>
      <div class="stage-wrap">
        <lethean-stage
          width="1280"
          height="720"
          duration="12"
          background="#f6f4ef"
          persist-key="anim-demo"
        >
          <!-- Scene 1 (0-3s): title with rect accents -->
          <lethean-sprite start="0" end="3">
            <lethean-rect-sprite
              x="80"
              y="280"
              width="160"
              height="160"
              color="oklch(72% 0.12 250)"
              radius="24"
              entry-dur="0.5"
            ></lethean-rect-sprite>
            <lethean-text-sprite
              x="280"
              y="320"
              text="Lethean-3"
              size="96"
              color="#0a0a0a"
              weight="700"
              letter-spacing="-0.03em"
            ></lethean-text-sprite>
            <lethean-text-sprite
              x="280"
              y="430"
              text="animation engine, ported"
              size="28"
              color="#5b5546"
              weight="500"
              letter-spacing="-0.01em"
              entry-dur="0.6"
            ></lethean-text-sprite>
          </lethean-sprite>

          <!-- Scene 2 (3-6.5s): image placeholder + caption -->
          <lethean-sprite start="3" end="6.5">
            <lethean-image-sprite
              x="160"
              y="120"
              width="640"
              height="480"
              ken-burns
              ken-burns-scale="1.06"
              radius="24"
              placeholder-label="Ken Burns drift"
            ></lethean-image-sprite>
            <lethean-text-sprite
              x="840"
              y="260"
              text="Hold &amp; drift"
              size="56"
              color="#0a0a0a"
              weight="600"
            ></lethean-text-sprite>
            <lethean-text-sprite
              x="840"
              y="340"
              text="entry / hold / exit per sprite"
              size="20"
              color="#5b5546"
              weight="500"
            ></lethean-text-sprite>
          </lethean-sprite>

          <!-- Scene 3 (6.5-9s): rect grid -->
          <lethean-sprite start="6.5" end="9">
            <lethean-rect-sprite x="240" y="240" width="120" height="120" color="oklch(72% 0.12 250)" radius="16"></lethean-rect-sprite>
            <lethean-rect-sprite x="400" y="240" width="120" height="120" color="oklch(78% 0.10 60)" radius="16"></lethean-rect-sprite>
            <lethean-rect-sprite x="560" y="240" width="120" height="120" color="oklch(70% 0.14 340)" radius="16"></lethean-rect-sprite>
            <lethean-rect-sprite x="720" y="240" width="120" height="120" color="oklch(75% 0.10 150)" radius="16"></lethean-rect-sprite>
            <lethean-rect-sprite x="880" y="240" width="120" height="120" color="oklch(68% 0.12 30)" radius="16"></lethean-rect-sprite>
            <lethean-text-sprite
              x="640"
              y="420"
              text="Compose freely"
              size="44"
              color="#0a0a0a"
              weight="600"
              align="center"
            ></lethean-text-sprite>
          </lethean-sprite>

          <!-- Scene 4 (9-12s): outro -->
          <lethean-sprite start="9" end="12">
            <lethean-text-sprite
              x="640"
              y="320"
              text="Stage / Sprite / Easing"
              size="64"
              color="#0a0a0a"
              weight="700"
              align="center"
              letter-spacing="-0.02em"
            ></lethean-text-sprite>
            <lethean-text-sprite
              x="640"
              y="420"
              text="ported from animations.jsx → Lit + @lit/context"
              size="20"
              color="#5b5546"
              weight="500"
              align="center"
              entry-dur="0.7"
            ></lethean-text-sprite>
          </lethean-sprite>
        </lethean-stage>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-animation-page': LetheanAnimationPage;
  }
}
