// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, Signal, computed, signal } from '@angular/core';

/**
 * A single settings field rendered in a plugin-contributed section.
 * The plugin owns the underlying value (via the `value` Signal) and the
 * persistence path (via `onChange`) — the IDE just renders the input.
 *
 * Convention: `key` is namespaced under the section id, e.g.
 * `lemma.profile`, `coreagent.endpoint`. It's both the form-field id
 * and the suggested config-yaml path the plugin should persist to.
 */
export interface PluginSettingsField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  label: string;
  hint?: string;
  /** Current value getter — wire this to a Signal so the form re-renders on change. */
  value: () => unknown;
  /** Required for `type: 'select'`. */
  options?: Array<{ value: string; label: string }>;
  /** Optional clamping for `type: 'number'`. */
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

/**
 * A section registered by a plugin (or the IDE itself) — a labelled
 * group of fields plus an optional onChange callback the renderer
 * fires per-field as the user edits.
 *
 * Plugins register at construction; settings panel reads `sections()`
 * and renders. Built-in IDE sections stay hardcoded in
 * settings.component.ts for now — the registry only renders ADDITIONAL
 * plugin / extension sections beneath them. This keeps the migration
 * incremental: existing IDE settings unchanged, plugins extend cleanly.
 */
export interface PluginSettingsSection {
  id: string;
  label: string;
  group?: string;
  hint?: string;
  fields: PluginSettingsField[];
  /** Called per-field as the user edits; the plugin owns persistence. */
  onChange?: (key: string, value: unknown) => void | Promise<void>;
  order?: number;
}

/**
 * SettingsRegistryService — fifth plugin extension surface, completing
 * the trio shipped today (commands, status, events, **settings**) plus
 * the existing routes (sidebar) primitive.
 *
 * Plugin example (CoreAgent, when it lands):
 *
 *   constructor() {
 *     this.settings.register({
 *       id: 'coreagent',
 *       label: 'CoreAgent',
 *       group: 'Plugins',
 *       fields: [
 *         { key: 'profile', type: 'select', label: 'Inference profile',
 *           value: () => this.cfg.profile(),
 *           options: [{value:'gemma4',label:'Gemma4 E2B'},…] },
 *         { key: 'autoload', type: 'boolean', label: 'Auto-load on boot',
 *           value: () => this.cfg.autoload() },
 *       ],
 *       onChange: (key, val) => this.cfg.update(key, val),
 *     });
 *   }
 *
 * No IDE shell change required. The settings panel grows the section
 * automatically.
 */
@Injectable({ providedIn: 'root' })
export class SettingsRegistryService {
  /** All registered sections in registration order. */
  readonly sections = signal<PluginSettingsSection[]>([]);

  /** Sections sorted by `order` (asc, default 1000). */
  readonly ordered: Signal<PluginSettingsSection[]> = computed(() =>
    this.sections().slice().sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000)),
  );

  register(section: PluginSettingsSection | PluginSettingsSection[]): () => void {
    const arr = Array.isArray(section) ? section : [section];
    if (arr.length === 0) return () => {};
    this.sections.update((list) => {
      const ids = new Set(arr.map((s) => s.id));
      const filtered = list.filter((s) => !ids.has(s.id));
      return [...filtered, ...arr];
    });
    const ids = new Set(arr.map((s) => s.id));
    return () => {
      this.sections.update((list) => list.filter((s) => !ids.has(s.id)));
    };
  }
}
