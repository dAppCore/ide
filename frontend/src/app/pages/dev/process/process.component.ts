// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
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
  imports: [SlicePipe],
  template: `
    <section class="block proc-block">
      <div class="block-header proc-header">
        <h2 class="block-title">Processes</h2>
        <span class="editorial subtitle">Managed processes + daemon registry · Surface over <code>core/go-process</code>.</span>
      </div>
      <div class="proc-toolbar">
        <div class="proc-tabs">
          <button class="proc-tab" [class.active]="procTab() === 'managed'" (click)="procTab.set('managed')">
            Managed <span class="proc-tab-count">{{ procManaged().length }}</span>
          </button>
          <button class="proc-tab" [class.active]="procTab() === 'daemons'" (click)="procTab.set('daemons')">
            Daemons <span class="proc-tab-count">{{ procDaemons().length }}</span>
          </button>
        </div>
        <button class="btn btn-ghost btn-sm" (click)="refreshProcesses()">Refresh</button>
      </div>

      <div class="proc-body">
        @if (procTab() === 'managed') {
          @if (procManaged().length === 0) {
            <div class="proc-empty">No managed processes. Use <code>process_start</code> from the bridge or run a build.</div>
          } @else {
            <table class="proc-table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>pid</th>
                  <th>command</th>
                  <th>status</th>
                  <th>started</th>
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
                        <button class="btn btn-ghost btn-sm" (click)="signalProcess(p.id, 'term'); $event.stopPropagation()" title="SIGTERM">⏹</button>
                        <button class="btn btn-ghost btn-sm" (click)="signalProcess(p.id, 'kill'); $event.stopPropagation()" title="SIGKILL">×</button>
                      } @else {
                        <button class="btn btn-ghost btn-sm" (click)="removeProcess(p.id); $event.stopPropagation()" title="Remove">✕</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (procSelected() && procOutput()) {
              <div class="proc-output">
                <div class="proc-output-head">Output · {{ procSelected() }}</div>
                <pre>{{ procOutput() }}</pre>
              </div>
            }
          }
        } @else {
          @if (procDaemons().length === 0) {
            <div class="proc-empty">No daemons in <code>~/.core/daemons/</code>. Lethean services that register as daemons (lemma, vi, etc.) will appear here when running.</div>
          } @else {
            <table class="proc-table">
              <thead>
                <tr>
                  <th>code</th>
                  <th>daemon</th>
                  <th>pid</th>
                  <th>alive</th>
                  <th>health</th>
                  <th>project</th>
                  <th>started</th>
                </tr>
              </thead>
              <tbody>
                @for (d of procDaemons(); track d.pid) {
                  <tr>
                    <td><code>{{ d.code }}</code></td>
                    <td><code>{{ d.daemon }}</code></td>
                    <td><code>{{ d.pid }}</code></td>
                    <td><span class="proc-status" [class.sev-running]="d.alive" [class.sev-stopped]="!d.alive">{{ d.alive ? 'alive' : 'dead' }}</span></td>
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
})
export class ProcessComponent implements OnInit {
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
    this.procOutput.set('Loading…');
    try {
      const v = await callBridge<string>('process_output', { id });
      this.procOutput.set(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
    } catch (e) {
      this.procOutput.set('Error: ' + (e instanceof Error ? e.message : String(e)));
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
