import { Component, ViewChild, computed, signal, OnInit, OnDestroy, PLATFORM_ID, Inject, CUSTOM_ELEMENTS_SCHEMA, inject, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DevNotificationHost } from '../../components/notification/notification-host';
import { CommandPaletteComponent } from '../../components/command-palette/command-palette.component';
import { ViStatus, emptyViStatus, loadViData } from '../../lib/vi.types';
import { SettingsStore, DEFAULT_SETTINGS, CoreSettings, ThemeName } from '../../services/store/settings.store';
import { PluginMenuStore } from '../../services/store/plugin-menu.store';
import { WorkspaceStore } from '../../services/store/workspace.store';
import { ThemeService } from '../../services/theme.service';
import { I18nService } from '../../services/i18n.service';
import { FileEditorStore } from '../../services/store/file-editor.store';
import { CommandRegistryService } from '../../services/command-registry.service';
import { StatusBarRegistryService } from '../../services/status-bar-registry.service';
import { SettingsRegistryService } from '../../services/settings-registry.service';
import * as LemBridge from '../../../../bindings/dappco.re/go/ide/pkg/server/lemlabbridge';


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
  imports: [CommonModule, SidebarComponent, RouterOutlet, DevNotificationHost, CommandPaletteComponent],
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

        <!-- Status bar (per Lethean-3 native handoff: 22px tall, mono, Vi state).
             Vi pill stays inline (IDE-built-in, framework-special). All other
             slots render through StatusBarRegistryService — built-in or plugin
             contributed, same render path. -->
        <div class="status-bar num">
          <div class="status-left">
            <span class="status-item">
              <span class="vi-status-dot" [class.connected]="vi().connected"></span>
              {{ vi().connected ? 'Vi connected' : 'Vi reconnecting…' }} · {{ vi().latencyMs }}ms
            </span>
            @for (slot of statusBar.left(); track slot.id) {
              <span class="status-sep">·</span>
              @if (slot.click) {
                <button class="status-item status-clickable" [class]="'tone-' + (slot.tone || 'default')" [title]="slot.hint || ''" (click)="slot.click!()">{{ slot.text() }}</button>
              } @else {
                <span class="status-item" [class]="'tone-' + (slot.tone || 'default')" [title]="slot.hint || ''">{{ slot.text() }}</span>
              }
            }
          </div>
          <div class="status-right">
            @for (slot of statusBar.right(); track slot.id; let first = $first) {
              @if (!first) { <span class="status-sep">·</span> }
              @if (slot.click) {
                <button class="status-item status-clickable" [class]="'tone-' + (slot.tone || 'default')" [title]="slot.hint || ''" (click)="slot.click!()">{{ slot.text() }}</button>
              } @else {
                <span class="status-item" [class]="'tone-' + (slot.tone || 'default')" [title]="slot.hint || ''">{{ slot.text() }}</span>
              }
            }
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
      <command-palette #palette></command-palette>
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
      background: transparent;
      border: none;
      color: inherit;
      font: inherit;
      padding: 0;
    }
    .status-clickable { cursor: pointer; }
    .status-clickable:hover { color: var(--fg-1); }
    .tone-ok { color: var(--success-400); }
    .tone-warn { color: var(--warning-400); }
    .tone-danger { color: var(--danger-400); }
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
  // Booted for its constructor effect — applies wa-theme-* class to <html>.
  private readonly themeService = inject(ThemeService);
  // Booted for its constructor effect — bridges SettingsStore.language
  // → ngx-translate.use().
  private readonly i18n = inject(I18nService);
  private readonly fileEditor = inject(FileEditorStore);
  private readonly commands = inject(CommandRegistryService);
  readonly statusBar = inject(StatusBarRegistryService);
  readonly settingsRegistry = inject(SettingsRegistryService);

  // ViewChild on the palette so the keyboard listener can toggle it.
  @ViewChild('palette') paletteRef?: CommandPaletteComponent;

  // Active sidebar route id — drives the sidebar [class.active] highlight
  // (for the Sites section, which still uses currentRoute), the toolbar
  // title, and the persisted ui.route field. Mirrored from the active
  // child route in updateRouteState.
  readonly currentRoute = signal('dashboard');
  readonly currentTime = signal('');

  // Vi connection status — drives the bottom status bar pill. Per-panel
  // briefs/sites/activity load inside ControlPanelComponent.
  readonly vi = signal<ViStatus>(emptyViStatus);

  // LEM.Lab training count — drives the bottom-bar "LEM · N" pill. Refreshed
  // by a 30s background poll started in ngOnInit so the status reflects
  // training activity without requiring the /lab/lem page to be open.
  readonly lemTrainingCount = signal('—');
  private lemPollTimer?: ReturnType<typeof setInterval>;

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

    // Register built-in commands (navigate / theme / language / ide).
    // Plugins extend this surface via CommandRegistryService.register()
    // \u2014 every plugin action (CoreAgent "switch model", Lem.Lab "load
    // checkpoint", etc.) ends up in the same fuzzy-search palette.
    this.registerBuiltinCommands();

    // Register built-in status-bar slots (sites / spend / version /
    // runtime). Plugins add slots via StatusBarRegistryService.register()
    // \u2014 Lemma t/s, CoreAgent model id, peer count, etc. go straight
    // into the bottom strip without IDE shell changes.
    this.registerBuiltinStatusBarSlots();

    // Register a demo settings section to prove the SettingsRegistryService
    // extension surface works end-to-end. Future plugins (CoreAgent,
    // Lem.Lab, etc.) register their own sections through the same path.
    this.registerDemoSettingsSection();

    // Register LEM.Lab settings section (auto-refresh interval + default
    // model). Mirrors the registerDemoSettingsSection shape; lives here
    // until LemComponent is restructured into a full plugin module.
    this.registerLemLabSettingsSection();

    // Background poll of LemBridge.GetSnapshot every 30s to keep the
    // status-bar pill ("LEM · N training") fresh whether or not the
    // /lab/lem page is open.
    this.refreshLemTrainingCount();
    this.lemPollTimer = setInterval(() => this.refreshLemTrainingCount(), 30_000);

    // Keyboard shortcuts:
    // - cmd/ctrl + Shift + P: toggle the command palette
    // - cmd/ctrl + 1..9 (no shift): jump to the first 9 Developer panels
    //   in sidebar order
    // Both skip while focus is in a text input / textarea /
    // contenteditable / monaco editor so we don't fight typing.
    this.keyboardListener = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inText = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable || !!target?.closest('.monaco-editor');

      // Palette toggle \u2014 works even from text inputs (the palette IS a
      // text input UX, so users expect cmd+Shift+P from anywhere).
      if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        this.paletteRef?.toggle();
        return;
      }

      if (e.shiftKey) return;
      if (inText) return;
      if (e.key < '1' || e.key > '9') return;
      const idx = parseInt(e.key, 10) - 1;
      const ids = ['explorer', 'search', 'git', 'updates', 'sessions', 'stream', 'memory', 'mantis', 'lint'];
      const route = ids[idx];
      if (!route) return;
      e.preventDefault();
      void this.router.navigate(['/dev', route]);
    };
    document.addEventListener('keydown', this.keyboardListener);
  }

  /**
   * Built-in commands wired at IDE boot. Three groups:
   *   - Navigate: every dev route (~30 commands)
   *   - Theme: 6 WebAwesome theme variants
   *   - Language: 5 ngx-translate locales
   *   - IDE: ad-hoc actions (refresh plugins, reload page)
   *
   * Plugins extend by injecting CommandRegistryService and calling
   * register() \u2014 same surface, no palette code change required.
   */
  private registerBuiltinCommands(): void {
    const navTargets: Array<{ route: string; label: string; group?: string }> = [
      { route: 'control-panel', label: 'Control Panel' },
      { route: 'explorer', label: 'Explorer' },
      { route: 'search', label: 'Search' },
      { route: 'git', label: 'Git' },
      { route: 'forge', label: 'Forge' },
      { route: 'mantis', label: 'Mantis' },
      { route: 'sessions', label: 'Sessions' },
      { route: 'lint', label: 'Lint' },
      { route: 'devops', label: 'Devops' },
      { route: 'memory', label: 'Memory' },
      { route: 'updates', label: 'Updates' },
      { route: 'cache', label: 'Cache' },
      { route: 'stream', label: 'Stream' },
      { route: 'process', label: 'Process' },
      { route: 'terminal', label: 'Terminal' },
      { route: 'build', label: 'Build' },
      { route: 'repos', label: 'Repos' },
      { route: 'containers', label: 'Containers' },
      { route: 'data', label: 'Data' },
      { route: 'store', label: 'Store' },
      { route: 'locales', label: 'Locales' },
      { route: 'tenant', label: 'Tenant' },
      { route: 'php', label: 'PHP' },
      { route: 'ts', label: 'TypeScript' },
      { route: 'chat', label: 'Chat' },
      { route: 'tim', label: 'TIM' },
      { route: 'p2p', label: 'P2P' },
      { route: 'marketplace', label: 'Marketplace' },
      { route: 'settings', label: 'Settings' },
    ];

    this.commands.register(
      navTargets.map((t) => ({
        id: 'navigate.' + t.route,
        label: 'Open ' + t.label,
        group: 'Navigate',
        run: () => void this.router.navigate(['/dev', t.route]),
      })),
    );

    const themes: ThemeName[] = ['lethean', 'default', 'awesome', 'shoelace', 'premium', 'matter'];
    this.commands.register(
      themes.map((t) => ({
        id: 'theme.' + t,
        label: 'Theme: ' + t.charAt(0).toUpperCase() + t.slice(1),
        group: 'Theme',
        run: () => this.settingsStore.update('theme', t),
      })),
    );

    const languages: Array<{ code: string; label: string }> = [
      { code: 'en', label: 'English' },
      { code: 'de', label: 'Deutsch' },
      { code: 'fa', label: '\u0641\u0627\u0631\u0633\u06cc' },
      { code: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
      { code: 'zh', label: '\u4e2d\u6587' },
    ];
    this.commands.register(
      languages.map((l) => ({
        id: 'language.' + l.code,
        label: 'Language: ' + l.label,
        group: 'Language',
        hint: l.code,
        run: () => this.settingsStore.update('language', l.code),
      })),
    );

    // LEM.Lab — first /lab/* surface. Open command navigates; ops
     // commands fire bridge actions directly so users can drive the
     // training/scoring stack from the palette without opening the
     // page first.
    this.commands.register([
      {
        id: 'lab.lem.open',
        label: 'LEM.Lab: Open dashboard',
        group: 'Lab',
        run: () => void this.router.navigate(['/lab', 'lem']),
      },
      {
        id: 'lab.lem.refresh',
        label: 'LEM.Lab: Refresh snapshot',
        group: 'Lab',
        run: () => { void LemBridge.Refresh(); },
      },
      {
        id: 'lab.lem.start-stack',
        label: 'LEM.Lab: Start docker stack',
        group: 'Lab',
        run: () => { void LemBridge.StartStack(); },
      },
      {
        id: 'lab.lem.stop-stack',
        label: 'LEM.Lab: Stop docker stack',
        group: 'Lab',
        run: () => { void LemBridge.StopStack(); },
      },
      {
        id: 'lab.lem.start-agent',
        label: 'LEM.Lab: Start scoring agent',
        group: 'Lab',
        run: () => { void LemBridge.StartAgent(); },
      },
      {
        id: 'lab.lem.stop-agent',
        label: 'LEM.Lab: Stop scoring agent',
        group: 'Lab',
        run: () => { void LemBridge.StopAgent(); },
      },
    ]);

    this.commands.register([
      {
        id: 'ide.refresh-plugins',
        label: 'Refresh installed plugins',
        group: 'IDE',
        run: () => void this.pluginMenuStore.reload(true),
      },
      {
        id: 'ide.reload-page',
        label: 'Reload IDE',
        group: 'IDE',
        hint: 'window.location.reload',
        run: () => {
          if (typeof window !== 'undefined') window.location.reload();
        },
      },
      {
        id: 'ide.toggle-chat',
        label: this.chatVisible() ? 'Hide chat panel' : 'Show chat panel',
        group: 'IDE',
        run: () => this.chatVisible.update((v) => !v),
      },
    ]);
  }

  /**
   * Built-in status-bar slots wired at IDE boot.
   *   - left: sites count, monthly spend
   *   - right: runtime, version
   * Plugin slots (Lemma, CoreAgent, etc.) register through the same
   * service and merge into the same render path.
   */
  private registerBuiltinStatusBarSlots(): void {
    this.statusBar.register([
      {
        id: 'ide.sites',
        side: 'left',
        order: 100,
        text: computed(() => `${this.vi().watching} sites`),
        click: () => void this.router.navigate(['/dev/repos']),
        hint: 'Watched sites — open Repos panel',
      },
      {
        id: 'ide.spend',
        side: 'left',
        order: 200,
        text: computed(() => '£0.00 / mo'),
        hint: 'Monthly spend (placeholder until tenant.usage wired)',
      },
      {
        id: 'lab.lem.status',
        side: 'left',
        order: 300,
        text: computed(() => `LEM · ${this.lemTrainingCount()}`),
        click: () => void this.router.navigate(['/lab', 'lem']),
        hint: 'LEM.Lab — open dashboard',
      },
      {
        id: 'ide.runtime',
        side: 'right',
        order: 100,
        text: computed(() => 'WebView2 · 124.0'),
        hint: 'WebView runtime',
      },
      {
        id: 'ide.version',
        side: 'right',
        order: 200,
        text: computed(() => 'core-ide v0.1.0'),
        hint: 'Build version — open Updates panel',
        click: () => void this.router.navigate(['/dev/updates']),
      },
    ]);
  }

  /**
   * Demo plugin-settings section — proves the SettingsRegistryService
   * extension surface works end-to-end. Real plugins (CoreAgent,
   * Lem.Lab, etc.) register their own sections the same way and they
   * appear in /dev/settings without any IDE shell change.
   *
   * The values here surface IDE state read-only as a demo; real plugin
   * sections wire `value()` to their own state signals and `onChange`
   * to their own persistence (typically `~/.core/config.yaml` under
   * their namespace).
   */
  private registerDemoSettingsSection(): void {
    this.settingsRegistry.register({
      id: 'ide.substrates',
      label: 'IDE Substrates',
      group: 'Plugins',
      order: 1000,
      hint: 'Live count of plugin extension surfaces in this IDE session — proves the SettingsRegistryService extension path works. Real plugin sections appear here automatically when plugins call SettingsRegistryService.register().',
      fields: [
        {
          key: 'commands.count',
          type: 'string',
          label: 'Registered commands',
          hint: 'palette → cmd+Shift+P',
          value: () => `${this.commands.commands().length} (${this.commands.enabled().length} enabled)`,
        },
        {
          key: 'statusbar.slots',
          type: 'string',
          label: 'Status-bar slots',
          hint: 'left + right total',
          value: () => `${this.statusBar.slots().length} slots (${this.statusBar.left().length} left, ${this.statusBar.right().length} right)`,
        },
        {
          key: 'settings.sections',
          type: 'string',
          label: 'Settings sections',
          hint: 'plugin-contributed (excludes IDE built-ins)',
          value: () => `${this.settingsRegistry.sections().length}`,
        },
      ],
    });
  }

  ngOnDestroy() {
    this.timeEventCleanup?.();
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
    if (this.lemPollTimer) clearInterval(this.lemPollTimer);
    // Best-effort flush of any pending save before component teardown.
    this.flushUIState();
  }

  private async refreshLemTrainingCount(): Promise<void> {
    try {
      const snap = await LemBridge.GetSnapshot();
      const n = snap?.training?.length ?? 0;
      this.lemTrainingCount.set(n === 0 ? 'idle' : `${n} training`);
    } catch {
      // Bridge unavailable — keep last value, drop to placeholder if
      // we never saw one.
      if (this.lemTrainingCount() === '—') this.lemTrainingCount.set('offline');
    }
  }

  /**
   * LEM.Lab settings section — registered through SettingsRegistryService
   * so it appears at /dev/settings under the "Plugins" group alongside
   * other plugin-contributed sections. Mirrors the demo section shape.
   *
   * Today the fields are read-only / display-only since the LEM.Lab
   * config sink isn't wired yet (auto-refresh interval is owned by the
   * LemComponent itself; default model is fixture-shaped). When the
   * bridge gains a SetConfig method, value() reads from a shared
   * LemConfigStore and onChange writes back through the bridge.
   */
  private registerLemLabSettingsSection(): void {
    this.settingsRegistry.register({
      id: 'lab.lem',
      label: 'LEM.Lab',
      group: 'Plugins',
      order: 100,
      hint: 'Training studio · scoring agent · stack control. Settings are read-only until the LEM.Lab config bridge ships; defaults today live in the page component and the docker compose file.',
      fields: [
        {
          key: 'lem.auto-refresh-ms',
          type: 'string',
          label: 'Auto-refresh interval',
          hint: 'milliseconds between snapshot polls (page-level)',
          value: () => '10000',
        },
        {
          key: 'lem.default-model',
          type: 'select',
          label: 'Default training model',
          hint: 'pre-selected when starting a new run',
          value: () => 'gemma4-e2b',
          options: [
            { value: 'gemma4-e2b', label: 'Gemma4 E2B' },
            { value: 'gemma4-e4b', label: 'Gemma4 E4B' },
            { value: 'lemma-26b',  label: 'Lemma 26B' },
            { value: 'qwen36-35b', label: 'Qwen 3.6 35B' },
          ],
        },
        {
          key: 'lem.compose-dir',
          type: 'string',
          label: 'Docker compose directory',
          hint: 'path to docker-compose.yml',
          value: () => '~/.lem/deploy',
        },
      ],
    });
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

      // Backend config \u2014 pulled from /internal/ide-config in parallel
      // with the ui-state load. Hydrate folds chat/tim/p2p subkeys
      // into the camelCase settings fields so the UI binds normally.
      // Failure (config file doesn't have ide.* yet) is silent \u2014 the
      // user will see blank fields and configure them.
      try {
        const ideRes = await fetch('http://127.0.0.1:9877/internal/ide-config');
        const ideData = await ideRes.json();
        const ide = (ideData?.ide ?? {}) as Record<string, any>;
        if (Object.keys(ide).length > 0) {
          this.settingsStore.hydrateIdeConfig(ide);
        }
      } catch (e) {
        console.warn('[ide-config] load failed (likely first run):', e);
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

    // Backend config (chat / TIM / p2p) lives outside the ui.* subtree
    // because it gets clobbered by the ui-state save on every keystroke
    // and we'd lose sibling ide.* fields. Send it to the dedicated
    // /internal/ide-config endpoint which merges per top-level subkey.
    // Restart-required to take effect — gui.BootstrapWithConfig only
    // reads at boot.
    fetch('http://127.0.0.1:9877/internal/ide-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.settingsStore.ideConfigPayload()),
      keepalive: true,
    }).catch((e) => console.warn('[ide-config] save failed:', e));
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
