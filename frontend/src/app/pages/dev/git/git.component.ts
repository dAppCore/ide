// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import * as GitBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/gitbridge';
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
 * Migrated 2026-05-09 to typed GitBridge wails binding (was
 * callBridgeRaw('git_*')). Same pattern as P2PBridge / SearchBridge.
 * Old TODO marker kept for reference:
 * was: TODO(snider/wails): swap callBridgeRaw('git_*') for a gitBridge wails
 * service.
 */
@Component({
  selector: 'dev-git',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block git-block">
      <div class="block-header git-header">
        <h2 class="block-title">{{ 'git.title' | translate }}</h2>
        @if (gitBranch(); as b) {
          <span class="git-branch-pill">
            <span class="git-branch-name">{{ b.branch || ('git.status.detached' | translate) }}</span>
            @if (b.ahead > 0) { <span class="git-ahead">↑{{ b.ahead }}</span> }
            @if (b.behind > 0) { <span class="git-behind">↓{{ b.behind }}</span> }
          </span>
        }
        <button class="btn btn-ghost btn-sm" (click)="refreshGit()" [disabled]="gitBusy()" [title]="'git.tooltip.refresh-status' | translate">
          {{ 'git.button.refresh' | translate }}
        </button>
      </div>

      <div class="git-grid">
        <div class="git-list">
          @if (gitEntries().length === 0) {
            <div class="git-empty">{{ 'git.empty.clean' | translate }}</div>
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
                <button class="git-row-btn" (click)="unstageFile(e.path, $event)" [title]="'git.tooltip.unstage' | translate">−</button>
              } @else {
                <button class="git-row-btn" (click)="stageFile(e.path, $event)" [title]="'git.tooltip.stage' | translate">+</button>
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
            <div class="git-diff-empty">{{ 'git.empty.select-file' | translate }}</div>
          }
        </div>
      </div>

      <div class="git-commit-bar">
        <input
          type="text"
          class="git-commit-input"
          [placeholder]="'git.placeholder.commit-message' | translate"
          [value]="gitCommitMessage()"
          (input)="gitCommitMessage.set($any($event.target).value)"
          (keydown.enter)="commitStaged()"
        />
        <button class="btn btn-secondary btn-sm" (click)="stageAll()" [disabled]="gitBusy()" [title]="'git.tooltip.stage-all' | translate">
          {{ 'git.button.stage-all' | translate }}
        </button>
        <button
          class="btn btn-primary btn-sm"
          (click)="commitStaged()"
          [disabled]="gitBusy() || !hasStaged() || !gitCommitMessage().trim()"
          [title]="'git.tooltip.commit-staged' | translate"
        >
          {{ 'git.button.commit' | translate }}
        </button>
      </div>

      @if (gitMessage(); as msg) {
        <div class="git-message">{{ msg }}</div>
      }
    </section>
  `,
  styles: [`
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
  `],
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
      GitBridge.Branch({ path: repo }),
      GitBridge.Status({ path: repo }),
    ]);
    if (branchRes.ok) {
      this.gitBranch.set({
        branch: branchRes.branch || '',
        ahead: branchRes.ahead || 0,
        behind: branchRes.behind || 0,
      });
    }
    if (statusRes.ok) {
      this.gitEntries.set((statusRes.entries as GitEntry[]) || []);
    } else {
      this.gitMessage.set(statusRes.error || 'git status failed');
    }
  }

  async selectGitFile(path: string): Promise<void> {
    this.gitSelectedFile.set(path);
    const repo = this.workspace.root();
    const entry = this.gitEntries().find((e) => e.path === path);
    const staged = !!entry?.staged && !entry?.unstaged;
    const res = await GitBridge.Diff({ path: repo, file: path, staged });
    if (res.ok) {
      this.gitDiff.set(res.diff || '(no diff — file may be untracked or unchanged)');
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
    const res = await GitBridge.Add({ path: this.workspace.root(), files: [path] });
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
    const res = await GitBridge.Unstage({ path: this.workspace.root(), files: [path] });
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
    const res = await GitBridge.Add({ path: this.workspace.root(), all: true });
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
    const res = await GitBridge.Commit({ path: this.workspace.root(), message: msg });
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
