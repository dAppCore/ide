// SPDX-Licence-Identifier: EUPL-1.2

import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { callBridge } from '../../../lib/bridge';
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
 * TODO(snider/wails): swap callBridge('pkg_*') + 'window_open' for
 * marketplaceBridge / windowBridge wails services.
 */
@Component({
  selector: 'dev-marketplace',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="block market-block">
      <div class="block-header market-header">
        <h2 class="block-title">Marketplace</h2>
        <span class="editorial subtitle">Plugins, themes, and agents for your Lethean workspace.</span>
      </div>
      <div class="market-toolbar">
        <input
          type="text"
          class="market-search-input"
          placeholder="Search marketplace…"
          [value]="marketQuery()"
          (input)="marketQuery.set($any($event.target).value)"
          (keyup.enter)="loadMarketplace()" />
        <select class="market-category-select"
                [value]="marketCategory()"
                (change)="onCategoryChange($any($event.target).value)">
          <option value="">All categories</option>
          <option value="agents">Agents</option>
          <option value="themes">Themes</option>
          <option value="tools">Tools</option>
          <option value="snippets">Snippets</option>
        </select>
        <button class="btn btn-primary btn-sm" (click)="loadMarketplace()" [disabled]="marketLoading()">
          @if (marketLoading()) { <span>loading…</span> } @else { <span>Refresh</span> }
        </button>
      </div>
      @if (marketError(); as err) {
        <div class="market-error">{{ err }}</div>
      }
      @if (embeddedPlugin(); as ep) {
        <div class="plugin-panel">
          <div class="plugin-panel-header">
            <span class="plugin-panel-title">▸ {{ ep.name }}</span>
            <span class="plugin-panel-mode">{{ ep.mode }} mode</span>
            <span class="plugin-panel-url">{{ ep.mode === 'native' ? '<' + ep.tag + '>' : ep.url }}</span>
            <button class="btn btn-ghost btn-sm" (click)="closeEmbeddedPlugin()">Close</button>
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
      <div class="market-grid">
        @for (m of marketModules(); track m.code) {
          <article class="market-card" [class.installed]="isInstalled(m.code)">
            <header class="market-card-head">
              <h3 class="market-card-title">{{ m.name }}</h3>
              <span class="market-card-cat">{{ m.category || 'misc' }}</span>
            </header>
            <div class="market-card-meta">
              <code class="market-card-code">{{ m.code }}</code>
              <span class="market-card-version">v{{ m.version || 'latest' }}</span>
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
                  <button class="btn btn-primary btn-sm" (click)="runPluginNative(m.code)" title="Mount as native custom element (Mining-route)">
                    ⚡ Native
                  </button>
                }
                @if (pluginRunUrl(m.code); as runUrl) {
                  <button class="btn btn-ghost btn-sm" (click)="runPluginInline(m.code)" title="Mount as iframe panel inside the IDE">
                    ▸ Frame
                  </button>
                  <button class="btn btn-ghost btn-sm" (click)="runPlugin(m.code)" title="Open as separate window">
                    ↗ Window
                  </button>
                }
                <button class="btn btn-ghost btn-sm" (click)="removeModule(m.code)" [disabled]="marketBusy() === m.code">
                  @if (marketBusy() === m.code) { <span>removing…</span> } @else { <span>Remove</span> }
                </button>
                <span class="market-card-state">Installed</span>
              } @else {
                <button class="btn btn-primary btn-sm" (click)="installModule(m.code)" [disabled]="marketBusy() === m.code">
                  @if (marketBusy() === m.code) { <span>installing…</span> } @else { <span>Install</span> }
                </button>
              }
            </footer>
          </article>
        }
        @if (marketModules().length === 0 && !marketLoading() && !marketError()) {
          <div class="market-empty">No packages found.</div>
        }
      </div>
      @if (marketMessage(); as msg) {
        <div class="market-message">{{ msg }}</div>
      }
    </section>
  `,
})
export class MarketplaceComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pluginMenus = inject(PluginMenuStore);
  private readonly router = inject(Router);

  readonly marketQuery = signal<string>('');
  readonly marketCategory = signal<string>('');
  readonly marketModules = signal<MarketModule[]>([]);
  readonly marketInstalled = signal<InstalledPlugin[]>([]);
  readonly marketLoading = signal(false);
  readonly marketBusy = signal<string | null>(null);
  readonly marketError = signal<string | null>(null);
  readonly marketMessage = signal<string | null>(null);
  readonly embeddedPlugin = signal<EmbeddedPlugin | null>(null);

  ngOnInit(): void {
    if (this.marketModules().length === 0) void this.loadMarketplace();
  }

  onCategoryChange(value: string): void {
    this.marketCategory.set(value);
    void this.loadMarketplace();
  }

  async loadMarketplace(): Promise<void> {
    this.marketLoading.set(true);
    this.marketError.set(null);
    this.marketMessage.set(null);
    try {
      const [search, installed] = await Promise.all([
        callBridge<{ packages?: MarketModule[] }>('pkg_search', {
          query: this.marketQuery(),
          category: this.marketCategory(),
        }),
        callBridge<{ packages?: any[] }>('pkg_installed', {}),
      ]);
      this.marketModules.set(search?.packages || []);
      const pkgs = installed?.packages || [];
      this.marketInstalled.set(
        pkgs.map((p) => ({
          code: p.code,
          name: p.name,
          version: p.version,
          entry_point: p.entry_point,
        })),
      );
    } catch (e) {
      this.marketError.set('marketplace bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.marketLoading.set(false);
    }
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
      await callBridge('window_open', {
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
      this.marketError.set('Failed to open plugin window: ' + (e instanceof Error ? e.message : String(e)));
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
      this.marketError.set(`No native element registered for plugin: ${code}`);
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
      await callBridge('pkg_install', { code });
      this.marketMessage.set(`Installed ${code} — added to your sidebar.`);
      await Promise.all([this.loadMarketplace(), this.pluginMenus.reload()]);
    } catch (e) {
      this.marketError.set(`Install ${code} failed: ` + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.marketBusy.set(null);
    }
  }

  async removeModule(code: string): Promise<void> {
    this.marketBusy.set(code);
    this.marketMessage.set(null);
    try {
      await callBridge('pkg_remove', { code });
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
      this.marketError.set(`Remove ${code} failed: ` + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.marketBusy.set(null);
    }
  }
}
