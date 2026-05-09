// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { FileEditorStore } from '../../../services/store/file-editor.store';

interface MantisIssue {
  id: number;
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
  issues?: MantisIssue[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

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
  template: `
    <section class="block mn-block">
      <div class="block-header mn-header">
        <h2 class="block-title">
          Tickets
          @if (mantisCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="mantisCacheAge() > 60" (click)="loadMantisIssues(true)" title="Click to force re-fetch">● cached {{ formatCacheAge(mantisCacheAge()) }}</span>
          } @else if (mantisIssues().length > 0) {
            <span class="cache-pill cache-fresh" title="Just fetched">● fresh</span>
          }
        </h2>
        <span class="editorial subtitle">tasks.lthn.sh · {{ mantisIssues().length }} issues loaded.</span>
      </div>
      @if (mantisRecent().length > 0) {
        <div class="mn-recent-strip">
          <div class="mn-recent-label">recent · last 7 days</div>
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
          <button class="mn-status-pill" [class.active]="mantisStatusFilter() === ''" (click)="mantisStatusFilter.set('')">all <span class="mn-pill-count">{{ mantisIssues().length }}</span></button>
          @for (s of mantisStatuses(); track s.status) {
            <button class="mn-status-pill" [class.active]="mantisStatusFilter() === s.status" (click)="mantisStatusFilter.set(s.status)">{{ s.status }} <span class="mn-pill-count">{{ s.count }}</span></button>
          }
        </div>
        <button class="btn btn-ghost btn-sm" (click)="loadMantisIssues()" [disabled]="mantisLoading()">↻ refresh</button>
      </div>
      <div class="mn-body">
        <aside class="mn-list">
          <div class="sess-list-title">Issues ({{ mantisVisible().length }})</div>
          @if (mantisLoading() && mantisIssues().length === 0) {
            <div class="sess-empty">Loading…</div>
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
            <div class="sess-empty">Pick an issue to view.</div>
          }
          @if (mantisInspectLoading()) {
            <div class="sess-empty">Loading…</div>
          }
          @if (mantisSelected(); as sel) {
            <div class="mn-detail-head">
              <code class="mn-id mn-id-large">#{{ sel.id }}</code>
              <span class="mn-status" [attr.data-status]="sel.status">{{ sel.status }}</span>
              <a class="mn-web-link" [href]="sel.web_url" target="_blank">↗ open in browser</a>
            </div>
            <h3 class="mn-detail-summary">{{ sel.summary }}</h3>
            <div class="mn-detail-meta">
              project <code>{{ sel.project }}</code>
              · reporter <code>{{ sel.reporter }}</code>
              @if (sel.handler) { · handler <code>{{ sel.handler }}</code> }
              @if (sel.severity) { · severity <code>{{ sel.severity }}</code> }
              @if (sel.created) { · created {{ sel.created.slice(0, 10) }} }
            </div>
            @if (sel.description) {
              <div class="mn-section-title">Description</div>
              <pre class="mn-description">@for (seg of mantisSegments(sel.description); track $index) {
                @if (seg.kind === 'path') {
                  <a class="mn-path-link" (click)="openMantisPath(seg.value)" [title]="'Open ' + seg.value">{{ seg.value }}</a>
                } @else {
                  <span>{{ seg.value }}</span>
                }
              }</pre>
            }
            @if (sel.notes && sel.notes.length > 0) {
              <div class="mn-section-title">Notes ({{ sel.notes.length }})</div>
              @for (n of sel.notes; track n.id) {
                <div class="mn-note">
                  <div class="mn-note-head">
                    <span class="mn-note-author">{{ n.reporter }}</span>
                    <span class="mn-note-when">{{ n.created_at?.slice(0, 19)?.replace('T', ' ') }}</span>
                  </div>
                  <pre class="mn-note-text">@for (seg of mantisSegments(n.text); track $index) {
                    @if (seg.kind === 'path') {
                      <a class="mn-path-link" (click)="openMantisPath(seg.value)" [title]="'Open ' + seg.value">{{ seg.value }}</a>
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
})
export class MantisComponent implements OnInit {
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  readonly mantisIssues = signal<MantisIssue[]>([]);
  readonly mantisLoading = signal(false);
  readonly mantisSelected = signal<MantisIssueDetail | null>(null);
  readonly mantisInspectLoading = signal(false);
  readonly mantisStatusFilter = signal('');
  readonly mantisCacheHit = signal(false);
  readonly mantisCacheAge = signal(0);

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

  ngOnInit(): void {
    void this.loadMantisIssues();
  }

  async loadMantisIssues(force: boolean = false): Promise<void> {
    this.mantisLoading.set(true);
    try {
      const v = await callBridge<MantisListResponse>('mantis_list', { force });
      this.mantisIssues.set(v?.issues || []);
      this.mantisCacheHit.set(!!v?.cache_hit);
      this.mantisCacheAge.set(v?.cache_age_s || 0);
    } finally {
      this.mantisLoading.set(false);
    }
  }

  async openMantisIssue(id: number): Promise<void> {
    this.mantisInspectLoading.set(true);
    try {
      const v = await callBridge<MantisIssueDetail>('mantis_view', { id });
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
