// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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
  imports: [TranslatePipe],
  template: `
    <section class="block data-block">
      <div class="block-header data-header">
        <h2 class="block-title">{{ 'data.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'data.subtitle.prefix' | translate }} <code>core/orm</code> · {{ 'data.subtitle.suffix' | translate }}</span>
      </div>
      @if (ormError(); as err) {
        <div class="data-error">{{ err }}</div>
      }
      <div class="data-body">
        <div class="data-tables-side">
          <h3>{{ 'data.section.backend' | translate }}</h3>
          <div class="data-backend-picker">
            <button class="data-backend-btn" [class.active]="ormBackend().current === 'memium'" (click)="switchOrmBackend('memium')">
              <span class="data-backend-name">Memium</span>
              <span class="data-backend-meta">{{ 'data.backend.in-memory' | translate }}</span>
            </button>
            <button class="data-backend-btn" [class.active]="ormBackend().current === 'duckdb'" (click)="switchOrmBackend('duckdb')">
              <span class="data-backend-name">DuckDB</span>
              <span class="data-backend-meta">{{ 'data.backend.persistent' | translate }}</span>
            </button>
          </div>
          @if (ormBackend().current === 'duckdb' && ormBackend().duck_path) {
            <div class="data-backend-path"><code>{{ ormBackend().duck_path }}</code></div>
          }

          <h3 style="margin-top: 16px;">{{ 'data.section.tables' | translate }}</h3>
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
              <span class="data-count">{{ ormCount() }} {{ 'data.label.rows-in' | translate }} <strong>{{ tbl }}</strong></span>
              <button class="btn btn-ghost btn-sm" (click)="refreshOrmRows()" [disabled]="ormLoading()">{{ 'data.button.refresh' | translate }}</button>
            </div>

            @if (ormTableSpec(tbl); as spec) {
              <div class="data-form">
                <h4>{{ 'data.section.insert-row' | translate }}</h4>
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
                <button class="btn btn-primary btn-sm" (click)="saveOrmDraft()">+ {{ 'data.button.save' | translate }}</button>
                <span class="data-hint">{{ 'data.hint.auto-fields' | translate }}</span>
              </div>
            }

            @if (ormRows().length === 0) {
              <div class="data-empty">{{ 'data.empty.no-rows' | translate }}</div>
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
                          <button class="btn btn-ghost btn-sm" (click)="deleteOrmRow(r, tbl)" [title]="'data.tooltip.delete-row' | translate">×</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          } @else {
            <div class="data-empty">{{ 'data.empty.no-table' | translate }}</div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Data panel */
    .data-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .data-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .data-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .data-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .data-tables-side { width: 200px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; }
    .data-tables-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .data-backend-picker { display: flex; gap: 4px; margin-bottom: 6px; }
    .data-backend-btn { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 6px 8px; background: var(--ink-2); border: 1px solid var(--line-2); border-radius: 5px; cursor: pointer; text-align: left; }
    .data-backend-btn:hover { border-color: var(--brand-400); }
    .data-backend-btn.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); }
    .data-backend-name { font-size: 11px; font-weight: 600; color: var(--fg-1); }
    .data-backend-meta { font-size: 9px; color: var(--fg-3); }
    .data-backend-path { font-size: 9px; color: var(--fg-3); margin-bottom: 8px; word-break: break-all; }
    .data-backend-path code { font-family: var(--font-mono); }
    .data-table-row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 8px 10px; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .data-table-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .data-table-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); }
    .data-table-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 600; }
    .data-table-meta { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .data-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .data-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .data-count { font-size: 12px; color: var(--fg-2); }
    .data-form { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
    .data-form h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 10px; }
    .data-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-bottom: 10px; }
    .data-form-label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--fg-3); }
    .data-input { background: var(--ink-1); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 9px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); }
    .data-input:focus { border-color: var(--brand-400); outline: none; }
    .data-hint { font-size: 10px; color: var(--fg-3); margin-left: 10px; font-style: italic; }
    .data-grid-wrap { overflow-x: auto; border: 1px solid var(--line-1); border-radius: 8px; }
    .data-grid { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-grid th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); background: var(--ink-2); border-bottom: 1px solid var(--line-1); }
    .data-grid td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .data-grid td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .data-actions-col { width: 40px; text-align: center; }
    .data-empty { text-align: center; color: var(--fg-3); padding: 32px; font-style: italic; font-size: 13px; }
  `],
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
