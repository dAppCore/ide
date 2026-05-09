// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';

interface TSScript {
  name: string;
  cmd: string;
}

interface TSProject {
  path: string;
  name: string;
  version: string;
  description: string;
  package_manager: string;
  frameworks: string[];
  scripts: TSScript[];
  deno: boolean;
  workspace: boolean;
  has_node_modules: boolean;
  has_lockfile: boolean;
  has_tsconfig: boolean;
  modified: string;
}

interface TSDetectResponse {
  projects?: TSProject[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

/**
 * TypeScript panel — TS / Deno / JS project discovery + script runner.
 *
 * TODO(snider/wails): swap callBridge('ts_*') for a tsBridge wails
 * service.
 */
@Component({
  selector: 'dev-ts',
  standalone: true,
  template: `
    <section class="block ts-block">
      <div class="block-header ts-header">
        <h2 class="block-title">
          TypeScript
          @if (tsCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="tsCacheAge() > 600" (click)="loadTSProjects(true)" title="Click to force re-scan">● cached {{ formatCacheAge(tsCacheAge()) }}</span>
          } @else if (tsProjects().length > 0) {
            <span class="cache-pill cache-fresh" title="Just scanned">● fresh</span>
          }
        </h2>
        <span class="editorial subtitle">TS / Deno / JS project discovery · 115 projects across the canon. Click a script → output streams in /process.</span>
      </div>
      <div class="ts-toolbar">
        <input type="text" class="ts-filter" placeholder="filter by name, framework, package manager…"
               [value]="tsFilter()"
               (input)="tsFilter.set($any($event.target).value)" />
        <button class="btn btn-ghost btn-sm" (click)="loadTSProjects()" [disabled]="tsLoading()">
          @if (tsLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
        </button>
      </div>

      <div class="ts-body">
        <div class="ts-side">
          <h3>{{ tsVisible().length }} of {{ tsProjects().length }}</h3>
          @for (p of tsVisible(); track p.path) {
            <button class="ts-row"
                    [class.active]="tsSelected()?.path === p.path"
                    (click)="selectTSProject(p)">
              <span class="ts-name">
                {{ p.name }}
                @if (p.deno) { <span class="ts-tag deno">deno</span> }
                @if (p.workspace) { <span class="ts-tag ws">ws</span> }
              </span>
              <span class="ts-meta">
                <code>{{ p.package_manager }}</code>
                @for (fw of p.frameworks.slice(0, 3); track fw) {
                  <span class="ts-fw">{{ fw }}</span>
                }
              </span>
            </button>
          }
        </div>

        <div class="ts-main">
          @if (tsSelected(); as sel) {
            <div class="ts-detail">
              <h3>{{ sel.name }} <span class="ts-version">{{ sel.version }}</span></h3>
              <code class="ts-path">{{ sel.path }}</code>
              @if (sel.description) { <p class="ts-desc">{{ sel.description }}</p> }

              <div class="ts-grid">
                <div class="ts-cell"><span class="ts-label">Package manager</span><code>{{ sel.package_manager }}</code></div>
                <div class="ts-cell"><span class="ts-label">Modified</span><code>{{ sel.modified }}</code></div>
                <div class="ts-cell"><span class="ts-label">tsconfig</span><span [class.ok]="sel.has_tsconfig">{{ sel.has_tsconfig ? '✓' : '—' }}</span></div>
                <div class="ts-cell"><span class="ts-label">node_modules</span><span [class.ok]="sel.has_node_modules">{{ sel.has_node_modules ? '✓' : '—' }}</span></div>
                <div class="ts-cell"><span class="ts-label">lockfile</span><span [class.ok]="sel.has_lockfile">{{ sel.has_lockfile ? '✓' : '—' }}</span></div>
                <div class="ts-cell"><span class="ts-label">workspace root</span><span [class.ok]="sel.workspace">{{ sel.workspace ? '✓' : '—' }}</span></div>
              </div>

              @if (sel.frameworks.length > 0) {
                <h4>Frameworks</h4>
                <div class="ts-fw-list">
                  @for (fw of sel.frameworks; track fw) {
                    <span class="ts-fw-pill">{{ fw }}</span>
                  }
                </div>
              }

              @if (sel.scripts.length > 0) {
                <h4>{{ sel.deno ? 'Tasks' : 'Scripts' }}</h4>
                <div class="ts-scripts">
                  @for (s of sel.scripts; track s.name) {
                    <button class="ts-script" (click)="runTSScript(sel, s.name)" [title]="s.cmd">
                      <span class="ts-script-name">{{ s.name }}</span>
                      <span class="ts-script-cmd"><code>{{ s.cmd.length > 60 ? s.cmd.slice(0, 60) + '…' : s.cmd }}</code></span>
                    </button>
                  }
                </div>
              } @else {
                <p class="ts-empty">No scripts defined.</p>
              }
            </div>
          } @else {
            <div class="ts-empty-pane">No project selected.</div>
          }
        </div>
      </div>
    </section>
  `,
})
export class TsComponent implements OnInit {
  private readonly router = inject(Router);

  readonly tsProjects = signal<TSProject[]>([]);
  readonly tsSelected = signal<TSProject | null>(null);
  readonly tsLoading = signal(false);
  readonly tsFilter = signal<string>('');
  readonly tsCacheHit = signal(false);
  readonly tsCacheAge = signal(0);

  readonly tsVisible = computed(() => {
    const f = this.tsFilter().toLowerCase().trim();
    if (!f) return this.tsProjects();
    return this.tsProjects().filter(
      (p) =>
        (p.name || '').toLowerCase().includes(f) ||
        (p.frameworks || []).some((fw) => fw.toLowerCase().includes(f)) ||
        (p.package_manager || '').toLowerCase().includes(f) ||
        p.path.toLowerCase().includes(f),
    );
  });

  ngOnInit(): void {
    void this.loadTSProjects();
  }

  async loadTSProjects(force: boolean = false): Promise<void> {
    this.tsLoading.set(true);
    try {
      const v = await callBridge<TSDetectResponse>('ts_detect', { force });
      this.tsProjects.set(v?.projects || []);
      this.tsCacheHit.set(!!v?.cache_hit);
      this.tsCacheAge.set(v?.cache_age_s || 0);
      if ((v?.projects || []).length > 0 && !this.tsSelected()) {
        this.tsSelected.set(v!.projects![0]);
      }
    } finally {
      this.tsLoading.set(false);
    }
  }

  selectTSProject(p: TSProject): void {
    this.tsSelected.set(p);
  }

  async runTSScript(p: TSProject, scriptName: string): Promise<void> {
    try {
      await callBridge('ts_script', {
        path: p.path,
        script: scriptName,
        package_manager: p.package_manager,
      });
      // Jump to /process so user can watch the output.
      void this.router.navigate(['/dev/process']);
    } catch {
      // ignore — user can retry
    }
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}
