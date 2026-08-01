// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { callBridge } from '../../../lib/bridge';
import * as CacheBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/cachebridge';
import { NotificationService } from '../../../services/notification.service';

interface CacheCollection {
  collection: string;
  last_full_scan: string;
  item_count: number;
  age_seconds: number;
}

/**
 * Cache panel — DuckDB-backed app state at ~/.core/ide-cache.db.
 *
 * Migrated 2026-05-10 to typed CacheBridge wails binding for the
 * cache_status / cache_clear methods. The per-collection refreshers
 * still go via callBridge since they each call a different bridge
 * (memory_list, php_detect, etc.) which live in their own bridges.
 */
@Component({
  selector: 'dev-cache',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block ch-block">
      <div class="block-header ch-header">
        <h2 class="block-title">{{ 'cache.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'cache.subtitle.state' | translate }} <code>~/.core/ide-cache.db</code> · {{ cacheCollections().length }} {{ 'cache.subtitle.collections' | translate }}</span>
      </div>
      <div class="ch-toolbar">
        <button class="btn btn-ghost btn-sm" (click)="loadCacheStatus()" [disabled]="cacheLoading()">↻ {{ 'cache.button.refresh-status' | translate }}</button>
      </div>
      <div class="ch-body">
        @if (cacheCollections().length === 0 && !cacheLoading()) {
          <div class="sess-empty">{{ 'cache.empty.no-collections' | translate }}</div>
        }
        <table class="ch-table">
          <thead><tr><th>{{ 'cache.column.collection' | translate }}</th><th>{{ 'cache.column.items' | translate }}</th><th>{{ 'cache.column.last-scan' | translate }}</th><th>{{ 'cache.column.age' | translate }}</th><th class="ch-actions-col">{{ 'cache.column.actions' | translate }}</th></tr></thead>
          <tbody>
            @for (c of cacheCollections(); track c.collection) {
              <tr [class.ch-stale]="c.age_seconds > 600">
                <td><code>{{ c.collection }}</code></td>
                <td><code>{{ c.item_count }}</code></td>
                <td><code>{{ c.last_full_scan.slice(0, 19).replace('T', ' ') }}</code></td>
                <td>
                  @if (c.age_seconds < 60) { {{ c.age_seconds }}s }
                  @else if (c.age_seconds < 3600) { {{ (c.age_seconds / 60).toFixed(0) }}m }
                  @else { {{ (c.age_seconds / 3600).toFixed(1) }}h }
                </td>
                <td class="ch-actions-col">
                  <button class="btn btn-ghost btn-sm" (click)="refreshCacheCollection(c.collection)" [title]="'cache.tooltip.rescan-write' | translate">↻</button>
                  <button class="btn btn-ghost btn-sm" (click)="clearCacheCollection(c.collection)" [title]="'cache.tooltip.drop-rows' | translate">×</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    /* Cache panel */
    .ch-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .ch-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ch-header code { font-size: 10px; }
    .ch-toolbar { padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ch-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .ch-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .ch-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .ch-table td { padding: 8px 10px; border-bottom: 1px solid var(--line-1); vertical-align: middle; }
    .ch-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); }
    .ch-stale { background: color-mix(in oklch, #fbbf24 6%, transparent); }
    .ch-actions-col { width: 120px; text-align: right; }
    .ch-actions-col .btn { padding: 2px 8px; font-size: 11px; }
  `],
})
export class CacheComponent implements OnInit {
  private readonly notify = inject(NotificationService);

  readonly cacheCollections = signal<CacheCollection[]>([]);
  readonly cacheLoading = signal(false);

  // Map of collection name → bridge tool that re-scans it. Drives the
  // "refresh" button on each row. Tools not in this map fall back to a
  // bare `cache_clear`; the user re-fills them on next panel
  // navigation.
  private readonly refresherFor: Record<string, { tool: string; params: Record<string, unknown> }> = {
    memory: { tool: 'memory_list', params: { force: true } },
    session_projects: { tool: 'session_projects_list', params: { force: true } },
    ts_projects: { tool: 'ts_detect', params: { force: true } },
    php_projects: { tool: 'php_detect', params: { force: true } },
  };

  ngOnInit(): void {
    void this.loadCacheStatus();
  }

  async loadCacheStatus(): Promise<void> {
    this.cacheLoading.set(true);
    try {
      const v = await CacheBridge.Status();
      const collections = (v.collections || []).map((c) => ({
        collection: c.collection,
        last_full_scan: c.last_full_scan || '',
        item_count: c.item_count,
        age_seconds: c.age_seconds,
      }));
      this.cacheCollections.set(collections);
    } catch {
      // tolerate; user retries via the refresh button
    } finally {
      this.cacheLoading.set(false);
    }
  }

  async refreshCacheCollection(collection: string): Promise<void> {
    const refresher = this.refresherFor[collection];
    if (refresher) {
      await callBridge(refresher.tool, refresher.params);
    } else {
      await CacheBridge.Clear({ collection });
    }
    await this.loadCacheStatus();
  }

  async clearCacheCollection(collection: string): Promise<void> {
    const ok = await this.notify.confirm({
      title: `Clear ${collection} cache?`,
      message: 'Next access will re-scan from source.',
      confirmLabel: 'Clear',
      variant: 'warning',
    });
    if (!ok) return;
    await CacheBridge.Clear({ collection });
    await this.loadCacheStatus();
  }
}
