// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, signal } from '@angular/core';

export type RenderWhitespace = 'none' | 'boundary' | 'selection' | 'trailing' | 'all';

/**
 * WebAwesome theme names — the project's canon `lethean` plus a curated
 * subset of WA's built-in themes for users who want to taste alternatives.
 * The polished design canon stays `lethean` (warm-purple ink + Vi #663399);
 * other themes are intentionally left in their stock WA appearance — see
 * feedback_dark_only_design_system memory.
 */
export type ThemeName =
  | 'lethean'    // canon — Vi purple on warm-purple ink (the polished one)
  | 'default'    // WA default
  | 'awesome'    // WA bright
  | 'shoelace'   // WA classic shoelace
  | 'premium'    // WA Pro — cyan / anodized
  | 'matter';    // WA Pro — purple / mild

export interface CoreSettings {
  editorFontSize: number;
  editorTabSize: number;
  editorWordWrap: boolean;
  editorLineNumbers: boolean;
  editorMinimap: boolean;
  editorRenderWhitespace: RenderWhitespace;
  workspaceRoot: string;
  defaultRoute: string;
  reposRoots: string;
  chatVisibleOnLaunch: boolean;
  marketplaceEndpoint: string;
  terminalSshPort: number;
  /**
   * UI theme — switches the WebAwesome theme class on `<html>`. Stays
   * dark-only (we don't expose a light variant; the canon is dark by
   * design). Default `'lethean'` is the polished design; others are
   * stock WA for taste exploration.
   */
  theme: ThemeName;

  /**
   * UI language code. Drives ngx-translate's active locale (matched
   * against /assets/i18n/{lang}.json). Default 'en'.
   */
  language: string;
}

export const DEFAULT_SETTINGS: CoreSettings = {
  editorFontSize: 12.5,
  editorTabSize: 2,
  editorWordWrap: false,
  editorLineNumbers: true,
  editorMinimap: false,
  editorRenderWhitespace: 'selection',
  workspaceRoot: '/Users/snider/Code/core/ide',
  defaultRoute: 'dashboard',
  reposRoots:
    '/Users/snider/Code/core\n/Users/snider/Code/lthn\n/Users/snider/Code/host-uk\n/Users/snider/Code/lab\n/Users/snider/Code/snider',
  chatVisibleOnLaunch: false,
  marketplaceEndpoint: '',
  terminalSshPort: 9876,
  theme: 'lethean',
  language: 'en',
};

/**
 * Settings — shared store for IDE config persisted under
 * `ui.settings.*` in `~/.core/config.yaml`. Loaded once at boot by
 * IdeComponent.loadUIState(), edited by /dev/settings, read live by
 * /dev/explorer (Monaco params), the launch flow (workspaceRoot,
 * defaultRoute, chatVisibleOnLaunch), and /dev/repos (reposRoots).
 *
 * The store does NOT own the HTTP save round-trip — IdeComponent's
 * flushUIState() reads `settings()` and POSTs the whole UI state
 * (chat_visible / route / open_files / settings) so we don't race
 * with other slices of the same blob. SettingsComponent calls
 * `markDirty()` after edits and `commit()` to flag a save; IdeComponent
 * watches via the same saveUIState debounce.
 */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly settings = signal<CoreSettings>({ ...DEFAULT_SETTINGS });
  readonly dirty = signal(false);
  readonly saveMessage = signal<string | null>(null);

  /** Default snapshot (read-only convenience). */
  readonly defaults: CoreSettings = DEFAULT_SETTINGS;

  /**
   * Replace the in-memory settings with a fresh snapshot. Called by
   * IdeComponent.loadUIState() at boot. Tolerates camelCase OR
   * lowercase keys because dappco.re/go/config lowercases YAML.
   */
  hydrate(loaded: Record<string, any>): void {
    const merged: Record<string, any> = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const lk = key.toLowerCase();
      if (key in loaded) merged[key] = loaded[key];
      else if (lk in loaded) merged[key] = loaded[lk];
    }
    this.settings.set(merged as CoreSettings);
    this.dirty.set(false);
  }

  update<K extends keyof CoreSettings>(key: K, value: CoreSettings[K]): void {
    this.settings.update((s) => ({ ...s, [key]: value }));
    this.dirty.set(true);
    this.saveMessage.set(null);
  }

  /**
   * Mark settings clean after a successful save. SettingsComponent
   * calls this after IdeComponent.flushUIState() lands, with a hint
   * for the toast.
   */
  markSaved(message: string): void {
    this.dirty.set(false);
    this.saveMessage.set(message);
  }

  reset(): void {
    this.settings.set({ ...DEFAULT_SETTINGS });
    this.dirty.set(true);
    this.saveMessage.set(null);
  }
}
