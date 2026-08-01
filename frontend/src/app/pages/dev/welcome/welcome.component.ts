// SPDX-Licence-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

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
  imports: [TranslatePipe],
  template: `
    <section class="block">
      <div class="block-header">
        <h2 class="block-title">{{ 'welcome.title' | translate }}</h2>
        <span class="editorial subtitle">
          {{ 'welcome.subtitle.prefix' | translate }} <code>/dev/welcome</code> {{ 'welcome.subtitle.suffix' | translate }}
        </span>
      </div>
      <p style="padding: 16px 0; color: var(--fg-2);">
        {{ 'welcome.body' | translate }}
      </p>
    </section>
  `,
})
export class WelcomeComponent {}
