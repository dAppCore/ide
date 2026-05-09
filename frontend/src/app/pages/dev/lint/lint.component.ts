// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { FileEditorStore } from '../../../services/store/file-editor.store';
import { WorkspaceStore } from '../../../services/store/workspace.store';

interface LintIssue {
  rule_id: string;
  title: string;
  severity: string;
  file: string;
  line: number;
  match: string;
  fix: string;
}

interface LintCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

interface LintRunResponse {
  issues?: LintIssue[];
  counts?: Partial<LintCounts>;
  total?: number;
  binary_path?: string;
  duration_ms?: number;
  path?: string;
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info';

const ZERO_COUNTS: LintCounts = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
  total: 0,
};

/**
 * Lint panel — pattern-based static analysis surface over core/lint.
 *
 * TODO(snider/wails): swap callBridge('lint_run') for a lintBridge
 * wails service. Big-payoff binding — lint runs are slow enough that
 * goroutine line-speed matters.
 *
 * TODO: openLintIssue currently no-ops. The IdeComponent version
 * delegates to openSearchResult which opens the file in Monaco; that
 * needs to live behind a shared FileEditorService once Search is
 * extracted too. For now the row-click is informational only.
 */
@Component({
  selector: 'dev-lint',
  standalone: true,
  template: `
    <section class="block lint-block">
      <div class="block-header lint-header">
        <h2 class="block-title">Lint</h2>
        <span class="editorial subtitle">Pattern-based static analysis. Surface over <code>core/lint</code>.</span>
      </div>
      <div class="lint-toolbar">
        <div class="lint-filters">
          <button class="lint-chip" [class.active]="lintFilter() === 'all'" (click)="lintFilter.set('all')">
            All <span class="lint-chip-count">{{ lintCounts().total }}</span>
          </button>
          @if (lintCounts().critical > 0) {
            <button class="lint-chip critical" [class.active]="lintFilter() === 'critical'" (click)="lintFilter.set('critical')">
              Critical <span class="lint-chip-count">{{ lintCounts().critical }}</span>
            </button>
          }
          @if (lintCounts().high > 0) {
            <button class="lint-chip high" [class.active]="lintFilter() === 'high'" (click)="lintFilter.set('high')">
              High <span class="lint-chip-count">{{ lintCounts().high }}</span>
            </button>
          }
          @if (lintCounts().medium > 0) {
            <button class="lint-chip medium" [class.active]="lintFilter() === 'medium'" (click)="lintFilter.set('medium')">
              Medium <span class="lint-chip-count">{{ lintCounts().medium }}</span>
            </button>
          }
          @if (lintCounts().low > 0) {
            <button class="lint-chip low" [class.active]="lintFilter() === 'low'" (click)="lintFilter.set('low')">
              Low <span class="lint-chip-count">{{ lintCounts().low }}</span>
            </button>
          }
          @if (lintCounts().info > 0) {
            <button class="lint-chip info" [class.active]="lintFilter() === 'info'" (click)="lintFilter.set('info')">
              Info <span class="lint-chip-count">{{ lintCounts().info }}</span>
            </button>
          }
        </div>
        <button class="btn btn-primary btn-sm" (click)="runLint()" [disabled]="lintRunning()">
          @if (lintRunning()) { <span>scanning…</span> } @else { <span>Re-run</span> }
        </button>
      </div>
      @if (lintError(); as err) {
        <div class="lint-error">{{ err }}</div>
      }
      @if (lintBinary()) {
        <div class="lint-meta">
          {{ lintCounts().total }} issues · {{ lintDurationMs() }}ms · <code>{{ lintBinary() }}</code>
        </div>
      }
      <div class="lint-list">
        @for (i of lintVisible(); track $index) {
          <button class="lint-row" [class]="'sev-' + i.severity" (click)="openLintIssue(i)">
            <span class="lint-severity sev-{{ i.severity }}">{{ i.severity }}</span>
            <span class="lint-rule">{{ i.rule_id }}</span>
            <span class="lint-title">{{ i.title }}</span>
            <span class="lint-loc">
              <span class="lint-file">{{ i.file }}</span>
              <span class="lint-line">:{{ i.line }}</span>
            </span>
          </button>
        }
        @if (lintVisible().length === 0 && !lintRunning() && !lintError()) {
          <div class="lint-empty">
            @if (lintCounts().total === 0) {
              ✓ No issues found.
            } @else {
              No issues match the {{ lintFilter() }} filter.
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class LintComponent implements OnInit {
  private readonly workspace = inject(WorkspaceStore);
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  readonly lintIssues = signal<LintIssue[]>([]);
  readonly lintCounts = signal<LintCounts>(ZERO_COUNTS);
  readonly lintRunning = signal(false);
  readonly lintError = signal<string | null>(null);
  readonly lintFilter = signal<SeverityFilter>('all');
  readonly lintBinary = signal<string>('');
  readonly lintDurationMs = signal<number>(0);
  readonly lintBasePath = signal<string>('');

  readonly lintVisible = computed(() => {
    const filter = this.lintFilter();
    const all = this.lintIssues();
    if (filter === 'all') return all;
    return all.filter((i) => i.severity === filter);
  });

  ngOnInit(): void {
    if (this.lintIssues().length === 0 && !this.lintRunning() && !this.lintError()) {
      void this.runLint();
    }
  }

  async runLint(): Promise<void> {
    if (this.lintRunning()) return;
    this.lintRunning.set(true);
    this.lintError.set(null);
    try {
      const v = await callBridge<LintRunResponse>('lint_run', { path: this.workspace.root() });
      const issues = Array.isArray(v.issues) ? v.issues : [];
      const counts = v.counts || {};
      this.lintIssues.set(issues);
      this.lintCounts.set({
        critical: counts.critical || 0,
        high: counts.high || 0,
        medium: counts.medium || 0,
        low: counts.low || 0,
        info: counts.info || 0,
        total: v.total ?? issues.length,
      });
      this.lintBinary.set(v.binary_path || '');
      this.lintDurationMs.set(v.duration_ms || 0);
      this.lintBasePath.set(v.path || this.workspace.root());
    } catch (e) {
      this.lintError.set('lint bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.lintRunning.set(false);
    }
  }

  async openLintIssue(issue: LintIssue): Promise<void> {
    const base = this.lintBasePath() || this.workspace.root();
    const fullPath = issue.file.startsWith('/') ? issue.file : `${base.replace(/\/$/, '')}/${issue.file}`;
    await this.fileEditor.openFile(fullPath);
    void this.router.navigate(['/dev/explorer']);
    this.fileEditor.revealLine(issue.line, 1);
  }
}
