// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { callBridge } from '../../../lib/bridge';

interface OrmTable {
  name: string;
  pk: string[];
  fields: string[];
  medium: string;
  backend: string;
}

interface OrmBackend {
  current: string;
  duck_path: string;
  available: string[];
}

/**
 * Data panel — live ORM bridge over core/orm. Memium / DuckDB backed.
 *
 * TODO(snider/wails): swap callBridge('orm_*') for an ormBridge wails
 * service.
 */
@Component({
  selector: 'dev-data',
  standalone: true,
  template: `
    <section class="block data-block">
      <div class="block-header data-header">
        <h2 class="block-title">Data</h2>
        <span class="editorial subtitle">Live ORM bridge over <code>core/orm</code> · Memium-backed v1 demo. Same dispatch path swaps to DuckDB / Postgres / Borg under the hood.</span>
      </div>
      @if (ormError(); as err) {
        <div class="data-error">{{ err }}</div>
      }
      <div class="data-body">
        <div class="data-tables-side">
          <h3>Backend</h3>
          <div class="data-backend-picker">
            <button class="data-backend-btn" [class.active]="ormBackend().current === 'memium'" (click)="switchOrmBackend('memium')">
              <span class="data-backend-name">Memium</span>
              <span class="data-backend-meta">in-memory</span>
            </button>
            <button class="data-backend-btn" [class.active]="ormBackend().current === 'duckdb'" (click)="switchOrmBackend('duckdb')">
              <span class="data-backend-name">DuckDB</span>
              <span class="data-backend-meta">persistent</span>
            </button>
          </div>
          @if (ormBackend().current === 'duckdb' && ormBackend().duck_path) {
            <div class="data-backend-path"><code>{{ ormBackend().duck_path }}</code></div>
          }

          <h3 style="margin-top: 16px;">Tables</h3>
          @for (t of ormTables(); track t.name) {
            <button class="data-table-row" [class.active]="ormSelectedTable() === t.name" (click)="selectOrmTable(t.name)">
              <span class="data-table-name">{{ t.name }}</span>
              <span class="data-table-meta">{{ t.backend }} · pk: {{ t.pk.join(',') }}</span>
            </button>
          }
        </div>

        <div class="data-main">
          @if (ormSelectedTable(); as tbl) {
            <div class="data-toolbar">
              <span class="data-count">{{ ormCount() }} rows in <strong>{{ tbl }}</strong></span>
              <button class="btn btn-ghost btn-sm" (click)="refreshOrmRows()" [disabled]="ormLoading()">Refresh</button>
            </div>

            @if (ormTableSpec(tbl); as spec) {
              <div class="data-form">
                <h4>Insert row</h4>
                <div class="data-form-grid">
                  @for (f of spec.fields; track f) {
                    @if (f !== 'id' && f !== 'created_at') {
                      <label class="data-form-label">
                        <span>{{ f }}</span>
                        <input class="data-input" type="text"
                               [value]="ormDraftRow()[f] || ''"
                               (input)="ormDraftField(f, $any($event.target).value)" />
                      </label>
                    }
                  }
                </div>
                <button class="btn btn-primary btn-sm" (click)="saveOrmDraft()">+ Save</button>
                <span class="data-hint">id auto-assigned · created_at auto-stamped</span>
              </div>
            }

            @if (ormRows().length === 0) {
              <div class="data-empty">No rows.</div>
            } @else {
              <div class="data-grid-wrap">
                <table class="data-grid">
                  <thead>
                    <tr>
                      @for (f of ormTableFields(tbl); track f) {
                        <th>{{ f }}</th>
                      }
                      <th class="data-actions-col">·</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of ormRows(); track $index) {
                      <tr>
                        @for (f of ormTableFields(tbl); track f) {
                          <td><code>{{ r[f] }}</code></td>
                        }
                        <td class="data-actions-col">
                          <button class="btn btn-ghost btn-sm" (click)="deleteOrmRow(r, tbl)" title="Delete row">×</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          } @else {
            <div class="data-empty">No table selected.</div>
          }
        </div>
      </div>
    </section>
  `,
})
export class DataComponent implements OnInit {
  readonly ormBackend = signal<OrmBackend>({ current: 'memium', duck_path: '', available: [] });
  readonly ormTables = signal<OrmTable[]>([]);
  readonly ormSelectedTable = signal<string | null>(null);
  readonly ormRows = signal<Record<string, any>[]>([]);
  readonly ormCount = signal<number>(0);
  readonly ormError = signal<string | null>(null);
  readonly ormLoading = signal(false);
  readonly ormDraftRow = signal<Record<string, string>>({});

