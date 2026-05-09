// SPDX-Licence-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
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
  playbooks?: DevopsPlaybook[];
}

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
  template: `
    <section class="block dvo-block">
      <div class="block-header dvo-header">
        <h2 class="block-title">DevOps</h2>
        <span class="editorial subtitle">Secret scanning + Ansible playbooks · Surface over <code>core/go-devops</code>.</span>
      </div>
      <div class="dvo-toolbar">
        <div class="dvo-tabs">
          <button class="dvo-tab" [class.active]="devopsTab() === 'secrets'" (click)="devopsTab.set('secrets')">
            Secrets <span class="dvo-tab-count">{{ devopsFindings().length || '—' }}</span>
          </button>
          <button class="dvo-tab" [class.active]="devopsTab() === 'playbooks'" (click)="devopsTab.set('playbooks'); ensurePlaybooksLoaded()">
            Playbooks <span class="dvo-tab-count">{{ devopsPlaybooks().length }}</span>
          </button>
        </div>
      </div>

      <div class="dvo-body">
        @if (devopsTab() === 'secrets') {
          <div class="dvo-scan-controls">
            <select class="dvo-input" [value]="devopsScanner()" (change)="devopsScanner.set($any($event.target).value)">
              <option value="regex">regex (built-in, no deps)</option>
              <option value="gitleaks">gitleaks (~150 patterns, requires binary)</option>
            </select>
            <span class="dvo-target">target: <code>{{ workspace.root() }}</code></span>
            <button class="btn btn-primary btn-sm" (click)="runDevopsSecretScan()" [disabled]="devopsScanRunning()">
              @if (devopsScanRunning()) { <span>scanning…</span> } @else { <span>Scan</span> }
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
              <div class="dvo-empty">No scan run yet — click Scan.</div>
            }
          </div>
        } @else {
          @if (devopsPlaybooksLoading()) {
            <div class="dvo-empty">Loading playbooks…</div>
          } @else if (devopsPlaybooks().length === 0) {
            <div class="dvo-empty">No playbooks found in ~/Code/DevOps/playbooks/ or core/go-devops/playbooks/.</div>
          } @else {
            <table class="dvo-table">
              <thead><tr><th>name</th><th>description</th><th>size</th><th>root</th></tr></thead>
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

  readonly devopsPlaybooks = signal<DevopsPlaybook[]>([]);
  readonly devopsPlaybooksLoading = signal(false);
  private playbooksLoaded = false;

  ensurePlaybooksLoaded(): void {
    if (this.playbooksLoaded) return;
    this.playbooksLoaded = true;
    void this.loadDevopsPlaybooks();
  }

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

  async loadDevopsPlaybooks(): Promise<void> {
    this.devopsPlaybooksLoading.set(true);
    try {
      const v = await callBridge<DevopsPlaybooksResponse>('devops_playbooks', {});
      this.devopsPlaybooks.set(v?.playbooks || []);
    } finally {
      this.devopsPlaybooksLoading.set(false);
    }
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
