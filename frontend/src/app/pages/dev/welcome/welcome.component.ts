// SPDX-Licence-Identifier: EUPL-1.2

import { Component } from '@angular/core';

/**
 * Phase-1 router-outlet proof. First Angular route mounted as a child
 * of /dev. Renders nothing-real — its existence and visibility verifies
 * IdeComponent's <router-outlet> is wired correctly, that the
 * hasChildRoute() switch correctly hides the legacy @switch fallback,
 * and that navigation to /dev/welcome lands here.
 *
 * Replace with the first real extracted panel in Phase 2.
 */
@Component({
  selector: 'dev-welcome',
  standalone: true,
  template: `
    <section class="block">
      <div class="block-header">
        <h2 class="block-title">Router-outlet proof</h2>
        <span class="editorial subtitle">
          You are at <code>/dev/welcome</code> — rendering through
          IdeComponent's child router-outlet.
        </span>
      </div>
      <p style="padding: 16px 0; color: var(--fg-2);">
        The legacy <code>&#64;switch</code> fallback is hidden whenever
        a child route is active. As panels move out of the switch into
        their own components, navigate to them by URL — sidebar
        migration follows once a critical mass of panels is extracted.
      </p>
    </section>
  `,
})
export class WelcomeComponent {}
