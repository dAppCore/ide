import { Component, Input, Output, EventEmitter, OnInit, PLATFORM_ID, Inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Site, ViStatus, emptyViStatus, loadViData } from '../../lib/vi.types';

/**
 * Sidebar — Vi Control Panel pattern (Lethean-3 native handoff).
 *
 * Pinned-top: workspace identity + Vi presence card.
 * Body: three groups — Workspace (IDE surfaces), Sites (status-dot per site),
 * Account.
 * Pinned-bottom: settings.
 *
 * Width: 240px on Darwin (per native handoff). Adjusts via [data-platform].
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="sidebar">
      <!-- Workspace identity -->
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true">
          <!-- Vi avatar placeholder — will swap to <Vi> component when assets land in repo -->
          <div class="vi-avatar-mini"></div>
        </div>
        <div class="brand-meta">
          <span class="brand-name">Lethean Desktop</span>
          <span class="brand-context">snider · homelab</span>
        </div>
      </div>

      <!-- Vi presence card -->
      <div class="vi-presence">
        <div class="vi-presence-row">
          <div class="vi-avatar"></div>
          <div class="vi-presence-text">
            <span class="vi-status-dot" [class.connected]="vi().connected"></span>
            <span class="vi-status-line">
              {{ vi().connected ? 'Vi connected' : 'Vi reconnecting…' }} · {{ vi().latencyMs }}ms
            </span>
            <span class="vi-presence-sub">
              Watching {{ vi().watching }} {{ vi().watching === 1 ? 'site' : 'sites' }}{{ vi().pending > 0 ? ' · ' + vi().pending + ' pending' : '' }}
            </span>
          </div>
        </div>
        <button class="vi-ask" (click)="onAskVi()">
          <span class="kbd">⌘K</span>
          <span class="vi-ask-label">Ask Vi anything</span>
        </button>
      </div>

      <!-- Group: Workspace -->
      <div class="nav-group">
        <div class="nav-group-title">Workspace</div>
        @for (item of workspaceItems; track item.id) {
          <button
            class="nav-row"
            [class.active]="currentRoute === item.id"
            (click)="routeChange.emit(item.id)">
            <span class="nav-icon" [innerHTML]="item.iconSvg"></span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        }
      </div>

      <!-- Group: Sites (status-dot per row, per Lethean-3 native handoff) -->
      <div class="nav-group">
        <div class="nav-group-title">Sites</div>
        @for (site of sites(); track site.domain) {
          <button class="nav-row site-row" [class.active]="currentRoute === 'site:' + site.domain" (click)="routeChange.emit('site:' + site.domain)">
            <span class="status-dot" [attr.data-status]="site.status"></span>
            <span class="nav-label">{{ site.domain }}</span>
          </button>
        }
      </div>

      <!-- Group: Account -->
      <div class="nav-group">
        <div class="nav-group-title">Account</div>
        <button class="nav-row" [class.active]="currentRoute === 'billing'" (click)="routeChange.emit('billing')">
          <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg></span>
          <span class="nav-label">Billing</span>
        </button>
        <button class="nav-row" [class.active]="currentRoute === 'settings'" (click)="routeChange.emit('settings')">
          <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
          <span class="nav-label">Settings</span>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      width: 240px;
      height: 100%;
      flex: 0 0 240px;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: color-mix(in oklch, var(--ink-1) 78%, transparent);
      border-right: 1px solid var(--line-1);
      overflow-y: auto;
    }

    /* Darwin profile: vibrancy effect via backdrop-filter */
    :host-context([data-platform="darwin"]) .sidebar {
      backdrop-filter: blur(40px) saturate(160%);
      -webkit-backdrop-filter: blur(40px) saturate(160%);
    }

    /* Workspace identity */
    .brand-block {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--line-1);
    }

    .brand-mark {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .vi-avatar-mini {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 35% 30%, color-mix(in oklch, var(--brand-300) 70%, transparent), transparent 50%),
        var(--brand-600);
      border: 1px solid color-mix(in oklch, var(--brand-400) 50%, transparent);
    }

    .brand-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .brand-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.01em;
    }

    .brand-context {
      font-size: 11px;
      color: var(--fg-3);
      font-family: var(--font-mono);
    }

    /* Vi presence card */
    .vi-presence {
      margin: 10px 10px 14px;
      padding: 10px;
      background: color-mix(in oklch, var(--brand-500) 12%, transparent);
      border: 1px solid color-mix(in oklch, var(--brand-500) 28%, transparent);
      border-radius: var(--r-md);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .vi-presence-row {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .vi-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      flex-shrink: 0;
      background:
        radial-gradient(circle at 35% 30%, color-mix(in oklch, var(--brand-200) 80%, transparent), transparent 55%),
        radial-gradient(circle at 65% 75%, color-mix(in oklch, var(--brand-700) 80%, transparent), transparent 50%),
        var(--brand-600);
      border: 1px solid color-mix(in oklch, var(--brand-400) 60%, transparent);
    }

    .vi-presence-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .vi-status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ink-5);
      margin-right: 4px;
    }

    .vi-status-dot.connected {
      background: var(--success-500);
      box-shadow: 0 0 0 2px color-mix(in oklch, var(--success-500) 25%, transparent);
    }

    .vi-status-line {
      font-size: 12px;
      color: var(--fg-1);
      font-weight: 500;
    }

    .vi-presence-sub {
      font-size: 11px;
      color: var(--fg-3);
      font-family: var(--font-mono);
    }

    .vi-ask {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: color-mix(in oklch, var(--ink-2) 80%, transparent);
      border: 1px solid var(--line-2);
      border-radius: var(--r-sm);
      color: var(--fg-2);
      transition: background 120ms ease, color 120ms ease;
    }

    .vi-ask:hover {
      background: var(--ink-3);
      color: var(--fg-0);
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

    .vi-ask-label {
      font-size: 12px;
      flex: 1;
      text-align: left;
    }

    /* Nav groups */
    .nav-group {
      padding: 6px 8px 10px;
    }

    .nav-group + .nav-group {
      border-top: 1px solid var(--line-1);
      padding-top: 12px;
    }

    .nav-group-title {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--fg-4);
      padding: 0 8px 6px;
    }

    .nav-row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      height: 30px;
      padding: 0 8px;
      background: transparent;
      border: none;
      border-radius: var(--r-sm);
      color: var(--fg-2);
      font-size: 13px;
      transition: background 100ms ease, color 100ms ease;
      text-align: left;
    }

    /* Darwin profile: tighter row height per native handoff */
    :host-context([data-platform="darwin"]) .nav-row {
      height: 26px;
      font-size: 13px;
    }

    /* iPad profile: 32px row height per native handoff */
    :host-context([data-platform="ipad"]) .nav-row {
      height: 32px;
    }

    /* iOS profile: 50px row height per native handoff */
    :host-context([data-platform="ios"]) .nav-row {
      height: 50px;
      font-size: 17px;
    }

    .nav-row:hover {
      background: var(--ink-3);
      color: var(--fg-0);
    }

    .nav-row.active {
      background: color-mix(in oklch, var(--brand-500) 26%, transparent);
      color: var(--fg-0);
    }

    .nav-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: inline-flex;
    }

    .nav-icon svg {
      width: 100%;
      height: 100%;
    }

    .nav-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Site rows — status dot replaces icon per native handoff */
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-left: 4px;
    }

    .status-dot[data-status="green"] { background: var(--success-500); }
    .status-dot[data-status="amber"] { background: var(--warning-500); }
    .status-dot[data-status="red"]   { background: var(--danger-500); }

    .site-row .nav-label {
      font-family: var(--font-mono);
      font-size: 12px;
    }
  `]
})
export class SidebarComponent implements OnInit {
  @Input() currentRoute = 'dashboard';
  @Output() routeChange = new EventEmitter<string>();

  private isBrowser: boolean;
  vi = signal<ViStatus>(emptyViStatus);
  sites = signal<Site[]>([]);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;
    loadViData()
      .then((snap) => {
        this.vi.set(snap.status);
        this.sites.set(snap.sites);
      })
      .catch((err) => {
        console.warn('[vi] sidebar loadViData failed:', err);
      });
  }

  workspaceItems = [
    {
      id: 'dashboard',
      label: 'Control Panel',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    },
    {
      id: 'explorer',
      label: 'Explorer',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/></svg>',
    },
    {
      id: 'search',
      label: 'Search',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
    },
    {
      id: 'git',
      label: 'Source Control',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M6 12c0 4 5 6 12 6"/></svg>',
    },
    {
      id: 'terminal',
      label: 'Terminal',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    },
  ];

  onAskVi() {
    // ⌘K command surface — to be wired to a modal in a follow-up
    this.routeChange.emit('ask-vi');
  }
}
