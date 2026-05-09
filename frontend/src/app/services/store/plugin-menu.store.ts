// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, computed, signal } from '@angular/core';
import { callBridge } from '../../lib/bridge';

export interface PluginMenuSubpage {
  label: string;
  path: string;
}

export interface PluginMenu {
  label: string;
  icon_svg?: string;
  subpages?: PluginMenuSubpage[];
}

export interface PluginMenuRecord {
  code: string;
  name: string;
  native_tag?: string;
  default_mode?: string;
  entrypoint?: string;
  menu?: PluginMenu;
}

interface MenusResponse {
  plugins?: PluginMenuRecord[];
}

/**
 * Plugin menus — installed marketplace modules that declare a Menu
 * contribute to the IDE sidebar's "Plugins" group AND drive the
 * /dev/plugin/:code(/sub) route. The IDE frame literally is the union
 * of installed plugin menus (CoreApp pattern).
 *
 * Loaded once at boot by IdeComponent, reloaded after marketplace
 * install / remove. Sidebar consumes via `menus()`; PluginComponent
 * looks up by code.
 */
@Injectable({ providedIn: 'root' })
export class PluginMenuStore {
  readonly menus = signal<PluginMenuRecord[]>([]);
  readonly loading = signal(false);

  /** Plugins that contributed a menu — sidebar filter. */
  readonly menuOnly = computed(() => this.menus().filter((p) => !!p.menu));

  /** Lookup a record by code. */
  byCode(code: string): PluginMenuRecord | null {
    return this.menus().find((p) => p.code === code) || null;
  }

  async reload(force: boolean = false): Promise<void> {
    this.loading.set(true);
    try {
      const v = await callBridge<MenusResponse>('pkg_menus', { force });
      this.menus.set(Array.isArray(v?.plugins) ? v!.plugins! : []);
    } catch (e) {
      console.warn('[plugin-menus] reload failed:', e);
    } finally {
      this.loading.set(false);
    }
  }
}
