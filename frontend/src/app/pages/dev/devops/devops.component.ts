// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';
import { FileEditorStore } from '../../../services/store/file-editor.store';
import { WorkspaceStore } from '../../../services/store/workspace.store';

interface DevopsFinding {
  file: string;
  line: number;
  column: number;
  rule: string;
  snippet: string;
}

interface DevopsRule {
  rule: string;
  count: number;
}

interface DevopsScanResponse {
  findings?: DevopsFinding[];
  rules?: DevopsRule[];
}

interface DevopsPlaybook {
  name: string;
  path: string;
  root: string;
  size_bytes: number;
  modified: string;
  description: string;
}

interface DevopsPlaybooksResponse {
  playbooks: DevopsPlaybook[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

const EMPTY_PLAYBOOKS: DevopsPlaybooksResponse = { playbooks: [] };

/**
 * DevOps panel — secret scanning + Ansible playbook listing. Surface
 * over core/go-devops.
 *
 * TODO(snider/wails): swap callBridge('devops_*') for a devopsBridge
 * wails service.
 *
 * TODO: openDevopsFinding + openPlaybook no-op (logs only). Wire to
 * shared FileEditorService when Search extracts.
 */
@Component({
  selector: 'dev-devops',
  standalone: true,
  imports: [DevSkeleton, TranslatePipe],
  template: `
    <section class="block dvo-block">
      <div class="block-header dvo-header">
        <h2 class="block-title">{{ 'devops.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'devops.subtitle.prefix' | translate }} <code>core/go-devops</code>.</span>
      </div>
      <div class="dvo-toolbar">
        <div class="dvo-tabs">
          <button class="dvo-tab" [class.active]="devopsTab() === 'secrets'" (click)="devopsTab.set('secrets')">
            {{ 'devops.tab.secrets' | translate }} <span class="dvo-tab-count">{{ devopsFindings().length || '—' }}</span>
          </button>
          <button class="dvo-tab" [class.active]="devopsTab() === 'playbooks'" (click)="devopsTab.set('playbooks'); ensurePlaybooksLoaded()">
            {{ 'devops.tab.playbooks' | translate }} <span class="dvo-tab-count">{{ devopsPlaybooks().length }}</span>
          </button>
        </div>
        @if (devopsTab() === 'playbooks') {
          @if (playbooksCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="playbooksCacheAge() > 600" (click)="loadDevopsPlaybooks(true)" [title]="'devops.tooltip.force-rescan' | translate">● {{ 'devops.cache.cached' | translate }} {{ formatCacheAge(playbooksCacheAge()) }}</span>
          } @else if (devopsPlaybooks().length > 0) {
            <span class="cache-pill cache-fresh" [title]="'devops.tooltip.just-scanned' | translate">● {{ 'devops.cache.fresh' | translate }}</span>
          }
        }
      </div>

      <div class="dvo-body">
        @if (devopsTab() === 'secrets') {
          <div class="dvo-scan-controls">
            <select class="dvo-input" [value]="devopsScanner()" (change)="devopsScanner.set($any($event.target).value)">
              <option value="regex">regex ({{ 'devops.option.regex-detail' | translate }})</option>
              <option value="gitleaks">gitleaks ({{ 'devops.option.gitleaks-detail' | translate }})</option>
            </select>
            <span class="dvo-target">{{ 'devops.label.target' | translate }} <code>{{ workspace.root() }}</code></span>
            <button class="btn btn-primary btn-sm" (click)="runDevopsSecretScan()" [disabled]="devopsScanRunning()">
              @if (devopsScanRunning()) { <span>{{ 'devops.status.scanning' | translate }}</span> } @else { <span>{{ 'devops.button.scan' | translate }}</span> }
            </button>
          </div>
          @if (devopsScanError(); as err) {
            <div class="dvo-error">{{ err }}</div>
          }
          @if (devopsRules().length > 0) {
            <div class="dvo-rule-summary">
              @for (r of devopsRules(); track r.rule) {
                <span class="dvo-rule-pill">{{ r.rule }} <span class="dvo-rule-count">{{ r.count }}</span></span>
              }
            </div>
          }
          <div class="dvo-findings">
            @for (f of devopsFindings(); track $index) {
              <button class="dvo-finding" (click)="openDevopsFinding(f)">
                <span class="dvo-rule">{{ f.rule }}</span>
                <span class="dvo-file"><code>{{ f.file }}</code><span class="dvo-line">:{{ f.line }}</span></span>
                <span class="dvo-snippet"><code>{{ f.snippet }}</code></span>
              </button>
            }
            @if (devopsFindings().length === 0 && !devopsScanRunning() && !devopsScanError()) {
              <div class="dvo-empty">{{ 'devops.empty.no-scan' | translate }}</div>
            }
          </div>
        } @else {
          @if (playbooksScan.firstLoad()) {
            <dev-skeleton kind="rows" [count]="6" />
          } @else if (devopsPlaybooks().length === 0) {
            <div class="dvo-empty">{{ 'devops.empty.no-playbooks' | translate }}</div>
          } @else {
            <table class="dvo-table">
              <thead><tr><th>{{ 'devops.column.name' | translate }}</th><th>{{ 'devops.column.description' | translate }}</th><th>{{ 'devops.column.size' | translate }}</th><th>{{ 'devops.column.root' | translate }}</th></tr></thead>
              <tbody>
                @for (p of devopsPlaybooks(); track p.path) {
                  <tr class="dvo-row" (click)="openPlaybook(p)">
                    <td><code>{{ p.name }}</code></td>
                    <td>{{ p.description || '—' }}</td>
                    <td><code>{{ p.size_bytes }}b</code></td>
                    <td><code>{{ p.root }}</code></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    /* DevOps panel */
    .dvo-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .dvo-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .dvo-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .dvo-tabs { display: flex; gap: 4px; }
    .dvo-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .dvo-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .dvo-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .dvo-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .dvo-scan-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--line-1); }
    .dvo-input { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 10px; border-radius: 5px; font-size: 12px; min-width: 200px; }
    .dvo-target { font-size: 11px; color: var(--fg-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-target code { font-family: var(--font-mono); color: var(--fg-2); }
    .dvo-error { color: #f87171; font-size: 12px; padding: 8px 12px; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-radius: 4px; margin-bottom: 10px; }
    .dvo-rule-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .dvo-rule-pill { font-size: 10px; font-family: var(--font-mono); padding: 3px 8px; background: color-mix(in oklch, #fbbf24 12%, var(--ink-2)); color: #fbbf24; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
    .dvo-rule-count { background: var(--ink-1); padding: 1px 6px; border-radius: 999px; color: #fbbf24; }
    .dvo-findings { display: flex; flex-direction: column; gap: 4px; }
    .dvo-finding { display: grid; grid-template-columns: 180px 1fr 200px; gap: 10px; align-items: baseline; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-bottom: 1px solid var(--line-1); cursor: pointer; text-align: left; font-size: 12px; }
    .dvo-finding:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .dvo-rule { font-family: var(--font-mono); font-size: 11px; color: #fbbf24; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-file { font-family: var(--font-mono); color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-file code { font-family: inherit; }
    .dvo-line { color: var(--brand-200); }
    .dvo-snippet { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-empty { padding: 30px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .dvo-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .dvo-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); background: var(--ink-2); }
    .dvo-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .dvo-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .dvo-row { cursor: pointer; }
    .dvo-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
  `],
})
export class DevopsComponent {
  readonly workspace = inject(WorkspaceStore);
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  readonly devopsTab = signal<'secrets' | 'playbooks'>('secrets');
  readonly devopsScanner = signal<'regex' | 'gitleaks'>('regex');
  readonly devopsFindings = signal<DevopsFinding[]>([]);
  readonly devopsRules = signal<DevopsRule[]>([]);
  readonly devopsScanError = signal<string | null>(null);
  readonly devopsScanRunning = signal(false);
  readonly devopsBasePath = signal<string>('');

