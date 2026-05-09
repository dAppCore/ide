import { Component, signal, OnInit, OnDestroy, PLATFORM_ID, Inject, CUSTOM_ELEMENTS_SCHEMA, inject, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DevNotificationHost } from '../../components/notification/notification-host';
import { ViStatus, emptyViStatus, loadViData } from '../../lib/vi.types';
import { SettingsStore, DEFAULT_SETTINGS, CoreSettings } from '../../services/store/settings.store';
import { PluginMenuStore } from '../../services/store/plugin-menu.store';
import { WorkspaceStore } from '../../services/store/workspace.store';
import { FileEditorStore } from '../../services/store/file-editor.store';


/**
 * IDE main page — Vi Control Panel layout (Lethean-3 native handoff pattern).
 *
 * Three-column on desktop:
 *   sidebar (240px) | main content (brief grid + sites + activity) | (Vi conversation panel — future)
 *
 * Status bar pinned at bottom (22px tall, mono, Vi connected · latency · sites · spend).
 *
 * Other surfaces (explorer / search / git / terminal / settings) keep placeholder
 * content for now but inherit the new tokens. The dashboard view is replaced
 * with the brief grid + sites + activity per the Vi Control Panel pattern.
 */
@Component({
  selector: 'app-ide',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterOutlet, DevNotificationHost],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // Default ViewEncapsulation (Emulated). The styles array below
  // carries only the IDE shell — toolbar, status bar, ide-layout,
  // shared utility classes (btn, kbd, block, pill, status-dot,
  // cache-pill, placeholder-pane). Each routed panel owns its own
  // CSS in its component's styles array.
  template: `
    <div class="ide-layout">
      <app-sidebar [pluginMenus]="pluginMenus()"></app-sidebar>

      <div class="ide-main">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-title">
            {{ titleForRoute() }}
          </div>
          <div class="toolbar-actions">
            <button class="btn btn-ghost btn-sm" title="Search workspace">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <span class="kbd">⌘F</span>
            </button>
            <button class="btn btn-ghost btn-sm vi-pill" title="Toggle chat panel" (click)="showChat()">
              <span class="kbd">⌘K</span>
              <span>Ask Vi</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          <router-outlet (activate)="onOutletActivate($event)" />
        </div>

        <!-- Status bar (per Lethean-3 native handoff: 22px tall, mono, Vi state) -->
        <div class="status-bar num">
          <div class="status-left">
            <span class="status-item">
              <span class="vi-status-dot" [class.connected]="vi().connected"></span>
              {{ vi().connected ? 'Vi connected' : 'Vi reconnecting…' }} · {{ vi().latencyMs }}ms
            </span>
            <span class="status-sep">·</span>
            <span class="status-item">{{ vi().watching }} sites</span>
            <span class="status-sep">·</span>
            <span class="status-item">£0.00 / mo</span>
          </div>
          <div class="status-right">
            <span class="status-item">core-ide v0.1.0</span>
            <span class="status-sep">·</span>
            <span class="status-item">WebView2 · 124.0</span>
          </div>
        </div>
      </div>

      <!-- Right rail: chat panel — Cladius lives here. Hidden via close button; restored via toolbar Ask Vi. -->
      @if (chatVisible()) {
        <lethean-vi-panel
          status="listening"
          [attr.width]="380"
          placeholder="Talk to Cladius… ( /help for commands)"
          footer-note="Cladius reads only what you type. Bridge: 127.0.0.1:9877"
          (lethean-vi-send)="onChatSend($any($event).detail.text)"
          (lethean-vi-close)="hideChat()"
        >
          @for (msg of chatMessages(); track msg.id) {
            <lethean-vi-message [attr.who]="msg.who" [attr.size]="'chat'">
              {{ msg.text }}
            </lethean-vi-message>
          }
        </lethean-vi-panel>
      }

      <!-- Notification host — single wa-toast container + reactive
           wa-dialog for confirms. Replaces native alert/confirm. -->
      <dev-notification-host></dev-notification-host>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .ide-layout {
      display: flex;
      height: 100%;
      background: var(--ink-1);
      color: var(--fg-1);
      font-family: var(--font-sans);
    }
    .ide-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    /* Toolbar (per Darwin profile: 52px unified toolbar) */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 52px;
      padding: 0 22px;
      background: color-mix(in oklch, var(--ink-1) 90%, transparent);
      border-bottom: 1px solid var(--line-1);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
    }
    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.01em;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    /* Buttons inherit .surface .btn from tokens.css; .btn-ghost / .btn-sm classes work directly. */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      border-radius: var(--r-sm);
      font-weight: 500;
      font-size: 12px;
      letter-spacing: -0.005em;
      border: 1px solid transparent;
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
      white-space: nowrap;
    }
    .btn-ghost {
      background: transparent;
      color: var(--fg-2);
    }
    .btn-ghost:hover {
      background: var(--ink-3);
      color: var(--fg-0);
    }
    .btn-primary {
      background: var(--brand-500);
      color: var(--fg-0);
      border-color: var(--brand-400);
    }
    .btn-primary:hover {
      background: var(--brand-400);
    }
    .btn-secondary {
      background: var(--ink-3);
      color: var(--fg-0);
      border-color: var(--line-2);
    }
    .btn-secondary:hover {
      background: var(--ink-4);
    }
    .btn-sm {
      height: 24px;
      padding: 0 8px;
      font-size: 11.5px;
      border-radius: var(--r-xs);
    }
    .vi-pill {
      border: 1px solid var(--line-2);
    }
    .kbd {
      font-family: var(--font-mono);
      font-size: 10.5px;
      padding: 1px 5px;
      background: var(--ink-1);
      border: 1px solid var(--line-2);
      border-radius: 3px;
      color: var(--fg-2);
    }
    /* Content scroll area */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .block {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .block-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .block-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.005em;
      margin: 0;
    }
    .subtitle {
      font-size: 12.5px;
      color: var(--fg-3);
    }
    .editorial {
      font-family: var(--font-serif);
      font-style: italic;
      letter-spacing: -0.015em;
    }
    .num { font-family: var(--font-mono); }
    .tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot[data-status="green"] { background: var(--success-500); }
    .status-dot[data-status="amber"] { background: var(--warning-500); }
    .status-dot[data-status="red"] { background: var(--danger-500); }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 20px;
      padding: 0 8px;
      border-radius: var(--r-pill);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.005em;
    }
    .pill-warn {
      background: color-mix(in oklch, var(--warning-500) 22%, var(--ink-2));
      color: var(--warning-400);
      border: 1px solid color-mix(in oklch, var(--warning-500) 35%, transparent);
    }
    /* Status bar (per native handoff: 22px tall, mono 10.5px, top-bordered) */
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 22px;
      padding: 0 14px;
      background: color-mix(in oklch, var(--ink-0) 80%, transparent);
      border-top: 1px solid var(--line-1);
      font-size: 10.5px;
      color: var(--fg-3);
      flex-shrink: 0;
    }
    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .status-sep {
      color: var(--fg-4);
    }
    .vi-status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ink-5);
    }
    .vi-status-dot.connected {
      background: var(--success-500);
    }
    /* Placeholder for untouched surfaces */
    .placeholder-pane {
      padding: 22px;
      background: var(--ink-2);
      border: 1px dashed var(--line-2);
      border-radius: var(--r-md);
      color: var(--fg-3);
      font-size: 13px;
    }
    .placeholder-pane code {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--fg-1);
      background: var(--ink-1);
      padding: 1px 6px;
      border-radius: 3px;
    }
    /* Cache freshness pill — shared across cache-aware panels */
    .cache-pill { display: inline-block; margin-left: 12px; font-size: 10px; font-weight: normal; padding: 2px 8px; border-radius: 4px; background: var(--ink-2); color: var(--brand-200); font-family: var(--font-mono); cursor: pointer; vertical-align: middle; letter-spacing: 0.04em; }
    .cache-pill.cache-fresh { color: #34d399; background: color-mix(in oklch, #34d399 12%, var(--ink-2)); cursor: default; }
    .cache-pill.cache-stale { color: #fbbf24; background: color-mix(in oklch, #fbbf24 12%, var(--ink-2)); }
    .cache-pill:hover:not(.cache-fresh) { background: color-mix(in oklch, var(--brand-200) 16%, var(--ink-2)); }
    /* Responsive: collapse brief grid on narrow viewports */
    @media (max-width: 1100px) {
      .brief-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 720px) {
      .brief-grid { grid-template-columns: 1fr; }
      .sites-row { grid-template-columns: 1fr 1fr; gap: 6px; }
      .sites-row > *:nth-child(n+3) { display: none; }
    }
  
  `]
})
export class IdeComponent implements OnInit, OnDestroy {
  private isBrowser: boolean;
  private timeEventCleanup?: () => void;
  private keyboardListener?: (e: KeyboardEvent) => void;
  private uiSaveTimer?: ReturnType<typeof setTimeout>;
  private uiSaveSuppressed = true;
  private chatIdCounter = 1;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly settingsStore = inject(SettingsStore);
  private readonly pluginMenuStore = inject(PluginMenuStore);
  private readonly workspaceStore = inject(WorkspaceStore);
  private readonly fileEditor = inject(FileEditorStore);

