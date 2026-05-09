// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';

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
  projects?: PHPProjectSummary[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

/**
 * PHP panel — Laravel project discovery + composer/artisan runner.
 *
 * TODO(snider/wails): swap callBridge('php_*') for a phpBridge wails
 * service.
 */
@Component({
  selector: 'dev-php',
  standalone: true,
  template: `
    <section class="block php-block">
      <div class="block-header php-header">
        <h2 class="block-title">
          PHP
          @if (phpCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="phpCacheAge() > 600" (click)="loadPHPProjects(true)" title="Click to force re-scan">● cached {{ formatCacheAge(phpCacheAge()) }}</span>
          } @else if (phpProjects().length > 0) {
            <span class="cache-pill cache-fresh" title="Just scanned">● fresh</span>
          }
        </h2>
        <span class="editorial subtitle">Laravel project discovery + tooling · Surface over <code>core/php</code>.</span>
      </div>
      @if (phpError(); as err) {
        <div class="php-error">{{ err }}</div>
      }
      <div class="php-body">
        <div class="php-side">
          <h3>Projects ({{ phpProjects().length }})</h3>
          @if (phpLoading() && phpProjects().length === 0) {
            <div class="php-empty">Scanning…</div>
          }
          @for (p of phpProjects(); track p.path) {
            <button class="php-row"
                    [class.active]="phpSelected()?.path === p.path"
                    (click)="selectPHPProject(p.path)">
              <span class="php-name">
                {{ p.name }}
                @if (p.frankenphp) { <span class="php-tag">FrankenPHP</span> }
              </span>
              <span class="php-url">{{ p.app_url || p.path }}</span>
            </button>
          }
        </div>

        <div class="php-main">
          @if (phpSelected(); as sel) {
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

              @if (phpScripts(); as scr) {
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
              } @else if (phpScriptsLoading()) {
                <div class="php-hint">Loading scripts…</div>
              }
            </div>
          } @else if (!phpLoading()) {
            <div class="php-empty-pane">No project selected.</div>
          }
        </div>
      </div>
    </section>
  `,
})
export class PhpComponent implements OnInit {
  private readonly router = inject(Router);

  readonly phpProjects = signal<PHPProjectSummary[]>([]);
  readonly phpScripts = signal<PHPScripts | null>(null);
  readonly phpScriptsLoading = signal(false);
  readonly phpSelected = signal<PHPProjectDetail | null>(null);
  readonly phpLoading = signal(false);
  readonly phpError = signal<string | null>(null);
  readonly phpCacheHit = signal(false);
  readonly phpCacheAge = signal(0);

  ngOnInit(): void {
    void this.loadPHPProjects();
  }

  async loadPHPProjects(force: boolean = false): Promise<void> {
    this.phpLoading.set(true);
    this.phpError.set(null);
    try {
      const v = await callBridge<PHPDetectResponse>('php_detect', { force });
      const projects = v?.projects || [];
      this.phpProjects.set(projects);
      this.phpCacheHit.set(!!v?.cache_hit);
      this.phpCacheAge.set(v?.cache_age_s || 0);
      if (projects.length > 0 && !this.phpSelected()) {
        await this.selectPHPProject(projects[0].path);
      }
    } catch (e) {
      this.phpError.set('php_detect failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.phpLoading.set(false);
    }
  }

  async selectPHPProject(path: string): Promise<void> {
    try {
      const v = await callBridge<PHPProjectDetail>('php_project', { path });
      this.phpSelected.set(v);
      void this.loadPHPScripts(path);
    } catch (e) {
      this.phpError.set('php_project failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async loadPHPScripts(path: string): Promise<void> {
    this.phpScriptsLoading.set(true);
    this.phpScripts.set(null);
    try {
      const v = await callBridge<PHPScripts>('php_scripts', { path });
      this.phpScripts.set(v);
    } finally {
      this.phpScriptsLoading.set(false);
    }
  }

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
