// SPDX-Licence-Identifier: EUPL-1.2

import { Component, computed, inject, resource, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import * as UpdatesBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/updatesbridge';
import { NotificationService } from '../../../services/notification.service';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';

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
 * Migrated 2026-05-10 to typed UpdatesBridge wails binding for the
 * updates_refresh / selfupdate_status / selfupdate_apply methods.
 */
@Component({
  selector: 'dev-updates',
  standalone: true,
  imports: [DevSkeleton, TranslatePipe],
  template: `
    <section class="block upd-block">
      <div class="block-header upd-header">
        <h2 class="block-title">{{ 'updates.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'updates.subtitle' | translate }}</span>
      </div>
      @if (selfUpdate()) {
        <div class="self-upd-card" [class.self-upd-card--update]="selfUpdate()?.update_available">
          <div class="self-upd-row">
            <div class="self-upd-icon">
              @if (selfUpdate()?.update_available) {
                <span [title]="'updates.tooltip.update-available' | translate">⬇</span>
              } @else if (selfUpdate()?.error) {
                <span [title]="'updates.tooltip.no-release' | translate">·</span>
              } @else {
                <span [title]="'updates.tooltip.up-to-date' | translate">✓</span>
              }
            </div>
            <div class="self-upd-body">
              <div class="self-upd-title">core-ide</div>
              <div class="self-upd-meta">
                {{ 'updates.label.current' | translate }} <code>{{ selfUpdate()?.current_version }}</code>
                @if (selfUpdate()?.latest_version) {
                  · {{ 'updates.label.latest' | translate }} <a [href]="selfUpdate()?.release_url" target="_blank"><code>{{ selfUpdate()?.latest_version }}</code></a>
                } @else if (selfUpdate()?.error) {
                  · <span class="self-upd-err">{{ 'updates.label.no-release' | translate }}: {{ selfUpdate()?.error }}</span>
                }
                · {{ 'updates.label.channel' | translate }} <code>{{ selfUpdate()?.channel }}</code>
                · {{ selfUpdate()?.platform }}
              </div>
              <div class="self-upd-meta self-upd-source">
                {{ 'updates.label.source' | translate }}: <a [href]="selfUpdate()?.repo_url" target="_blank">{{ selfUpdate()?.repo_url }}</a>
                <span class="self-upd-hint"> · {{ 'updates.hint.override' | translate }} <code>CORE_IDE_UPDATE_URL</code></span>
              </div>
            </div>
            <div class="self-upd-actions">
              @if (selfUpdate()?.cache_hit) {
                <span class="cache-pill" [class.cache-stale]="(selfUpdate()?.cache_age_s ?? 0) > 600" (click)="loadSelfUpdate(true)" [title]="'updates.tooltip.force-recheck' | translate">● {{ 'updates.cache.cached' | translate }} {{ formatCacheAge(selfUpdate()?.cache_age_s ?? 0) }}</span>
              }
              <button class="btn btn-ghost btn-sm" (click)="loadSelfUpdate(true)" [disabled]="selfUpdateLoading()" [title]="'updates.button.recheck' | translate">
                @if (selfUpdateLoading()) { <span>…</span> } @else { <span>↻</span> }
              </button>
              @if (selfUpdate()?.update_available) {
                <button class="btn btn-primary btn-sm" (click)="applySelfUpdate()" [disabled]="selfUpdateApplying()">
                  @if (selfUpdateApplying()) { <span>{{ 'updates.status.updating' | translate }}</span> } @else { <span>{{ 'updates.button.update' | translate }}</span> }
                </button>
              }
            </div>
          </div>
        </div>
      }
      <div class="upd-toolbar">
        <span class="upd-summary">
          @if (updatesNeedingAttention().length === 0) {
            <span class="upd-allgood">✓ {{ 'updates.summary.all-good' | translate }}</span>
          } @else {
            <span class="upd-attn">⚠ {{ updatesNeedingAttention().length }} {{ (updatesNeedingAttention().length > 1 ? 'updates.summary.updates-available' : 'updates.summary.update-available') | translate }}</span>
          }
        </span>
        <button class="btn btn-ghost btn-sm" (click)="refreshAllUpdates()" [disabled]="updatesLoading()">
          @if (updatesLoading()) { <span>{{ 'updates.status.checking' | translate }}</span> } @else { <span>{{ 'updates.button.refresh-all' | translate }}</span> }
        </button>
      </div>
      <div class="upd-body">
        @if (toolsResource.isLoading() && updatesTools().length === 0) {
          <dev-skeleton kind="table" [count]="9" />
        } @else {
        <table class="upd-table">
          <thead>
            <tr>
              <th>{{ 'updates.column.tool' | translate }}</th>
              <th>{{ 'updates.column.local' | translate }}</th>
              <th>{{ 'updates.column.latest' | translate }}</th>
              <th>{{ 'updates.column.status' | translate }}</th>
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
                    <span class="upd-missing">{{ 'updates.label.not-installed' | translate }}</span>
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
                    <span class="upd-pill missing">{{ 'updates.pill.missing' | translate }}</span>
                  } @else if (t.up_to_date) {
                    <span class="upd-pill ok">{{ 'updates.pill.up-to-date' | translate }}</span>
                  } @else if (t.latest_version) {
                    <span class="upd-pill warn">{{ 'updates.pill.update-available' | translate }}</span>
                  } @else {
                    <span class="upd-pill unknown">{{ 'updates.pill.no-source' | translate }}</span>
                  }
                </td>
                <td class="upd-actions-col">
                  <button class="btn btn-ghost btn-sm" (click)="refreshUpdate(t.key)" [title]="'updates.tooltip.recheck-tool' | translate">↻</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        }
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
  private readonly notify = inject(NotificationService);
  private readonly t = inject(TranslateService);

  // Self-update — DuckDB-cached. SWR via cachedBridgeResource.
  readonly self = cachedBridgeResource<SelfUpdateStatus>({
    loader: () =>
      UpdatesBridge.SelfUpdateStatus().then((v) => ({
        current_version: v.current_version || '',
        repo_url: v.repo_url || '',
        channel: v.channel || '',
        platform: v.platform || '',
        configured: v.configured,
        checked: v.checked,
        owner: v.owner,
        repo: v.repo,
        latest_version: v.latest_version,
        release_url: v.release_url,
        update_available: v.update_available,
        error: v.status_error,
        cache_hit: v.cache_hit,
        cache_age_s: v.cache_age_s,
      })),
    emptyValue: { current_version: '', repo_url: '', channel: '', platform: '', configured: false, checked: false },
    isEmpty: (v) => !v.checked,
  });

  // Tools list — server-side per-repo cache (sync.Map, 5min TTL). We
  // wrap in a resource purely for reactivity / signal access.
  readonly toolsResource = resource<UpdateTool[], void>({
    defaultValue: [],
    loader: () =>
      UpdatesBridge.Refresh({}).then((v) =>
        (v.tools || []).map((t) => ({
          key: t.key,
          name: t.name,
          description: t.description,
          installed: t.installed,
          local_version: t.local_version,
          latest_version: t.latest_version,
          latest_url: t.latest_url,
          up_to_date: t.up_to_date,
          github_repo: t.github_repo,
          error: t.error,
        })),
      ),
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
      await UpdatesBridge.Refresh({ key });
      // Trigger a full reload so the resource value updates with the merge.
      this.toolsResource.reload();
    } catch {
      // ignore
    }
  }

  /** Full re-probe — bypasses server sync.Map. */
  refreshAllUpdates(): void {
    this.toolsResource.reload();
  }

  formatCacheAge(seconds: number): string {
    const ago = this.t.instant('updates.label.ago');
    if (seconds < 60) return `${seconds}s ${ago}`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${ago}`;
    return `${Math.floor(seconds / 3600)}h ${ago}`;
  }

  async applySelfUpdate(): Promise<void> {
    const ok = await this.notify.confirm({
      title: this.t.instant('updates.confirm.title'),
      message: this.t.instant('updates.confirm.message'),
      confirmLabel: this.t.instant('updates.confirm.label'),
      variant: 'warning',
    });
    if (!ok) return;
    this.selfUpdateApplying.set(true);
    try {
      const v = await UpdatesBridge.SelfUpdateApply();
      this.notify.notify({
        message: this.t.instant('updates.notify.success', { version: v.updated_to }),
        variant: 'success',
        icon: 'check',
        duration: 0,
      });
      this.self.refresh();
    } catch (e) {
      this.notify.notify({
        message: this.t.instant('updates.notify.failed') + ': ' + (e instanceof Error ? e.message : String(e)),
        variant: 'danger',
        icon: 'triangle-exclamation',
      });
    } finally {
      this.selfUpdateApplying.set(false);
    }
  }
}
