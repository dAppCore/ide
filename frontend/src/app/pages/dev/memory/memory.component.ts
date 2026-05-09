// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';
import { FileEditorStore } from '../../../services/store/file-editor.store';

interface MemoryEntry {
  name: string;
  description: string;
  type: string;
  filename: string;
  path: string;
  size: number;
  modified?: string;
}

interface MemorySearchHit {
  filename: string;
  path: string;
  line: number;
  match: string;
  memory_name?: string;
  memory_type?: string;
}

interface MemoryListResponse {
  memories: MemoryEntry[];
  type_counts: Record<string, number>;
  dir: string;
  cache_hit?: boolean;
  cache_age_s?: number;
}

const EMPTY_MEM: MemoryListResponse = { memories: [], type_counts: {}, dir: '' };

interface MemorySearchResponse {
  hits?: MemorySearchHit[];
}

/**
 * Memory panel — browse ~/.claude/memory/ frontmatter and contents.
 *
 * TODO(snider/wails): swap callBridge('memory_list' / 'memory_search')
 * for a memoryBridge wails service.
 *
 * TODO: openMemoryEntry no-ops with a console log. The IdeComponent
 * legacy version routed through openSearchResult. Move to a shared
 * FileEditorService when Search extracts.
 */
@Component({
  selector: 'dev-memory',
  standalone: true,
  imports: [DecimalPipe, DevSkeleton, TranslatePipe],
  template: `
    <section class="block mem-block">
      <div class="block-header mem-header">
        <h2 class="block-title">
          {{ 'memory.title' | translate }}
          @if (memoryCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="memoryCacheAge() > 600" (click)="loadMemoryEntries(true)" [title]="'memory.tooltip.force-rescan' | translate">● {{ 'memory.cache.cached' | translate }} {{ formatCacheAge(memoryCacheAge()) }}</span>
          } @else if (memoryEntries().length > 0) {
            <span class="cache-pill cache-fresh" [title]="'memory.tooltip.just-scanned' | translate">● {{ 'memory.cache.fresh' | translate }}</span>
          }
        </h2>
        <span class="editorial subtitle">{{ 'memory.subtitle.auto-memory-at' | translate }} <code>{{ memoryDir() || '~/.claude/projects/.../memory/' }}</code> · {{ memoryEntries().length }} {{ 'memory.label.entries' | translate }}</span>
      </div>
      @if (memoryRecent().length > 0) {
        <div class="mem-recent-strip">
          <div class="mem-recent-label">{{ 'memory.section.recent' | translate }}</div>
          <div class="mem-recent-row">
            @for (m of memoryRecent(); track m.path) {
              <button class="mem-recent-pill" (click)="openMemoryEntry(m.path)" [title]="m.name + ' · ' + (m.description || '')">
                <span class="mem-recent-type" [attr.data-type]="m.type || 'untyped'">{{ m.type || '?' }}</span>
                <span class="mem-recent-name">{{ m.name.slice(0, 50) }}</span>
                <span class="mem-recent-when">{{ formatRelative(m.modified) }}</span>
              </button>
            }
          </div>
        </div>
      }
      <div class="mem-toolbar">
        <input class="input mem-filter" [placeholder]="'memory.placeholder.filter' | translate" [value]="memoryFilter()" (input)="memoryFilter.set($any($event.target).value)" (keyup.enter)="runMemorySearch(memoryFilter())" />
        @if (memorySearchActive()) {
          <button class="btn btn-ghost btn-sm" (click)="exitMemorySearch()" [title]="'memory.tooltip.back-filter' | translate">× {{ 'memory.button.exit-search' | translate }}</button>
        }
        <div class="mem-type-pills">
          <button class="mem-type-pill" [class.active]="memoryTypeFilter() === null" (click)="memoryTypeFilter.set(null)">{{ 'memory.tab.all' | translate }} <span class="mem-type-count">{{ memoryEntries().length }}</span></button>
          @for (t of memoryTypeEntries(); track t.type) {
            <button class="mem-type-pill" [class.active]="memoryTypeFilter() === t.type" (click)="memoryTypeFilter.set(t.type)">
              {{ t.type }} <span class="mem-type-count">{{ t.count }}</span>
            </button>
          }
        </div>
        <select class="input mem-sort" [value]="memorySort()" (change)="memorySort.set($any($event.target).value)">
          <option value="modified">{{ 'memory.sort.modified' | translate }}</option>
          <option value="name">{{ 'memory.sort.name' | translate }}</option>
          <option value="type">{{ 'memory.sort.type' | translate }}</option>
        </select>
      </div>
      <div class="mem-body">
        @if (memorySearchActive()) {
          @if (memorySearchLoading()) {
            <div class="mem-empty">{{ 'memory.status.searching' | translate }}</div>
          } @else {
            <div class="mem-list-summary">{{ memorySearchHits().length }} {{ 'memory.label.content-matches-for' | translate }} "{{ memoryFilter() }}"</div>
            @for (h of memorySearchHits(); track $index) {
              <button class="mem-search-hit" (click)="openMemoryEntry(h.path, h.line)" [title]="h.path + ':' + h.line">
                <div class="mem-search-head">
                  @if (h.memory_type) {
                    <span class="mem-row-type" [attr.data-type]="h.memory_type">{{ h.memory_type }}</span>
                  }
                  <span class="mem-search-name">{{ h.memory_name || h.filename }}</span>
                  <span class="mem-search-line"><code>:{{ h.line }}</code></span>
                </div>
                <pre class="mem-search-match">{{ h.match }}</pre>
              </button>
            }
          }
        } @else if (scan.firstLoad()) {
          <dev-skeleton kind="rows" [count]="8" />
        } @else {
          <div class="mem-list-summary">{{ memoryVisible().length }} {{ 'memory.label.matching' | translate }}</div>
          @for (m of memoryVisible(); track m.path) {
            <button class="mem-row" (click)="openMemoryEntry(m.path)" [title]="m.path">
              <span class="mem-row-type" [attr.data-type]="m.type || 'untyped'">{{ m.type || ('memory.type.untyped' | translate) }}</span>
              <div class="mem-row-body">
                <div class="mem-row-name">{{ m.name }}</div>
                @if (m.description) {
                  <div class="mem-row-desc">{{ m.description }}</div>
                }
                <div class="mem-row-meta">
                  <code>{{ m.filename }}</code>
                  <span class="mem-row-size">· {{ m.size > 1024 ? (m.size / 1024 | number:'1.0-1') + 'k' : m.size + 'B' }}</span>
                  @if (m.modified) {
                    <span class="mem-row-mod">· {{ m.modified.slice(0, 10) }}</span>
                  }
                </div>
              </div>
            </button>
          }
        }
      </div>
    </section>
  `,
  styles: [`
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
  `],
})
export class MemoryComponent {
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  readonly memoryFilter = signal('');
  readonly memoryTypeFilter = signal<string | null>(null);
  readonly memorySort = signal<'modified' | 'name' | 'type'>('modified');

