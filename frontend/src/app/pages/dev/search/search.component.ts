// SPDX-Licence-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridgeRaw } from '../../../lib/bridge';
import { FileEditorStore } from '../../../services/store/file-editor.store';
import { WorkspaceStore } from '../../../services/store/workspace.store';

interface SearchMatch {
  path: string;
  line: number;
  text: string;
}

/**
 * Search panel — workspace-wide ripgrep dispatch. Surface over
 * core/go-process's ripgrep wrapper. Results route through
 * FileEditorStore so a click opens the file in the explorer's tabs and
 * jumps to the line.
 *
 * TODO(snider/wails): swap callBridgeRaw('workspace_search') for a
 * searchBridge wails service that streams matches as ripgrep yields
 * them.
 */
@Component({
  selector: 'dev-search',
  standalone: true,
  template: `
    <section class="block search-block">
      <div class="block-header search-header">
        <h2 class="block-title">Search</h2>
        <span class="editorial subtitle">{{ workspace.root() }}</span>
      </div>
      <div class="search-toolbar">
        <input
          type="text"
          class="search-input"
          placeholder="Search workspace…"
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)"
          (keydown.enter)="runSearch()"
        />
        <button class="btn btn-primary btn-sm" (click)="runSearch()" [disabled]="searchLoading()">
          @if (searchLoading()) { <span>searching…</span> }
          @else { <span>Search</span> }
        </button>
      </div>

      @if (searchError(); as err) {
        <div class="search-error">{{ err }}</div>
      }

      @if (searchResults().length === 0 && !searchError() && !searchLoading() && searchQuery()) {
        <div class="search-empty">No matches</div>
      }

      @if (searchResults().length > 0) {
        <div class="search-summary">
          {{ searchResults().length }} match{{ searchResults().length === 1 ? '' : 'es' }}
          @if (searchTruncated()) { <span>· truncated at 200 results</span> }
        </div>
        <div class="search-results">
          @for (m of searchResults(); track $index) {
            <button class="search-row" (click)="openSearchResult(m)">
              <span class="search-path">{{ basename(m.path) }}</span>
              <span class="search-line">:{{ m.line }}</span>
              <span class="search-text">{{ m.text }}</span>
              <span class="search-fullpath">{{ m.path }}</span>
            </button>
          }
        </div>
      }
    </section>
  `,
  styles: [`
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
  `],
})
export class SearchComponent {
  readonly workspace = inject(WorkspaceStore);
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  readonly searchQuery = signal<string>('');
  readonly searchResults = signal<SearchMatch[]>([]);
  readonly searchLoading = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searchTruncated = signal(false);

  async runSearch(): Promise<void> {
    const q = this.searchQuery().trim();
    if (!q) {
      this.searchResults.set([]);
      this.searchError.set(null);
      this.searchTruncated.set(false);
      return;
    }
    this.searchLoading.set(true);
    this.searchError.set(null);
    try {
      const data = await callBridgeRaw('workspace_search', {
        query: q,
        path: this.workspace.root(),
        max_results: 200,
      });
      if (!data.ok) {
        this.searchError.set(data.error || 'search failed');
        this.searchResults.set([]);
        this.searchTruncated.set(false);
        return;
      }
      this.searchResults.set((data['matches'] as SearchMatch[]) || []);
      this.searchTruncated.set(!!data['truncated']);
    } finally {
      this.searchLoading.set(false);
    }
  }

  async openSearchResult(match: SearchMatch): Promise<void> {
    await this.fileEditor.openFile(match.path);
    void this.router.navigate(['/dev/explorer']);
    this.fileEditor.revealLine(match.line, 1);
  }

  basename(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }
}
