import { Component, signal, OnInit, OnDestroy, PLATFORM_ID, Inject, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation, inject, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ViStatus, emptyViStatus, loadViData } from '../../lib/vi.types';
import { SettingsStore, DEFAULT_SETTINGS, CoreSettings } from '../../services/store/settings.store';
import { PluginMenuStore } from '../../services/store/plugin-menu.store';
import { WorkspaceStore } from '../../services/store/workspace.store';
import { FileEditorStore } from '../../services/store/file-editor.store';
import { SettingsComponent } from '../dev/settings/settings.component';


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
  imports: [CommonModule, SidebarComponent, RouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ViewEncapsulation.None — IdeComponent's styles array carries the
  // panel design system (.repos-card, .market-card, .frg-row, …)
  // shared across every routed child. Default Emulated would attribute-
  // scope them to this component's template, leaving routed children
  // unstyled. Tokens.css and Tailwind already live globally; the
  // panel styles join them.
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="ide-layout">
      <app-sidebar [currentRoute]="currentRoute()" [pluginMenus]="pluginMenus()" (routeChange)="onRouteChange($event)"></app-sidebar>

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

    /* Source Control — git surface */
    .git-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .git-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .git-branch-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-2));
      border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
      border-radius: 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--brand-200);
    }
    .git-ahead { color: var(--success-300); font-weight: 600; }
    .git-behind { color: var(--warn-300); font-weight: 600; }

    .git-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .git-list {
      border-right: 1px solid var(--line-1);
      overflow: auto;
      min-height: 0;
    }
    .git-empty {
      padding: 16px 18px;
      color: var(--fg-3);
      font-style: italic;
      font-size: 12px;
    }
    .git-row {
      display: grid;
      grid-template-columns: 28px 1fr 24px;
      gap: 6px;
      padding: 5px 12px 5px 14px;
      align-items: center;
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-1);
      border-bottom: 1px solid color-mix(in oklch, var(--line-1) 50%, transparent);
    }
    .git-row:hover { background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2)); }
    .git-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); color: var(--fg-0); }
    .git-row.staged .git-status-flag { color: var(--success-300); }
    .git-row.unstaged .git-status-flag { color: var(--warn-300); }
    .git-row.untracked .git-status-flag { color: var(--brand-300); }
    .git-status-flag {
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.05em;
    }
    .git-row-path {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .git-row-btn {
      width: 22px; height: 22px;
      background: transparent;
      border: 1px solid var(--line-2);
      border-radius: 4px;
      color: var(--fg-3);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }
    .git-row-btn:hover { color: var(--fg-0); border-color: var(--brand-300); }

    .git-diff-pane {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .git-diff-header {
      padding: 8px 14px;
      border-bottom: 1px solid var(--line-1);
      background: var(--ink-2);
      flex-shrink: 0;
    }
    .git-diff-path {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-1);
    }
    .git-diff-empty {
      padding: 32px 18px;
      color: var(--fg-4);
      font-style: italic;
      font-size: 12px;
      text-align: center;
    }
    .git-diff-body {
      flex: 1;
      overflow: auto;
      margin: 0;
      padding: 12px 14px;
      background: var(--ink-1);
      color: var(--fg-1);
      font-family: var(--font-mono);
      font-size: 11.5px;
      line-height: 1.5;
      white-space: pre;
      tab-size: 4;
      min-height: 0;
    }

    .git-commit-bar {
      display: flex;
      gap: 8px;
      padding: 10px 18px;
      border-top: 1px solid var(--line-1);
      background: var(--ink-2);
      flex-shrink: 0;
    }
    .git-commit-input {
      flex: 1;
      background: var(--ink-1);
      border: 1px solid var(--line-2);
      border-radius: 5px;
      padding: 6px 10px;
      color: var(--fg-0);
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
    }
    .git-commit-input:focus { border-color: var(--brand-400); }
    .git-message {
      padding: 6px 18px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      border-top: 1px solid color-mix(in oklch, var(--line-1) 50%, transparent);
      flex-shrink: 0;
    }

    /* Search — workspace ripgrep results */
    .search-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .search-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .search-toolbar {
      display: flex;
      gap: 8px;
      padding: 10px 18px;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      border-radius: 5px;
      padding: 6px 10px;
      color: var(--fg-0);
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
    }
    .search-input:focus { border-color: var(--brand-400); }
    .search-error {
      padding: 10px 18px;
      background: color-mix(in oklch, var(--danger-500) 14%, var(--ink-2));
      color: var(--danger-300);
      font-size: 12px;
      flex-shrink: 0;
    }
    .search-empty, .search-summary {
      padding: 10px 18px;
      color: var(--fg-3);
      font-size: 11.5px;
      font-family: var(--font-mono);
      flex-shrink: 0;
    }
    .search-results {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
    .search-row {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      gap: 8px;
      padding: 5px 18px;
      width: 100%;
      background: transparent;
      border: 0;
      border-bottom: 1px solid color-mix(in oklch, var(--line-1) 50%, transparent);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-1);
      align-items: baseline;
    }
    .search-row:hover { background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2)); }
    .search-path { color: var(--brand-200); font-weight: 500; }
    .search-line { color: var(--fg-3); }
    .search-text {
      color: var(--fg-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .search-fullpath {
      color: var(--fg-4);
      font-size: 10px;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      direction: rtl;
      text-align: left;
    }

    /* Explorer — file tree + viewer */
    .explorer-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .explorer-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-3);
      flex-wrap: wrap;
    }
    .crumb {
      background: transparent;
      border: 0;
      color: var(--brand-200);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      font: inherit;
    }
    .crumb:hover { background: var(--ink-2); color: var(--brand-100); }
    .crumb-sep { color: var(--fg-4); }

    .explorer-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: 0;
      overflow: hidden;
    }
    .explorer-grid:not(.has-file) { grid-template-columns: 1fr; }

    .explorer-tree {
      border-right: 1px solid var(--line-1);
      overflow: auto;
      padding: 6px 0;
      min-height: 0;
    }
    .tree-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      font-size: 12.5px;
      font-family: var(--font-mono);
      color: var(--fg-1);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tree-row:hover { background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2)); }
    .tree-row.dir { color: var(--brand-200); }
    .tree-row.file { color: var(--fg-2); }
    .tree-row.file.active {
      background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2));
      color: var(--fg-0);
    }
    .tree-row.up { color: var(--fg-3); border-bottom: 1px solid var(--line-1); margin-bottom: 4px; }
    .tree-row.loading, .tree-row.empty { color: var(--fg-4); font-style: italic; cursor: default; }
    .tree-row.loading:hover, .tree-row.empty:hover { background: transparent; }
    .tree-icon { width: 12px; text-align: center; flex-shrink: 0; opacity: 0.7; }

    /* Tab bar */
    .tab-bar {
      display: flex;
      align-items: stretch;
      background: var(--ink-2);
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
      min-height: 30px;
    }
    .tab-list {
      flex: 1;
      display: flex;
      align-items: stretch;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .tab-list::-webkit-scrollbar { height: 3px; }
    .tab-list::-webkit-scrollbar-thumb { background: var(--line-2); }
    .tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px 6px 12px;
      border-right: 1px solid var(--line-1);
      cursor: pointer;
      max-width: 220px;
      min-width: 80px;
      user-select: none;
      font-size: 11.5px;
      font-family: var(--font-mono);
      color: var(--fg-2);
      background: var(--ink-2);
      flex-shrink: 0;
      position: relative;
    }
    .tab:hover { background: var(--ink-3); color: var(--fg-1); }
    .tab.active {
      background: var(--ink-1);
      color: var(--fg-0);
      box-shadow: inset 0 2px 0 0 var(--brand-400);
    }
    .tab-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tab-dirty {
      width: 8px;
      color: var(--brand-300);
      font-size: 13px;
      line-height: 1;
      visibility: hidden;
      flex-shrink: 0;
    }
    .tab-dirty.show { visibility: visible; }
    .tab-close {
      width: 16px;
      height: 16px;
      background: transparent;
      border: 0;
      border-radius: 3px;
      color: var(--fg-3);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }
    .tab-close:hover {
      background: var(--ink-3);
      color: var(--fg-0);
    }
    .tab-close-all {
      padding: 0 12px;
      background: transparent;
      border: 0;
      border-left: 1px solid var(--line-1);
      color: var(--fg-3);
      font-size: 11px;
      font-family: var(--font-mono);
      cursor: pointer;
      flex-shrink: 0;
    }
    .tab-close-all:hover { color: var(--fg-0); background: var(--ink-3); }
    .tab-close-all:disabled { opacity: 0.3; cursor: default; }

    .explorer-viewer {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .viewer-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      border-bottom: 1px solid var(--line-1);
      background: var(--ink-2);
      flex-shrink: 0;
    }
    .viewer-path {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      direction: rtl;
      text-align: left;
    }
    .viewer-lang {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--fg-4);
      background: var(--ink-3);
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .viewer-dirty {
      color: var(--brand-300);
      font-size: 16px;
      line-height: 1;
      margin-right: 4px;
    }
    .viewer-save {
      padding: 3px 10px;
      background: var(--brand-500);
      color: var(--fg-0);
      border: 1px solid var(--brand-400);
      border-radius: 4px;
      font: 500 11px / 1 inherit;
      cursor: pointer;
    }
    .viewer-save:hover {
      background: color-mix(in oklch, var(--brand-500) 90%, white);
    }
    .viewer-close {
      width: 22px;
      height: 22px;
      background: transparent;
      border: 1px solid var(--line-2);
      border-radius: 4px;
      color: var(--fg-3);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
    .viewer-close:hover { color: var(--fg-0); border-color: var(--line-1); }
    .viewer-monaco {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
    }
    .viewer-monaco lethean-monaco {
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .viewer-body {
      flex: 1;
      margin: 0;
      padding: 14px 18px;
      overflow: auto;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.55;
      color: var(--fg-1);
      background: var(--ink-1);
      white-space: pre;
      tab-size: 2;
      min-height: 0;
    }
    .viewer-body code { font: inherit; color: inherit; }

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

    /* TS panel */
    .ts-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .ts-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ts-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ts-filter { flex: 1; background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 10px; border-radius: 5px; font-size: 12px; }
    .ts-filter:focus { border-color: var(--brand-400); outline: none; }
    .ts-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .ts-side { width: 320px; border-right: 1px solid var(--line-1); padding: 12px 10px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .ts-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; padding: 0 4px; }
    .ts-row { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; width: 100%; padding: 7px 9px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 3px; }
    .ts-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .ts-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .ts-name { font-size: 12px; color: var(--fg-1); font-weight: 600; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .ts-tag { font-size: 8px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .ts-tag.deno { background: color-mix(in oklch, #34d399 20%, var(--ink-1)); color: #34d399; }
    .ts-tag.ws { background: color-mix(in oklch, #a78bfa 20%, var(--ink-1)); color: #a78bfa; }
    .ts-meta { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .ts-fw { padding: 1px 5px; border-radius: 3px; background: var(--ink-1); color: var(--fg-3); font-size: 9px; }
    .ts-main { flex: 1; padding: 16px 20px; overflow-y: auto; min-width: 0; }
    .ts-detail h3 { font-size: 16px; color: var(--fg-1); margin: 0 0 4px; display: flex; align-items: baseline; gap: 8px; }
    .ts-detail h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 18px 0 8px; }
    .ts-version { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); font-weight: 400; }
    .ts-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); display: block; margin-bottom: 12px; }
    .ts-desc { color: var(--fg-2); font-size: 13px; line-height: 1.4; margin: 6px 0 14px; }
    .ts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px; }
    .ts-cell { display: flex; flex-direction: column; gap: 2px; padding: 7px 10px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; }
    .ts-cell code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-1); }
    .ts-cell .ok { color: #34d399; }
    .ts-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); }
    .ts-fw-list { display: flex; flex-wrap: wrap; gap: 5px; }
    .ts-fw-pill { font-size: 11px; padding: 3px 9px; background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1)); color: var(--brand-200); border-radius: 999px; font-family: var(--font-mono); }
    .ts-scripts { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 6px; }
    .ts-script { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; padding: 8px 12px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; cursor: pointer; text-align: left; }
    .ts-script:hover { border-color: var(--brand-400); background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .ts-script-name { font-family: var(--font-mono); font-size: 12px; color: var(--brand-200); }
    .ts-script-cmd { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .ts-empty, .ts-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .ts-empty-pane { padding: 30px; text-align: center; }

    /* PHP scripts grid (symmetric to TS scripts) */
    .php-script-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin: 6px 0 14px; }
    .php-script-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; padding: 8px 10px; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; flex-direction: column; gap: 3px; position: relative; }
    .php-script-card:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 6%, var(--ink-2)); }
    .php-script-name { font-size: 12px; font-weight: 600; color: var(--fg-1); font-family: var(--font-mono); }
    .php-script-lines { position: absolute; top: 6px; right: 8px; font-size: 9px; color: var(--brand-200); font-family: var(--font-mono); }
    .php-script-cmd { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .php-grid-meta { color: var(--fg-3); font-weight: normal; font-size: 11px; }

    /* PHP panel */
    .php-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .php-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .php-error { padding: 8px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 12px; }
    .php-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .php-side { width: 260px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .php-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .php-row { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; width: 100%; padding: 8px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .php-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .php-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .php-name { font-size: 12px; color: var(--fg-1); font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .php-tag { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: color-mix(in oklch, #a78bfa 18%, var(--ink-1)); color: #a78bfa; text-transform: uppercase; letter-spacing: 0.04em; }
    .php-url { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .php-main { flex: 1; padding: 16px 20px; overflow-y: auto; min-width: 0; }
    .php-empty, .php-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .php-empty-pane { padding: 30px; text-align: center; }
    .php-detail h3 { font-size: 16px; color: var(--fg-1); margin: 0 0 4px; }
    .php-detail h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 18px 0 8px; }
    .php-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); display: block; margin-bottom: 14px; }
    .php-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin-bottom: 6px; }
    .php-cell { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; }
    .php-cell code { font-family: var(--font-mono); }
    .php-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); }
    .php-cell > span:not(.php-label) { font-size: 12px; color: var(--fg-1); }
    .php-services { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-service { font-size: 11px; padding: 3px 9px; background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1)); color: var(--brand-200); border-radius: 999px; font-family: var(--font-mono); }
    .php-state-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-state { font-size: 10px; font-family: var(--font-mono); padding: 3px 8px; border-radius: 4px; background: var(--ink-1); color: var(--fg-3); }
    .php-state.ok { background: color-mix(in oklch, #34d399 12%, var(--ink-1)); color: #34d399; }
    .php-state.warn { background: color-mix(in oklch, #fbbf24 12%, var(--ink-1)); color: #fbbf24; }
    .php-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-hint { font-size: 11px; color: var(--fg-3); font-style: italic; margin-top: 8px; }

    /* DevOps panel */
    .dvo-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .dvo-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .dvo-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .dvo-tabs { display: flex; gap: 4px; }
    .dvo-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .dvo-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .dvo-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .dvo-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .dvo-scan-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--line-1); }
    .dvo-input { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 10px; border-radius: 5px; font-size: 12px; min-width: 200px; }
    .dvo-target { font-size: 11px; color: var(--fg-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-target code { font-family: var(--font-mono); color: var(--fg-2); }
    .dvo-error { color: #f87171; font-size: 12px; padding: 8px 12px; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-radius: 4px; margin-bottom: 10px; }
    .dvo-rule-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .dvo-rule-pill { font-size: 10px; font-family: var(--font-mono); padding: 3px 8px; background: color-mix(in oklch, #fbbf24 12%, var(--ink-2)); color: #fbbf24; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
    .dvo-rule-count { background: var(--ink-1); padding: 1px 6px; border-radius: 999px; color: #fbbf24; }
    .dvo-findings { display: flex; flex-direction: column; gap: 4px; }
    .dvo-finding { display: grid; grid-template-columns: 180px 1fr 200px; gap: 10px; align-items: baseline; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-bottom: 1px solid var(--line-1); cursor: pointer; text-align: left; font-size: 12px; }
    .dvo-finding:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .dvo-rule { font-family: var(--font-mono); font-size: 11px; color: #fbbf24; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-file { font-family: var(--font-mono); color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-file code { font-family: inherit; }
    .dvo-line { color: var(--brand-200); }
    .dvo-snippet { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-empty { padding: 30px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .dvo-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .dvo-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); background: var(--ink-2); }
    .dvo-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .dvo-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .dvo-row { cursor: pointer; }
    .dvo-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }

    /* Forge panel */
    .frg-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .frg-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .frg-header code { font-family: var(--font-mono); color: var(--fg-2); }
    .frg-error, .frg-hint { padding: 8px 18px; font-size: 12px; border-bottom: 1px solid var(--line-1); }
    .frg-error { color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); }
    .frg-hint { color: var(--fg-3); font-style: italic; background: color-mix(in oklch, #fbbf24 6%, transparent); font-family: var(--font-mono); font-size: 11px; word-break: break-all; }
    .frg-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .frg-orgs-side { width: 220px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .frg-orgs-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .frg-org-row { display: block; width: 100%; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); margin-bottom: 3px; }
    .frg-org-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .frg-org-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .frg-note-row { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 4px; text-decoration: none; color: var(--fg-2); margin-bottom: 4px; border: 1px solid transparent; }
    .frg-note-row:hover { background: var(--ink-1); border-color: var(--line-1); }
    .frg-note-row.unread { background: color-mix(in oklch, var(--brand-500) 8%, transparent); }
    .frg-note-type { font-size: 9px; text-transform: uppercase; color: var(--brand-200); letter-spacing: 0.04em; }
    .frg-note-title { font-size: 11px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .frg-note-repo { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .frg-empty, .frg-empty-pane { font-size: 11px; color: var(--fg-3); font-style: italic; padding: 10px 6px; }
    .frg-empty-pane { padding: 30px; text-align: center; }
    .frg-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .frg-repos-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line-1); }
    .frg-org-label { font-family: var(--font-mono); font-size: 12px; color: var(--fg-2); }
    .frg-repo-picker { background: var(--ink-2); color: var(--fg-1); border: 1px solid var(--line-2); padding: 6px 10px; border-radius: 5px; font-size: 12px; min-width: 240px; }
    .frg-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .frg-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .frg-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .frg-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .frg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .frg-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .frg-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .frg-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .frg-table a { color: var(--brand-200); text-decoration: none; }
    .frg-table a:hover { text-decoration: underline; }
    .frg-title { color: var(--fg-1); }
    .frg-draft { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: var(--ink-1); color: var(--fg-3); margin-left: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .frg-state { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .frg-state.open { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .frg-state.closed { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .frg-state.merged { background: color-mix(in oklch, #a78bfa 18%, var(--ink-1)); color: #a78bfa; }

    /* Tenant panel */
    .tnt-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .tnt-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .tnt-status { padding: 10px 18px; border-bottom: 1px solid var(--line-1); display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .tnt-status.online { background: color-mix(in oklch, #34d399 6%, transparent); }
    .tnt-status.offline { background: color-mix(in oklch, var(--fg-3) 6%, transparent); }
    .tnt-status-row { display: flex; align-items: center; gap: 10px; }
    .tnt-status-pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em; background: var(--ink-1); color: var(--fg-3); font-family: var(--font-mono); }
    .tnt-status.online .tnt-status-pill { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .tnt-status.offline .tnt-status-pill { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .tnt-status-detail { font-size: 12px; color: var(--fg-2); flex: 1; }
    .tnt-status-detail code { font-family: var(--font-mono); color: var(--fg-1); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; }
    .tnt-status-hint { font-size: 11px; color: var(--fg-3); font-style: italic; padding-left: 4px; }
    .tnt-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
    .tnt-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    .tnt-card h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0; }
    .tnt-form-row { display: flex; gap: 8px; }
    .tnt-form-grid { display: grid; grid-template-columns: 1fr 1fr 100px; gap: 8px; }
    .tnt-form-grid label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--fg-3); }
    .tnt-input { background: var(--ink-1); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 9px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); flex: 1; }
    .tnt-input:focus { border-color: var(--brand-400); outline: none; }
    .tnt-input.num { width: 80px; flex: 0 0 80px; }
    .tnt-error { color: #f87171; font-size: 12px; padding: 6px 10px; background: color-mix(in oklch, #f87171 8%, var(--ink-1)); border-radius: 4px; font-family: var(--font-mono); }
    .tnt-result { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 10px 12px; margin: 0; max-height: 280px; overflow-y: auto; background: var(--ink-1); border: 1px solid var(--line-1); border-radius: 5px; color: var(--fg-2); white-space: pre-wrap; }
    .tnt-can-result { padding: 10px 12px; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; }
    .tnt-can-result.allowed { background: color-mix(in oklch, #34d399 8%, var(--ink-1)); border: 1px solid color-mix(in oklch, #34d399 30%, var(--line-1)); }
    .tnt-can-result.denied { background: color-mix(in oklch, #f87171 8%, var(--ink-1)); border: 1px solid color-mix(in oklch, #f87171 30%, var(--line-1)); }
    .tnt-can-verdict { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .tnt-can-pill { font-family: var(--font-mono); font-size: 10px; padding: 3px 10px; border-radius: 4px; font-weight: 700; }
    .tnt-can-result.allowed .tnt-can-pill { background: #34d399; color: #064e3b; }
    .tnt-can-result.denied .tnt-can-pill { background: #f87171; color: #7f1d1d; }
    .tnt-can-reason { font-size: 12px; color: var(--fg-2); font-style: italic; }
    .tnt-can-meta { font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); }

    /* Store panel */
    .str-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .str-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .str-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .str-tabs { display: flex; gap: 4px; }
    .str-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .str-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .str-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .str-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .str-side { width: 280px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .str-files-side { width: 320px; }
    .str-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .str-row { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; width: 100%; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .str-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .str-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .str-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 600; }
    .str-count { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .str-file-name { font-family: var(--font-mono); font-size: 11px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .str-file-meta { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .str-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .str-empty, .str-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .str-empty-pane { padding: 30px; text-align: center; }
    .str-group-head { font-family: var(--font-mono); font-size: 13px; color: var(--fg-1); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-1); }
    .str-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .str-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .str-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); vertical-align: top; }
    .str-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); word-break: break-all; }
    .str-actions { width: 50px; text-align: right; }
    .str-file-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-1); }
    .str-file-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; }
    .str-file-preview { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 12px 14px; margin: 0; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; color: var(--fg-2); white-space: pre-wrap; max-height: 600px; overflow-y: auto; }

    /* Data panel */
    .data-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .data-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .data-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .data-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .data-tables-side { width: 200px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; }
    .data-tables-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .data-backend-picker { display: flex; gap: 4px; margin-bottom: 6px; }
    .data-backend-btn { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 6px 8px; background: var(--ink-2); border: 1px solid var(--line-2); border-radius: 5px; cursor: pointer; text-align: left; }
    .data-backend-btn:hover { border-color: var(--brand-400); }
    .data-backend-btn.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); }
    .data-backend-name { font-size: 11px; font-weight: 600; color: var(--fg-1); }
    .data-backend-meta { font-size: 9px; color: var(--fg-3); }
    .data-backend-path { font-size: 9px; color: var(--fg-3); margin-bottom: 8px; word-break: break-all; }
    .data-backend-path code { font-family: var(--font-mono); }
    .data-table-row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 8px 10px; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .data-table-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .data-table-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); }
    .data-table-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 600; }
    .data-table-meta { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .data-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .data-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .data-count { font-size: 12px; color: var(--fg-2); }
    .data-form { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
    .data-form h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 10px; }
    .data-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-bottom: 10px; }
    .data-form-label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--fg-3); }
    .data-input { background: var(--ink-1); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 9px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); }
    .data-input:focus { border-color: var(--brand-400); outline: none; }
    .data-hint { font-size: 10px; color: var(--fg-3); margin-left: 10px; font-style: italic; }
    .data-grid-wrap { overflow-x: auto; border: 1px solid var(--line-1); border-radius: 8px; }
    .data-grid { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-grid th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); background: var(--ink-2); border-bottom: 1px solid var(--line-1); }
    .data-grid td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .data-grid td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .data-actions-col { width: 40px; text-align: center; }
    .data-empty { text-align: center; color: var(--fg-3); padding: 32px; font-style: italic; font-size: 13px; }

    /* Locales panel */
    .i18n-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .i18n-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .i18n-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .i18n-meta { font-size: 12px; color: var(--fg-3); }
    .i18n-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .i18n-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 18px; }
    .i18n-matrix table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .i18n-matrix th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .i18n-matrix td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .i18n-pkg-col { min-width: 160px; }
    .i18n-baseline-col, .i18n-matrix th:not(.i18n-pkg-col):not(.i18n-baseline-col) { text-align: center; min-width: 70px; }
    .i18n-pkg-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 500; }
    .i18n-baseline { font-family: var(--font-mono); color: var(--fg-2); text-align: center; }
    .i18n-cell { font-family: var(--font-mono); text-align: center; cursor: pointer; transition: background 0.15s; }
    .i18n-cell.present { color: var(--fg-2); }
    .i18n-cell.present:hover { background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2)); }
    .i18n-cell.complete { background: color-mix(in oklch, #34d399 8%, transparent); }
    .i18n-cell.partial { background: color-mix(in oklch, #fbbf24 8%, transparent); }
    .i18n-cell.over { background: color-mix(in oklch, #93c5fd 8%, transparent); }
    .i18n-cell.active { background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2)) !important; outline: 1px solid var(--brand-400); }
    .i18n-cell.missing { color: var(--fg-3); cursor: default; opacity: 0.4; }
    .i18n-cell-keys { font-weight: 500; }
    .i18n-cell-gap { font-size: 10px; color: #fbbf24; margin-left: 4px; }
    .i18n-cell-extra { font-size: 10px; color: #93c5fd; margin-left: 4px; }
    .i18n-empty { text-align: center; color: var(--fg-3); padding: 32px; font-style: italic; }
    .i18n-viewer { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; }
    .i18n-viewer-head { padding: 10px 14px; border-bottom: 1px solid var(--line-1); display: flex; gap: 10px; align-items: center; }
    .i18n-viewer-title { font-size: 13px; color: var(--fg-1); }
    .i18n-viewer-path { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); margin-left: auto; }
    .i18n-viewer-body { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 14px 16px; margin: 0; max-height: 400px; overflow-y: auto; color: var(--fg-2); white-space: pre-wrap; }

    /* Cache freshness pill — shared across cache-aware panels */
    .cache-pill { display: inline-block; margin-left: 12px; font-size: 10px; font-weight: normal; padding: 2px 8px; border-radius: 4px; background: var(--ink-2); color: var(--brand-200); font-family: var(--font-mono); cursor: pointer; vertical-align: middle; letter-spacing: 0.04em; }
    .cache-pill.cache-fresh { color: #34d399; background: color-mix(in oklch, #34d399 12%, var(--ink-2)); cursor: default; }
    .cache-pill.cache-stale { color: #fbbf24; background: color-mix(in oklch, #fbbf24 12%, var(--ink-2)); }
    .cache-pill:hover:not(.cache-fresh) { background: color-mix(in oklch, var(--brand-200) 16%, var(--ink-2)); }

    /* Cache panel */
    .ch-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .ch-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ch-header code { font-size: 10px; }
    .ch-toolbar { padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ch-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .ch-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .ch-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .ch-table td { padding: 8px 10px; border-bottom: 1px solid var(--line-1); vertical-align: middle; }
    .ch-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); }
    .ch-stale { background: color-mix(in oklch, #fbbf24 6%, transparent); }
    .ch-actions-col { width: 120px; text-align: right; }
    .ch-actions-col .btn { padding: 2px 8px; font-size: 11px; }

    /* Mantis panel */
    .mn-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .mn-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .mn-toolbar { display: flex; gap: 12px; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; align-items: center; flex-wrap: wrap; }
    .mn-status-pills { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
    .mn-status-pill { background: var(--ink-2); border: 1px solid var(--line-1); color: var(--fg-2); padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font: inherit; display: flex; gap: 6px; align-items: center; }
    .mn-status-pill:hover { border-color: var(--brand-200); }
    .mn-status-pill.active { background: var(--brand-200); color: var(--ink-1); border-color: var(--brand-200); }
    .mn-pill-count { font-family: var(--font-mono); font-size: 10px; opacity: 0.7; }
    .mn-body { display: grid; grid-template-columns: 360px 1fr; gap: 0; flex: 1; min-height: 0; overflow: hidden; }
    .mn-list { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .mn-row { width: 100%; padding: 10px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; flex-direction: column; gap: 4px; }
    .mn-row:hover { background: var(--ink-2); }
    .mn-row.active { background: var(--ink-2); border-left-color: var(--brand-200); }
    .mn-row-head { display: flex; gap: 6px; align-items: center; }
    .mn-id { font-family: var(--font-mono); font-size: 11px; color: var(--brand-200); }
    .mn-id-large { font-size: 16px; }
    .mn-status { font-size: 9px; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; background: var(--ink-1); color: var(--fg-3); }
    .mn-status[data-status="new"] { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .mn-status[data-status="acknowledged"], .mn-status[data-status="confirmed"] { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .mn-status[data-status="assigned"] { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .mn-status[data-status="resolved"], .mn-status[data-status="closed"] { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }
    .mn-status[data-status="feedback"] { background: color-mix(in oklch, #c4b5fd 18%, var(--ink-1)); color: #c4b5fd; }
    .mn-project { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .mn-summary { font-size: 12px; color: var(--fg-1); line-height: 1.4; }
    .mn-meta { font-size: 10px; color: var(--fg-3); display: flex; gap: 8px; }
    .mn-updated { font-family: var(--font-mono); margin-left: auto; }
    .mn-detail { overflow-y: auto; padding: 18px; }
    .mn-detail-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
    .mn-web-link { color: var(--brand-200); text-decoration: none; font-size: 11px; margin-left: auto; }
    .mn-web-link:hover { text-decoration: underline; }
    .mn-detail-summary { font-size: 16px; color: var(--fg-1); margin: 0 0 10px; line-height: 1.4; }
    .mn-detail-meta { font-size: 11px; color: var(--fg-3); margin-bottom: 16px; }
    .mn-detail-meta code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); padding: 0 4px; background: var(--ink-2); border-radius: 3px; }
    .mn-section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 14px 0 6px; }
    .mn-description, .mn-note-text { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); white-space: pre-wrap; word-break: break-word; padding: 10px 12px; background: var(--ink-2); border-radius: 6px; margin: 0; line-height: 1.5; }
    .mn-path-link { color: var(--brand-200); cursor: pointer; text-decoration: underline; text-decoration-color: color-mix(in oklch, var(--brand-200) 40%, transparent); }
    .mn-path-link:hover { background: color-mix(in oklch, var(--brand-200) 14%, transparent); text-decoration-color: var(--brand-200); }
    .mn-note { margin-bottom: 10px; }
    .mn-note-head { display: flex; gap: 8px; font-size: 10px; color: var(--fg-3); margin-bottom: 4px; }
    .mn-note-author { color: var(--fg-2); }
    .mn-note-when { font-family: var(--font-mono); margin-left: auto; }
    .mn-recent-strip { padding: 10px 18px; border-bottom: 1px solid var(--line-1); background: var(--ink-2); flex-shrink: 0; }
    .mn-recent-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin-bottom: 6px; }
    .mn-recent-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
    .mn-recent-pill { background: var(--ink-1); border: 1px solid var(--line-1); padding: 5px 10px; border-radius: 4px; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .mn-recent-pill:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 6%, var(--ink-1)); }
    .mn-recent-summary { font-size: 11px; color: var(--fg-1); }
    .mn-recent-when { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }

    /* Memory panel */
    .mem-recent-strip { padding: 10px 18px; border-bottom: 1px solid var(--line-1); background: var(--ink-2); flex-shrink: 0; }
    .mem-recent-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin-bottom: 6px; }
    .mem-recent-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
    .mem-recent-pill { background: var(--ink-1); border: 1px solid var(--line-1); padding: 5px 10px; border-radius: 4px; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .mem-recent-pill:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 6%, var(--ink-1)); }
    .mem-recent-type { font-size: 9px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; background: var(--ink-2); color: var(--fg-3); }
    .mem-recent-type[data-type="project"] { background: color-mix(in oklch, #34d399 18%, var(--ink-2)); color: #34d399; }
    .mem-recent-type[data-type="feedback"] { background: color-mix(in oklch, #fbbf24 18%, var(--ink-2)); color: #fbbf24; }
    .mem-recent-type[data-type="reference"] { background: color-mix(in oklch, #93c5fd 18%, var(--ink-2)); color: #93c5fd; }
    .mem-recent-type[data-type="user"] { background: color-mix(in oklch, #c4b5fd 18%, var(--ink-2)); color: #c4b5fd; }
    .mem-recent-type[data-type="design"] { background: color-mix(in oklch, #fb7185 18%, var(--ink-2)); color: #fb7185; }
    .mem-recent-name { font-size: 11px; color: var(--fg-1); }
    .mem-recent-when { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .mem-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .mem-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .mem-header code { font-size: 10px; }
    .mem-toolbar { display: flex; gap: 12px; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; align-items: center; flex-wrap: wrap; }
    .mem-filter { flex: 0 0 280px; }
    .mem-sort { flex: 0 0 150px; margin-left: auto; }
    .mem-type-pills { display: flex; flex-wrap: wrap; gap: 4px; }
    .mem-type-pill { background: var(--ink-2); border: 1px solid var(--line-1); color: var(--fg-2); padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font: inherit; display: flex; gap: 6px; align-items: center; }
    .mem-type-pill:hover { border-color: var(--brand-200); }
    .mem-type-pill.active { background: var(--brand-200); color: var(--ink-1); border-color: var(--brand-200); }
    .mem-type-count { font-family: var(--font-mono); font-size: 10px; opacity: 0.7; }
    .mem-body { flex: 1; overflow-y: auto; padding: 12px 18px; }
    .mem-empty { padding: 24px; font-size: 13px; color: var(--fg-3); text-align: center; }
    .mem-list-summary { font-size: 10px; color: var(--fg-3); padding: 0 4px 8px; text-transform: uppercase; letter-spacing: 0.06em; }
    .mem-row { width: 100%; display: grid; grid-template-columns: 80px 1fr; gap: 12px; align-items: flex-start; padding: 10px 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; margin-bottom: 6px; cursor: pointer; text-align: left; font: inherit; color: var(--fg-2); }
    .mem-row:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 4%, var(--ink-2)); }
    .mem-row-type { background: var(--ink-1); color: var(--fg-3); font-size: 9px; padding: 3px 7px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; text-align: center; align-self: start; margin-top: 2px; }
    .mem-row-type[data-type="project"] { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .mem-row-type[data-type="feedback"] { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .mem-row-type[data-type="reference"] { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .mem-row-type[data-type="user"] { background: color-mix(in oklch, #c4b5fd 18%, var(--ink-1)); color: #c4b5fd; }
    .mem-row-type[data-type="design"] { background: color-mix(in oklch, #fb7185 18%, var(--ink-1)); color: #fb7185; }
    .mem-row-body { min-width: 0; }
    .mem-row-name { font-size: 13px; font-weight: 600; color: var(--fg-1); }
    .mem-row-desc { font-size: 11px; color: var(--fg-2); margin-top: 4px; line-height: 1.4; }
    .mem-row-meta { font-size: 10px; color: var(--fg-3); margin-top: 4px; display: flex; gap: 6px; }
    .mem-row-meta code { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .mem-search-hit { width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; margin-bottom: 6px; cursor: pointer; text-align: left; font: inherit; color: var(--fg-2); }
    .mem-search-hit:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 4%, var(--ink-2)); }
    .mem-search-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .mem-search-name { font-size: 12px; font-weight: 600; color: var(--fg-1); }
    .mem-search-line { color: var(--fg-3); }
    .mem-search-line code { font-family: var(--font-mono); font-size: 11px; }
    .mem-search-match { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); margin: 0; padding: 6px 8px; background: var(--ink-1); border-radius: 4px; white-space: pre-wrap; word-break: break-word; }

    /* Stream panel */
    .stream-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .stream-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-stat { background: var(--ink-2); padding: 10px 12px; border-radius: 6px; }
    .stream-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-3); }
    .stream-stat-value { font-size: 18px; font-weight: 500; color: var(--fg-1); margin-top: 4px; font-family: var(--font-mono); }
    .stream-ok { color: #34d399; }
    .stream-warn { color: #fbbf24; }
    .stream-body { display: grid; grid-template-columns: 240px 1fr; gap: 0; flex: 1; min-height: 0; overflow: hidden; }
    .stream-channels { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .stream-list-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); padding: 0 14px 8px; display: flex; justify-content: space-between; align-items: center; }
    .stream-refresh { padding: 2px 6px; font-size: 11px; }
    .stream-channel-row { width: 100%; padding: 8px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; justify-content: space-between; align-items: center; }
    .stream-channel-row:hover { background: var(--ink-2); }
    .stream-channel-row.active { background: var(--ink-2); border-left-color: var(--brand-200); color: var(--fg-1); }
    .stream-channel-name { font-size: 12px; font-weight: 500; font-family: var(--font-mono); }
    .stream-channel-meta { font-size: 10px; color: var(--fg-3); display: flex; gap: 4px; }
    .stream-empty { padding: 18px; font-size: 12px; color: var(--fg-3); font-style: italic; text-align: center; }
    .stream-frames { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .stream-frame-list { flex: 1; overflow-y: auto; padding: 0 18px; font-family: var(--font-mono); font-size: 11px; }
    .stream-frame { padding: 6px 0; border-bottom: 1px solid var(--line-1); display: flex; flex-direction: column; gap: 4px; }
    .stream-frame-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .stream-frame-time { color: var(--fg-3); font-size: 11px; min-width: 60px; }
    .stream-frame-bytes { color: var(--brand-200); font-size: 11px; min-width: 40px; text-align: right; }
    .stream-frame-tag { background: color-mix(in oklch, var(--brand-200) 16%, var(--ink-1)); color: var(--brand-200); font-size: 9px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .stream-frame-toggle { background: var(--ink-1); border: 1px solid var(--line-1); color: var(--fg-3); font-size: 9px; padding: 1px 6px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); }
    .stream-frame-toggle:hover { color: var(--fg-1); border-color: var(--brand-200); }
    .stream-frame-jump { background: transparent; border: 1px solid var(--brand-200); color: var(--brand-200); font-size: 10px; padding: 1px 6px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); margin-left: auto; }
    .stream-frame-jump:hover { background: color-mix(in oklch, var(--brand-200) 14%, transparent); }
    .stream-frame-text { color: var(--fg-2); white-space: pre-wrap; word-break: break-all; font-size: 11px; }
    .stream-frame-pretty { color: var(--fg-2); white-space: pre; overflow-x: auto; font-size: 10px; padding: 6px 8px; background: var(--ink-1); border-radius: 4px; margin: 0; line-height: 1.4; }
    .stream-frame-json .stream-frame-time { color: var(--brand-200); }
    .stream-publish { padding: 14px 18px; border-top: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-publish-row { display: flex; gap: 8px; align-items: center; }
    .stream-mode-select { width: 110px; flex-shrink: 0; }
    .stream-channel-input { width: 160px; flex-shrink: 0; }
    .stream-frame-input { flex: 1; }

    /* Sessions panel */
    .sess-tabs { display: flex; gap: 0; padding: 0 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .sess-tab { padding: 8px 14px; background: transparent; border: 0; border-bottom: 2px solid transparent; color: var(--fg-2); font: inherit; font-size: 12px; cursor: pointer; display: flex; gap: 6px; align-items: center; }
    .sess-tab:hover { color: var(--fg-1); }
    .sess-tab.active { color: var(--fg-1); border-bottom-color: var(--brand-200); }
    .sess-tab-count { font-family: var(--font-mono); font-size: 10px; color: var(--brand-200); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; }
    .sess-active-mode { grid-template-columns: 320px 1fr !important; }
    .sess-active-list { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .sess-active-row { width: 100%; padding: 10px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: block; }
    .sess-active-row:hover { background: var(--ink-2); }
    .sess-active-row.active { background: var(--ink-2); border-left-color: var(--brand-200); }
    .sess-active-head { display: flex; justify-content: space-between; align-items: center; }
    .sess-active-id { font-family: var(--font-mono); font-size: 11px; color: var(--brand-200); }
    .sess-active-age { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .sess-active-fresh { color: #34d399; font-weight: 500; }
    .sess-active-proj { font-size: 11px; color: var(--fg-1); margin-top: 4px; word-break: break-all; }
    .sess-active-meta { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); margin-top: 2px; }
    .sess-search-list { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .sess-search-hit { width: calc(100% - 20px); margin: 4px 10px; padding: 8px 12px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; cursor: pointer; font: inherit; color: var(--fg-2); text-align: left; display: flex; flex-direction: column; gap: 6px; }
    .sess-search-hit:hover { border-color: var(--brand-200); }
    .sess-search-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .sess-search-when { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .sess-search-tool { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: color-mix(in oklch, var(--brand-200) 16%, var(--ink-1)); color: var(--brand-200); text-transform: uppercase; letter-spacing: 0.04em; }
    .sess-search-match { font-family: var(--font-mono); font-size: 10px; color: var(--fg-2); margin: 0; padding: 6px 8px; background: var(--ink-1); border-radius: 4px; white-space: pre-wrap; word-break: break-all; }

    .sess-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .sess-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .sess-toolbar { display: flex; gap: 8px; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; align-items: center; }
    .sess-filter { flex: 1; max-width: 320px; }
    .sess-body { display: grid; grid-template-columns: 240px 280px 1fr; gap: 0; flex: 1; min-height: 0; overflow: hidden; }
    .sess-projects, .sess-list { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .sess-list-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); padding: 0 14px 8px; }
    .sess-spin { color: var(--brand-200); }
    .sess-empty { padding: 18px; font-size: 12px; color: var(--fg-3); font-style: italic; text-align: center; }
    .sess-project-row, .sess-row { width: 100%; padding: 8px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: block; }
    .sess-project-row:hover, .sess-row:hover { background: var(--ink-2); }
    .sess-project-row.active, .sess-row.active { background: var(--ink-2); border-left-color: var(--brand-200); color: var(--fg-1); }
    .sess-project-name { font-size: 12px; font-weight: 500; word-break: break-all; }
    .sess-project-meta { font-size: 10px; color: var(--fg-3); margin-top: 2px; display: flex; gap: 6px; }
    .sess-row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center; }
    .sess-row-id code { font-size: 11px; color: var(--brand-200); }
    .sess-row-meta { font-size: 10px; color: var(--fg-3); display: flex; flex-direction: column; }
    .sess-row-size { color: var(--fg-2); font-family: var(--font-mono); }
    .sess-detail { overflow-y: auto; padding: 18px; }
    .sess-detail-head { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line-1); }
    .sess-detail-title { font-size: 13px; }
    .sess-detail-title code { font-family: var(--font-mono); color: var(--brand-200); }
    .sess-detail-sub { font-size: 11px; color: var(--fg-3); margin-top: 4px; }
    .sess-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .sess-stat { background: var(--ink-2); padding: 10px 12px; border-radius: 6px; }
    .sess-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-3); }
    .sess-stat-value { font-size: 18px; font-weight: 500; color: var(--fg-1); margin-top: 4px; font-family: var(--font-mono); }
    .sess-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin-bottom: 8px; }
    .sess-tail-note { text-transform: none; letter-spacing: 0; font-style: italic; color: var(--fg-3); }
    .sess-tools-section { margin-bottom: 18px; }
    .sess-tools-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .sess-tool-pill { display: inline-flex; gap: 6px; align-items: center; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; padding: 3px 8px; font-size: 11px; }
    .sess-tool-name { color: var(--fg-2); font-family: var(--font-mono); }
    .sess-tool-count { color: var(--brand-200); font-weight: 500; font-family: var(--font-mono); }
    .sess-events-section { margin-bottom: 18px; }
    .sess-events-list { background: var(--ink-2); border-radius: 6px; padding: 8px; max-height: 400px; overflow-y: auto; font-family: var(--font-mono); font-size: 10px; }
    .sess-event { display: grid; grid-template-columns: 60px 80px 100px 60px 1fr; gap: 6px; padding: 3px 6px; border-bottom: 1px solid var(--line-1); align-items: center; }
    .sess-event-jumpable { cursor: pointer; }
    .sess-event-jumpable:hover { background: color-mix(in oklch, var(--brand-200) 10%, transparent); }
    .sess-event-jumpable .sess-event-input { color: var(--brand-200); }
    .sess-event-error { background: color-mix(in oklch, #fbbf24 8%, transparent); }
    .sess-live-toggle { margin-left: auto; padding: 2px 8px; font-size: 10px; }
    .sess-live-active { background: color-mix(in oklch, #34d399 22%, var(--ink-1)); color: #34d399; border-color: #34d399; }
    .sess-live-count { font-size: 10px; color: #34d399; font-family: var(--font-mono); margin-left: 6px; }
    .sess-live-divider { padding: 6px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #34d399; background: color-mix(in oklch, #34d399 8%, transparent); border-top: 1px solid color-mix(in oklch, #34d399 30%, transparent); border-bottom: 1px solid color-mix(in oklch, #34d399 30%, transparent); }
    .sess-event-live { background: color-mix(in oklch, #34d399 4%, transparent); border-left: 2px solid #34d399; }
    .sess-live-pulse { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #34d399; margin-right: 4px; transition: opacity 0.4s ease, transform 0.4s ease; }
    .sess-live-pulse[data-tick="0"] { opacity: 1; transform: scale(1); }
    .sess-live-pulse[data-tick="1"] { opacity: 0.4; transform: scale(0.7); }
    .sess-live-dropped { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); margin-left: 4px; opacity: 0.7; }
    .sess-event-time { color: var(--fg-3); }
    .sess-event-type { color: var(--brand-200); }
    .sess-event-tool { color: var(--fg-2); }
    .sess-event-dur { color: var(--fg-3); text-align: right; }
    .sess-event-input { color: var(--fg-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Updates panel */
    .self-upd-card { padding: 14px 18px; border-bottom: 1px solid var(--line-1); background: var(--ink-2); flex-shrink: 0; }
    .self-upd-card--update { background: color-mix(in oklch, #fbbf24 8%, var(--ink-2)); border-bottom-color: color-mix(in oklch, #fbbf24 30%, var(--line-1)); }
    .self-upd-row { display: flex; align-items: center; gap: 14px; }
    .self-upd-icon { font-size: 22px; color: var(--brand-200); width: 32px; text-align: center; }
    .self-upd-card--update .self-upd-icon { color: #fbbf24; }
    .self-upd-body { flex: 1; min-width: 0; }
    .self-upd-title { font-size: 14px; font-weight: 600; color: var(--fg-1); }
    .self-upd-meta { font-size: 11px; color: var(--fg-3); margin-top: 3px; }
    .self-upd-meta code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); padding: 0 4px; background: var(--ink-1); border-radius: 3px; }
    .self-upd-meta a { color: var(--brand-200); text-decoration: none; }
    .self-upd-meta a:hover { text-decoration: underline; }
    .self-upd-source { opacity: 0.7; }
    .self-upd-hint { color: var(--fg-3); font-style: italic; }
    .self-upd-err { color: #fbbf24; font-size: 10px; }
    .self-upd-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .upd-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .upd-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .upd-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .upd-allgood { color: #34d399; font-size: 12px; }
    .upd-attn { color: #fbbf24; font-size: 12px; font-weight: 500; }
    .upd-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .upd-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .upd-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .upd-table td { padding: 8px 10px; border-bottom: 1px solid var(--line-1); vertical-align: middle; }
    .upd-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); }
    .upd-table a { color: var(--brand-200); text-decoration: none; }
    .upd-table a:hover { text-decoration: underline; }
    .upd-needs { background: color-mix(in oklch, #fbbf24 6%, transparent); }
    .upd-name { font-weight: 600; color: var(--fg-1); font-size: 12px; }
    .upd-desc { font-size: 10px; color: var(--fg-3); margin-top: 2px; }
    .upd-missing { font-size: 11px; color: var(--fg-3); font-style: italic; }
    .upd-unknown { color: var(--fg-3); }
    .upd-pill { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .upd-pill.ok { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .upd-pill.warn { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .upd-pill.missing { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }
    .upd-pill.unknown { background: var(--ink-1); color: var(--fg-3); }
    .upd-actions-col { width: 50px; text-align: right; }

    /* Process panel */
    .proc-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .proc-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .proc-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .proc-tabs { display: flex; gap: 4px; }
    .proc-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .proc-tab:hover { border-color: var(--brand-400); }
    .proc-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .proc-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .proc-tab.active .proc-tab-count { color: var(--brand-200); }
    .proc-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .proc-empty { padding: 32px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .proc-empty code { font-family: var(--font-mono); color: var(--fg-2); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; font-size: 12px; }
    .proc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .proc-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); background: var(--ink-2); }
    .proc-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .proc-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .proc-row { cursor: pointer; }
    .proc-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .proc-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); }
    .proc-cmd { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .proc-status { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; background: var(--ink-1); color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.04em; }
    .proc-status.sev-running { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .proc-status.sev-exited, .proc-status.sev-stopped { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }
    .proc-status.sev-failed, .proc-status.sev-killed { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .proc-actions-col { width: 80px; text-align: right; }
    .proc-output { margin-top: 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; }
    .proc-output-head { padding: 8px 14px; border-bottom: 1px solid var(--line-1); font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); }
    .proc-output pre { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 12px 14px; margin: 0; max-height: 320px; overflow-y: auto; color: var(--fg-2); white-space: pre-wrap; }

    /* Lint panel */
    .lint-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .lint-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .lint-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .lint-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .lint-chip { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 10px; border-radius: 999px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .lint-chip:hover { border-color: var(--brand-400); }
    .lint-chip.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .lint-chip.critical.active { background: color-mix(in oklch, #f87171 26%, var(--ink-2)); border-color: #f87171; }
    .lint-chip.high.active { background: color-mix(in oklch, #fbbf24 22%, var(--ink-2)); border-color: #fbbf24; }
    .lint-chip-count { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); padding: 1px 6px; border-radius: 999px; background: var(--ink-1); }
    .lint-chip.active .lint-chip-count { color: var(--brand-200); }
    .lint-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .lint-meta { padding: 6px 18px; font-size: 11px; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .lint-meta code { font-family: var(--font-mono); color: var(--fg-2); }
    .lint-list { flex: 1; overflow-y: auto; padding: 4px 18px 18px; }
    .lint-row {
      display: grid;
      grid-template-columns: 70px 110px 1fr auto;
      gap: 12px;
      align-items: baseline;
      width: 100%;
      padding: 7px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-bottom: 1px solid var(--line-1);
      cursor: pointer;
      text-align: left;
      font-size: 12px;
      color: var(--fg-1);
    }
    .lint-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .lint-severity {
      font-family: var(--font-mono);
      font-size: 10px;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--ink-1);
      color: var(--fg-3);
      letter-spacing: 0.04em;
    }
    .lint-severity.sev-critical { background: color-mix(in oklch, #f87171 22%, var(--ink-1)); color: #f87171; }
    .lint-severity.sev-high { background: color-mix(in oklch, #fbbf24 22%, var(--ink-1)); color: #fbbf24; }
    .lint-severity.sev-medium { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .lint-severity.sev-low { background: color-mix(in oklch, #34d399 14%, var(--ink-1)); color: #34d399; }
    .lint-severity.sev-info { background: var(--ink-1); color: var(--fg-3); }
    .lint-rule { font-family: var(--font-mono); font-size: 11px; color: var(--brand-200); }
    .lint-title { color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lint-loc { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); white-space: nowrap; }
    .lint-file { color: var(--fg-2); }
    .lint-line { color: var(--brand-200); }
    .lint-empty { padding: 40px; text-align: center; color: var(--fg-3); font-size: 13px; }

    /* Containers panel */
    .ctn-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .ctn-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ctn-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ctn-count { font-size: 11px; color: var(--fg-3); }
    .ctn-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .ctn-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 20px; }
    .ctn-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-2); margin: 0 0 10px; }
    .ctn-runtime-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    .ctn-runtime-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .ctn-runtime-card.unavailable { opacity: 0.5; }
    .ctn-runtime-head { display: flex; justify-content: space-between; align-items: center; }
    .ctn-runtime-name { font-weight: 600; font-size: 13px; color: var(--fg-1); text-transform: capitalize; }
    .ctn-runtime-desc { font-size: 11px; color: var(--fg-3); margin: 0; line-height: 1.4; }
    .ctn-runtime-version { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); background: var(--ink-1); padding: 2px 6px; border-radius: 3px; align-self: flex-start; }
    .ctn-pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em; }
    .ctn-pill.available { background: color-mix(in oklch, #34d399 14%, var(--ink-1)); color: #34d399; }
    .ctn-pill.missing { background: var(--ink-1); color: var(--fg-3); }
    .ctn-caps { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .ctn-cap { font-size: 10px; color: var(--fg-2); background: var(--ink-1); padding: 1px 7px; border-radius: 4px; }
    .ctn-list { display: flex; flex-direction: column; gap: 4px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; padding: 4px; }
    .ctn-row { display: grid; grid-template-columns: 100px 200px 1fr 140px 70px; gap: 10px; padding: 8px 12px; align-items: center; cursor: pointer; border-radius: 4px; font-size: 12px; }
    .ctn-row:hover { background: var(--ink-1); }
    .ctn-row.active { background: color-mix(in oklch, var(--brand-500) 15%, var(--ink-1)); }
    .ctn-row-id { font-family: var(--font-mono); color: var(--fg-3); }
    .ctn-row-name { color: var(--fg-1); font-weight: 500; }
    .ctn-row-image { font-family: var(--font-mono); color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ctn-row-status { color: var(--fg-2); }
    .ctn-row-runtime { font-size: 10px; text-transform: uppercase; color: var(--brand-200); }
    .ctn-empty { padding: 18px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .ctn-logs { background: var(--ink-0); border: 1px solid var(--line-1); border-radius: 6px; padding: 12px 14px; font-family: var(--font-mono); font-size: 11px; line-height: 1.5; color: var(--fg-2); white-space: pre-wrap; max-height: 300px; overflow-y: auto; margin: 0; }

    /* Build panel */
    .build-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .build-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .build-toolbar {
      display: flex;
      gap: 12px;
      padding: 10px 18px;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .build-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .build-type-pill {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 10px;
      border-radius: 999px;
    }
    .build-cmd {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--fg-2);
      background: var(--ink-2);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .build-hint { font-size: 11px; color: var(--fg-3); font-style: italic; }
    .build-actions { display: flex; gap: 6px; }
    .build-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .build-log {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      background: var(--ink-0);
    }
    .build-log pre {
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.5;
      color: var(--fg-2);
      white-space: pre-wrap;
      margin: 0;
    }
    .build-empty, .build-running { color: var(--fg-3); font-style: italic; }

    /* Plugin route — full-surface render of an installed plugin's UI */
    .plugin-route-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .plugin-route-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .plugin-route-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .plugin-route-frame { width: 100%; height: 100%; border: none; background: var(--ink-0); }
    .plugin-route-body .plugin-panel-native { flex: 1; overflow-y: auto; }

    /* Settings */
    .settings-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .settings-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .settings-toolbar {
      display: flex;
      gap: 10px;
      padding: 10px 18px;
      align-items: center;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .settings-saved {
      font-size: 12px;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2));
      padding: 4px 10px;
      border-radius: var(--r-sm);
    }
    .settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .settings-group {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .settings-group-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-1);
      margin: 0;
      letter-spacing: 0.02em;
    }
    .settings-group-hint {
      font-size: 11px;
      color: var(--fg-3);
      margin: -4px 0 4px;
      font-style: italic;
    }
    .settings-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: var(--fg-2);
    }
    .settings-row.stacked {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
    }
    .settings-row.toggle {
      cursor: pointer;
    }
    .settings-row.toggle input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: var(--brand-500);
    }
    .settings-label {
      flex: 1;
      color: var(--fg-1);
    }
    .settings-hint {
      color: var(--fg-3);
      font-weight: 400;
      font-style: italic;
      font-size: 11px;
      margin-left: 6px;
    }
    .settings-input {
      background: var(--ink-1);
      border: 1px solid var(--line-2);
      color: var(--fg-1);
      padding: 6px 10px;
      border-radius: var(--r-sm);
      font-size: 13px;
      font-family: var(--font-sans);
    }
    .settings-input:focus { border-color: var(--brand-400); outline: none; }
    .settings-input.num { width: 80px; font-family: var(--font-mono); }
    .settings-input.textarea {
      font-family: var(--font-mono);
      font-size: 12px;
      resize: vertical;
      min-height: 80px;
    }
    .settings-row select.settings-input { width: 200px; }
    .settings-row.stacked input.settings-input,
    .settings-row.stacked textarea.settings-input { width: 100%; }

    /* Repos dashboard */
    .repos-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .repos-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .repos-toolbar {
      display: flex;
      gap: 10px;
      padding: 12px 18px;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .repos-filters { display: flex; gap: 6px; }
    .repos-chip {
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      color: var(--fg-2);
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: border-color 0.15s, background 0.15s;
    }
    .repos-chip:hover { border-color: var(--brand-400); }
    .repos-chip.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .repos-chip-count {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--ink-1);
    }
    .repos-chip.active .repos-chip-count { color: var(--brand-200); }
    .repos-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .repos-grid {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px;
      align-content: start;
    }
    .repos-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--fg-3);
      padding: 32px;
      font-size: 13px;
    }
    .repos-card {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, transform 0.15s, background 0.15s;
    }
    .repos-card:hover {
      border-color: var(--brand-400);
      transform: translateY(-1px);
    }
    .repos-card.dirty { border-color: color-mix(in oklch, #fbbf24 60%, var(--line-1)); }
    .repos-card.behind { border-color: color-mix(in oklch, #f87171 50%, var(--line-1)); }
    .repos-card.ahead.dirty { border-color: color-mix(in oklch, #fbbf24 60%, var(--line-1)); }
    .repos-card-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .repos-card-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-1);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .repos-card-branch {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      flex-shrink: 0;
    }
    .repos-card-state {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .badge {
      font-family: var(--font-mono);
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--ink-1);
      color: var(--fg-2);
    }
    .badge-staged { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .badge-mod { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .badge-unt { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .badge-ahead { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); color: var(--brand-200); }
    .badge-behind { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .badge-clean { color: var(--fg-3); }
    .repos-card-error {
      font-size: 10px;
      color: #f87171;
      font-family: var(--font-mono);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Plugin embedded panel — Angular Render iframe-as-component */
    .plugin-panel {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
      background: var(--ink-1);
    }
    .plugin-panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 18px;
      background: var(--ink-2);
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .plugin-panel-title { font-size: 13px; font-weight: 600; color: var(--fg-1); }
    .plugin-panel-url { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plugin-panel-frame {
      width: 100%;
      height: 480px;
      border: none;
      background: var(--ink-0);
    }
    .plugin-panel-native {
      max-height: 480px;
      overflow-y: auto;
      background: var(--ink-0);
    }
    .plugin-panel-mode {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* Marketplace */
    .market-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .market-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .market-toolbar {
      display: flex;
      gap: 10px;
      padding: 12px 18px;
      align-items: center;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .market-search-input,
    .market-category-select {
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      color: var(--fg-1);
      padding: 7px 10px;
      border-radius: var(--r-sm);
      font-size: 13px;
    }
    .market-search-input { flex: 1; }
    .market-search-input:focus,
    .market-category-select:focus { border-color: var(--brand-400); outline: none; }
    .market-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .market-message {
      padding: 8px 18px;
      color: var(--fg-2);
      background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2));
      border-top: 1px solid var(--line-1);
      font-size: 12px;
    }
    .market-grid {
      flex: 1;
      overflow-y: auto;
      padding: 16px 18px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      align-content: start;
    }
    .market-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--fg-3);
      padding: 32px;
      font-size: 13px;
    }
    .market-card {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s, transform 0.15s;
    }
    .market-card:hover {
      border-color: var(--brand-400);
      transform: translateY(-1px);
    }
    .market-card.installed { border-color: color-mix(in oklch, var(--brand-500) 60%, var(--line-1)); }
    .market-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .market-card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-1);
      margin: 0;
      line-height: 1.3;
    }
    .market-card-cat {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .market-card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--fg-3);
    }
    .market-card-code { font-family: var(--font-mono); color: var(--fg-2); }
    .market-card-version { font-family: var(--font-mono); }
    .market-card-desc {
      font-size: 12px;
      color: var(--fg-2);
      line-height: 1.4;
    }
    .market-card-repo {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      word-break: break-all;
    }
    .market-card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: auto;
      padding-top: 6px;
    }
    .market-card-state {
      font-size: 11px;
      color: var(--brand-200);
      text-transform: uppercase;
      letter-spacing: 0.06em;
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
      if (path === ':panel') {
        const panel = child?.params['panel'] as string | undefined;
        if (panel) this.currentRoute.set(panel);
      } else if (path === 'plugin/:code' || path === 'plugin/:code/:sub') {
        const code = child?.params['code'] as string | undefined;
        const sub = child?.params['sub'] as string | undefined;
        if (code) this.currentRoute.set(sub ? `plugin:${code}:${sub}` : `plugin:${code}`);
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

  // --- Sidebar (routeChange) hook ---
  // Almost every sidebar row uses [routerLink] now; the only emits
  // that still flow through here are from the Sites section
  // ('site:foo'). Mirror to currentRoute and persist.
  onRouteChange(route: string) {
    this.currentRoute.set(route);
    this.saveUIState();
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
  // Wires SettingsComponent (requestSave) so /dev/settings save flows
  // through onSettingsSave \u2192 flushUIState in one HTTP round-trip.
  onOutletActivate(component: any): void {
    if (component instanceof SettingsComponent) {
      component.requestSave.subscribe(() => this.onSettingsSave());
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
