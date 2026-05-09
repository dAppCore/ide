// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { callBridgeRaw } from '../../../lib/bridge';
import { WorkspaceStore } from '../../../services/store/workspace.store';

interface GitBranch {
  branch: string;
  ahead: number;
  behind: number;
}

interface GitEntry {
  path: string;
  index_status: string;
  worktree_status: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
}

/**
 * Git panel — Source Control. Single-repo per-file status / diff /
 * stage / commit. Surface over core/go-git's editor-time path.
 *
 * TODO(snider/wails): swap callBridgeRaw('git_*') for a gitBridge wails
 * service.
 */
@Component({
  selector: 'dev-git',
  standalone: true,
  template: `
    <section class="block git-block">
      <div class="block-header git-header">
        <h2 class="block-title">Source Control</h2>
        @if (gitBranch(); as b) {
          <span class="git-branch-pill">
            <span class="git-branch-name">{{ b.branch || '(detached)' }}</span>
            @if (b.ahead > 0) { <span class="git-ahead">↑{{ b.ahead }}</span> }
            @if (b.behind > 0) { <span class="git-behind">↓{{ b.behind }}</span> }
          </span>
        }
        <button class="btn btn-ghost btn-sm" (click)="refreshGit()" [disabled]="gitBusy()" title="Refresh status">
          Refresh
        </button>
      </div>

      <div class="git-grid">
        <div class="git-list">
          @if (gitEntries().length === 0) {
            <div class="git-empty">working tree clean</div>
          }
          @for (e of gitEntries(); track e.path) {
            <div
              class="git-row"
              [class.active]="gitSelectedFile() === e.path"
              [class.staged]="e.staged"
              [class.unstaged]="e.unstaged"
              [class.untracked]="e.untracked"
              (click)="selectGitFile(e.path)"
            >
              <span class="git-status-flag">{{ gitFileLabel(e) }}</span>
              <span class="git-row-path">{{ e.path }}</span>
              @if (e.staged && !e.unstaged) {
                <button class="git-row-btn" (click)="unstageFile(e.path, $event)" title="Unstage">−</button>
              } @else {
                <button class="git-row-btn" (click)="stageFile(e.path, $event)" title="Stage">+</button>
              }
            </div>
          }
        </div>

        <div class="git-diff-pane">
          @if (gitSelectedFile(); as p) {
            <div class="git-diff-header">
              <span class="git-diff-path">{{ p }}</span>
            </div>
            <pre class="git-diff-body">{{ gitDiff() }}</pre>
          } @else {
            <div class="git-diff-empty">Select a file to view its diff</div>
          }
        </div>
      </div>

      <div class="git-commit-bar">
        <input
          type="text"
          class="git-commit-input"
          placeholder="Commit message…"
          [value]="gitCommitMessage()"
          (input)="gitCommitMessage.set($any($event.target).value)"
          (keydown.enter)="commitStaged()"
        />
        <button class="btn btn-secondary btn-sm" (click)="stageAll()" [disabled]="gitBusy()" title="Stage all changes">
          Stage all
        </button>
        <button
          class="btn btn-primary btn-sm"
          (click)="commitStaged()"
          [disabled]="gitBusy() || !hasStaged() || !gitCommitMessage().trim()"
          title="Commit staged"
        >
          Commit
        </button>
      </div>

      @if (gitMessage(); as msg) {
        <div class="git-message">{{ msg }}</div>
      }
    </section>
  `,
})
export class GitComponent implements OnInit {
  readonly workspace = inject(WorkspaceStore);

  readonly gitBranch = signal<GitBranch | null>(null);
  readonly gitEntries = signal<GitEntry[]>([]);
  readonly gitSelectedFile = signal<string | null>(null);
  readonly gitDiff = signal<string>('');
  readonly gitCommitMessage = signal<string>('');
  readonly gitBusy = signal(false);
  readonly gitMessage = signal<string | null>(null);

  readonly hasStaged = computed(() => this.gitEntries().some((e) => e.staged));

  ngOnInit(): void {
    void this.refreshGit();
  }

  async refreshGit(): Promise<void> {
    const repo = this.workspace.root();
    const [branchRes, statusRes] = await Promise.all([
      callBridgeRaw('git_branch', { path: repo }),
      callBridgeRaw('git_status', { path: repo }),
    ]);
    if (branchRes.ok) {
      this.gitBranch.set({
        branch: branchRes['branch'] as string,
        ahead: (branchRes['ahead'] as number) || 0,
        behind: (branchRes['behind'] as number) || 0,
      });
    }
    if (statusRes.ok) {
      this.gitEntries.set((statusRes['entries'] as GitEntry[]) || []);
    } else {
      this.gitMessage.set(statusRes.error || 'git status failed');
    }
  }

  async selectGitFile(path: string): Promise<void> {
    this.gitSelectedFile.set(path);
    const repo = this.workspace.root();
    const entry = this.gitEntries().find((e) => e.path === path);
    const staged = !!entry?.staged && !entry?.unstaged;
    const res = await callBridgeRaw('git_diff', { path: repo, file: path, staged });
    if (res.ok) {
      this.gitDiff.set((res['diff'] as string) || '(no diff — file may be untracked or unchanged)');
    } else {
      this.gitDiff.set(`(error: ${res.error || 'git diff failed'})`);
    }
  }

  gitFileLabel(entry: GitEntry): string {
    if (entry.untracked) return 'U';
    const s = (entry.index_status + entry.worktree_status).trim();
    return s || '·';
  }

  async stageFile(path: string, ev: Event): Promise<void> {
    ev.stopPropagation();
    this.gitBusy.set(true);
    const res = await callBridgeRaw('git_add', { path: this.workspace.root(), files: [path] });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'stage failed');
      return;
    }
    this.gitMessage.set(`staged ${this.basename(path)}`);
    void this.refreshGit();
  }

  async unstageFile(path: string, ev: Event): Promise<void> {
    ev.stopPropagation();
    this.gitBusy.set(true);
    const res = await callBridgeRaw('git_unstage', { path: this.workspace.root(), files: [path] });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'unstage failed');
      return;
    }
    this.gitMessage.set(`unstaged ${this.basename(path)}`);
    void this.refreshGit();
  }

  async stageAll(): Promise<void> {
    this.gitBusy.set(true);
    const res = await callBridgeRaw('git_add', { path: this.workspace.root(), all: true });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'stage all failed');
      return;
    }
    this.gitMessage.set('staged all changes');
    void this.refreshGit();
  }

  async commitStaged(): Promise<void> {
    const msg = this.gitCommitMessage().trim();
    if (!msg) {
      this.gitMessage.set('commit message required');
      return;
    }
    this.gitBusy.set(true);
    const res = await callBridgeRaw('git_commit', { path: this.workspace.root(), message: msg });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'commit failed');
      return;
    }
    this.gitMessage.set(`committed: ${msg.split('\n')[0].slice(0, 60)}`);
    this.gitCommitMessage.set('');
    void this.refreshGit();
  }

  private basename(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }
}
