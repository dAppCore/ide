// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, inject, linkedSignal, resource } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';

interface PHPProjectSummary {
  path: string;
  name: string;
  app_name: string;
  app_url: string;
  package_mgr: string;
  frankenphp: boolean;
}

interface PHPProjectDetail extends PHPProjectSummary {
  domain?: string;
  services: string[];
  has_env: boolean;
  has_env_example: boolean;
  has_vendor: boolean;
  has_composer_lock: boolean;
  has_node_modules: boolean;
  has_package_lock: boolean;
}

interface PHPScriptItem {
  name: string;
  command: string;
  lines?: number;
  source?: string;
  artisan_args?: string[];
}

interface PHPScripts {
  composer_scripts: PHPScriptItem[];
  artisan_scripts: PHPScriptItem[];
  has_artisan: boolean;
  has_composer: boolean;
}

interface PHPDetectResponse {
  projects: PHPProjectSummary[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

const EMPTY_PHP: PHPDetectResponse = { projects: [] };

/**
 * PHP panel — Laravel project discovery + composer/artisan runner.
 *
 * Reactive shape: scan resource feeds projects list; `selected` is a
 * linkedSignal off projects (defaults to first, user-overridable);
 * detail + scripts resources auto-fetch when selected changes. No
 * manual sequencing, no effect()s — pure reactive flow.
 *
 * TODO(snider/wails): swap callBridge('php_*') for a phpBridge wails
 * service.
 */
@Component({
  selector: 'dev-php',
  standalone: true,
  imports: [DevSkeleton],
  template: `
    <section class="block php-block">
      <div class="block-header php-header">
        <h2 class="block-title">
          PHP
          @if (scan.cacheHit()) {
            <span class="cache-pill" [class.cache-stale]="scan.cacheAge() > 600" (click)="scan.refresh()" title="Click to force re-scan">● cached {{ formatCacheAge(scan.cacheAge()) }}</span>
          } @else if (projects().length > 0) {
            <span class="cache-pill cache-fresh" title="Just scanned">● fresh</span>
          }
        </h2>
        <span class="editorial subtitle">Laravel project discovery + tooling · Surface over <code>core/php</code>.</span>
      </div>
      @if (scan.error(); as err) {
        <div class="php-error">{{ err }}</div>
      }
      <div class="php-body">
        <div class="php-side">
          <h3>Projects ({{ projects().length }})</h3>
          @if (scan.firstLoad()) {
            <dev-skeleton kind="rows" [count]="6" />
          }
          @for (p of projects(); track p.path) {
            <button class="php-row"
                    [class.active]="selected() === p.path"
                    (click)="selected.set(p.path)">
              <span class="php-name">
                {{ p.name }}
                @if (p.frankenphp) { <span class="php-tag">FrankenPHP</span> }
              </span>
              <span class="php-url">{{ p.app_url || p.path }}</span>
            </button>
          }
        </div>

        <div class="php-main">
          @if (detail.value(); as sel) {
            <div class="php-detail">
              <h3>{{ sel.name }}</h3>
              <code class="php-path">{{ sel.path }}</code>

              <div class="php-grid">
                <div class="php-cell"><span class="php-label">App name</span><span>{{ sel.app_name || '—' }}</span></div>
                <div class="php-cell"><span class="php-label">App URL</span><span><code>{{ sel.app_url || '—' }}</code></span></div>
                <div class="php-cell"><span class="php-label">Domain</span><span><code>{{ sel.domain || '—' }}</code></span></div>
                <div class="php-cell"><span class="php-label">Package manager</span><span><code>{{ sel.package_mgr }}</code></span></div>
              </div>

              <h4>Detected services</h4>
              <div class="php-services">
                @for (s of sel.services; track s) {
                  <span class="php-service">{{ s }}</span>
                }
                @if (sel.services.length === 0) { <span class="php-empty">none</span> }
              </div>

              <h4>Project state</h4>
              <div class="php-state-grid">
                <span class="php-state" [class.ok]="sel.has_env" [class.warn]="!sel.has_env">.env {{ sel.has_env ? '✓' : '⚠' }}</span>
                <span class="php-state" [class.ok]="sel.has_env_example">env.example {{ sel.has_env_example ? '✓' : '—' }}</span>
                <span class="php-state" [class.ok]="sel.has_vendor" [class.warn]="!sel.has_vendor">vendor/ {{ sel.has_vendor ? '✓' : '⚠' }}</span>
                <span class="php-state" [class.ok]="sel.has_composer_lock">composer.lock {{ sel.has_composer_lock ? '✓' : '—' }}</span>
                <span class="php-state" [class.ok]="sel.has_node_modules">node_modules/ {{ sel.has_node_modules ? '✓' : '—' }}</span>
                <span class="php-state" [class.ok]="sel.has_package_lock">package-lock {{ sel.has_package_lock ? '✓' : '—' }}</span>
              </div>

              @if (scripts.value(); as scr) {
                @if (scr.composer_scripts.length > 0) {
                  <h4>composer scripts <span class="php-grid-meta">({{ scr.composer_scripts.length }})</span></h4>
                  <div class="php-script-grid">
                    @for (s of scr.composer_scripts; track s.name) {
                      <button class="php-script-card" (click)="runPHPScript(sel.path, 'composer', {name: s.name})" [title]="s.command">
                        <span class="php-script-name">{{ s.name }}</span>
                        @if ((s.lines || 0) > 1) { <span class="php-script-lines">+{{ (s.lines || 0) - 1 }}</span> }
                        <span class="php-script-cmd">{{ s.command }}</span>
                      </button>
                    }
                  </div>
                }
                @if (scr.artisan_scripts.length > 0) {
                  <h4>artisan <span class="php-grid-meta">({{ scr.artisan_scripts.length }} canonical)</span></h4>
                  <div class="php-script-grid">
                    @for (s of scr.artisan_scripts; track s.name) {
                      <button class="php-script-card" (click)="runPHPScript(sel.path, 'artisan', {args: s.artisan_args})" [title]="s.command">
                        <span class="php-script-name">{{ s.name }}</span>
                        <span class="php-script-cmd">{{ s.command }}</span>
                      </button>
                    }
                  </div>
                }
                <div class="php-hint">Click any script — runs in <code>{{ sel.path }}</code> and auto-jumps to /process.</div>
              } @else if (scripts.isLoading()) {
                <div class="php-hint">Loading scripts…</div>
              }
            </div>
          } @else if (!scan.loading()) {
            <div class="php-empty-pane">No project selected.</div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* PHP scripts grid (symmetric to TS scripts) */
    .php-script-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin: 6px 0 14px; }
    .php-script-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; padding: 8px 10px; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; flex-direction: column; gap: 3px; position: relative; }
    .php-script-card:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 6%, var(--ink-2)); }
    .php-script-name { font-size: 12px; font-weight: 600; color: var(--fg-1); font-family: var(--font-mono); }
    .php-script-lines { position: absolute; top: 6px; right: 8px; font-size: 9px; color: var(--brand-200); font-family: var(--font-mono); }
    .php-script-cmd { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .php-grid-meta { color: var(--fg-3); font-weight: normal; font-size: 11px; }
    /* PHP panel */
    .php-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .php-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .php-error { padding: 8px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 12px; }
    .php-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .php-side { width: 260px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .php-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .php-row { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; width: 100%; padding: 8px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .php-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .php-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .php-name { font-size: 12px; color: var(--fg-1); font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .php-tag { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: color-mix(in oklch, #a78bfa 18%, var(--ink-1)); color: #a78bfa; text-transform: uppercase; letter-spacing: 0.04em; }
    .php-url { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .php-main { flex: 1; padding: 16px 20px; overflow-y: auto; min-width: 0; }
    .php-empty, .php-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .php-empty-pane { padding: 30px; text-align: center; }
    .php-detail h3 { font-size: 16px; color: var(--fg-1); margin: 0 0 4px; }
    .php-detail h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 18px 0 8px; }
    .php-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); display: block; margin-bottom: 14px; }
    .php-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin-bottom: 6px; }
    .php-cell { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; }
    .php-cell code { font-family: var(--font-mono); }
    .php-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); }
    .php-cell > span:not(.php-label) { font-size: 12px; color: var(--fg-1); }
    .php-services { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-service { font-size: 11px; padding: 3px 9px; background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1)); color: var(--brand-200); border-radius: 999px; font-family: var(--font-mono); }
    .php-state-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-state { font-size: 10px; font-family: var(--font-mono); padding: 3px 8px; border-radius: 4px; background: var(--ink-1); color: var(--fg-3); }
    .php-state.ok { background: color-mix(in oklch, #34d399 12%, var(--ink-1)); color: #34d399; }
    .php-state.warn { background: color-mix(in oklch, #fbbf24 12%, var(--ink-1)); color: #fbbf24; }
    .php-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-hint { font-size: 11px; color: var(--fg-3); font-style: italic; margin-top: 8px; }
  `],
})
export class PhpComponent {
  private readonly router = inject(Router);

