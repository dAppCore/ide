// SPDX-Licence-Identifier: EUPL-1.2

import { CUSTOM_ELEMENTS_SCHEMA, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { PluginMenuStore } from '../../../services/store/plugin-menu.store';

/**
 * Plugin route — mounts an installed marketplace module by code, with
 * an optional sub-page path. Three rendering modes:
 *
 *   - default_mode: 'native' + native_tag set → render the registered
 *     custom element directly (e.g. <lethean-vi-plugin>).
 *   - entrypoint set → render a sandboxed iframe to the plugin URL,
 *     appending the sub-page path if any.
 *   - neither → passive plugin (theme / snippets / tool), placeholder.
 *
 * URL shape: /dev/plugin/:code  or  /dev/plugin/:code/:sub
 *
 * Replaces the legacy `currentRoute = "plugin:vi:ask"` colon-string
 * scheme with real Angular route params. Sidebar uses
 * [routerLink]="['/dev/plugin', code, sub?]" against the same store.
 */
@Component({
  selector: 'dev-plugin',
  standalone: true,
  imports: [TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (record(); as rec) {
      <section class="block plugin-route-block">
        <div class="block-header plugin-route-header">
          <h2 class="block-title">{{ rec.menu?.label || rec.name }}</h2>
          <span class="editorial subtitle">
            {{ 'plugin.label.plugin' | translate }} · {{ rec.code }}
            @if (sub()) { · <strong>{{ sub() }}</strong> }
          </span>
        </div>
        <div class="plugin-route-body">
          @if (rec.default_mode === 'native' && rec.native_tag === 'lethean-vi-plugin') {
            <div class="plugin-panel-native">
              <lethean-vi-plugin></lethean-vi-plugin>
            </div>
          } @else if (rec.entrypoint) {
            <iframe class="plugin-route-frame"
                    [src]="safeFrameUrl()"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    referrerpolicy="no-referrer"></iframe>
          } @else {
            <div class="placeholder-pane">
              <p>{{ 'plugin.empty.passive' | translate }}</p>
            </div>
          }
        </div>
      </section>
    } @else {
      <section class="block plugin-route-block">
        <div class="block-header plugin-route-header">
          <h2 class="block-title">{{ 'plugin.title' | translate }}</h2>
          <span class="editorial subtitle">{{ 'plugin.label.code' | translate }} <code>{{ code() }}</code> {{ 'plugin.status.not-installed' | translate }}</span>
        </div>
        <div class="placeholder-pane">
          <p>{{ 'plugin.empty.no-match' | translate }}</p>
        </div>
      </section>
    }
  `,
})
export class PluginComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly menus = inject(PluginMenuStore);

  /**
   * Route params — paramMap is an Observable in Angular's router; we
   * convert it to a signal so the template recomputes on navigation
   * without rxjs subscriptions in the component body.
   */
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  readonly code = computed(() => this.params().get('code') || '');
  readonly sub = computed(() => this.params().get('sub') || '');

  readonly record = computed(() => this.menus.byCode(this.code()));

  safeFrameUrl(): SafeResourceUrl | null {
    const rec = this.record();
    if (!rec?.entrypoint) return null;
    const sub = this.sub();
    const url = sub ? rec.entrypoint.replace(/\/$/, '') + '/' + sub : rec.entrypoint;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
