// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, Signal, computed, signal } from '@angular/core';

/**
 * Single shape for everything that wants a slot in a frame's nav. Maps
 * onto canonical lthn-desktop's `.itw3.json` `menu` entries — label +
 * icon + route + (optional) subpages — but kept loose so plugins can
 * contribute panels without a manifest round-trip in dev.
 */
export interface PanelDef {
  /** Stable ID used for register / unregister / sidebar tracking. */
  id: string;
  /** Human label shown in nav. i18n key OR final string. */
  label: string;
  /** FontAwesome class string ("fa-regular fa-cube") OR raw SVG markup. */
  icon: string;
  /** Whether `icon` is a class string (default) or raw SVG. */
  iconKind?: 'fa' | 'svg';
  /** Route path the nav row navigates to. */
  route: string;
  /** Group bucket — drives section headers in the sidebar. */
  group: PanelGroup;
  /** Render order within the group (low → high). Default 100. */
  order?: number;
  /** Optional sub-pages, rendered nested when this row is active. */
  subpages?: { label: string; route: string }[];
  /** Origin tag — useful for diagnostics and selective unregister. */
  source?: 'builtin' | 'plugin' | string;
}

export type PanelGroup =
  | 'developer'
  | 'plugin'
  | 'sites'
  | 'account';

/**
 * Registry of every panel a frame can render in its nav. Seeded with the
 * built-in developer panels at construction; plugins call register() at
 * runtime to add more (or unregister() to remove their own).
 *
 * When go-scm's manifest service ships Action wrappers
 * (`manifest.list`, `marketplace.installed`), swap the seed step for an
 * Angular `resource()` loader that pulls live data and merges with the
 * built-ins. The component-facing API (panels(), grouped(), etc) won't
 * change — that's why ManifestService exists as a layer above the
 * source.
 */
@Injectable({ providedIn: 'root' })
export class ManifestService {
  private readonly _panels = signal<PanelDef[]>([]);

  /** Read-only signal of every registered panel, sorted by (group, order, id). */
  readonly panels: Signal<PanelDef[]> = computed(() =>
    [...this._panels()].sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      const ao = a.order ?? 100;
      const bo = b.order ?? 100;
      if (ao !== bo) return ao - bo;
      return a.id.localeCompare(b.id);
    }),
  );

  /** Panels in the `developer` group — sidebar's main nav. */
  readonly developerPanels = computed(() =>
    this.panels().filter((p) => p.group === 'developer'),
  );

  /** Panels added at runtime by installed plugins. */
  readonly pluginPanels = computed(() =>
    this.panels().filter((p) => p.group === 'plugin'),
  );

  /** Account-level panels (Billing, Settings, etc). */
  readonly accountPanels = computed(() =>
    this.panels().filter((p) => p.group === 'account'),
  );

  /** Filter by arbitrary group string. */
  forGroup(group: PanelGroup): Signal<PanelDef[]> {
    return computed(() => this.panels().filter((p) => p.group === group));
  }

  /** Add (or replace by ID) a single panel. */
  register(def: PanelDef): void {
    this._panels.update((list) => {
      const without = list.filter((p) => p.id !== def.id);
      return [...without, def];
    });
  }

  /** Remove a panel by ID. No-op if not present. */
  unregister(id: string): void {
    this._panels.update((list) => list.filter((p) => p.id !== id));
  }

  /**
   * Bulk seed — typically called once during app boot with the built-in
   * developer panels, then plugins call register() individually as they
   * load. Replaces existing entries with matching IDs.
   */
  seed(defs: PanelDef[]): void {
    this._panels.update((list) => {
      const ids = new Set(defs.map((d) => d.id));
      const without = list.filter((p) => !ids.has(p.id));
      return [...without, ...defs];
    });
  }

  /** Wipe the registry — testing only. */
  clear(): void {
    this._panels.set([]);
  }
}
