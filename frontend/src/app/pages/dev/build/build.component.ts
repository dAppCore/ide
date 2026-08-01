// SPDX-Licence-Identifier: EUPL-1.2

import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import * as BuildBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/buildbridge';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';
import { WorkspaceStore } from '../../../services/store/workspace.store';

/**
 * Build panel — surface over `core/go-build`. Detects the project,
 * runs the build, polls process_output for streaming logs.
 *
 * TODO(snider/wails): the data path here goes through `lib/bridge.ts`
 * (MCP HTTP) because there's no wails binding for build operations
 * yet. Replace `callBridge('build_detect')` etc. with a wails-bound
 * `buildBridge.Detect()` once a buildBridge service is added to
 * cmd/core-ide and wired into Options.Services.
 */
interface BuildDetected {
  path: string;
  project_type: string;
  command: string;
  args: string[];
  core_bin_on_path: boolean;
  cache_hit?: boolean;
  cache_age_s?: number;
}

interface BuildRunResponse {
  ok: boolean;
  error?: string;
  id?: string;
  process_id?: string;
  build_command?: string;
  build_args?: string[];
  value?: { process_id?: string };
}

@Component({
  selector: 'dev-build',
  standalone: true,
  imports: [DevSkeleton, TranslatePipe],
  template: `
    <section class="block build-block">
      <div class="block-header build-header">
        <h2 class="block-title">
          {{ 'build.title' | translate }}
          @if (buildCacheHit()) {
            <span class="cache-pill" [class.cache-stale]="buildCacheAge() > 600" (click)="detectBuild(true)" [title]="'build.tooltip.force-redetect' | translate">● {{ 'build.cache.cached' | translate }} {{ formatCacheAge(buildCacheAge()) }}</span>
          } @else if (buildDetected()) {
            <span class="cache-pill cache-fresh" [title]="'build.tooltip.just-detected' | translate">● {{ 'build.cache.fresh' | translate }}</span>
          }
        </h2>
        <span class="editorial subtitle">{{ 'build.subtitle.surface' | translate }} <code>core/go-build</code>{{ 'build.subtitle.detects' | translate }}</span>
      </div>
      <div class="build-toolbar">
        <div class="build-meta">
          @if (buildDetected(); as d) {
            <span class="build-type-pill">{{ d.project_type }}</span>
            <code class="build-cmd">{{ d.command }} {{ d.args.join(' ') }}</code>
            @if (!d.core_bin_on_path) {
              <span class="build-hint">{{ 'build.hint.core-bin-fallback' | translate }}</span>
            }
          } @else if (detect.firstLoad()) {
            <dev-skeleton kind="detail" />
          } @else {
            <span class="build-hint">{{ 'build.empty.no-config' | translate }}</span>
          }
        </div>
        <div class="build-actions">
          <button class="btn btn-ghost btn-sm" (click)="detectBuild(true)" [disabled]="buildRunning()">{{ 'build.button.redetect' | translate }}</button>
          @if (!buildRunning()) {
            <button class="btn btn-primary btn-sm" (click)="runBuild()" [disabled]="!buildDetected() || buildDetected()?.project_type === 'unknown'">
              ▸ {{ 'build.button.build' | translate }}
            </button>
          } @else {
            <button class="btn btn-ghost btn-sm" (click)="cancelBuild()">⏹ {{ 'build.button.cancel' | translate }}</button>
          }
        </div>
      </div>
      @if (buildError(); as err) {
        <div class="build-error">{{ err }}</div>
      }
      <div class="build-log">
        @if (buildLog()) {
          <pre>{{ buildLog() }}</pre>
        } @else if (buildRunning()) {
          <pre class="build-running">{{ 'build.status.building' | translate }}</pre>
        } @else {
          <pre class="build-empty">{{ 'build.empty.start' | translate }}</pre>
        }
      </div>
    </section>
  `,
  styles: [`
    /* Build panel */
    .build-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .build-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .build-toolbar {
      display: flex;
      gap: 12px;
      padding: 10px 18px;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .build-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .build-type-pill {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 10px;
      border-radius: 999px;
    }
    .build-cmd {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--fg-2);
      background: var(--ink-2);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .build-hint { font-size: 11px; color: var(--fg-3); font-style: italic; }
    .build-actions { display: flex; gap: 6px; }
    .build-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .build-log {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      background: var(--ink-0);
    }
    .build-log pre {
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.5;
      color: var(--fg-2);
      white-space: pre-wrap;
      margin: 0;
    }
    .build-empty, .build-running { color: var(--fg-3); font-style: italic; }
  `],
})
export class BuildComponent implements OnInit {
  private readonly workspace = inject(WorkspaceStore);
  private readonly destroyRef = inject(DestroyRef);

