import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ManifestService } from '../../services/manifest.service';
import { SitesStore } from '../../services/store/sites.store';

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
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar">
      <!-- Workspace identity -->
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true">
          <img class="vi-avatar-mini" src="/vi/vi-master.png" alt="Vi" />
        </div>
        <div class="brand-meta">
          <span class="brand-name">Lethean Desktop</span>
          <span class="brand-context">snider · homelab</span>
        </div>
      </div>

      <!-- Group: Developer — full feature set, will gate behind a dev-mode
           setting once onboarding flow lands. Today everyone sees everything;
           later this group hides for non-dev personas. -->
      <div class="nav-group">
        <div class="nav-group-title">Developer</div>
        @for (item of developerPanels(); track item.id) {
          <a
            class="nav-row"
            [routerLink]="['/dev', item.route]"
            routerLinkActive="active">
            <span class="nav-icon" [innerHTML]="trustIcon(item.icon)"></span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </div>

      <!-- Group: Plugins — installed marketplace modules that declare a Menu
           extend the IDE frame here. Click navigates to plugin:<code>; sub-pages
           render as nested rows when the plugin row is active. -->
      @if (pluginMenus.length > 0) {
        <div class="nav-group">
          <div class="nav-group-title">Plugins</div>
          @for (p of pluginMenus; track p.code) {
            @if (p.menu) {
              <button
                class="nav-row"
                [class.active]="isPluginActive(p.code)"
                (click)="routeChange.emit(pluginRouteId(p.code))">
                @if (p.menu.icon_svg) {
                  <span class="nav-icon" [innerHTML]="trustIcon(p.menu.icon_svg)"></span>
                } @else {
                  <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg></span>
                }
                <span class="nav-label">{{ p.menu.label }}</span>
              </button>
              @if (isPluginActive(p.code) && p.menu.subpages?.length) {
                @for (s of p.menu.subpages; track s.path) {
                  <button
                    class="nav-row nav-subpage"
                    [class.active]="currentRoute === pluginRouteId(p.code, s.path)"
                    (click)="routeChange.emit(pluginRouteId(p.code, s.path))">
                    <span class="nav-label">— {{ s.label }}</span>
                  </button>
                }
              }
            }
          }
        </div>
      }

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
        @for (item of accountPanels(); track item.id) {
          <a
            class="nav-row"
            [routerLink]="['/dev', item.route]"
            routerLinkActive="active">
            <span class="nav-icon" [innerHTML]="trustIcon(item.icon)"></span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
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
      object-fit: cover;
      border: 1px solid color-mix(in oklch, var(--brand-400) 50%, transparent);
      background: var(--brand-700);
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
      object-fit: cover;
      background: var(--brand-700);
      border: 1px solid color-mix(in oklch, var(--brand-400) 60%, transparent);
      transition: transform 200ms ease;
    }

    .vi-presence:hover .vi-avatar {
      content: url('/vi/vi-peek-1.png');
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

    .nav-subpage {
      padding-left: 28px !important;
      font-size: 12px !important;
      color: var(--fg-3) !important;
    }
    .nav-subpage.active { color: var(--brand-200) !important; background: color-mix(in oklch, var(--brand-500) 10%, transparent) !important; }

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
export class SidebarComponent {
  @Input() currentRoute = 'dashboard';
  @Input() pluginMenus: { code: string; name: string; menu?: { label: string; icon_svg?: string; subpages?: { label: string; path: string }[] } }[] = [];
  @Output() routeChange = new EventEmitter<string>();

  private readonly manifest = inject(ManifestService);
  private readonly sitesStore = inject(SitesStore);

  readonly developerPanels = this.manifest.developerPanels;
  readonly accountPanels = this.manifest.accountPanels;
  readonly sites = this.sitesStore.sites;

  private readonly sanitizer = inject(DomSanitizer);
  private readonly trustedIconCache = new Map<string, SafeHtml>();

  trustIcon(svg: string): SafeHtml {
    let trusted = this.trustedIconCache.get(svg);
    if (!trusted) {
      trusted = this.sanitizer.bypassSecurityTrustHtml(svg);
      this.trustedIconCache.set(svg, trusted);
    }
    return trusted;
  }

  pluginRouteId(code: string, sub?: string): string {
    return sub ? `plugin:${code}:${sub}` : `plugin:${code}`;
  }

  isPluginActive(code: string): boolean {
    const r = this.currentRoute || '';
    return r === `plugin:${code}` || r.startsWith(`plugin:${code}:`);
  }

}
