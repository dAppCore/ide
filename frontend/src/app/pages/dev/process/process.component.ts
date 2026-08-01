// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { callBridge } from '../../../lib/bridge';

interface ManagedProcess {
  id: string;
  command: string;
  args: string[];
  dir: string;
  status: string;
  started_at: string;
  exit_code: number;
  duration_ms: number;
  pid: number;
}

interface DaemonProcess {
  code: string;
  daemon: string;
  pid: number;
  health: string;
  project: string;
  binary: string;
  started: string;
  alive: boolean;
}

/**
 * Processes panel — managed processes + daemon registry. Surface over
 * core/go-process.
 *
 * TODO(snider/wails): swap callBridge('process_*') for a processBridge
 * wails service.
 */
@Component({
  selector: 'dev-process',
  standalone: true,
  imports: [SlicePipe, TranslatePipe],
  template: `
    <section class="block proc-block">
      <div class="block-header proc-header">
        <h2 class="block-title">{{ 'process.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'process.subtitle.prefix' | translate }} <code>core/go-process</code>.</span>
      </div>
      <div class="proc-toolbar">
        <div class="proc-tabs">
          <button class="proc-tab" [class.active]="procTab() === 'managed'" (click)="procTab.set('managed')">
            {{ 'process.tab.managed' | translate }} <span class="proc-tab-count">{{ procManaged().length }}</span>
          </button>
          <button class="proc-tab" [class.active]="procTab() === 'daemons'" (click)="procTab.set('daemons')">
            {{ 'process.tab.daemons' | translate }} <span class="proc-tab-count">{{ procDaemons().length }}</span>
          </button>
        </div>
        <button class="btn btn-ghost btn-sm" (click)="refreshProcesses()">{{ 'process.button.refresh' | translate }}</button>
      </div>

      <div class="proc-body">
        @if (procTab() === 'managed') {
          @if (procManaged().length === 0) {
            <div class="proc-empty">{{ 'process.empty.managed-prefix' | translate }} <code>process_start</code> {{ 'process.empty.managed-suffix' | translate }}</div>
          } @else {
            <table class="proc-table">
              <thead>
                <tr>
                  <th>{{ 'process.column.id' | translate }}</th>
                  <th>{{ 'process.column.pid' | translate }}</th>
                  <th>{{ 'process.column.command' | translate }}</th>
                  <th>{{ 'process.column.status' | translate }}</th>
                  <th>{{ 'process.column.started' | translate }}</th>
                  <th class="proc-actions-col">·</th>
                </tr>
              </thead>
              <tbody>
                @for (p of procManaged(); track p.id) {
                  <tr [class.active]="procSelected() === p.id" (click)="loadProcessOutput(p.id)" class="proc-row">
                    <td><code>{{ p.id.slice(0, 12) }}</code></td>
                    <td><code>{{ p.pid }}</code></td>
                    <td class="proc-cmd"><code>{{ p.command }} {{ (p.args || []).join(' ') }}</code></td>
                    <td><span class="proc-status sev-{{ p.status }}">{{ p.status }}</span></td>
                    <td><code>{{ p.started_at | slice:11:19 }}</code></td>
                    <td class="proc-actions-col">
                      @if (p.status === 'running') {
                        <button class="btn btn-ghost btn-sm" (click)="signalProcess(p.id, 'term'); $event.stopPropagation()" [title]="'process.tooltip.sigterm' | translate">⏹</button>
                        <button class="btn btn-ghost btn-sm" (click)="signalProcess(p.id, 'kill'); $event.stopPropagation()" [title]="'process.tooltip.sigkill' | translate">×</button>
                      } @else {
                        <button class="btn btn-ghost btn-sm" (click)="removeProcess(p.id); $event.stopPropagation()" [title]="'process.tooltip.remove' | translate">✕</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (procSelected() && procOutput()) {
              <div class="proc-output">
                <div class="proc-output-head">{{ 'process.label.output' | translate }} · {{ procSelected() }}</div>
                <pre>{{ procOutput() }}</pre>
              </div>
            }
          }
        } @else {
          @if (procDaemons().length === 0) {
            <div class="proc-empty">{{ 'process.empty.daemons-prefix' | translate }} <code>~/.core/daemons/</code>. {{ 'process.empty.daemons-suffix' | translate }}</div>
          } @else {
            <table class="proc-table">
              <thead>
                <tr>
                  <th>{{ 'process.column.code' | translate }}</th>
                  <th>{{ 'process.column.daemon' | translate }}</th>
                  <th>{{ 'process.column.pid' | translate }}</th>
                  <th>{{ 'process.column.alive' | translate }}</th>
                  <th>{{ 'process.column.health' | translate }}</th>
                  <th>{{ 'process.column.project' | translate }}</th>
                  <th>{{ 'process.column.started' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (d of procDaemons(); track d.pid) {
                  <tr>
                    <td><code>{{ d.code }}</code></td>
                    <td><code>{{ d.daemon }}</code></td>
                    <td><code>{{ d.pid }}</code></td>
                    <td><span class="proc-status" [class.sev-running]="d.alive" [class.sev-stopped]="!d.alive">{{ (d.alive ? 'process.status.alive' : 'process.status.dead') | translate }}</span></td>
                    <td>@if (d.health) { <a [href]="d.health" target="_blank">{{ d.health }}</a> } @else { — }</td>
                    <td><code>{{ d.project || '—' }}</code></td>
                    <td><code>{{ d.started | slice:0:19 }}</code></td>
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
    /* Process panel */
    .proc-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .proc-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .proc-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .proc-tabs { display: flex; gap: 4px; }
    .proc-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .proc-tab:hover { border-color: var(--brand-400); }
    .proc-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .proc-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .proc-tab.active .proc-tab-count { color: var(--brand-200); }
    .proc-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .proc-empty { padding: 32px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .proc-empty code { font-family: var(--font-mono); color: var(--fg-2); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; font-size: 12px; }
    .proc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .proc-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); background: var(--ink-2); }
    .proc-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .proc-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .proc-row { cursor: pointer; }
    .proc-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .proc-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); }
    .proc-cmd { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .proc-status { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; background: var(--ink-1); color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.04em; }
    .proc-status.sev-running { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .proc-status.sev-exited, .proc-status.sev-stopped { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }
    .proc-status.sev-failed, .proc-status.sev-killed { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .proc-actions-col { width: 80px; text-align: right; }
    .proc-output { margin-top: 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; }
    .proc-output-head { padding: 8px 14px; border-bottom: 1px solid var(--line-1); font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); }
    .proc-output pre { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 12px 14px; margin: 0; max-height: 320px; overflow-y: auto; color: var(--fg-2); white-space: pre-wrap; }
  `],
})
export class ProcessComponent implements OnInit {
  private readonly t = inject(TranslateService);

