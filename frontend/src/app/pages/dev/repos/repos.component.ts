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
        <h2 class="block-title">Repos</h2>
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
        <button class="btn btn-primary btn-sm" (click)="loadRepos()" [disabled]="reposLoading()">
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
})
export class ReposComponent implements OnInit {
  private readonly settings = inject(SettingsStore);
  private readonly workspace = inject(WorkspaceStore);
  private readonly router = inject(Router);

  readonly reposAll = signal<RepoStatus[]>([]);
  readonly reposFilter = signal<ReposFilter>('all');
  readonly reposLoading = signal(false);
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
    if (this.reposAll().length === 0) void this.loadRepos();
  }

  async loadRepos(): Promise<void> {
    this.reposLoading.set(true);
    this.reposError.set(null);
    try {
      // Honour user-configured scan roots from settings: one path per
      // line. Empty → backend falls back to its built-in canonical roots.
      const rootsRaw = (this.settings.settings().reposRoots || '').trim();
      const params: Record<string, unknown> = {};
      if (rootsRaw) {
        params['roots'] = rootsRaw.split('\n').map((l) => l.trim()).filter(Boolean);
      }
      const v = await callBridge<ReposResponse>('repos_status', params);
      const repos = (v?.repos || []).slice().sort((a, b) => {
        if (a.dirty !== b.dirty) return a.dirty ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      this.reposAll.set(repos);
    } catch (e) {
      this.reposError.set('repos bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.reposLoading.set(false);
    }
  }

  /** Click → set workspace + jump to /dev/git for that repo. */
  openRepoInGit(repo: RepoStatus): void {
    this.workspace.setRoot(repo.path);
    void this.router.navigate(['/dev/git']);
  }
}
