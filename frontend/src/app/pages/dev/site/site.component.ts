// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SitesStore } from '../../../services/store/sites.store';

/**
 * Site detail — placeholder. The real ops dashboard (status / uptime
 * / p95 / errors / deploy timeline / actions) is specced in
 * `plans/code/core/ide/RFC.ops-dashboard.md` (Status: Stub). This route
 * exists today to give the sidebar's Sites rows a real landing page
 * instead of falling through the wildcard to /dev/control-panel.
 */
@Component({
  selector: 'dev-site',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (site(); as s) {
      <section class="block">
        <div class="block-header">
          <h2 class="block-title">
            <span class="status-dot" [attr.data-status]="s.status"></span>
            {{ s.domain }}
          </h2>
          <span class="editorial subtitle">{{ s.stack }} · {{ s.uptime }}% {{ 'site.label.uptime' | translate }} · {{ s.response }}ms {{ 'site.label.p95' | translate }}</span>
        </div>
        <div class="placeholder-pane">
          <p>{{ 'site.body.dashboard-roadmap' | translate }}
          <code>plans/code/core/ide/RFC.ops-dashboard.md</code> ({{ 'site.label.status-stub' | translate }}).</p>
          <p>{{ 'site.body.planned' | translate }}</p>
          <p>{{ 'site.label.last-deploy' | translate }} <code>{{ s.lastDeploy }}</code>
          @if (s.warn) { · <span class="pill pill-warn">{{ s.warn }}</span> }
          </p>
        </div>
      </section>
    } @else {
      <section class="block">
        <div class="block-header">
          <h2 class="block-title">{{ domain() }}</h2>
          <span class="editorial subtitle">{{ 'site.status.unknown' | translate }}</span>
        </div>
        <div class="placeholder-pane">
          <p>{{ 'site.empty.no-service-prefix' | translate }} <code>{{ domain() }}</code>. {{ 'site.empty.no-service-suffix' | translate }}
          <code>plans/code/core/ide/RFC.ops-dashboard.md</code>).</p>
        </div>
      </section>
    }
  `,
})
export class SiteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sitesStore = inject(SitesStore);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  readonly domain = computed(() => this.params().get('domain') || '');
  readonly site = computed(() =>
    this.sitesStore.sites().find((s) => s.domain === this.domain()) || null,
  );
}
