// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, signal } from '@angular/core';
import { callBridge } from '../../../lib/bridge';

interface UpdateTool {
  key: string;
  name: string;
  description: string;
  installed: boolean;
  local_version?: string;
  latest_version?: string;
  latest_url?: string;
  up_to_date: boolean;
  github_repo?: string;
  error?: string;
}

interface SelfUpdateStatus {
  current_version: string;
  repo_url: string;
  channel: string;
  platform: string;
  configured: boolean;
  checked: boolean;
  owner?: string;
  repo?: string;
  latest_version?: string;
  release_url?: string;
  update_available?: boolean;
  error?: string;
}

interface UpdatesRefreshResponse {
  tools?: UpdateTool[];
}

interface SelfUpdateApplyResponse {
  updated_to?: string;
}

/**
 * Updates panel — core-ide self-update + tool version tracking surface.
 *
 * TODO(snider/wails): swap callBridge('updates_refresh' /
 * 'selfupdate_status' / 'selfupdate_apply') for an updateBridge wails
 * service. core/go-update already exposes the right shape — wrapping
 * it as a wails service is one Go file.
 */
@Component({
  selector: 'dev-updates',
  standalone: true,
  template: `
    <section class="block upd-block">
      <div class="block-header upd-header">
        <h2 class="block-title">Updates</h2>
        <span class="editorial subtitle">core-ide self-update + tool version tracking.</span>
      </div>
      @if (selfUpdate()) {
        <div class="self-upd-card" [class.self-upd-card--update]="selfUpdate()?.update_available">
          <div class="self-upd-row">
            <div class="self-upd-icon">
              @if (selfUpdate()?.update_available) {
                <span title="Update available">⬇</span>
              } @else if (selfUpdate()?.error) {
                <span title="No release endpoint or fetch error">·</span>
              } @else {
                <span title="Up to date">✓</span>
              }
            </div>
            <div class="self-upd-body">
              <div class="self-upd-title">core-ide</div>
              <div class="self-upd-meta">
                current <code>{{ selfUpdate()?.current_version }}</code>
                @if (selfUpdate()?.latest_version) {
                  · latest <a [href]="selfUpdate()?.release_url" target="_blank"><code>{{ selfUpdate()?.latest_version }}</code></a>
                } @else if (selfUpdate()?.error) {
                  · <span class="self-upd-err">no release: {{ selfUpdate()?.error }}</span>
                }
                · channel <code>{{ selfUpdate()?.channel }}</code>
                · {{ selfUpdate()?.platform }}
              </div>
              <div class="self-upd-meta self-upd-source">
                source: <a [href]="selfUpdate()?.repo_url" target="_blank">{{ selfUpdate()?.repo_url }}</a>
                <span class="self-upd-hint"> · override via <code>CORE_IDE_UPDATE_URL</code></span>
              </div>
            </div>
            <div class="self-upd-actions">
              <button class="btn btn-ghost btn-sm" (click)="loadSelfUpdate()" [disabled]="selfUpdateLoading()" title="Re-check">
                @if (selfUpdateLoading()) { <span>…</span> } @else { <span>↻</span> }
              </button>
              @if (selfUpdate()?.update_available) {
                <button class="btn btn-primary btn-sm" (click)="applySelfUpdate()" [disabled]="selfUpdateApplying()">
                  @if (selfUpdateApplying()) { <span>updating…</span> } @else { <span>Update</span> }
                </button>
              }
            </div>
          </div>
        </div>
      }
      <div class="upd-toolbar">
        <span class="upd-summary">
          @if (updatesNeedingAttention().length === 0) {
            <span class="upd-allgood">✓ all installed tools up to date</span>
          } @else {
            <span class="upd-attn">⚠ {{ updatesNeedingAttention().length }} update{{ updatesNeedingAttention().length > 1 ? 's' : '' }} available</span>
          }
        </span>
        <button class="btn btn-ghost btn-sm" (click)="refreshAllUpdates()" [disabled]="updatesLoading()">
          @if (updatesLoading()) { <span>checking…</span> } @else { <span>Refresh all</span> }
        </button>
      </div>
      <div class="upd-body">
        <table class="upd-table">
          <thead>
            <tr>
              <th>tool</th>
              <th>local</th>
              <th>latest</th>
              <th>status</th>
              <th class="upd-actions-col">·</th>
            </tr>
          </thead>
          <tbody>
            @for (t of updatesTools(); track t.key) {
              <tr [class.upd-needs]="t.installed && !t.up_to_date && t.latest_version">
                <td>
                  <div class="upd-name">{{ t.name }}</div>
                  <div class="upd-desc">{{ t.description }}</div>
                </td>
                <td>
                  @if (t.installed) {
                    <code>{{ t.local_version || '?' }}</code>
                  } @else {
                    <span class="upd-missing">not installed</span>
                  }
                </td>
                <td>
                  @if (t.latest_version) {
                    <a [href]="t.latest_url" target="_blank"><code>{{ t.latest_version }}</code></a>
                  } @else {
                    <span class="upd-unknown">—</span>
                  }
                </td>
                <td>
                  @if (!t.installed) {
                    <span class="upd-pill missing">missing</span>
                  } @else if (t.up_to_date) {
                    <span class="upd-pill ok">up to date</span>
                  } @else if (t.latest_version) {
                    <span class="upd-pill warn">update available</span>
                  } @else {
                    <span class="upd-pill unknown">no source</span>
                  }
                </td>
                <td class="upd-actions-col">
                  <button class="btn btn-ghost btn-sm" (click)="refreshUpdate(t.key)" title="Re-check this tool">↻</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class UpdatesComponent implements OnInit {
  readonly updatesTools = signal<UpdateTool[]>([]);
  readonly updatesLoading = signal(false);
  readonly updatesNeedingAttention = computed(() =>
    this.updatesTools().filter((t) => t.installed && !t.up_to_date && t.latest_version),
  );

  readonly selfUpdate = signal<SelfUpdateStatus | null>(null);
  readonly selfUpdateLoading = signal(false);
  readonly selfUpdateApplying = signal(false);

  ngOnInit(): void {
    void this.loadSelfUpdate();
    void this.refreshAllUpdates();
  }

  async refreshUpdate(key: string): Promise<void> {
    this.updatesLoading.set(true);
    try {
      const v = await callBridge<UpdatesRefreshResponse>('updates_refresh', { key });
      const fresh = v?.tools || [];
      const map = new Map(this.updatesTools().map((t) => [t.key, t]));
      for (const t of fresh) map.set(t.key, t);
      this.updatesTools.set(Array.from(map.values()));
    } finally {
      this.updatesLoading.set(false);
    }
  }

  async refreshAllUpdates(): Promise<void> {
    this.updatesLoading.set(true);
    try {
      const v = await callBridge<UpdatesRefreshResponse>('updates_refresh', {});
      this.updatesTools.set(v?.tools || []);
    } finally {
      this.updatesLoading.set(false);
    }
  }

  async loadSelfUpdate(): Promise<void> {
    this.selfUpdateLoading.set(true);
    try {
      const v = await callBridge<SelfUpdateStatus>('selfupdate_status', {});
      this.selfUpdate.set(v ?? null);
    } finally {
      this.selfUpdateLoading.set(false);
    }
  }

  async applySelfUpdate(): Promise<void> {
    if (!confirm('Download and replace core-ide binary in place? You will need to quit and relaunch.')) return;
    this.selfUpdateApplying.set(true);
    try {
      const v = await callBridge<SelfUpdateApplyResponse>('selfupdate_apply', {});
      alert(`Updated to ${v?.updated_to}. Quit and relaunch core-ide.`);
      await this.loadSelfUpdate();
    } catch (e) {
      alert('Self-update failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.selfUpdateApplying.set(false);
    }
  }
}
