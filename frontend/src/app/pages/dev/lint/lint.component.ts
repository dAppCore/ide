// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import * as LintBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/lintbridge';
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
 * Migrated 2026-05-09 to typed LintBridge wails binding.
 * was: TODO(snider/wails): swap callBridge('lint_run') for a lintBridge
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
  imports: [TranslatePipe],
  template: `
    <section class="block lint-block">
      <div class="block-header lint-header">
        <h2 class="block-title">{{ 'lint.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'lint.subtitle.prefix' | translate }} <code>core/lint</code>.</span>
      </div>
      <div class="lint-toolbar">
        <div class="lint-filters">
          <button class="lint-chip" [class.active]="lintFilter() === 'all'" (click)="lintFilter.set('all')">
            {{ 'lint.tab.all' | translate }} <span class="lint-chip-count">{{ lintCounts().total }}</span>
          </button>
          @if (lintCounts().critical > 0) {
            <button class="lint-chip critical" [class.active]="lintFilter() === 'critical'" (click)="lintFilter.set('critical')">
              {{ 'lint.tab.critical' | translate }} <span class="lint-chip-count">{{ lintCounts().critical }}</span>
            </button>
          }
          @if (lintCounts().high > 0) {
            <button class="lint-chip high" [class.active]="lintFilter() === 'high'" (click)="lintFilter.set('high')">
              {{ 'lint.tab.high' | translate }} <span class="lint-chip-count">{{ lintCounts().high }}</span>
            </button>
          }
          @if (lintCounts().medium > 0) {
            <button class="lint-chip medium" [class.active]="lintFilter() === 'medium'" (click)="lintFilter.set('medium')">
              {{ 'lint.tab.medium' | translate }} <span class="lint-chip-count">{{ lintCounts().medium }}</span>
            </button>
          }
          @if (lintCounts().low > 0) {
            <button class="lint-chip low" [class.active]="lintFilter() === 'low'" (click)="lintFilter.set('low')">
              {{ 'lint.tab.low' | translate }} <span class="lint-chip-count">{{ lintCounts().low }}</span>
            </button>
          }
          @if (lintCounts().info > 0) {
            <button class="lint-chip info" [class.active]="lintFilter() === 'info'" (click)="lintFilter.set('info')">
              {{ 'lint.tab.info' | translate }} <span class="lint-chip-count">{{ lintCounts().info }}</span>
            </button>
          }
        </div>
        <button class="btn btn-primary btn-sm" (click)="runLint()" [disabled]="lintRunning()">
          @if (lintRunning()) { <span>{{ 'lint.status.scanning' | translate }}</span> } @else { <span>{{ 'lint.button.rerun' | translate }}</span> }
        </button>
      </div>
      @if (lintError(); as err) {
        <div class="lint-error">{{ err }}</div>
      }
      @if (lintBinary()) {
        <div class="lint-meta">
          {{ lintCounts().total }} {{ 'lint.label.issues' | translate }} · {{ lintDurationMs() }}ms · <code>{{ lintBinary() }}</code>
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
              ✓ {{ 'lint.empty.no-issues' | translate }}
            } @else {
              {{ 'lint.empty.no-filter-match.prefix' | translate }} {{ lintFilter() }} {{ 'lint.empty.no-filter-match.suffix' | translate }}
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    /* Lint panel */
    .lint-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .lint-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .lint-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .lint-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .lint-chip { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 10px; border-radius: 999px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .lint-chip:hover { border-color: var(--brand-400); }
    .lint-chip.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .lint-chip.critical.active { background: color-mix(in oklch, #f87171 26%, var(--ink-2)); border-color: #f87171; }
    .lint-chip.high.active { background: color-mix(in oklch, #fbbf24 22%, var(--ink-2)); border-color: #fbbf24; }
    .lint-chip-count { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); padding: 1px 6px; border-radius: 999px; background: var(--ink-1); }
    .lint-chip.active .lint-chip-count { color: var(--brand-200); }
    .lint-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .lint-meta { padding: 6px 18px; font-size: 11px; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .lint-meta code { font-family: var(--font-mono); color: var(--fg-2); }
    .lint-list { flex: 1; overflow-y: auto; padding: 4px 18px 18px; }
    .lint-row {
      display: grid;
      grid-template-columns: 70px 110px 1fr auto;
      gap: 12px;
      align-items: baseline;
      width: 100%;
      padding: 7px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-bottom: 1px solid var(--line-1);
      cursor: pointer;
      text-align: left;
      font-size: 12px;
      color: var(--fg-1);
    }
    .lint-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .lint-severity {
      font-family: var(--font-mono);
      font-size: 10px;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--ink-1);
      color: var(--fg-3);
      letter-spacing: 0.04em;
    }
    .lint-severity.sev-critical { background: color-mix(in oklch, #f87171 22%, var(--ink-1)); color: #f87171; }
    .lint-severity.sev-high { background: color-mix(in oklch, #fbbf24 22%, var(--ink-1)); color: #fbbf24; }
    .lint-severity.sev-medium { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .lint-severity.sev-low { background: color-mix(in oklch, #34d399 14%, var(--ink-1)); color: #34d399; }
    .lint-severity.sev-info { background: var(--ink-1); color: var(--fg-3); }
    .lint-rule { font-family: var(--font-mono); font-size: 11px; color: var(--brand-200); }
    .lint-title { color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lint-loc { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); white-space: nowrap; }
    .lint-file { color: var(--fg-2); }
    .lint-line { color: var(--brand-200); }
    .lint-empty { padding: 40px; text-align: center; color: var(--fg-3); font-size: 13px; }
  `],
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
      const v = await LintBridge.Run({ path: this.workspace.root() });
      const issues = Array.isArray(v.issues) ? v.issues : [];
      const counts = v.counts || {};
      this.lintIssues.set(issues);
      this.lintCounts.set({
        critical: counts['critical'] || 0,
        high: counts['high'] || 0,
        medium: counts['medium'] || 0,
        low: counts['low'] || 0,
        info: counts['info'] || 0,
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