  // Active sidebar route id — drives the sidebar [class.active] highlight
  // (for the Sites section, which still uses currentRoute), the toolbar
  // title, and the persisted ui.route field. Mirrored from the active
  // child route in updateRouteState.
  readonly currentRoute = signal('dashboard');
  readonly currentTime = signal('');

  // Vi connection status — drives the bottom status bar pill. Per-panel
  // briefs/sites/activity load inside ControlPanelComponent.
  readonly vi = signal<ViStatus>(emptyViStatus);

  // Chat — Cladius lives here. Backend wiring (claude_bridge upstream
  // MCP) lands next iter; for now messages echo locally so the UI is
  // real.
  readonly chatVisible = signal(true);
  readonly chatMessages = signal<{ id: number; who: 'vi' | 'you'; text: string }[]>([
    {
      id: 0,
      who: 'vi',
      text: "Hey \u2014 Cladius here. The chat surface is up. Backend wiring lands next iter; until then, messages echo locally. The MCP bridge at :9877 is fully active though, so real DOM/console/window/file/process control is already live.",
    },
  ]);

  // Settings — delegating signals; SettingsStore is source of truth.
  readonly defaultSettings = DEFAULT_SETTINGS;
  readonly settings = this.settingsStore.settings;
  readonly settingsDirty = this.settingsStore.dirty;
  readonly settingsSaveMessage = this.settingsStore.saveMessage;