  readonly procManaged = signal<ManagedProcess[]>([]);
  readonly procDaemons = signal<DaemonProcess[]>([]);
  readonly procTab = signal<'managed' | 'daemons'>('managed');
  readonly procSelected = signal<string | null>(null);
  readonly procOutput = signal<string>('');

  ngOnInit(): void {
    void this.refreshProcesses();
  }

  async refreshProcesses(): Promise<void> {
    try {
      const [managed, daemons] = await Promise.all([
        callBridge<{ processes?: ManagedProcess[] }>('process_managed_list', {}),
        callBridge<{ daemons?: DaemonProcess[] }>('process_daemons_list', {}),
      ]);
      this.procManaged.set(managed?.processes || []);
      this.procDaemons.set(daemons?.daemons || []);
    } catch (e) {
      console.warn('[process] refresh error:', e);
    }
  }

  async loadProcessOutput(id: string): Promise<void> {
    this.procSelected.set(id);
    this.procOutput.set(this.t.instant('process.status.loading'));
    try {
      const v = await callBridge<string>('process_output', { id });
      this.procOutput.set(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
    } catch (e) {
      this.procOutput.set(this.t.instant('process.label.error') + ': ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async signalProcess(id: string, signal: 'term' | 'kill' | 'hup' | 'int'): Promise<void> {
    try {
      await callBridge('process_managed_signal', { id, signal });
      await this.refreshProcesses();
    } catch {
      // ignore — user retries via Refresh
    }
  }

  async removeProcess(id: string): Promise<void> {
    try {
      await callBridge('process_managed_remove', { id });
      if (this.procSelected() === id) {
        this.procSelected.set(null);
        this.procOutput.set('');
      }
      await this.refreshProcesses();
    } catch {
      // ignore
    }
  }
}
