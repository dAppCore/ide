// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, resource, signal } from '@angular/core';
import { callBridge } from '../../../lib/bridge';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';

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
  cache_hit?: boolean;
  cache_age_s?: number;
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
              @if (selfUpdate()?.cache_hit) {
                <span class="cache-pill" [class.cache-stale]="(selfUpdate()?.cache_age_s ?? 0) > 600" (click)="loadSelfUpdate(true)" title="Click to force re-check">● cached {{ formatCacheAge(selfUpdate()?.cache_age_s ?? 0) }}</span>
              }
              <button class="btn btn-ghost btn-sm" (click)="loadSelfUpdate(true)" [disabled]="selfUpdateLoading()" title="Re-check">
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
  styles: [`
    /* Updates panel */
    .self-upd-card { padding: 14px 18px; border-bottom: 1px solid var(--line-1); background: var(--ink-2); flex-shrink: 0; }
    .self-upd-card--update { background: color-mix(in oklch, #fbbf24 8%, var(--ink-2)); border-bottom-color: color-mix(in oklch, #fbbf24 30%, var(--line-1)); }
    .self-upd-row { display: flex; align-items: center; gap: 14px; }
    .self-upd-icon { font-size: 22px; color: var(--brand-200); width: 32px; text-align: center; }
    .self-upd-card--update .self-upd-icon { color: #fbbf24; }
    .self-upd-body { flex: 1; min-width: 0; }
    .self-upd-title { font-size: 14px; font-weight: 600; color: var(--fg-1); }
    .self-upd-meta { font-size: 11px; color: var(--fg-3); margin-top: 3px; }
    .self-upd-meta code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); padding: 0 4px; background: var(--ink-1); border-radius: 3px; }
    .self-upd-meta a { color: var(--brand-200); text-decoration: none; }
    .self-upd-meta a:hover { text-decoration: underline; }
    .self-upd-source { opacity: 0.7; }
    .self-upd-hint { color: var(--fg-3); font-style: italic; }
    .self-upd-err { color: #fbbf24; font-size: 10px; }
    .self-upd-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .upd-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .upd-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .upd-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .upd-allgood { color: #34d399; font-size: 12px; }
    .upd-attn { color: #fbbf24; font-size: 12px; font-weight: 500; }
    .upd-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .upd-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .upd-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .upd-table td { padding: 8px 10px; border-bottom: 1px solid var(--line-1); vertical-align: middle; }
    .upd-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); }
    .upd-table a { color: var(--brand-200); text-decoration: none; }
    .upd-table a:hover { text-decoration: underline; }
    .upd-needs { background: color-mix(in oklch, #fbbf24 6%, transparent); }
    .upd-name { font-weight: 600; color: var(--fg-1); font-size: 12px; }
    .upd-desc { font-size: 10px; color: var(--fg-3); margin-top: 2px; }
    .upd-missing { font-size: 11px; color: var(--fg-3); font-style: italic; }
    .upd-unknown { color: var(--fg-3); }
    .upd-pill { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .upd-pill.ok { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .upd-pill.warn { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .upd-pill.missing { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }
    .upd-pill.unknown { background: var(--ink-1); color: var(--fg-3); }
    .upd-actions-col { width: 50px; text-align: right; }
  `],
})
export class UpdatesComponent {
  // Self-update — DuckDB-cached. SWR via cachedBridgeResource.
  readonly self = cachedBridgeResource<SelfUpdateStatus>({
    tool: 'selfupdate_status',
    emptyValue: { current_version: '', repo_url: '', channel: '', platform: '', configured: false, checked: false },
    isEmpty: (v) => !v.checked,
  });

  // Tools list — server-side per-repo cache (sync.Map, 5min TTL). We
  // wrap in a resource purely for reactivity / signal access.
  readonly toolsResource = resource<UpdateTool[], void>({
    defaultValue: [],
    loader: () => callBridge<UpdatesRefreshResponse>('updates_refresh', {}).then((v) => v?.tools || []),
  });

  readonly updatesTools = computed(() => this.toolsResource.value() ?? []);
  readonly updatesLoading = computed(() => this.toolsResource.isLoading());
  readonly updatesNeedingAttention = computed(() =>
    this.updatesTools().filter((t) => t.installed && !t.up_to_date && t.latest_version),
  );

  readonly selfUpdate = computed(() => {
    const v = this.self.stable();
    return v.checked || v.configured ? v : null;
  });
  readonly selfUpdateLoading = computed(() => this.self.loading());
  readonly selfUpdateApplying = signal(false);

  /** Template alias — Re-check button on selfupdate card. */
  loadSelfUpdate(force?: boolean): void {
    if (force) this.self.refresh();
  }

  /** Per-tool refresh: hits updates_refresh with a key, merges into
   *  the existing list. The server's per-repo sync.Map handles the
   *  rest; we just need to merge results. */
  async refreshUpdate(key: string): Promise<void> {
    try {
      const v = await callBridge<UpdatesRefreshResponse>('updates_refresh', { key });
      const fresh = v?.tools || [];
      // Trigger a full reload so the resource value updates with the merge.
      this.toolsResource.reload();
      void fresh; // results merged via the reload above
    } catch {
      // ignore
    }
  }

  /** Full re-probe — bypasses server sync.Map. */
  refreshAllUpdates(): void {
    this.toolsResource.reload();
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  async applySelfUpdate(): Promise<void> {
    if (!confirm('Download and replace core-ide binary in place? You will need to quit and relaunch.')) return;
    this.selfUpdateApplying.set(true);
    try {
      const v = await callBridge<SelfUpdateApplyResponse>('selfupdate_apply', {});
      alert(`Updated to ${v?.updated_to}. Quit and relaunch core-ide.`);
      this.self.refresh();
    } catch (e) {
      alert('Self-update failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.selfUpdateApplying.set(false);
    }
  }
}