  readonly scan = cachedBridgeResource<MemoryListResponse>({
    tool: 'memory_list',
    emptyValue: EMPTY_MEM,
    isEmpty: (v) => v.memories.length === 0,
    // sort is reactive — changing it re-fires the loader automatically.
    extraParams: () => ({ sort: this.memorySort() }),
  });

  readonly memoryEntries = computed(() => this.scan.stable().memories);
  readonly memoryTypeCounts = computed(() => this.scan.stable().type_counts);
  readonly memoryDir = computed(() => this.scan.stable().dir);
  readonly memoryLoading = computed(() => this.scan.loading());
  readonly memoryCacheHit = computed(() => this.scan.cacheHit());
  readonly memoryCacheAge = computed(() => this.scan.cacheAge());

  readonly memorySearchHits = signal<MemorySearchHit[]>([]);
  readonly memorySearchActive = signal(false);
  readonly memorySearchLoading = signal(false);

  /** Template alias — `loadMemoryEntries(true)` keeps working. */
  loadMemoryEntries(force?: boolean): void {
    if (force) this.scan.refresh();
  }

  /** Last 7 days of memories — quick-access strip at the top. */
  readonly memoryRecent = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.memoryEntries()
      .filter((m) => {
        if (!m.modified) return false;
        const t = Date.parse(m.modified);
        return !isNaN(t) && t >= cutoff;
      })
      .slice(0, 30);
  });

  readonly memoryVisible = computed(() => {
    const f = this.memoryFilter().trim().toLowerCase();
    const t = this.memoryTypeFilter();
    return this.memoryEntries().filter((m) => {
      if (t !== null && (m.type || 'untyped') !== t) return false;
      if (!f) return true;
      return (m.name + ' ' + m.description + ' ' + m.filename).toLowerCase().includes(f);
    });
  });

  async openMemoryEntry(path: string, line: number = 1): Promise<void> {
    await this.fileEditor.openFile(path);
    void this.router.navigate(['/dev/explorer']);
    if (line > 1) this.fileEditor.revealLine(line, 1);
  }

  async runMemorySearch(query: string): Promise<void> {
    const q = query.trim();
    if (q.length < 2) {
      this.memorySearchHits.set([]);
      this.memorySearchActive.set(false);
      return;
    }
    this.memorySearchLoading.set(true);
    this.memorySearchActive.set(true);
    try {
      const v = await callBridge<MemorySearchResponse>('memory_search', { query: q });
      this.memorySearchHits.set(v?.hits || []);
    } finally {
      this.memorySearchLoading.set(false);
    }
  }

  exitMemorySearch(): void {
    this.memorySearchActive.set(false);
    this.memorySearchHits.set([]);
  }

  memoryTypeEntries(): { type: string; count: number }[] {
    return Object.entries(this.memoryTypeCounts())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
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