  // Plugin menus — delegating signal sourced from PluginMenuStore.
  // Sidebar consumes via @Input pluginMenus; PluginComponent looks up
  // by code via PluginMenuStore.byCode().
  readonly pluginMenus = this.pluginMenuStore.menus;

  // Workspace root — delegating signal sourced from WorkspaceStore.
  // Shared with FileEditorStore (explorer breadcrumbs) and every routed
  // panel that needs the IDE-wide working directory.
  readonly workspaceRoot = this.workspaceStore.root;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;

    // Mirror the active child route id into currentRoute so sidebar
    // highlight + toolbar title + persisted ui.route stay in sync.
    // Plugin params (/dev/plugin/:code/:sub) collapse back into the
    // legacy 'plugin:code:sub' label so the persistence shape doesn't
    // change.
    const updateRouteState = () => {
      const child = this.route.snapshot.firstChild;
      const path = child?.routeConfig?.path ?? null;
      if (!path) return;
      if (path === ':panel' || path === '**') {
        const panel = child?.params['panel'] as string | undefined;
        if (panel) this.currentRoute.set(panel);
      } else if (path === 'plugin/:code' || path === 'plugin/:code/:sub') {
        const code = child?.params['code'] as string | undefined;
        const sub = child?.params['sub'] as string | undefined;
        if (code) this.currentRoute.set(sub ? `plugin:${code}:${sub}` : `plugin:${code}`);
      } else if (path === 'site/:domain') {
        const domain = child?.params['domain'] as string | undefined;
        if (domain) this.currentRoute.set(`site:${domain}`);
      } else {
        this.currentRoute.set(path);
      }
    };
    updateRouteState();
    const sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        updateRouteState();
        this.saveUIState();
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());

    import('@wailsio/runtime').then(({ Events }) => {
      this.timeEventCleanup = Events.On('time', (time: { data: string }) => {
        this.currentTime.set(time.data);
      });
    });

    // Status-bar 'vi' info — only the connected/latency/watching
    // counts are surfaced here; per-panel data (briefs/sites/activity)
    // is loaded by ControlPanelComponent on its own ngOnInit.
    loadViData()
      .then((snap) => this.vi.set(snap.status))
      .catch((err) => console.warn('[vi] loadViData failed:', err));

    // Restore persisted UI state from ~/.core/config.yaml. Failure (no
    // config yet) is silent \u2014 we just keep the defaults.
    void this.loadUIState();

    // Load installed-plugin menus so the sidebar's Plugins group
    // renders immediately. Re-runs after marketplace install/remove
    // via PluginMenuStore.reload().
    void this.loadPluginMenus();

    // Keyboard shortcuts: \u23181..\u23189 (Ctrl+1..9 elsewhere) jumps to the first
    // 9 Developer panels in sidebar order. Skips while focus is in a
    // text input / textarea / contenteditable so we don't fight typing.
    this.keyboardListener = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta || e.shiftKey || e.altKey) return;
      if (e.key < '1' || e.key > '9') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (target?.isContentEditable) return;
      if (target?.closest('.monaco-editor')) return;
      const idx = parseInt(e.key, 10) - 1;
      const ids = ['explorer', 'search', 'git', 'updates', 'sessions', 'stream', 'memory', 'mantis', 'lint'];
      const route = ids[idx];
      if (!route) return;
      e.preventDefault();
      void this.router.navigate(['/dev', route]);
    };
    document.addEventListener('keydown', this.keyboardListener);
  }

  ngOnDestroy() {
    this.timeEventCleanup?.();
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
    // Best-effort flush of any pending save before component teardown.
    this.flushUIState();
  }

  // --- UI state persistence (POST /internal/ui-state) ---

  private async loadUIState() {
    try {
      const res = await fetch('http://127.0.0.1:9877/internal/ui-state');
      const data = await res.json();
      const ui = (data?.ui ?? {}) as Record<string, any>;

      // Settings first \u2014 they shape downstream defaults.
      // SettingsStore.hydrate() handles the camelCase / lowercase key
      // normalisation that dappco.re/go/config imposes on YAML.
      if (ui['settings'] && typeof ui['settings'] === 'object') {
        this.settingsStore.hydrate(ui['settings'] as Record<string, any>);
      }
      const s = this.settings();
      this.workspaceStore.setRoot(s.workspaceRoot);
      this.fileEditor.setExplorerPath(s.workspaceRoot);
      this.currentRoute.set(s.defaultRoute);
      this.chatVisible.set(s.chatVisibleOnLaunch);

      if (typeof ui['chat_visible'] === 'boolean') this.chatVisible.set(ui['chat_visible']);
      if (typeof ui['route'] === 'string') this.currentRoute.set(ui['route'] as string);
      if (typeof ui['workspace_root'] === 'string') {
        this.workspaceStore.setRoot(ui['workspace_root']);
        this.fileEditor.setExplorerPath(ui['workspace_root']);
      }
      // Re-open the persisted tabs in order \u2014 FileEditorStore owns
      // the tab list; we just re-hydrate from the persisted paths.
      if (Array.isArray(ui['open_files'])) {
        const files: string[] = (ui['open_files'] as any[]).filter((p) => typeof p === 'string');
        for (const path of files) {
          await this.fileEditor.restoreOpenFile(path);
        }
        if (typeof ui['active_tab_idx'] === 'number') {
          const idx = ui['active_tab_idx'] as number;
          if (idx >= 0 && idx < this.fileEditor.openFiles().length) {
            this.fileEditor.selectTab(idx);
          }
        } else if (this.fileEditor.openFiles().length > 0) {
          this.fileEditor.selectTab(0);
        }
      }
    } catch (e) {
      console.warn('[ui-state] load failed (likely first run):', e);
    } finally {
      this.uiSaveSuppressed = false;
    }
  }

  /** Schedule a debounced UI-state save; coalesces rapid changes. */
  saveUIState() {
    if (this.uiSaveSuppressed) return;
    if (this.uiSaveTimer) clearTimeout(this.uiSaveTimer);
    this.uiSaveTimer = setTimeout(() => this.flushUIState(), 400);
  }

  private flushUIState() {
    if (this.uiSaveSuppressed) return;
    if (this.uiSaveTimer) {
      clearTimeout(this.uiSaveTimer);
      this.uiSaveTimer = undefined;
    }
    const state = {
      chat_visible: this.chatVisible(),
      route: this.currentRoute(),
      workspace_root: this.workspaceRoot(),
      open_files: this.fileEditor.openFiles().map((f) => f.path),
      active_tab_idx: this.fileEditor.activeFileIdx(),
      settings: this.settings(),
    };
    fetch('http://127.0.0.1:9877/internal/ui-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
      keepalive: true,
    }).catch((e) => console.warn('[ui-state] save failed:', e));
  }

  // --- Settings round-trip ---

  updateSetting<K extends keyof CoreSettings>(key: K, value: CoreSettings[K]) {
    this.settingsStore.update(key, value);
  }

  /**
   * Save handler \u2014 invoked by the routed SettingsComponent via
   * (requestSave) wired in onOutletActivate. Applies any
   * runtime-affecting fields, flushes UI state, marks the store clean.
   */
  onSettingsSave() {
    const s = this.settings();
    if (this.workspaceRoot() !== s.workspaceRoot) {
      this.workspaceStore.setRoot(s.workspaceRoot);
      this.fileEditor.setExplorerPath(s.workspaceRoot);
    }
    this.flushUIState();
    this.settingsStore.markSaved('Saved. Backend settings (marketplace endpoint, SSH port) take effect after restart.');
  }

  saveSettings() { this.onSettingsSave(); }
  resetSettings() { this.settingsStore.reset(); }

  // --- Plugin menus reload (called from boot) ---
  async loadPluginMenus() {
    await this.pluginMenuStore.reload();
  }

  // --- Router outlet activate hook ---
  // Wires the lazy-loaded SettingsComponent's (requestSave) Output so
  // /dev/settings save flows through onSettingsSave \u2192 flushUIState in
  // one HTTP round-trip. Duck-typed so we don't need a static import
  // of SettingsComponent \u2014 that import would defeat its lazy chunk by
  // pulling it into the IDE shell's eager bundle.
  onOutletActivate(component: any): void {
    const save = component?.requestSave;
    if (save && typeof save.subscribe === 'function') {
      save.subscribe(() => this.onSettingsSave());
    }
  }

  // --- Toolbar title ---
  titleForRoute(): string {
    const route = this.currentRoute();
    if (route === 'dashboard' || route === 'control-panel') return 'Control Panel';
    if (route === 'ask-vi') return 'Ask Vi';
    if (route.startsWith('site:')) return route.slice('site:'.length);
    if (route.startsWith('plugin:')) {
      const code = route.slice('plugin:'.length).split(':')[0];
      return this.pluginMenuStore.byCode(code)?.menu?.label || 'Plugin';
    }
    return route.charAt(0).toUpperCase() + route.slice(1);
  }

  // --- Chat panel ---

  hideChat() { this.chatVisible.set(false); this.saveUIState(); }
  showChat() { this.chatVisible.set(true); this.saveUIState(); }

  onChatSend(text: string) {
    const t = (text || '').trim();
    if (!t) return;
    this.chatMessages.update((msgs) => [
      ...msgs,
      { id: this.chatIdCounter++, who: 'you', text: t },
    ]);
    if (t.startsWith('/')) {
      void this.invokeBridgeTool(t);
      return;
    }
    setTimeout(() => {
      this.chatMessages.update((msgs) => [
        ...msgs,
        {
          id: this.chatIdCounter++,
          who: 'vi',
          text: `(echo) ${t}\n\nTry "/help" to see available bridge commands. Upstream Cladius wiring lands next.`,
        },
      ]);
    }, 200);
  }

  private async invokeBridgeTool(line: string) {
    // Parse `/tool [json-params | key=value pairs]`
    const stripped = line.replace(/^\//, '').trim();
    if (!stripped) return;
    const firstSpace = stripped.indexOf(' ');
    const tool = firstSpace < 0 ? stripped : stripped.slice(0, firstSpace);
    const argStr = firstSpace < 0 ? '' : stripped.slice(firstSpace + 1).trim();

    if (tool === 'help') {
      this.chatMessages.update((msgs) => [
        ...msgs,
        {
          id: this.chatIdCounter++,
          who: 'vi',
          text:
            'Bridge command syntax: /<tool> [json-params | key=value]\n\n' +
            'Common tools:\n' +
            '  /webview_console limit=20\n' +
            '  /webview_errors\n' +
            '  /webview_dom_tree selector=main\n' +
            '  /webview_eval {"script":"return document.title;"}\n' +
            '  /window_get\n' +
            '  /window_position x=300 y=200\n' +
            '  /file_read path=/Users/snider/Code/core/ide/CLAUDE.md\n' +
            '  /dir_list path=/Users/snider/Code/core/ide\n' +
            '  /process_start command=ls args=["-la"]\n' +
            '  /clipboard_read\n' +
            '  /theme_get\n\n' +
            'Full manifest: GET http://127.0.0.1:9877/mcp/tools',
        },
      ]);
      return;
    }

    let params: Record<string, unknown> = {};
    if (argStr.startsWith('{')) {
      try {
        params = JSON.parse(argStr);
      } catch (e) {
        this.chatMessages.update((msgs) => [
          ...msgs,
          { id: this.chatIdCounter++, who: 'vi', text: `JSON parse error: ${(e as Error).message}\nInput was: ${argStr}` },
        ]);
        return;
      }
    } else if (argStr) {
      const tokens = argStr.match(/[a-zA-Z_][a-zA-Z0-9_]*=(?:"[^"]*"|\[[^\]]*\]|\{[^}]*\}|\S+)/g) || [];
      for (const tok of tokens) {
        const eq = tok.indexOf('=');
        const k = tok.slice(0, eq);
        const v: string = tok.slice(eq + 1);
        if (v.startsWith('"') && v.endsWith('"')) params[k] = v.slice(1, -1);
        else if (v.startsWith('[') || v.startsWith('{')) {
          try { params[k] = JSON.parse(v); } catch { params[k] = v; }
        } else if (/^-?\d+$/.test(v)) params[k] = parseInt(v, 10);
        else if (/^(true|false)$/.test(v)) params[k] = v === 'true';
        else params[k] = v;
      }
    }

    try {
      const res = await fetch('http://127.0.0.1:9877/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, params }),
      });
      const data = await res.json();
      const formatted = JSON.stringify(data, null, 2);
      const text = formatted.length > 4000 ? formatted.slice(0, 4000) + '\n\u2026(truncated)' : formatted;
      this.chatMessages.update((msgs) => [
        ...msgs,
        { id: this.chatIdCounter++, who: 'vi', text: `\`/${tool}\`\n\n${text}` },
      ]);
    } catch (e) {
      this.chatMessages.update((msgs) => [
        ...msgs,
        { id: this.chatIdCounter++, who: 'vi', text: `Bridge call failed: ${(e as Error).message}` },
      ]);
    }
  }
}
