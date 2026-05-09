// SPDX-Licence-Identifier: EUPL-1.2

import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { callBridge } from '../../../lib/bridge';
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
  project_type: string;
  command: string;
  args: string[];
  core_bin_on_path: boolean;
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
  template: `
    <section class="block build-block">
      <div class="block-header build-header">
        <h2 class="block-title">Build</h2>
        <span class="editorial subtitle">Surface over <code>core/go-build</code>. Detects your project, runs the build, streams output.</span>
      </div>
      <div class="build-toolbar">
        <div class="build-meta">
          @if (buildDetected(); as d) {
            <span class="build-type-pill">{{ d.project_type }}</span>
            <code class="build-cmd">{{ d.command }} {{ d.args.join(' ') }}</code>
            @if (!d.core_bin_on_path) {
              <span class="build-hint">core binary not on PATH — using fallback</span>
            }
          } @else {
            <span class="build-hint">Detecting…</span>
          }
        </div>
        <div class="build-actions">
          <button class="btn btn-ghost btn-sm" (click)="detectBuild()" [disabled]="buildRunning()">Re-detect</button>
          @if (!buildRunning()) {
            <button class="btn btn-primary btn-sm" (click)="runBuild()" [disabled]="!buildDetected() || buildDetected()?.project_type === 'unknown'">
              ▸ Build
            </button>
          } @else {
            <button class="btn btn-ghost btn-sm" (click)="cancelBuild()">⏹ Cancel</button>
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
          <pre class="build-running">building…</pre>
        } @else {
          <pre class="build-empty">Click ▸ Build to start. Output streams here.</pre>
        }
      </div>
    </section>
  `,
})
export class BuildComponent implements OnInit {
  private readonly workspace = inject(WorkspaceStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly buildDetected = signal<BuildDetected | null>(null);
  readonly buildLog = signal<string>('');
  readonly buildRunning = signal(false);
  readonly buildError = signal<string | null>(null);
  readonly buildProcessId = signal<string | null>(null);

  private buildPollTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    void this.detectBuild();
    this.destroyRef.onDestroy(() => {
      if (this.buildPollTimer) clearInterval(this.buildPollTimer);
    });
  }

  async detectBuild(): Promise<void> {
    this.buildError.set(null);
    try {
      const value = await callBridge<BuildDetected>('build_detect', { path: this.workspace.root() });
      this.buildDetected.set(value);
    } catch (e) {
      this.buildError.set('build detect error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async runBuild(): Promise<void> {
    if (this.buildRunning()) return;
    this.buildError.set(null);
    this.buildLog.set('');
    this.buildRunning.set(true);
    try {
      // build_run wraps process_start; the response carries the spawned
      // process id at the top level so we can poll its output stream.
      const res = await callBridge<BuildRunResponse>('build_run', { path: this.workspace.root() });
      const pid = res.id || res.process_id || res.value?.process_id;
      if (!pid) {
        this.buildError.set('build kicked off but no process id returned');
        this.buildRunning.set(false);
        return;
      }
      this.buildProcessId.set(pid);
      this.buildLog.set(`$ ${res.build_command} ${(res.build_args || []).join(' ')}\n\n`);
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
      await callBridge('process_kill', { id: pid });
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
      const out = await callBridge<string>('process_output', { id: pid });
      const baseLog = this.buildLog().split('\n\n')[0] + '\n\n';
      this.buildLog.set(baseLog + (out || ''));
      const procs = await callBridge<{ id: string; status?: string }[]>('process_list', {});
      const proc = procs?.find((p) => p.id === pid);
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
