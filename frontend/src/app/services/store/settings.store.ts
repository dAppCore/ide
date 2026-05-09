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

  /**
   * Chat backend (gui chat service). APIURL points at a local LLM
   * server (Ollama, Lemma, Vi, etc.). Defaults to "http://localhost:8090"
   * which matches the gui chat package default. Restart-required —
   * change takes effect on next IDE launch via gui.BootstrapWithConfig.
   */
  chatApiUrl: string;
  chatStorePath: string;

  /**
   * TIM (Trusted In-Memory) container manager. Image + Name are the
   * minimum fields the user must set before /dev/tim's Start button
   * unlocks. Restart-required.
   */
  timImage: string;
  timName: string;
  timDataDir: string;

  /**
   * P2P router (TCP driver). ListenAddr blank = no listener bound;
   * /dev/p2p surfaces this as empty state. PeerAddrs = newline-separated
   * bootstrap peers. Restart-required.
   */
  p2pListenAddr: string;
  p2pPeerAddrs: string;
  p2pNodeId: string;
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
  chatApiUrl: '',
  chatStorePath: '',
  timImage: '',
  timName: '',
  timDataDir: '',
  p2pListenAddr: '',
  p2pPeerAddrs: '',
  p2pNodeId: '',
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

  /**
   * Apply a snapshot returned by /internal/ide-config GET — the body
   * shape mirrors the Go cfg.Ide.{Chat,TIM,P2P} structs, with
   * snake_case keys per YAML convention. We fold them into the
   * camelCase settings fields here so the UI binds normally.
   */
  hydrateIdeConfig(ide: Record<string, any>): void {
    const chat = (ide['chat'] || {}) as Record<string, any>;
    const tim = (ide['tim'] || {}) as Record<string, any>;
    const p2p = (ide['p2p'] || {}) as Record<string, any>;
    this.settings.update((s) => ({
      ...s,
      chatApiUrl: typeof chat['api_url'] === 'string' ? chat['api_url'] : s.chatApiUrl,
      chatStorePath: typeof chat['store_path'] === 'string' ? chat['store_path'] : s.chatStorePath,
      timImage: typeof tim['image'] === 'string' ? tim['image'] : s.timImage,
      timName: typeof tim['name'] === 'string' ? tim['name'] : s.timName,
      timDataDir: typeof tim['data_dir'] === 'string' ? tim['data_dir'] : s.timDataDir,
      p2pListenAddr: typeof p2p['listen_addr'] === 'string' ? p2p['listen_addr'] : s.p2pListenAddr,
      p2pPeerAddrs: Array.isArray(p2p['peer_addrs']) ? (p2p['peer_addrs'] as string[]).join('\n') : s.p2pPeerAddrs,
      p2pNodeId: typeof p2p['node_id'] === 'string' ? p2p['node_id'] : s.p2pNodeId,
    }));
    // Loaded values are clean by definition.
    this.dirty.set(false);
  }

  /**
   * Build the body to POST to /internal/ide-config. Mirrors the YAML
   * shape: snake_case keys per top-level subkey, peer_addrs as a real
   * string array (split + trimmed from the textarea content).
   */
  ideConfigPayload(): Record<string, Record<string, unknown>> {
    const s = this.settings();
    const peers = s.p2pPeerAddrs
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      chat: {
        api_url: s.chatApiUrl,
        store_path: s.chatStorePath,
      },
      tim: {
        image: s.timImage,
        name: s.timName,
        data_dir: s.timDataDir,
      },
      p2p: {
        listen_addr: s.p2pListenAddr,
        peer_addrs: peers,
        node_id: s.p2pNodeId,
      },
    };
  }
}
