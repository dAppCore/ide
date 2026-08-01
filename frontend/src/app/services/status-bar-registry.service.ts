// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, Signal, computed, signal } from '@angular/core';

/**
 * A status-bar slot — one ambient indicator on the IDE bottom strip.
 * Plugins register slots to surface live state (model load %, training
 * step, peer count, etc.) without touching IDE shell code.
 *
 * `text` is a Signal so the slot updates reactively when the underlying
 * state changes — wire it up to a SettingsStore signal, an
 * SSE-backed StreamEventsService computed, or any other reactive source.
 *
 * Convention for `id`: `<group-lowercase>.<noun>`, e.g. `ide.version`,
 * `lemma.tps`, `coreagent.model`.
 */
export interface StatusBarSlot {
  id: string;
  side: 'left' | 'right';
  text: Signal<string>;
  tone?: 'default' | 'ok' | 'warn' | 'danger';
  hint?: string;
  click?: () => void;
  /** Lower order renders first (closer to the side edge). Default 1000. */
  order?: number;
}

/**
 * StatusBarRegistryService — the framework primitive for the bottom
 * strip. Built-in slots (sites, monthly spend, version, runtime) flow
 * through the same registry as plugin slots so there's one render path.
 *
 * Idempotent on id collision — re-register replaces the existing slot.
 * Returned unregister fn is safe to call from DestroyRef.
 *
 * Usage:
 *
 *   constructor() {
 *     const off = this.statusBar.register({
 *       id: 'lemma.tps',
 *       side: 'left',
 *       text: computed(() => `Lemma · ${this.tps()} t/s`),
 *       tone: 'ok',
 *       click: () => this.router.navigate(['/dev/lemma']),
 *     });
 *     this.destroyRef.onDestroy(off);
 *   }
 */
@Injectable({ providedIn: 'root' })
export class StatusBarRegistryService {
  /** All registered slots, in registration order. */
  readonly slots = signal<StatusBarSlot[]>([]);

  /** Slots filtered to side=left, sorted by order (asc). */
  readonly left = computed(() => this.bySide('left'));

  /** Slots filtered to side=right, sorted by order (desc — they render closer to the right edge first). */
  readonly right = computed(() => this.bySide('right').slice().reverse());

  register(slot: StatusBarSlot | StatusBarSlot[]): () => void {
    const arr = Array.isArray(slot) ? slot : [slot];
    if (arr.length === 0) return () => {};
    this.slots.update((list) => {
      const ids = new Set(arr.map((s) => s.id));
      const filtered = list.filter((s) => !ids.has(s.id));
      return [...filtered, ...arr];
    });
    const ids = new Set(arr.map((s) => s.id));
    return () => {
      this.slots.update((list) => list.filter((s) => !ids.has(s.id)));
    };
  }

  private bySide(side: 'left' | 'right'): StatusBarSlot[] {
    return this.slots()
      .filter((s) => s.side === side)
      .sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000));
  }
}
