// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, Signal, computed, resource } from '@angular/core';
import type { Site } from '../../lib/vi.types';
import { loadViData } from '../../lib/vi.types';

/**
 * Sites — canonical signal-based store, mirrors the pattern every other
 * cross-cutting resource will follow:
 *
 *   1. `resource()` from @angular/core wraps the loader. The resource
 *      ref exposes `value()`, `status()`, `error()`, `reload()` as
 *      signals. No RxJS, no observable chains, no custom store class.
 *   2. The service exposes the underlying signals as readonly aliases
 *      with names that read naturally at call sites
 *      (`store.sites()` instead of `store.repo.value()`).
 *   3. Computed derivations (`green`, `amber`, `red`) live alongside
 *      the source signal — components consume the derivation, not the
 *      raw filter logic.
 *
 * Replicate this shape for ReposStore, ProcessesStore, MemoryStore,
 * MantisStore etc. When go-scm's manifest / marketplace Actions ship
 * their own loaders, those stores swap their loader fn for callBridge
 * (see lib/bridge.ts) — the consumer-facing API is unchanged.
 */
@Injectable({ providedIn: 'root' })
export class SitesStore {
  private readonly resource = resource<Site[], void>({
    loader: async () => {
      const snap = await loadViData();
      return snap.sites;
    },
  });

  /** Live list of sites — empty array while loading or on error. */
  readonly sites: Signal<Site[]> = computed(() => this.resource.value() ?? []);

  /** Loading flag — true on first load + during reload(). */
  readonly isLoading: Signal<boolean> = computed(
    () => this.resource.status() === 'loading' || this.resource.status() === 'reloading',
  );

  /** Last load error, or null. */
  readonly error: Signal<Error | null> = computed(
    () => (this.resource.error() as Error | undefined) ?? null,
  );

  /** Sites filtered to status === 'green' — useful for the "N green" pill. */
  readonly green = computed(() => this.sites().filter((s) => s.status === 'green'));
  /** Sites filtered to status === 'amber'. */
  readonly amber = computed(() => this.sites().filter((s) => s.status === 'amber'));
  /** Sites filtered to status === 'red'. */
  readonly red = computed(() => this.sites().filter((s) => s.status === 'red'));

  /** Force a reload (manual refresh button, post-mutation, etc). */
  reload(): void {
    this.resource.reload();
  }
}
