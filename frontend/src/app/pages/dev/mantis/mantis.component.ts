// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';
import { FileEditorStore } from '../../../services/store/file-editor.store';

// MantisIssue is the row shape rendered by the panel. id is now string |
// number — local tasks use 12-char strings; remote mantis tickets use
// integers. Both render fine in the template.
interface MantisIssue {
  id: number | string;
  summary: string;
  status: string;
  project: string;
  reporter: string;
  handler?: string;
  severity?: string;
  updated?: string;
}

interface MantisNote {
  id: number;
  reporter: string;
  text: string;
  created_at?: string;
}

interface MantisIssueDetail extends MantisIssue {
  description?: string;
  notes?: MantisNote[];
  web_url?: string;
  created?: string;
}

interface MantisListResponse {
  issues: MantisIssue[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

const EMPTY_MANTIS: MantisListResponse = { issues: [] };

type Segment = { kind: 'text' | 'path'; value: string };

/**
 * Tickets panel — tasks.lthn.sh / Mantis browser.
 *
 * TODO(snider/wails): swap callBridge('mantis_*') for a mantisBridge
 * wails service.
 *
 * TODO: openMantisPath no-ops with a console log. The IdeComponent
 * legacy version routed through openSearchResult to open the file in
 * Monaco. Move to a shared FileEditorService when Search extracts.
 */
@Component({
  selector: 'dev-mantis',
  standalone: true,
  imports: [DevSkeleton, TranslatePipe],
  template: `
    <section class="block mn-block">
      <div class="block-header mn-header">
        <h2 class="block-title">
          {{ 'mantis.title' | translate }}
          @if (mantisCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="mantisCacheAge() > 60" (click)="loadMantisIssues(true)" [title]="'mantis.tooltip.force-refetch' | translate">● {{ 'mantis.cache.cached' | translate }} {{ formatCacheAge(mantisCacheAge()) }}</span>
          } @else if (mantisIssues().length > 0) {
            <span class="cache-pill cache-fresh" [title]="'mantis.tooltip.just-fetched' | translate">● {{ 'mantis.cache.fresh' | translate }}</span>
          }
        </h2>
        <span class="editorial subtitle">tasks.lthn.sh · {{ mantisIssues().length }} {{ 'mantis.label.issues-loaded' | translate }}</span>
      </div>
      @if (mantisRecent().length > 0) {
        <div class="mn-recent-strip">
          <div class="mn-recent-label">{{ 'mantis.section.recent' | translate }}</div>
          <div class="mn-recent-row">
            @for (i of mantisRecent(); track i.id) {
              <button class="mn-recent-pill" (click)="openMantisIssue(i.id)" [title]="'#' + i.id + ': ' + i.summary">
                <span class="mn-status" [attr.data-status]="i.status">{{ i.status }}</span>
                <code class="mn-id">#{{ i.id }}</code>
                <span class="mn-recent-summary">{{ i.summary.slice(0, 50) }}</span>
                <span class="mn-recent-when">{{ formatRelative(i.updated) }}</span>
              </button>
            }
          </div>
        </div>
      }
      <div class="mn-toolbar">
        <div class="mn-status-pills">
          <button class="mn-status-pill" [class.active]="mantisStatusFilter() === ''" (click)="mantisStatusFilter.set('')">{{ 'mantis.tab.all' | translate }} <span class="mn-pill-count">{{ mantisIssues().length }}</span></button>
          @for (s of mantisStatuses(); track s.status) {
            <button class="mn-status-pill" [class.active]="mantisStatusFilter() === s.status" (click)="mantisStatusFilter.set(s.status)">{{ s.status }} <span class="mn-pill-count">{{ s.count }}</span></button>
          }
        </div>
        <button class="btn btn-ghost btn-sm" (click)="loadMantisIssues()" [disabled]="mantisLoading()">↻ {{ 'mantis.button.refresh' | translate }}</button>
      </div>
      <div class="mn-body">
        <aside class="mn-list">
          <div class="sess-list-title">{{ 'mantis.section.issues' | translate }} ({{ mantisVisible().length }})</div>
          @if (scan.firstLoad()) {
            <dev-skeleton kind="rows" [count]="8" />
          }
          @for (i of mantisVisible(); track i.id) {
            <button class="mn-row" [class.active]="mantisSelected()?.id === i.id" (click)="openMantisIssue(i.id)">
              <div class="mn-row-head">
                <code class="mn-id">#{{ i.id }}</code>
                <span class="mn-status" [attr.data-status]="i.status">{{ i.status }}</span>
                <span class="mn-project">{{ i.project }}</span>
              </div>
              <div class="mn-summary">{{ i.summary }}</div>
              <div class="mn-meta">
                @if (i.handler) { <span>→ {{ i.handler }}</span> }
                @if (i.updated) { <span class="mn-updated">{{ i.updated.slice(0, 10) }}</span> }
              </div>
            </button>
          }
        </aside>
        <main class="mn-detail">
          @if (!mantisSelected() && !mantisInspectLoading()) {
            <div class="sess-empty">{{ 'mantis.empty.pick-issue' | translate }}</div>
          }
          @if (mantisInspectLoading()) {
            <div class="sess-empty">{{ 'mantis.status.loading' | translate }}</div>
          }
          @if (mantisSelected(); as sel) {
            <div class="mn-detail-head">
              <code class="mn-id mn-id-large">#{{ sel.id }}</code>
              <span class="mn-status" [attr.data-status]="sel.status">{{ sel.status }}</span>
              <a class="mn-web-link" [href]="sel.web_url" target="_blank">↗ {{ 'mantis.button.open-browser' | translate }}</a>
            </div>
            <h3 class="mn-detail-summary">{{ sel.summary }}</h3>
            <div class="mn-detail-meta">
              {{ 'mantis.label.project' | translate }} <code>{{ sel.project }}</code>
              · {{ 'mantis.label.reporter' | translate }} <code>{{ sel.reporter }}</code>
              @if (sel.handler) { · {{ 'mantis.label.handler' | translate }} <code>{{ sel.handler }}</code> }
              @if (sel.severity) { · {{ 'mantis.label.severity' | translate }} <code>{{ sel.severity }}</code> }
              @if (sel.created) { · {{ 'mantis.label.created' | translate }} {{ sel.created.slice(0, 10) }} }
            </div>
            @if (sel.description) {
              <div class="mn-section-title">{{ 'mantis.section.description' | translate }}</div>
              <pre class="mn-description">@for (seg of mantisSegments(sel.description); track $index) {
                @if (seg.kind === 'path') {
                  <a class="mn-path-link" (click)="openMantisPath(seg.value)" [title]="('mantis.tooltip.open-path' | translate) + ' ' + seg.value">{{ seg.value }}</a>
                } @else {
                  <span>{{ seg.value }}</span>
                }
              }</pre>
            }
            @if (sel.notes && sel.notes.length > 0) {
              <div class="mn-section-title">{{ 'mantis.section.notes' | translate }} ({{ sel.notes.length }})</div>
              @for (n of sel.notes; track n.id) {
                <div class="mn-note">
                  <div class="mn-note-head">
                    <span class="mn-note-author">{{ n.reporter }}</span>
                    <span class="mn-note-when">{{ n.created_at?.slice(0, 19)?.replace('T', ' ') }}</span>
                  </div>
                  <pre class="mn-note-text">@for (seg of mantisSegments(n.text); track $index) {
                    @if (seg.kind === 'path') {
                      <a class="mn-path-link" (click)="openMantisPath(seg.value)" [title]="('mantis.tooltip.open-path' | translate) + ' ' + seg.value">{{ seg.value }}</a>
                    } @else {
                      <span>{{ seg.value }}</span>
                    }
                  }</pre>
                </div>
              }
            }
          }
        </main>
      </div>
    </section>
  `,
  styles: [`
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
  `],
})
export class MantisComponent {
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  // Local tasks panel — primary state from pkg/tasks (DuckDB via go-orm).
  // Mantis stays available as a separate "remote connector" via mantis_*
  // tools; this panel renders the local-first store.
  readonly scan = cachedBridgeResource<MantisListResponse>({
    tool: 'tasks_list',
    emptyValue: EMPTY_MANTIS,
    isEmpty: (v) => v.issues.length === 0,
  });

  readonly mantisIssues = computed(() => this.scan.stable().issues);
  readonly mantisLoading = computed(() => this.scan.loading());
  readonly mantisCacheHit = computed(() => this.scan.cacheHit());
  readonly mantisCacheAge = computed(() => this.scan.cacheAge());

  readonly mantisSelected = signal<MantisIssueDetail | null>(null);
  readonly mantisInspectLoading = signal(false);
  readonly mantisStatusFilter = signal('');

  // Wraps cachedBridgeResource.refresh() so the existing
  // `loadMantisIssues(true)` call sites in the template keep working.
  loadMantisIssues(force?: boolean): void {
    if (force) this.scan.refresh();
  }

  readonly mantisVisible = computed(() => {
    const f = this.mantisStatusFilter().trim().toLowerCase();
    if (!f) return this.mantisIssues();
    return this.mantisIssues().filter((i) => i.status.toLowerCase() === f);
  });

  readonly mantisRecent = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.mantisIssues()
      .filter((i) => {
        if (!i.updated) return false;
        const t = Date.parse(i.updated);
        return !isNaN(t) && t >= cutoff;
      })
      .slice(0, 20);
  });

