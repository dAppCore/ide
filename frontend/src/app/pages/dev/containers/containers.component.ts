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
