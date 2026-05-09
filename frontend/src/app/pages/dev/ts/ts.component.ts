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
  styles: [`
    /* TS panel */
    .ts-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .ts-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ts-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ts-filter { flex: 1; background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 10px; border-radius: 5px; font-size: 12px; }
    .ts-filter:focus { border-color: var(--brand-400); outline: none; }
    .ts-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .ts-side { width: 320px; border-right: 1px solid var(--line-1); padding: 12px 10px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .ts-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; padding: 0 4px; }
    .ts-row { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; width: 100%; padding: 7px 9px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 3px; }
    .ts-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .ts-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .ts-name { font-size: 12px; color: var(--fg-1); font-weight: 600; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .ts-tag { font-size: 8px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .ts-tag.deno { background: color-mix(in oklch, #34d399 20%, var(--ink-1)); color: #34d399; }
    .ts-tag.ws { background: color-mix(in oklch, #a78bfa 20%, var(--ink-1)); color: #a78bfa; }
    .ts-meta { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .ts-fw { padding: 1px 5px; border-radius: 3px; background: var(--ink-1); color: var(--fg-3); font-size: 9px; }
    .ts-main { flex: 1; padding: 16px 20px; overflow-y: auto; min-width: 0; }
    .ts-detail h3 { font-size: 16px; color: var(--fg-1); margin: 0 0 4px; display: flex; align-items: baseline; gap: 8px; }
    .ts-detail h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 18px 0 8px; }
    .ts-version { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); font-weight: 400; }
    .ts-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); display: block; margin-bottom: 12px; }
    .ts-desc { color: var(--fg-2); font-size: 13px; line-height: 1.4; margin: 6px 0 14px; }
    .ts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px; }
    .ts-cell { display: flex; flex-direction: column; gap: 2px; padding: 7px 10px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; }
    .ts-cell code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-1); }
    .ts-cell .ok { color: #34d399; }
    .ts-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); }
    .ts-fw-list { display: flex; flex-wrap: wrap; gap: 5px; }
    .ts-fw-pill { font-size: 11px; padding: 3px 9px; background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1)); color: var(--brand-200); border-radius: 999px; font-family: var(--font-mono); }
    .ts-scripts { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 6px; }
    .ts-script { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; padding: 8px 12px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; cursor: pointer; text-align: left; }
    .ts-script:hover { border-color: var(--brand-400); background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .ts-script-name { font-family: var(--font-mono); font-size: 12px; color: var(--brand-200); }
    .ts-script-cmd { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .ts-empty, .ts-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .ts-empty-pane { padding: 30px; text-align: center; }
  `],
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
    // SWR — render cached data instantly, then silently force-refresh
    // so the user never looks at hours-old data after a navigation.
    void this.loadTSProjects().then(() => void this.loadTSProjects(true, true));
  }

  async loadTSProjects(force: boolean = false, silent: boolean = false): Promise<void> {
    if (!silent) this.tsLoading.set(true);
    try {
      const v = await callBridge<TSDetectResponse>('ts_detect', { force });
      this.tsProjects.set(v?.projects || []);
      this.tsCacheHit.set(!!v?.cache_hit);
      this.tsCacheAge.set(v?.cache_age_s || 0);
      if ((v?.projects || []).length > 0 && !this.tsSelected()) {
        this.tsSelected.set(v!.projects![0]);
      }
    } finally {
      if (!silent) this.tsLoading.set(false);
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