  // build_detect is per-path — extraParams reads workspace.root()
  // reactively, so changing the workspace root (via repos card click,
  // settings save, explorer navigation) auto-refetches detection.
  readonly detect = cachedBridgeResource<BuildDetected>({
    loader: ({ path, force }) =>
      BuildBridge.Detect({ path: String(path ?? ''), force: !!force }) as unknown as Promise<BuildDetected>,
    emptyValue: { path: '', project_type: 'unknown', command: '', args: [], core_bin_on_path: false },
    isEmpty: (v) => v.project_type === 'unknown' && v.path === '',
    extraParams: () => ({ path: this.workspace.root() }),
  });

  readonly buildDetected = computed(() => {
    const v = this.detect.stable();
    return v.path ? v : null;
  });
  readonly buildCacheHit = computed(() => this.detect.cacheHit());
  readonly buildCacheAge = computed(() => this.detect.cacheAge());

  readonly buildLog = signal<string>('');
  readonly buildRunning = signal(false);
  readonly buildError = signal<string | null>(null);
  readonly buildProcessId = signal<string | null>(null);

  private buildPollTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      if (this.buildPollTimer) clearInterval(this.buildPollTimer);
    });
  }

  /** Template alias — Re-detect button. */
  detectBuild(force?: boolean): void {
    if (force) this.detect.refresh();
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  async runBuild(): Promise<void> {
    if (this.buildRunning()) return;
    this.buildError.set(null);
    this.buildLog.set('');
    this.buildRunning.set(true);
    try {
      // build_run wraps process_start; the response carries the spawned
      // process id at the top level so we can poll its output stream.
      const res = await BuildBridge.Run({ path: this.workspace.root() });
      const pid = res.process_id;
      if (!pid) {
        this.buildError.set(res.error || 'build kicked off but no process id returned');
        this.buildRunning.set(false);
        return;
      }
      this.buildProcessId.set(pid);
      const detected = this.detect.stable();
      this.buildLog.set(`$ ${detected.command} ${(detected.args || []).join(' ')}\n\n`);
      if (this.buildPollTimer) clearInterval(this.buildPollTimer);
      this.buildPollTimer = setInterval(() => void this.pollBuildLog(), 500);
    } catch (e) {
      this.buildError.set('build run error: ' + (e instanceof Error ? e.message : String(e)));
      this.buildRunning.set(false);
    }
  }

  async cancelBuild(): Promise<void> {
    const pid = this.buildProcessId();
    if (!pid) return;
    try {
      await BuildBridge.ProcessKill({ id: pid });
    } catch (e) {
      this.buildError.set('cancel failed: ' + (e instanceof Error ? e.message : String(e)));
    }
    this.stopPolling();
    this.buildRunning.set(false);
  }

  private async pollBuildLog(): Promise<void> {
    const pid = this.buildProcessId();
    if (!pid) return;
    try {
      const out = await BuildBridge.ProcessOutput({ id: pid });
      const baseLog = this.buildLog().split('\n\n')[0] + '\n\n';
      this.buildLog.set(baseLog + (out.output || ''));
      const procs = await BuildBridge.ProcessList();
      const proc = (procs.processes || []).find((p) => p.id === pid);
      if (!proc || proc.status === 'exited' || proc.status === 'killed') {
        this.stopPolling();
        this.buildRunning.set(false);
      }
    } catch {
      // Network glitch; keep polling.
    }
  }

  private stopPolling(): void {
    if (this.buildPollTimer) {
      clearInterval(this.buildPollTimer);
      this.buildPollTimer = undefined;
    }
  }
}
