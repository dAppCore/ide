// <lethean-provisioning-page> — host-context wrapper for the
// provisioning scene. Brand-mark + order-id breadcrumb header, then
// <lethean-stage> running the 12s loop with the scene as its child.
//
// Ported from provisioning.jsx > Provisioning. The actual time-driven
// content lives in <lethean-provisioning-scene>; the stage primitive
// (from animations.jsx) provides the rAF loop, scrub bar, and
// auto-scaling.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';
import '../animation/lethean-stage';
import '../vi/lethean-provisioning-scene';

@customElement('lethean-provisioning-page')
export class LetheanProvisioningPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        class="surface"
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          padding: 32px 40px;
          display: flex; flex-direction: column; gap: 24px;
          box-sizing: border-box;
        "
      >
        <header style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <lethean-brand-mark size="sm" name="Host UK" subdomain="order"></lethean-brand-mark>
            <span style="color: var(--fg-4); font-size: 12px;">/</span>
            <span style="font-size: 12px; color: var(--fg-3); font-family: var(--font-mono);">
              order #2025-0413
            </span>
          </div>
          <div
            style="
              font-size: 11px; color: var(--fg-4);
              font-family: var(--font-mono);
            "
          >Loop preview · scrub timeline below</div>
        </header>

        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; min-height: 700px;">
          <lethean-stage
            width="1100"
            height="620"
            duration="12"
            background="transparent"
            persist-key="provisioning"
          >
            <lethean-provisioning-scene></lethean-provisioning-scene>
          </lethean-stage>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-provisioning-page': LetheanProvisioningPage;
  }
}
