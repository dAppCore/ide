// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, computed, signal } from '@angular/core';

/**
 * A discoverable, runnable action surface for the IDE. Built-in commands
 * map to navigation / theme / language / plugin-mgmt; future plugins
 * (CoreAgent, Lem.Lab, etc.) register their own through the same
 * primitive — every plugin's action surface collapses into one
 * keyboard-driven discovery layer.
 *
 * `id` must be globally unique. Convention: `<group-lowercase>.<verb>`,
 * e.g. `navigate.explorer`, `theme.lethean`, `coreagent.switch-model`.
 */
export interface CommandRecord {
  id: string;
  label: string;
  group?: string;
  hint?: string;
  icon?: string;
  /** Optional predicate; commands return false from `when` are hidden. */
  when?: () => boolean;
  run: () => void | Promise<void>;
}

/**
 * CommandRegistryService — single source of truth for the command
 * palette. Registration returns an unregister function so panels /
 * plugins can scope commands to their lifetime cleanly.
 *
 * Usage:
 *
 *   constructor() {
 *     const off = this.commands.register({
 *       id: 'coreagent.switch-model',
 *       label: 'CoreAgent: Switch model',
 *       group: 'CoreAgent',
 *       run: () => this.openModelPicker(),
 *     });
 *     this.destroyRef.onDestroy(off);
 *   }
 */
@Injectable({ providedIn: 'root' })
export class CommandRegistryService {
  /** All registered commands, in registration order. */
  readonly commands = signal<CommandRecord[]>([]);

  /** Filtered to those whose `when` predicate (if any) currently returns true. */
  readonly enabled = computed(() => this.commands().filter((c) => !c.when || c.when()));

  /** Register one or many commands. Returns an unregister fn. */
  register(records: CommandRecord | CommandRecord[]): () => void {
    const arr = Array.isArray(records) ? records : [records];
    if (arr.length === 0) return () => {};

    // Idempotent on id collision: overwrite rather than duplicate. Lets
    // panels re-register after navigation without leaking entries.
    this.commands.update((list) => {
      const ids = new Set(arr.map((c) => c.id));
      const filtered = list.filter((c) => !ids.has(c.id));
      return [...filtered, ...arr];
    });

    const ids = new Set(arr.map((c) => c.id));
    return () => {
      this.commands.update((list) => list.filter((c) => !ids.has(c.id)));
    };
  }

  /**
   * Fuzzy-rank commands against a query. Empty query returns all enabled
   * commands in registration order. Otherwise returns matches sorted by
   * a coarse score (exact prefix on label > group prefix > substring
   * match > id substring).
   */
  find(query: string): CommandRecord[] {
    const q = query.trim().toLowerCase();
    const all = this.enabled();
    if (!q) return all;
    const scored: Array<{ rec: CommandRecord; score: number }> = [];
    for (const rec of all) {
      const label = rec.label.toLowerCase();
      const group = (rec.group || '').toLowerCase();
      const id = rec.id.toLowerCase();
      const hint = (rec.hint || '').toLowerCase();
      let score = -1;
      if (label.startsWith(q)) score = 1000 - (label.length - q.length);
      else if (group.startsWith(q)) score = 500 - (group.length - q.length);
      else if (label.includes(q)) score = 200;
      else if (group.includes(q)) score = 100;
      else if (id.includes(q)) score = 50;
      else if (hint.includes(q)) score = 25;
      else if (subseqMatch(label, q)) score = 10;
      if (score >= 0) scored.push({ rec, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.rec);
  }
}

/** Subsequence match: does q appear as a subsequence of s? */
function subseqMatch(s: string, q: string): boolean {
  let i = 0;
  for (const ch of s) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}