  ngOnInit(): void {
    void this.loadOrm();
  }

  async loadOrm(): Promise<void> {
    this.ormLoading.set(true);
    this.ormError.set(null);
    try {
      const [tables, backend] = await Promise.all([
        callBridge<{ tables?: OrmTable[] }>('orm_tables', {}),
        callBridge<OrmBackend>('orm_backend', {}),
      ]);
      if (backend) this.ormBackend.set(backend);
      const list = tables?.tables || [];
      this.ormTables.set(list);
      if (list.length > 0 && !this.ormSelectedTable()) {
        this.ormSelectedTable.set(list[0].name);
      }
      await this.refreshOrmRows();
    } catch (e) {
      this.ormError.set('orm bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.ormLoading.set(false);
    }
  }

  async switchOrmBackend(name: string): Promise<void> {
    this.ormError.set(null);
    try {
      const v = await callBridge<OrmBackend>('orm_backend', { name });
      if (v) this.ormBackend.set({ ...this.ormBackend(), current: v.current, duck_path: v.duck_path });
      const tables = await callBridge<{ tables?: OrmTable[] }>('orm_tables', {});
      this.ormTables.set(tables?.tables || []);
      await this.refreshOrmRows();
    } catch (e) {
      this.ormError.set('switch failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async refreshOrmRows(): Promise<void> {
    const table = this.ormSelectedTable();
    if (!table) return;
    try {
      const [rows, count] = await Promise.all([
        callBridge<Record<string, any>[]>('orm_get', { table, limit: 100 }),
        callBridge<number>('orm_count', { table }),
      ]);
      this.ormRows.set(Array.isArray(rows) ? rows : []);
      this.ormCount.set(typeof count === 'number' ? count : 0);
    } catch (e) {
      this.ormError.set('orm_get failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  selectOrmTable(name: string): void {
    this.ormSelectedTable.set(name);
    this.ormDraftRow.set({});
    void this.refreshOrmRows();
  }

  ormDraftField(field: string, value: string): void {
    this.ormDraftRow.update((r) => ({ ...r, [field]: value }));
  }

  async saveOrmDraft(): Promise<void> {
    const table = this.ormSelectedTable();
    if (!table) return;
    const draft = this.ormDraftRow();
    if (!draft['id']) {
      const maxId = this.ormRows().reduce((m, r) => Math.max(m, Number(r['id']) || 0), 0);
      draft['id'] = String(maxId + 1);
    }
    if (!draft['created_at']) {
      draft['created_at'] = new Date().toISOString();
    }
    const row: Record<string, any> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (k === 'id') row[k] = Number(v);
      else row[k] = v;
    }
    try {
      await callBridge('orm_save', { table, row });
      this.ormDraftRow.set({});
      await this.refreshOrmRows();
    } catch (e) {
      this.ormError.set('save failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  ormTableSpec(name: string): OrmTable | null {
    return this.ormTables().find((t) => t.name === name) || null;
  }

  ormTableFields(name: string | null): string[] {
    if (!name) return [];
    return this.ormTableSpec(name)?.fields || [];
  }

  async deleteOrmRow(row: Record<string, any>, table: string): Promise<void> {
    const tableSpec = this.ormTableSpec(table);
    if (!tableSpec) return;
    const pkField = tableSpec.pk[0];
    try {
      await callBridge('orm_delete', { table, field: pkField, value: row[pkField] });
      await this.refreshOrmRows();
    } catch (e) {
      this.ormError.set('delete failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
}