  readonly scan = cachedBridgeResource<PHPDetectResponse>({
    tool: 'php_detect',
    emptyValue: EMPTY_PHP,
    isEmpty: (v) => v.projects.length === 0,
  });

  readonly projects = computed(() => this.scan.stable().projects);

  // Selected project path — defaults to first project, preserves user
  // selection across refreshes if it survives in the new list.
  readonly selected = linkedSignal<PHPProjectSummary[], string | null>({
    source: this.projects,
    computation: (newProjects, prev) => {
      const prevPath = prev?.value;
      if (prevPath && newProjects.find((p) => p.path === prevPath)) return prevPath;
      return newProjects[0]?.path ?? null;
    },
  });

  // Detail + scripts auto-fetch reactively when `selected` path changes.
  // No manual sequencing, no effect() — params signal drives the loader.
  readonly detail = resource<PHPProjectDetail | null, string | null>({
    defaultValue: null,
    params: () => this.selected(),
    loader: ({ params }) =>
      params ? callBridge<PHPProjectDetail>('php_project', { path: params }) : Promise.resolve(null),
  });

  readonly scripts = resource<PHPScripts | null, string | null>({
    defaultValue: null,
    params: () => this.selected(),
    loader: ({ params }) =>
      params ? callBridge<PHPScripts>('php_scripts', { path: params }) : Promise.resolve(null),
  });

  async runPHPScript(
    path: string,
    mode: 'composer' | 'artisan' | 'raw',
    extra: { name?: string; args?: string[]; command?: string },
  ): Promise<void> {
    try {
      await callBridge('php_run', { path, mode, ...extra });
      void this.router.navigate(['/dev/process']);
    } catch {
      // ignore
    }
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}
