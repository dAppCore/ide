// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { callBridge } from '../../../lib/bridge';

interface ContainerRuntime {
  name: string;
  available: boolean;
  version?: string;
  path?: string;
  description: string;
  has_gpu: boolean;
  has_network_isolation: boolean;
  has_volume_mounts: boolean;
  has_encryption: boolean;
  hardware_isolated: boolean;
  sub_second_start: boolean;
}

interface ContainerEntry {
  id: string;
  name?: string;
  image: string;
  status: string;
  runtime: string;
  created?: string;
}

/**
 * Containers panel — runtimes detected on this host. Surface over
 * core/go-container.
 *
 * TODO(snider/wails): swap callBridge('container_*') for a
 * containerBridge wails service.
 */
@Component({
  selector: 'dev-containers',
  standalone: true,
  template: `
    <section class="block ctn-block">
      <div class="block-header ctn-header">
        <h2 class="block-title">Containers</h2>
        <span class="editorial subtitle">Runtimes detected on this host. Surface over <code>core/go-container</code>.</span>
      </div>

      <div class="ctn-toolbar">
        <button class="btn btn-ghost btn-sm" (click)="loadContainers()" [disabled]="containerLoading()">
          @if (containerLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
        </button>
        <span class="ctn-count">{{ containerList().length }} running · {{ containerRuntimes().length }} runtimes detected</span>
      </div>

      @if (containerError(); as err) {
        <div class="ctn-error">{{ err }}</div>
      }

      <div class="ctn-body">
        <div class="ctn-section">
          <h3>Runtimes</h3>
          <div class="ctn-runtime-grid">
            @for (r of containerRuntimes(); track r.name) {
              <div class="ctn-runtime-card" [class.unavailable]="!r.available">
                <div class="ctn-runtime-head">
                  <span class="ctn-runtime-name">{{ r.name }}</span>
                  @if (r.available) {
                    <span class="ctn-pill available">available</span>
                  } @else {
                    <span class="ctn-pill missing">missing</span>
                  }
                </div>
                <p class="ctn-runtime-desc">{{ r.description }}</p>
                @if (r.version) {
                  <code class="ctn-runtime-version">{{ r.version }}</code>
                }
                <div class="ctn-caps">
                  @if (r.hardware_isolated) { <span class="ctn-cap">⚙ hardware</span> }
                  @if (r.has_network_isolation) { <span class="ctn-cap">⌗ network</span> }
                  @if (r.has_volume_mounts) { <span class="ctn-cap">▢ mounts</span> }
                  @if (r.has_gpu) { <span class="ctn-cap">⚡ GPU</span> }
                  @if (r.has_encryption) { <span class="ctn-cap">🔒 encrypted</span> }
                  @if (r.sub_second_start) { <span class="ctn-cap">⚡ &lt;1s start</span> }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="ctn-section">
          <h3>Running containers</h3>
          @if (containerList().length === 0) {
            <div class="ctn-empty">Nothing running.</div>
          } @else {
            <div class="ctn-list">
              @for (c of containerList(); track c.id) {
                <div class="ctn-row" [class.active]="containerSelected() === c.id" (click)="loadContainerLogs(c.id, c.runtime)">
                  <span class="ctn-row-id">{{ c.id }}</span>
                  <span class="ctn-row-name">{{ c.name || '—' }}</span>
                  <span class="ctn-row-image">{{ c.image }}</span>
                  <span class="ctn-row-status">{{ c.status }}</span>
                  <span class="ctn-row-runtime">{{ c.runtime }}</span>
                </div>
              }
            </div>
          }
        </div>

        @if (containerSelected() && containerLogs()) {
          <div class="ctn-section">
            <h3>Logs · {{ containerSelected() }}</h3>
            <pre class="ctn-logs">{{ containerLogs() }}</pre>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    /* Containers panel */
    .ctn-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .ctn-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ctn-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ctn-count { font-size: 11px; color: var(--fg-3); }
    .ctn-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .ctn-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 20px; }
    .ctn-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-2); margin: 0 0 10px; }
    .ctn-runtime-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    .ctn-runtime-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .ctn-runtime-card.unavailable { opacity: 0.5; }
    .ctn-runtime-head { display: flex; justify-content: space-between; align-items: center; }
    .ctn-runtime-name { font-weight: 600; font-size: 13px; color: var(--fg-1); text-transform: capitalize; }
    .ctn-runtime-desc { font-size: 11px; color: var(--fg-3); margin: 0; line-height: 1.4; }
    .ctn-runtime-version { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); background: var(--ink-1); padding: 2px 6px; border-radius: 3px; align-self: flex-start; }
    .ctn-pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em; }
    .ctn-pill.available { background: color-mix(in oklch, #34d399 14%, var(--ink-1)); color: #34d399; }
    .ctn-pill.missing { background: var(--ink-1); color: var(--fg-3); }
    .ctn-caps { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .ctn-cap { font-size: 10px; color: var(--fg-2); background: var(--ink-1); padding: 1px 7px; border-radius: 4px; }
    .ctn-list { display: flex; flex-direction: column; gap: 4px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; padding: 4px; }
    .ctn-row { display: grid; grid-template-columns: 100px 200px 1fr 140px 70px; gap: 10px; padding: 8px 12px; align-items: center; cursor: pointer; border-radius: 4px; font-size: 12px; }
    .ctn-row:hover { background: var(--ink-1); }
    .ctn-row.active { background: color-mix(in oklch, var(--brand-500) 15%, var(--ink-1)); }
    .ctn-row-id { font-family: var(--font-mono); color: var(--fg-3); }
    .ctn-row-name { color: var(--fg-1); font-weight: 500; }
    .ctn-row-image { font-family: var(--font-mono); color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ctn-row-status { color: var(--fg-2); }
    .ctn-row-runtime { font-size: 10px; text-transform: uppercase; color: var(--brand-200); }
    .ctn-empty { padding: 18px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .ctn-logs { background: var(--ink-0); border: 1px solid var(--line-1); border-radius: 6px; padding: 12px 14px; font-family: var(--font-mono); font-size: 11px; line-height: 1.5; color: var(--fg-2); white-space: pre-wrap; max-height: 300px; overflow-y: auto; margin: 0; }
  `],
})
export class ContainersComponent implements OnInit {
  readonly containerRuntimes = signal<ContainerRuntime[]>([]);
  readonly containerList = signal<ContainerEntry[]>([]);
  readonly containerLoading = signal(false);
  readonly containerError = signal<string | null>(null);
  readonly containerSelected = signal<string | null>(null);
  readonly containerLogs = signal<string>('');

  ngOnInit(): void {
    void this.loadContainers();
  }

  async loadContainers(): Promise<void> {
    this.containerLoading.set(true);
    this.containerError.set(null);
    try {
      const [detect, list] = await Promise.all([
        callBridge<{ runtimes?: ContainerRuntime[] }>('container_detect', {}),
        callBridge<{ containers?: ContainerEntry[] }>('container_list', {}),
      ]);
      this.containerRuntimes.set(detect?.runtimes || []);
      this.containerList.set(list?.containers || []);
    } catch (e) {
      this.containerError.set('container bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.containerLoading.set(false);
    }
  }

  async loadContainerLogs(id: string, runtime: string): Promise<void> {
    this.containerSelected.set(id);
    this.containerLogs.set('Loading…');
    try {
      const v = await callBridge<{ logs?: string }>('container_logs', { id, runtime, tail: 200 });
      this.containerLogs.set(v?.logs || '(no output)');
    } catch (e) {
      this.containerLogs.set('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
}
