import { Component, signal, OnInit, OnDestroy, PLATFORM_ID, Inject, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { Brief, Site, ActivityItem, viFixtures } from '../../lib/vi.types';

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
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="ide-layout">
      <app-sidebar [currentRoute]="currentRoute()" (routeChange)="onRouteChange($event)"></app-sidebar>

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
            <button class="btn btn-ghost btn-sm vi-pill" title="Ask Vi">
              <span class="kbd">⌘K</span>
              <span>Ask Vi</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          @switch (viewKind()) {
            @case ('control-panel') {
              <!-- Brief grid -->
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">Briefs</h2>
                  <span class="editorial subtitle">{{ briefSubtitle() }}</span>
                </div>
                <div class="brief-grid">
                  @for (brief of briefs; track $index) {
                    <article class="brief-card" [attr.data-tone]="brief.tone" [class.done]="brief.done">
                      <span class="tone-strip"></span>
                      <div class="brief-body">
                        <div class="brief-meta">
                          <span class="tone-dot"></span>
                          <span class="brief-time">{{ brief.time }}</span>
                          @if (brief.done) {
                            <span class="brief-done">DONE</span>
                          }
                        </div>
                        <h3 class="brief-title">{{ brief.title }}</h3>
                        <p class="brief-text">{{ brief.body }}</p>
                        <div class="brief-actions">
                          @for (action of brief.actions; track action.label) {
                            <button class="btn btn-sm" [class.btn-primary]="action.primary && !brief.done" [class.btn-secondary]="!action.primary && !brief.done" [class.btn-ghost]="brief.done">
                              {{ action.label }}
                              @if (brief.shortcut && action.primary) {
                                <span class="kbd">{{ brief.shortcut }}</span>
                              }
                            </button>
                          }
                        </div>
                      </div>
                    </article>
                  }
                </div>
              </section>

              <!-- Sites table -->
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">Sites</h2>
                  <span class="editorial subtitle">{{ vi.watching }} watched · {{ greenCount() }} green</span>
                </div>
                <div class="sites-table">
                  <div class="sites-row sites-head">
                    <span>Domain</span>
                    <span>Stack</span>
                    <span>Uptime</span>
                    <span>Response</span>
                    <span>Deploy</span>
                  </div>
                  @for (site of sites; track site.domain) {
                    <div class="sites-row">
                      <span class="sites-domain">
                        <span class="status-dot" [attr.data-status]="site.status"></span>
                        <span class="num">{{ site.domain }}</span>
                      </span>
                      <span class="sites-stack">{{ site.stack }}</span>
                      <span class="num tnum">{{ site.uptime }}%</span>
                      <span class="num tnum">{{ site.response }}ms</span>
                      <span class="sites-deploy">
                        {{ site.lastDeploy }}
                        @if (site.warn) {
                          <span class="pill pill-warn">{{ site.warn }}</span>
                        }
                      </span>
                    </div>
                  }
                </div>
              </section>

              <!-- Activity stream -->
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">Activity</h2>
                  <span class="editorial subtitle">last few hours</span>
                </div>
                <div class="activity-list">
                  @for (item of activity; track $index) {
                    <div class="activity-row" [attr.data-tone]="item.tone">
                      <span class="who-badge num">{{ item.who | uppercase }}</span>
                      <span class="activity-text">{{ item.text }}</span>
                      <span class="num activity-time">{{ item.time }}</span>
                    </div>
                  }
                </div>
              </section>
            }
            @case ('terminal') {
              <section class="block">
                <h2 class="block-title">Terminal</h2>
                <div class="terminal-output">
                  <pre>$ core dev health
18 repos │ clean │ synced

$ _</pre>
                </div>
              </section>
            }
            @default {
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">{{ titleForRoute() }}</h2>
                  <span class="editorial subtitle">{{ placeholderHint() }}</span>
                </div>
                <div class="placeholder-pane">
                  <p>This surface inherits the Lethean-3 design tokens but its detail design is pending. See <code>plans/project/lthn/desktop/RFC.md</code> for what's planned vs. shipped.</p>
                </div>
              </section>
            }
          }
        </div>

        <!-- Status bar (per Lethean-3 native handoff: 22px tall, mono, Vi state) -->
        <div class="status-bar num">
          <div class="status-left">
            <span class="status-item">
              <span class="vi-status-dot" [class.connected]="vi.connected"></span>
              {{ vi.connected ? 'Vi connected' : 'Vi reconnecting…' }} · {{ vi.latencyMs }}ms
            </span>
            <span class="status-sep">·</span>
            <span class="status-item">{{ vi.watching }} sites</span>
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

    /* Brief grid (per native handoff: 3-col, 10px gap, 6px radius cards, 2px tone strip) */
    .brief-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .brief-card {
      position: relative;
      display: flex;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-sm);
      overflow: hidden;
      transition: background 100ms ease, border-color 100ms ease;
    }

    .brief-card:hover {
      background: var(--ink-3);
      border-color: var(--line-2);
    }

    .tone-strip {
      width: 2px;
      flex-shrink: 0;
      background: var(--ink-5);
    }

    .brief-card[data-tone="warning"] .tone-strip { background: var(--warning-500); }
    .brief-card[data-tone="success"] .tone-strip { background: var(--success-500); }
    .brief-card[data-tone="info"] .tone-strip { background: var(--info-500); }
    .brief-card[data-tone="danger"] .tone-strip { background: var(--danger-500); }
    .brief-card[data-tone="neutral"] .tone-strip { background: var(--ink-5); }

    .brief-body {
      flex: 1;
      padding: 10px 12px 11px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .brief-meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tone-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ink-5);
    }

    .brief-card[data-tone="warning"] .tone-dot { background: var(--warning-500); }
    .brief-card[data-tone="success"] .tone-dot { background: var(--success-500); }
    .brief-card[data-tone="info"] .tone-dot { background: var(--info-500); }
    .brief-card[data-tone="danger"] .tone-dot { background: var(--danger-500); }

    .brief-time {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--fg-3);
    }

    .brief-done {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.05em;
      color: var(--success-400);
      padding: 1px 5px;
      border: 1px solid color-mix(in oklch, var(--success-500) 35%, transparent);
      border-radius: 3px;
    }

    .brief-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.005em;
      margin: 0;
      line-height: 1.3;
    }

    .brief-text {
      font-size: 12px;
      color: var(--fg-2);
      line-height: 1.45;
      margin: 0;
    }

    .brief-actions {
      display: flex;
      gap: 6px;
      margin-top: auto;
      padding-top: 4px;
    }

    .brief-card.done {
      opacity: 0.7;
    }

    /* Sites data-table */
    .sites-table {
      display: flex;
      flex-direction: column;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      overflow: hidden;
    }

    .sites-row {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 1fr 2fr;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      font-size: 12.5px;
      border-top: 1px solid var(--line-1);
      color: var(--fg-1);
    }

    .sites-row:first-child {
      border-top: none;
    }

    .sites-head {
      font-family: var(--font-mono);
      font-size: 10.5px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--fg-4);
      padding-top: 9px;
      padding-bottom: 9px;
      background: color-mix(in oklch, var(--ink-1) 50%, transparent);
    }

    .sites-domain {
      display: inline-flex;
      align-items: center;
      gap: 8px;
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
    .status-dot[data-status="red"]   { background: var(--danger-500); }

    .sites-stack {
      color: var(--fg-3);
      font-size: 12px;
    }

    .sites-deploy {
      color: var(--fg-2);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

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

    /* Activity list */
    .activity-list {
      display: flex;
      flex-direction: column;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      overflow: hidden;
    }

    .activity-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 8px 14px;
      border-top: 1px solid var(--line-1);
      font-size: 12.5px;
    }

    .activity-row:first-child {
      border-top: none;
    }

    .who-badge {
      font-size: 10px;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--ink-3);
      color: var(--fg-3);
    }

    .activity-row[data-tone="success"] .who-badge {
      background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3));
      color: var(--success-400);
    }

    .activity-row[data-tone="warning"] .who-badge {
      background: color-mix(in oklch, var(--warning-500) 18%, var(--ink-3));
      color: var(--warning-400);
    }

    .activity-text {
      color: var(--fg-1);
    }

    .activity-time {
      font-size: 11px;
      color: var(--fg-3);
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

    /* Terminal placeholder (existing surface, tokenised) */
    .terminal-output {
      background: var(--ink-0);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--success-400);
    }

    .terminal-output pre {
      margin: 0;
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

  currentRoute = signal('dashboard');
  currentTime = signal('');

  vi = viFixtures.status;
  briefs: Brief[] = viFixtures.briefs;
  sites: Site[] = viFixtures.sites;
  activity: ActivityItem[] = viFixtures.activity;

  viewKind = computed(() => {
    const route = this.currentRoute();
    if (route === 'dashboard') return 'control-panel';
    if (route === 'terminal') return 'terminal';
    return 'placeholder';
  });

  greenCount = computed(() => this.sites.filter((s) => s.status === 'green').length);

  briefSubtitle = computed(() => {
    const open = this.briefs.filter((b) => !b.done).length;
    return open === 0 ? 'all caught up' : `${open} open · ${this.briefs.length - open} closed today`;
  });

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;

    import('@wailsio/runtime').then(({ Events }) => {
      this.timeEventCleanup = Events.On('time', (time: { data: string }) => {
        this.currentTime.set(time.data);
      });
    });
  }

  ngOnDestroy() {
    this.timeEventCleanup?.();
  }

  onRouteChange(route: string) {
    this.currentRoute.set(route);
  }

  titleForRoute(): string {
    const route = this.currentRoute();
    if (route === 'dashboard') return 'Control Panel';
    if (route === 'ask-vi') return 'Ask Vi';
    if (route.startsWith('site:')) return route.slice('site:'.length);
    return route.charAt(0).toUpperCase() + route.slice(1);
  }

  placeholderHint(): string {
    const route = this.currentRoute();
    if (route === 'explorer') return 'browse the workspace tree';
    if (route === 'search') return 'workspace-wide search';
    if (route === 'git') return 'commits, branches, working tree';
    if (route === 'settings') return 'preferences + brand + platform overrides';
    if (route === 'billing') return 'subscriptions, invoices, payment methods';
    if (route === 'ask-vi') return '⌘K command surface — modal coming soon';
    if (route.startsWith('site:')) return 'per-site detail — uptime, response, recent deploys';
    return 'detail design pending';
  }
}
