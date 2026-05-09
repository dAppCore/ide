// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { callBridge } from '../../../lib/bridge';

interface CacheCollection {
  collection: string;
  last_full_scan: string;
  item_count: number;
  age_seconds: number;
}

interface CacheStatusResponse {
  collections: CacheCollection[];
}

/**
 * Cache panel — DuckDB-backed app state at ~/.core/ide-cache.db.
 *
 * TODO(snider/wails): swap callBridge('cache_status') etc. for a
 * cacheBridge wails service. The cache lives in core/store; one Go
 * file with Status / Refresh / Clear methods would expose it cleanly.
 */
@Component({
  selector: 'dev-cache',
  standalone: true,
  template: `
    <section class="block ch-block">
      <div class="block-header ch-header">
        <h2 class="block-title">Cache</h2>
        <span class="editorial subtitle">DuckDB-backed app state at <code>~/.core/ide-cache.db</code> · {{ cacheCollections().length }} collections.</span>
      </div>
      <div class="ch-toolbar">
        <button class="btn btn-ghost btn-sm" (click)="loadCacheStatus()" [disabled]="cacheLoading()">↻ refresh status</button>
      </div>
      <div class="ch-body">
        @if (cacheCollections().length === 0 && !cacheLoading()) {
          <div class="sess-empty">No cached collections yet. Open /memory, /sessions, /ts, or /php to seed.</div>
        }
        <table class="ch-table">
          <thead><tr><th>collection</th><th>items</th><th>last scan</th><th>age</th><th class="ch-actions-col">actions</th></tr></thead>
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
                  <button class="btn btn-ghost btn-sm" (click)="refreshCacheCollection(c.collection)" title="Re-scan + write through">↻</button>
                  <button class="btn btn-ghost btn-sm" (click)="clearCacheCollection(c.collection)" title="Drop cached rows">×</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class CacheComponent implements OnInit {
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
      const v = await callBridge<CacheStatusResponse>('cache_status', {});
      this.cacheCollections.set(v?.collections || []);
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
      await callBridge('cache_clear', { collection });
    }
    await this.loadCacheStatus();
  }

  async clearCacheCollection(collection: string): Promise<void> {
    if (!confirm(`Clear cached ${collection}? Next access will re-scan.`)) return;
    await callBridge('cache_clear', { collection });
    await this.loadCacheStatus();
  }
}