  readonly playbooksScan = cachedBridgeResource<DevopsPlaybooksResponse>({
    tool: 'devops_playbooks',
    emptyValue: EMPTY_PLAYBOOKS,
    isEmpty: (v) => v.playbooks.length === 0,
  });

  readonly devopsPlaybooks = computed(() => this.playbooksScan.stable().playbooks);
  readonly devopsPlaybooksLoading = computed(() => this.playbooksScan.loading());
  readonly playbooksCacheHit = computed(() => this.playbooksScan.cacheHit());
  readonly playbooksCacheAge = computed(() => this.playbooksScan.cacheAge());

  /** No-op now — cachedBridgeResource fires at construction. Kept so
   *  the existing template (click)="ensurePlaybooksLoaded()" doesn't
   *  break. The cache makes eager-load cheap. */
  ensurePlaybooksLoaded(): void {}

  async runDevopsSecretScan(): Promise<void> {
    if (this.devopsScanRunning()) return;
    this.devopsScanRunning.set(true);
    this.devopsScanError.set(null);
    this.devopsFindings.set([]);
    this.devopsRules.set([]);
    const tool = this.devopsScanner() === 'gitleaks' ? 'devops_gitleaks' : 'devops_secrets_scan';
    const path = this.workspace.root();
    this.devopsBasePath.set(path);
    try {
      const v = await callBridge<DevopsScanResponse>(tool, { path });
      this.devopsFindings.set(v?.findings || []);
      this.devopsRules.set(v?.rules || []);
    } catch (e) {
      this.devopsScanError.set('devops bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.devopsScanRunning.set(false);
    }
  }

  /** Template alias — cache-pill click forces a refresh. */
  loadDevopsPlaybooks(force?: boolean): void {
    if (force) this.playbooksScan.refresh();
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  async openDevopsFinding(f: DevopsFinding): Promise<void> {
    const base = this.devopsBasePath() || this.workspace.root();
    const fullPath = f.file.startsWith('/') ? f.file : `${base.replace(/\/$/, '')}/${f.file}`;
    await this.fileEditor.openFile(fullPath);
    void this.router.navigate(['/dev/explorer']);
    this.fileEditor.revealLine(f.line, 1);
  }

  async openPlaybook(p: DevopsPlaybook): Promise<void> {
    await this.fileEditor.openFile(p.path);
    void this.router.navigate(['/dev/explorer']);
  }
}
