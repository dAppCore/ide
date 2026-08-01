// <lethean-error-states-page> — 4-up grid of error-state cards
// (404 / 500 / 402 / site-down) showing the same Vi-narrated pattern
// across neutral / danger / warning tones. Ported from
// status-errors.jsx > ErrorStatesGrid.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../feedback/lethean-error-card';

@customElement('lethean-error-states-page')
export class LetheanErrorStatesPage extends LitElement {
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
          padding: 28px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-auto-rows: 1fr;
          gap: 20px;
          box-sizing: border-box;
        "
      >
        <lethean-error-card
          code="404"
          eyebrow="NOT FOUND"
          heading="This page flew off."
          body="The link's broken or the page moved. Vi can search for what you meant."
          pose="peek-right"
          tone="neutral"
          .actions=${[
            { label: 'Search the docs', icon: 'magnifying-glass', primary: true },
            { label: 'Back to control panel' },
          ]}
        ></lethean-error-card>

        <lethean-error-card
          code="500"
          eyebrow="OUR FAULT"
          heading="Something broke our end."
          body="I've already filed an incident — ID INC-2025-0411. The team will see it in seconds. Try again in a minute."
          pose="master"
          tone="danger"
          meta="INC-2025-0411 · auto-filed 14:31"
          .actions=${[
            { label: 'Try again', icon: 'arrow-rotate-right', primary: true },
            { label: 'Check status page', icon: 'wave-pulse' },
          ]}
        ></lethean-error-card>

        <lethean-error-card
          code="402"
          eyebrow="PAYMENT FAILED"
          heading="Card declined."
          body="Your bank refused the £24.40 charge for the renewal. They didn't say why. Try another card or contact them — I'll keep your sites running for 7 days."
          pose="peek-left"
          tone="warning"
          meta="Sites stay live for 7 days · then read-only"
          .actions=${[
            { label: 'Update card', icon: 'credit-card', primary: true },
            { label: 'Pay another way' },
          ]}
        ></lethean-error-card>

        <lethean-error-card
          code="↓"
          eyebrow="SITE DOWN"
          heading="hookway.co.uk isn't responding."
          body="I noticed at 14:02 — first failed health check 3 minutes ago. I'm restarting the worker. If that doesn't fix it within 60s I'll fail over to the cold standby."
          pose="master"
          tone="danger"
          meta="3rd outage this quarter · SLA: 99.9% (you're at 99.94)"
          .actions=${[
            { label: 'Watch live log', icon: 'wave-pulse', primary: true },
            { label: 'Force failover now', icon: 'arrow-right-arrow-left' },
          ]}
        ></lethean-error-card>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-error-states-page': LetheanErrorStatesPage;
  }
}
