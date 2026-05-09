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