  readonly mantisStatuses = computed(() => {
    const counts: Record<string, number> = {};
    for (const i of this.mantisIssues()) counts[i.status] = (counts[i.status] || 0) + 1;
    return Object.entries(counts)
      .map(([s, c]) => ({ status: s, count: c }))
      .sort((a, b) => b.count - a.count);
  });

  async openMantisIssue(id: number | string): Promise<void> {
    this.mantisInspectLoading.set(true);
    try {
      const v = await callBridge<MantisIssueDetail>('tasks_view', { id });
      this.mantisSelected.set(v);
    } finally {
      this.mantisInspectLoading.set(false);
    }
  }

  /**
   * Detect file paths in Mantis text. Match absolute /Users/... paths
   * (handles both bare paths and ones in backticks). Returns segments
   * the template iterates with @for to render path-clickable.
   */
  mantisSegments(text: string | undefined): Segment[] {
    if (!text) return [];
    const re = /(\/Users\/[^\s`'"<>]+)/g;
    const out: Segment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        out.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
      }
      let p = match[0];
      while (/[.,;:)\]}]$/.test(p)) p = p.slice(0, -1);
      out.push({ kind: 'path', value: p });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      out.push({ kind: 'text', value: text.slice(lastIndex) });
    }
    return out;
  }

  async openMantisPath(path: string): Promise<void> {
    await this.fileEditor.openFile(path);
    void this.router.navigate(['/dev/explorer']);
  }

  formatRelative(iso: string | undefined): string {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (isNaN(t)) return '';
    const delta = (Date.now() - t) / 1000;
    if (delta < 60) return 'just now';
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    if (delta < 604800) return `${Math.floor(delta / 86400)}d ago`;
    return iso.slice(0, 10);
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}
