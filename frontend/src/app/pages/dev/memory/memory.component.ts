// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { callBridge } from '../../../lib/bridge';

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
  memories?: MemoryEntry[];
  type_counts?: Record<string, number>;
  dir?: string;
  cache_hit?: boolean;
  cache_age_s?: number;
}

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
  imports: [DecimalPipe],
  template: `
    <section class="block mem-block">
      <div class="block-header mem-header">
        <h2 class="block-title">
          Memory
          @if (memoryCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="memoryCacheAge() > 600" (click)="loadMemoryEntries(true)" title="Click to force re-scan">● cached {{ formatCacheAge(memoryCacheAge()) }}</span>
          } @else if (memoryEntries().length > 0) {
            <span class="cache-pill cache-fresh" title="Just scanned">● fresh</span>
          }
        </h2>
        <span class="editorial subtitle">Auto-memory at <code>{{ memoryDir() || '~/.claude/projects/.../memory/' }}</code> · {{ memoryEntries().length }} entries.</span>
      </div>
      @if (memoryRecent().length > 0) {
        <div class="mem-recent-strip">
          <div class="mem-recent-label">recent · last 7 days</div>
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
        <input class="input mem-filter" placeholder="filter (frontmatter) — Enter for full-text…" [value]="memoryFilter()" (input)="memoryFilter.set($any($event.target).value)" (keyup.enter)="runMemorySearch(memoryFilter())" />
        @if (memorySearchActive()) {
          <button class="btn btn-ghost btn-sm" (click)="exitMemorySearch()" title="Back to filter mode">× exit search</button>
        }
        <div class="mem-type-pills">
          <button class="mem-type-pill" [class.active]="memoryTypeFilter() === null" (click)="memoryTypeFilter.set(null)">all <span class="mem-type-count">{{ memoryEntries().length }}</span></button>
          @for (t of memoryTypeEntries(); track t.type) {
            <button class="mem-type-pill" [class.active]="memoryTypeFilter() === t.type" (click)="memoryTypeFilter.set(t.type)">
              {{ t.type }} <span class="mem-type-count">{{ t.count }}</span>
            </button>
          }
        </div>
        <select class="input mem-sort" [value]="memorySort()" (change)="memorySort.set($any($event.target).value); loadMemoryEntries()">
          <option value="modified">sort: modified</option>
          <option value="name">sort: name</option>
          <option value="type">sort: type</option>
        </select>
      </div>
      <div class="mem-body">
        @if (memorySearchActive()) {
          @if (memorySearchLoading()) {
            <div class="mem-empty">Searching memory contents…</div>
          } @else {
            <div class="mem-list-summary">{{ memorySearchHits().length }} content matches for "{{ memoryFilter() }}"</div>
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
        } @else if (memoryLoading() && memoryEntries().length === 0) {
          <div class="mem-empty">Loading memories…</div>
        } @else {
          <div class="mem-list-summary">{{ memoryVisible().length }} matching</div>
          @for (m of memoryVisible(); track m.path) {
            <button class="mem-row" (click)="openMemoryEntry(m.path)" [title]="m.path">
              <span class="mem-row-type" [attr.data-type]="m.type || 'untyped'">{{ m.type || 'untyped' }}</span>
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
})
export class MemoryComponent implements OnInit {
  readonly memoryEntries = signal<MemoryEntry[]>([]);
  readonly memoryTypeCounts = signal<Record<string, number>>({});
  readonly memoryDir = signal('');
  readonly memoryLoading = signal(false);
  readonly memoryFilter = signal('');
  readonly memoryTypeFilter = signal<string | null>(null);
  readonly memorySort = signal<'modified' | 'name' | 'type'>('modified');
  readonly memorySearchHits = signal<MemorySearchHit[]>([]);
  readonly memorySearchActive = signal(false);
  readonly memorySearchLoading = signal(false);
  readonly memoryCacheHit = signal(false);
  readonly memoryCacheAge = signal(0);

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

  ngOnInit(): void {
    void this.loadMemoryEntries();
  }

  async loadMemoryEntries(force: boolean = false): Promise<void> {
    this.memoryLoading.set(true);
    try {
      const v = await callBridge<MemoryListResponse>('memory_list', {
        sort: this.memorySort(),
        force,
      });
      this.memoryEntries.set(v?.memories || []);
      this.memoryTypeCounts.set(v?.type_counts || {});
      this.memoryDir.set(v?.dir || '');
      this.memoryCacheHit.set(!!v?.cache_hit);
      this.memoryCacheAge.set(v?.cache_age_s || 0);
    } finally {
      this.memoryLoading.set(false);
    }
  }

  openMemoryEntry(path: string, line: number = 1): void {
    // TODO: route through a shared FileEditorService when Search extracts.
    console.info('[memory] would open', path, 'line', line);
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
