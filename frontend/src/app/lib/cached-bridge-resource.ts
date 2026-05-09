// SPDX-Licence-Identifier: EUPL-1.2

import { Signal, afterNextRender, computed, linkedSignal, resource, signal } from '@angular/core';
import type { ResourceRef } from '@angular/core';
import { callBridge } from './bridge';

/**
 * Generic SWR cached-bridge data shape — the response envelope that
 * server-side cacheGetCollection/cacheSetCollection helpers wrap.
 */
export interface CachedBridgeEnvelope {
  cache_hit?: boolean;
  cache_age_s?: number;
}

export interface CachedBridgeResourceOptions<T extends CachedBridgeEnvelope> {
  /** Bridge tool name. */
  tool: string;
  /** Initial value before the first loader resolve (used as resource defaultValue). */
  emptyValue: T;
  /**
   * Returns true if the value is the "empty/unloaded" shape — the SWR
   * linkedSignal uses this to decide whether to fall back to the prior
   * resolved value during a force-refresh round-trip. Typically:
   *   `(v) => v.items.length === 0`
   */
  isEmpty: (value: T) => boolean;
  /**
   * Optional extra params merged into every loader call (alongside the
   * synthesised `force` flag). Reactive — re-evaluated on each fire.
   * Examples: memory's `sort`, build's `path`, search's `query`.
   */
  extraParams?: () => Record<string, unknown>;
  /**
   * Optional override for whether to send `force` to the server.
   * Default: send `force: tick > 0` (initial load uses cache; every
   * refresh after first paint forces).
   */
  forceFlag?: (tick: number) => boolean;
}

export interface CachedBridgeResource<T extends CachedBridgeEnvelope> {
  /** SWR-stable value — preserves the prior resolved value while reloading. Bind here. */
  readonly stable: Signal<T>;
  /** Raw resource ref — escape hatch for status() / hasValue() etc. */
  readonly raw: ResourceRef<T>;
  /** Server reported the response came from ide-cache.db. */
  readonly cacheHit: Signal<boolean>;
  /** Seconds since the cache entry was written. */
  readonly cacheAge: Signal<number>;
  /** True during initial load OR force-refresh reload. */
  readonly loading: Signal<boolean>;
  /**
   * True only during the COLD initial load (loading AND stable value is
   * empty). False once cached data has rendered, even during silent SWR
   * reloads. Bind skeletons / loading states to this so the UI doesn't
   * blank during a refresh that has prior data to show.
   */
  readonly firstLoad: Signal<boolean>;
  /** First-line error message from the loader, or null. */
  readonly error: Signal<string | null>;
  /** Bump the tick → resource re-runs with force=true. */
  refresh: () => void;
}

/**
 * Wraps an ide-cache.db-backed bridge tool in the canonical Angular
 * resource() + linkedSignal SWR shape. Each consuming panel calls this
 * once as a class field initializer:
 *
 *   readonly scan = cachedBridgeResource<I18nScanResponse>({
 *     tool: 'i18n_scan',
 *     emptyValue: { packages: [], unique_locales: [] },
 *     isEmpty: (v) => v.packages.length === 0,
 *   });
 *
 * Then binds in template via `scan.stable().packages`,
 * `scan.cacheHit()`, `scan.loading()`, etc. The Refresh button calls
 * `scan.refresh()`. The silent SWR force-refresh fires automatically
 * via afterNextRender (in injection context — must be called from a
 * component's class field or constructor).
 *
 * Replaces ~22 lines of imperative SWR plumbing per panel with one
 * helper call. See `plans/code/core/ide/RFC.swr-resource-migration.md`.
 */
export function cachedBridgeResource<T extends CachedBridgeEnvelope>(
  opts: CachedBridgeResourceOptions<T>,
): CachedBridgeResource<T> {
  const tick = signal(0);
  const forceFlag = opts.forceFlag ?? ((t: number) => t > 0);

  const raw = resource<T, Record<string, unknown> & { __tick: number }>({
    defaultValue: opts.emptyValue,
    // extraParams must be evaluated INSIDE params() so its signal reads
    // are tracked — Angular re-runs the loader whenever any dep changes.
    // Calling extraParams in the loader (not in params) would lose the
    // reactivity and the user's filter/sort/path changes wouldn't refetch.
    params: () => ({ __tick: tick(), ...(opts.extraParams?.() ?? {}) }),
    loader: ({ params }) => {
      const { __tick: t, ...extra } = params;
      return callBridge<T>(opts.tool, { force: forceFlag(t), ...extra });
    },
  });

  // SWR — preserve the last resolved value across params-change reloads
  // so the UI doesn't blank when the user (or the post-paint hook)
  // triggers a force refresh.
  const stable = linkedSignal<T, T>({
    source: raw.value,
    computation: (next, prev) =>
      opts.isEmpty(next) ? (prev?.value ?? next) : next,
  });

  const cacheHit = computed(() => !!raw.value().cache_hit);
  const cacheAge = computed(() => raw.value().cache_age_s ?? 0);
  const loading = computed(
    () => raw.status() === 'loading' || raw.status() === 'reloading',
  );
  const firstLoad = computed(() => loading() && opts.isEmpty(stable()));
  const error = computed(() => raw.error()?.message ?? null);

  // SWR — silent force-refresh after first paint. Must be in injection
  // context — this helper itself runs in the consumer's class-field
  // initializer / constructor, which IS injection context.
  afterNextRender(() => tick.set(1));

  return {
    stable,
    raw,
    cacheHit,
    cacheAge,
    loading,
    firstLoad,
    error,
    refresh: () => tick.update((n) => n + 1),
  };
}
