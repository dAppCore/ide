// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, inject } from '@angular/core';
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
  template: `
    @if (site(); as s) {
      <section class="block">
        <div class="block-header">
          <h2 class="block-title">
            <span class="status-dot" [attr.data-status]="s.status"></span>
            {{ s.domain }}
          </h2>
          <span class="editorial subtitle">{{ s.stack }} · {{ s.uptime }}% uptime · {{ s.response }}ms p95</span>
        </div>
        <div class="placeholder-pane">
          <p>Service operational dashboard is on the roadmap — see
          <code>plans/code/core/ide/RFC.ops-dashboard.md</code> (Status:
          Stub).</p>
          <p>Planned: time-series error rate / latency, recent error log,
          deploy timeline (forge_releases pivoted by service), restart /
          rollback / scale actions gated by tenant.Can.</p>
          <p>Last deploy: <code>{{ s.lastDeploy }}</code>
          @if (s.warn) { · <span class="pill pill-warn">{{ s.warn }}</span> }
          </p>
        </div>
      </section>
    } @else {
      <section class="block">
        <div class="block-header">
          <h2 class="block-title">{{ domain() }}</h2>
          <span class="editorial subtitle">Unknown service</span>
        </div>
        <div class="placeholder-pane">
          <p>No service registered for <code>{{ domain() }}</code>. Add it
          to the Sites snapshot or wait for the ops dashboard wiring (see
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
