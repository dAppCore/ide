// SPDX-Licence-Identifier: EUPL-1.2

import { CUSTOM_ELEMENTS_SCHEMA, Component, computed, inject, resource, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import * as MarketplaceBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/marketplacebridge';
import * as WindowBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/windowbridge';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';
import { PluginMenuStore } from '../../../services/store/plugin-menu.store';

interface MarketModule {
  code: string;
  name: string;
  version?: string;
  repo?: string;
  category?: string;
  entrypoint?: string;
  description?: string;
}

interface InstalledPlugin {
  code: string;
  name: string;
  version: string;
  entry_point?: string;
}

interface EmbeddedPlugin {
  code: string;
  name: string;
  url: string;
  mode: 'iframe' | 'native';
  tag?: string;
}

/**
 * Native-element registry — hardcoded today, will read from plugin
 * manifests in v2 once `pkg_menus` exposes `native_tag` (PluginMenuStore
 * already carries the field; the marketplace flow predates it).
 */
function pluginNativeTag(code: string): string | null {
  switch (code) {
    case 'vi':
      return 'lethean-vi-plugin';
    default:
      return null;
  }
}

/**
 * Marketplace panel — package browse / install / remove via core/scm
 * marketplace. Three plugin run modes:
 *   - Native: mount a registered custom element (same JS context).
 *   - Frame:  iframe panel inside the IDE (origin-sandboxed).
 *   - Window: detached window via window_open (separate frame).
 *
 * Migrated 2026-05-10 to typed MarketplaceBridge wails binding for the
 * pkg_search / pkg_installed / pkg_install / pkg_remove methods, then
 * window_open via WindowBridge.Open in the same session — last
 * callBridge usage in this panel.
 */
@Component({
  selector: 'dev-marketplace',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [DevSkeleton, TranslatePipe],
  template: `
    <section class="block market-block">
      <div class="block-header market-header">
        <h2 class="block-title">{{ 'marketplace.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'marketplace.subtitle' | translate }}</span>
      </div>
      <div class="market-toolbar">
        <input
          type="text"
          class="market-search-input"
          [placeholder]="'marketplace.placeholder.search' | translate"
          [value]="marketQuery()"
          (input)="marketQuery.set($any($event.target).value)"
          (keyup.enter)="loadMarketplace()" />
        <select class="market-category-select"
                [value]="marketCategory()"
                (change)="onCategoryChange($any($event.target).value)">
          <option value="">{{ 'marketplace.category.all' | translate }}</option>
          <option value="agents">{{ 'marketplace.category.agents' | translate }}</option>
          <option value="themes">{{ 'marketplace.category.themes' | translate }}</option>
          <option value="tools">{{ 'marketplace.category.tools' | translate }}</option>
          <option value="snippets">{{ 'marketplace.category.snippets' | translate }}</option>
        </select>
        <button class="btn btn-primary btn-sm" (click)="loadMarketplace(true)" [disabled]="marketLoading()">
          @if (marketLoading()) { <span>{{ 'marketplace.status.loading' | translate }}</span> } @else { <span>{{ 'marketplace.button.refresh' | translate }}</span> }
        </button>
      </div>
      @if (marketError(); as err) {
        <div class="market-error">{{ err }}</div>
      }
      @if (embeddedPlugin(); as ep) {
        <div class="plugin-panel">
          <div class="plugin-panel-header">
            <span class="plugin-panel-title">▸ {{ ep.name }}</span>
            <span class="plugin-panel-mode">{{ ep.mode }} {{ 'marketplace.label.mode' | translate }}</span>
            <span class="plugin-panel-url">{{ ep.mode === 'native' ? '<' + ep.tag + '>' : ep.url }}</span>
            <button class="btn btn-ghost btn-sm" (click)="closeEmbeddedPlugin()">{{ 'marketplace.button.close' | translate }}</button>
          </div>
          @if (ep.mode === 'iframe') {
            <iframe class="plugin-panel-frame"
                    [src]="safeEmbeddedPluginUrl()"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    referrerpolicy="no-referrer"></iframe>
          } @else if (ep.mode === 'native' && ep.tag === 'lethean-vi-plugin') {
            <div class="plugin-panel-native">
              <lethean-vi-plugin></lethean-vi-plugin>
            </div>
          }
        </div>
      }
      @if (searchResource.isLoading() && marketModules().length === 0) {
        <dev-skeleton kind="cards" [count]="6" />
      }
      <div class="market-grid">
        @for (m of marketModules(); track m.code) {
          <article class="market-card" [class.installed]="isInstalled(m.code)">
            <header class="market-card-head">
              <h3 class="market-card-title">{{ m.name }}</h3>
              <span class="market-card-cat">{{ m.category || ('marketplace.category.misc' | translate) }}</span>
            </header>
            <div class="market-card-meta">
              <code class="market-card-code">{{ m.code }}</code>
              <span class="market-card-version">v{{ m.version || ('marketplace.label.latest' | translate) }}</span>
            </div>
            @if (m.description) {
              <div class="market-card-desc">{{ m.description }}</div>
            }
            @if (m.repo) {
              <div class="market-card-repo">{{ m.repo }}</div>
            }
            <footer class="market-card-actions">
              @if (isInstalled(m.code)) {
                @if (hasNativeMode(m.code)) {
                  <button class="btn btn-primary btn-sm" (click)="runPluginNative(m.code)" [title]="'marketplace.tooltip.native' | translate">
                    ⚡ {{ 'marketplace.button.native' | translate }}
                  </button>
                }
                @if (pluginRunUrl(m.code); as runUrl) {
                  <button class="btn btn-ghost btn-sm" (click)="runPluginInline(m.code)" [title]="'marketplace.tooltip.frame' | translate">
                    ▸ {{ 'marketplace.button.frame' | translate }}
                  </button>
                  <button class="btn btn-ghost btn-sm" (click)="runPlugin(m.code)" [title]="'marketplace.tooltip.window' | translate">
                    ↗ {{ 'marketplace.button.window' | translate }}
                  </button>
                }
                <button class="btn btn-ghost btn-sm" (click)="removeModule(m.code)" [disabled]="marketBusy() === m.code">
                  @if (marketBusy() === m.code) { <span>{{ 'marketplace.status.removing' | translate }}</span> } @else { <span>{{ 'marketplace.button.remove' | translate }}</span> }
                </button>
                <span class="market-card-state">{{ 'marketplace.status.installed' | translate }}</span>
              } @else {
                <button class="btn btn-primary btn-sm" (click)="installModule(m.code)" [disabled]="marketBusy() === m.code">
                  @if (marketBusy() === m.code) { <span>{{ 'marketplace.status.installing' | translate }}</span> } @else { <span>{{ 'marketplace.button.install' | translate }}</span> }
                </button>
              }
            </footer>
          </article>
        }
        @if (marketModules().length === 0 && !marketLoading() && !marketError()) {
          <div class="market-empty">{{ 'marketplace.empty.no-packages' | translate }}</div>
        }
      </div>
      @if (marketMessage(); as msg) {
        <div class="market-message">{{ msg }}</div>
      }
    </section>
  `,
  styles: [`
    /* Plugin route — full-surface render of an installed plugin's UI */
    .plugin-route-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .plugin-route-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .plugin-route-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .plugin-route-frame { width: 100%; height: 100%; border: none; background: var(--ink-0); }
    .plugin-route-body .plugin-panel-native { flex: 1; overflow-y: auto; }
    /* Plugin embedded panel — Angular Render iframe-as-component */
    .plugin-panel {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
      background: var(--ink-1);
    }
    .plugin-panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 18px;
      background: var(--ink-2);
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .plugin-panel-title { font-size: 13px; font-weight: 600; color: var(--fg-1); }
    .plugin-panel-url { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plugin-panel-frame {
      width: 100%;
      height: 480px;
      border: none;
      background: var(--ink-0);
    }
    .plugin-panel-native {
      max-height: 480px;
      overflow-y: auto;
      background: var(--ink-0);
    }
    .plugin-panel-mode {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
    }
    /* Marketplace */
    .market-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .market-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .market-toolbar {
      display: flex;
      gap: 10px;
      padding: 12px 18px;
      align-items: center;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .market-search-input,
    .market-category-select {
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      color: var(--fg-1);
      padding: 7px 10px;
      border-radius: var(--r-sm);
      font-size: 13px;
    }
    .market-search-input { flex: 1; }
    .market-search-input:focus,
    .market-category-select:focus { border-color: var(--brand-400); outline: none; }
    .market-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .market-message {
      padding: 8px 18px;
      color: var(--fg-2);
      background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2));
      border-top: 1px solid var(--line-1);
      font-size: 12px;
    }
    .market-grid {
      flex: 1;
      overflow-y: auto;
      padding: 16px 18px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      align-content: start;
    }
    .market-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--fg-3);
      padding: 32px;
      font-size: 13px;
    }
    .market-card {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s, transform 0.15s;
    }
    .market-card:hover {
      border-color: var(--brand-400);
      transform: translateY(-1px);
    }
    .market-card.installed { border-color: color-mix(in oklch, var(--brand-500) 60%, var(--line-1)); }
    .market-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .market-card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-1);
      margin: 0;
      line-height: 1.3;
    }
    .market-card-cat {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .market-card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--fg-3);
    }
    .market-card-code { font-family: var(--font-mono); color: var(--fg-2); }
    .market-card-version { font-family: var(--font-mono); }
    .market-card-desc {
      font-size: 12px;
      color: var(--fg-2);
      line-height: 1.4;
    }
    .market-card-repo {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      word-break: break-all;
    }
    .market-card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: auto;
      padding-top: 6px;
    }
    .market-card-state {
      font-size: 11px;
      color: var(--brand-200);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
  `],
})
export class MarketplaceComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pluginMenus = inject(PluginMenuStore);
  private readonly router = inject(Router);

  readonly marketQuery = signal<string>('');
  readonly marketCategory = signal<string>('');
  readonly marketBusy = signal<string | null>(null);
  readonly marketMessage = signal<string | null>(null);
  readonly embeddedPlugin = signal<EmbeddedPlugin | null>(null);

  // Search — reactive on query+category, server returns live results
  // each call (no cache layer; user expects per-query freshness).
  readonly searchResource = resource<MarketModule[], { query: string; category: string }>({
    defaultValue: [],
    params: () => ({ query: this.marketQuery(), category: this.marketCategory() }),
    loader: ({ params }) =>
      MarketplaceBridge.Search(params).then((v) =>
        (v.packages || []).map((p) => ({
          code: p.code,
          name: p.name,
          version: p.version,
          repo: p.repo,
          category: p.category,
          entrypoint: p.entrypoint,
          description: p.description,
        })),
      ),
  });

  // Installed — DuckDB-cached server-side. SWR via cachedBridgeResource.
  readonly installedResource = cachedBridgeResource<{
    packages: InstalledPlugin[];
    cache_hit?: boolean;
    cache_age_s?: number;
  }>({
    loader: () =>
      MarketplaceBridge.Installed().then((v) => ({
        packages: (v.packages || []).map((p) => ({
          code: p.code,
          name: p.name,
          version: p.version,
          entry_point: p.entry_point,
        })),
        cache_hit: v.cache_hit,
        cache_age_s: v.cache_age_s,
      })),
    emptyValue: { packages: [] },
    isEmpty: (v) => v.packages.length === 0,
  });

  readonly marketModules = computed(() => this.searchResource.value() ?? []);
  readonly marketInstalled = computed(() =>
    this.installedResource.stable().packages.map((p) => ({
      code: p.code,
      name: p.name,
      version: p.version,
      entry_point: p.entry_point,
    })),
  );
  readonly marketLoading = computed(() => this.searchResource.isLoading() || this.installedResource.loading());
  // Separate writable for mutation errors (install/remove fail) so the
  // resource-derived error stays read-only and we can OR the two.
  private readonly mutationError = signal<string | null>(null);
  readonly marketError = computed(
    () =>
      this.mutationError() ??
      this.searchResource.error()?.message ??
      this.installedResource.error() ??
      null,
  );

  onCategoryChange(value: string): void {
    this.marketCategory.set(value);
    // searchResource auto-fires on params change (category included).
  }

  /** Template alias — Refresh button. Forces both resources. */
  loadMarketplace(force?: boolean): void {
    this.searchResource.reload();
    if (force) this.installedResource.refresh();
  }

  isInstalled(code: string): boolean {
    return this.marketInstalled().some((p) => p.code === code);
  }

  /**
   * Returns the runnable URL for an installed plugin, or null. Marketplace
   * fixtures store runtime URLs in the entry_point field; modules with
   * no URL (themes, snippet packs, tools) get no Run button.
   */
  pluginRunUrl(code: string): string | null {
    const installed = this.marketInstalled().find((p) => p.code === code);
    if (!installed) return null;
    const ep = installed.entry_point || '';
    if (ep.startsWith('http://') || ep.startsWith('https://')) return ep;
    return null;
  }

  hasNativeMode(code: string): boolean {
    return pluginNativeTag(code) !== null;
  }

  async runPlugin(code: string): Promise<void> {
    const url = this.pluginRunUrl(code);
    if (!url) return;
    const installed = this.marketInstalled().find((p) => p.code === code);
    const title = installed?.name || code;
    try {
      await WindowBridge.Open({
        name: 'plugin-' + code,
        title,
        url,
        width: 960,
        height: 760,
        x: 120,
        y: 120,
      });
      this.marketMessage.set(`Running ${title} in a new window. Same MCP bridge addresses it.`);
    } catch (e) {
      this.mutationError.set('Failed to open plugin window: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  runPluginInline(code: string): void {
    const url = this.pluginRunUrl(code);
    if (!url) return;
    const installed = this.marketInstalled().find((p) => p.code === code);
    const title = installed?.name || code;
    this.embeddedPlugin.set({ code, name: title, url, mode: 'iframe' });
    this.marketMessage.set(`Mounted ${title} as an iframe panel.`);
  }

  runPluginNative(code: string): void {
    const installed = this.marketInstalled().find((p) => p.code === code);
    if (!installed) return;
    const title = installed.name || code;
    const tag = pluginNativeTag(code);
    if (!tag) {
      this.mutationError.set(`No native element registered for plugin: ${code}`);
      return;
    }
    this.embeddedPlugin.set({ code, name: title, url: '', mode: 'native', tag });
    this.marketMessage.set(`Mounted ${title} as a native element. Same JS context as the IDE.`);
  }

  closeEmbeddedPlugin(): void {
    this.embeddedPlugin.set(null);
  }

  /**
   * Bypass Angular URL sanitization for the iframe src — origin
   * isolation is the sandbox boundary, not Angular's string-blocking.
   */
  safeEmbeddedPluginUrl(): SafeResourceUrl | null {
    const ep = this.embeddedPlugin();
    if (!ep || ep.mode !== 'iframe') return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(ep.url);
  }

  async installModule(code: string): Promise<void> {
    this.marketBusy.set(code);
    this.marketMessage.set(null);
    try {
      await MarketplaceBridge.Install({ code });
      this.marketMessage.set(`Installed ${code} — added to your sidebar.`);
      await Promise.all([this.loadMarketplace(), this.pluginMenus.reload()]);
    } catch (e) {
      this.mutationError.set(`Install ${code} failed: ` + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.marketBusy.set(null);
    }
  }

  async removeModule(code: string): Promise<void> {
    this.marketBusy.set(code);
    this.marketMessage.set(null);
    try {
      await MarketplaceBridge.Remove({ code });
      this.marketMessage.set(`Removed ${code}`);
      await Promise.all([this.loadMarketplace(), this.pluginMenus.reload()]);
      // If the user was on this plugin's route, redirect home.
      if (this.router.url.startsWith(`/dev/plugin/${code}`)) {
        void this.router.navigate(['/dev/marketplace']);
      }
      // Embedded panel showing this plugin? Close it.
      const ep = this.embeddedPlugin();
      if (ep?.code === code) this.embeddedPlugin.set(null);
    } catch (e) {
      this.mutationError.set(`Remove ${code} failed: ` + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.marketBusy.set(null);
    }
  }
}
