// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { SettingsStore } from '../../../services/store/settings.store';
import { WorkspaceStore } from '../../../services/store/workspace.store';

interface RepoStatus {
  name: string;
  path: string;
  branch: string;
  modified: number;
  untracked: number;
  staged: number;
  ahead: number;
  behind: number;
  dirty: boolean;
  error?: string;
}

interface ReposResponse {
  repos?: RepoStatus[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

type ReposFilter = 'all' | 'dirty' | 'ahead' | 'behind';

/**
 * Repos panel — multi-repo dashboard. Aggregates git status across
 * the workspace roots configured in /dev/settings (repos_status
 * surface over core/go-scm).
 *
 * TODO(snider/wails): swap callBridge('repos_status') for a reposBridge
 * wails service.
 */
@Component({
  selector: 'dev-repos',
  standalone: true,
  template: `
    <section class="block repos-block">
      <div class="block-header repos-header">
        <h2 class="block-title">
          Repos
          @if (reposCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="reposCacheAge() > 60" (click)="loadRepos(true)" title="Click to force re-scan">● cached {{ formatCacheAge(reposCacheAge()) }}</span>
          } @else if (reposAll().length > 0) {
            <span class="cache-pill cache-fresh" title="Just scanned">● fresh</span>
          }
        </h2>
        <span class="editorial subtitle">Aggregate git status across your Lethean workspace.</span>
      </div>
      <div class="repos-toolbar">
        <div class="repos-filters">
          <button class="repos-chip" [class.active]="reposFilter() === 'all'" (click)="reposFilter.set('all')">
            All <span class="repos-chip-count">{{ reposCounts().total }}</span>
          </button>
          <button class="repos-chip" [class.active]="reposFilter() === 'dirty'" (click)="reposFilter.set('dirty')">
            Dirty <span class="repos-chip-count">{{ reposCounts().dirty }}</span>
          </button>
          <button class="repos-chip" [class.active]="reposFilter() === 'ahead'" (click)="reposFilter.set('ahead')">
            Ahead <span class="repos-chip-count">{{ reposCounts().ahead }}</span>
          </button>
          <button class="repos-chip" [class.active]="reposFilter() === 'behind'" (click)="reposFilter.set('behind')">
            Behind <span class="repos-chip-count">{{ reposCounts().behind }}</span>
          </button>
        </div>
        <button class="btn btn-primary btn-sm" (click)="loadRepos(true)" [disabled]="reposLoading()">
          @if (reposLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
        </button>
      </div>
      @if (reposError(); as err) {
        <div class="repos-error">{{ err }}</div>
      }
      <div class="repos-grid">
        @for (r of reposVisible(); track r.path) {
          <button class="repos-card"
                  [class.dirty]="r.dirty"
                  [class.ahead]="r.ahead > 0"
                  [class.behind]="r.behind > 0"
                  (click)="openRepoInGit(r)"
                  [title]="r.path">
            <div class="repos-card-head">
              <span class="repos-card-name">{{ r.name }}</span>
              <span class="repos-card-branch">{{ r.branch }}</span>
            </div>
            <div class="repos-card-state">
              @if (r.staged > 0) { <span class="badge badge-staged">+{{ r.staged }}</span> }
              @if (r.modified > 0) { <span class="badge badge-mod">~{{ r.modified }}</span> }
              @if (r.untracked > 0) { <span class="badge badge-unt">?{{ r.untracked }}</span> }
              @if (r.ahead > 0) { <span class="badge badge-ahead">↑{{ r.ahead }}</span> }
              @if (r.behind > 0) { <span class="badge badge-behind">↓{{ r.behind }}</span> }
              @if (!r.dirty && r.ahead === 0 && r.behind === 0) { <span class="badge badge-clean">clean</span> }
            </div>
            @if (r.error) { <div class="repos-card-error">{{ r.error }}</div> }
          </button>
        }
        @if (reposVisible().length === 0 && !reposLoading() && !reposError()) {
          <div class="repos-empty">
            @if (reposCounts().total === 0) {
              No repositories found. Re-scan to refresh.
            } @else {
              No repos match the {{ reposFilter() }} filter.
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
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
  `],
})
export class ReposComponent implements OnInit {
  private readonly settings = inject(SettingsStore);
  private readonly workspace = inject(WorkspaceStore);
  private readonly router = inject(Router);

  readonly reposAll = signal<RepoStatus[]>([]);
  readonly reposFilter = signal<ReposFilter>('all');
  readonly reposLoading = signal(false);
  readonly reposCacheHit = signal(false);
  readonly reposCacheAge = signal(0);
  readonly reposError = signal<string | null>(null);

  readonly reposVisible = computed(() => {
    const filter = this.reposFilter();
    const all = this.reposAll();
    if (filter === 'dirty') return all.filter((r) => r.dirty);
    if (filter === 'ahead') return all.filter((r) => r.ahead > 0);
    if (filter === 'behind') return all.filter((r) => r.behind > 0);
    return all;
  });

  readonly reposCounts = computed(() => {
    const all = this.reposAll();
    return {
      total: all.length,
      dirty: all.filter((r) => r.dirty).length,
      ahead: all.filter((r) => r.ahead > 0).length,
      behind: all.filter((r) => r.behind > 0).length,
    };
  });

  ngOnInit(): void {
    // SWR — render cached, then silently force-refresh.
    void this.loadRepos().then(() => void this.loadRepos(true, true));
  }

  async loadRepos(force: boolean = false, silent: boolean = false): Promise<void> {
    if (!silent) this.reposLoading.set(true);
    this.reposError.set(null);
    try {
      // Honour user-configured scan roots from settings: one path per
      // line. Empty → backend falls back to its built-in canonical roots.
      const rootsRaw = (this.settings.settings().reposRoots || '').trim();
      const params: Record<string, unknown> = { force };
      if (rootsRaw) {
        params['roots'] = rootsRaw.split('\n').map((l) => l.trim()).filter(Boolean);
      }
      const v = await callBridge<ReposResponse>('repos_status', params);
      const repos = (v?.repos || []).slice().sort((a, b) => {
        if (a.dirty !== b.dirty) return a.dirty ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      this.reposAll.set(repos);
      this.reposCacheHit.set(!!v?.cache_hit);
      this.reposCacheAge.set(v?.cache_age_s || 0);
    } catch (e) {
      this.reposError.set('repos bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      if (!silent) this.reposLoading.set(false);
    }
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  /** Click → set workspace + jump to /dev/git for that repo. */
  openRepoInGit(repo: RepoStatus): void {
    this.workspace.setRoot(repo.path);
    void this.router.navigate(['/dev/git']);
  }
}
