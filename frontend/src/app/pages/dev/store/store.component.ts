// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { FileEditorStore } from '../../../services/store/file-editor.store';

interface StoreGroup {
  name: string;
  count: number;
}

interface StoreEntry {
  key: string;
  value: string;
}

interface StoreFile {
  path: string;
  rel: string;
  name: string;
  ext: string;
  size_bytes: number;
  modified: string;
  preview: string;
}

/**
 * Store panel — SQLite KV namespaces + ~/.core/* config files.
 *
 * TODO(snider/wails): swap callBridge('store_*') for a storeBridge
 * wails service.
 *
 * TODO: openStoreFileInEditor no-op (logs only). Wire to shared
 * FileEditorService when Search extracts.
 */
@Component({
  selector: 'dev-store',
  standalone: true,
  template: `
    <section class="block str-block">
      <div class="block-header str-header">
        <h2 class="block-title">Store</h2>
        <span class="editorial subtitle">SQLite KV store + ~/.core/* config files. The IDE's persistent layer surfaced.</span>
      </div>
      <div class="str-toolbar">
        <div class="str-tabs">
          <button class="str-tab" [class.active]="storeTab() === 'groups'" (click)="storeTab.set('groups')">
            KV Groups <span class="str-tab-count">{{ storeGroups().length }}</span>
          </button>
          <button class="str-tab" [class.active]="storeTab() === 'files'" (click)="storeTab.set('files')">
            Files <span class="str-tab-count">{{ storeFiles().length }}</span>
          </button>
        </div>
        <button class="btn btn-ghost btn-sm" (click)="loadStore()">Refresh</button>
      </div>

      <div class="str-body">
        @if (storeTab() === 'groups') {
          <div class="str-side">
            <h3>Namespaces ({{ storeGroups().length }})</h3>
            @if (storeGroups().length === 0) {
              <div class="str-empty">No KV namespaces. Store may be empty.</div>
            }
            @for (g of storeGroups(); track g.name) {
              <button class="str-row"
                      [class.active]="storeSelectedGroup() === g.name"
                      (click)="selectStoreGroup(g.name)">
                <span class="str-name">{{ g.name }}</span>
                <span class="str-count">{{ g.count }}</span>
              </button>
            }
          </div>
          <div class="str-main">
            @if (storeSelectedGroup(); as group) {
              <div class="str-group-head">{{ group }} · {{ storeEntries().length }} entries</div>
              @if (storeEntries().length === 0) {
                <div class="str-empty-pane">Empty namespace.</div>
              } @else {
                <table class="str-table">
                  <thead><tr><th>key</th><th>value</th><th class="str-actions">·</th></tr></thead>
                  <tbody>
                    @for (e of storeEntries(); track e.key) {
                      <tr>
                        <td><code>{{ e.key }}</code></td>
                        <td><code>{{ e.value.length > 200 ? e.value.slice(0, 200) + '…' : e.value }}</code></td>
                        <td class="str-actions">
                          <button class="btn btn-ghost btn-sm" (click)="deleteStoreEntry(group, e.key)" title="Delete entry">×</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            } @else {
              <div class="str-empty-pane">Pick a namespace to view its entries.</div>
            }
          </div>
        } @else {
          <div class="str-side str-files-side">
            <h3>Config files ({{ storeFiles().length }})</h3>
            @for (f of storeFiles(); track f.path) {
              <button class="str-row"
                      [class.active]="storeSelectedFile()?.path === f.path"
                      (click)="selectStoreFile(f)">
                <span class="str-file-name">{{ f.rel }}</span>
                <span class="str-file-meta">{{ f.size_bytes }}b · {{ f.ext.replace('.','') }}</span>
              </button>
            }
          </div>
          <div class="str-main">
            @if (storeSelectedFile(); as f) {
              <div class="str-file-head">
                <code class="str-file-path">{{ f.path }}</code>
                <button class="btn btn-ghost btn-sm" (click)="openStoreFileInEditor(f)">Open in editor</button>
              </div>
              <pre class="str-file-preview">{{ f.preview }}</pre>
            } @else {
              <div class="str-empty-pane">Pick a file to preview.</div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    /* Store panel */
    .str-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .str-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .str-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .str-tabs { display: flex; gap: 4px; }
    .str-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .str-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .str-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .str-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .str-side { width: 280px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .str-files-side { width: 320px; }
    .str-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .str-row { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; width: 100%; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .str-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .str-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .str-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 600; }
    .str-count { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .str-file-name { font-family: var(--font-mono); font-size: 11px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .str-file-meta { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .str-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .str-empty, .str-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .str-empty-pane { padding: 30px; text-align: center; }
    .str-group-head { font-family: var(--font-mono); font-size: 13px; color: var(--fg-1); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-1); }
    .str-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .str-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .str-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); vertical-align: top; }
    .str-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); word-break: break-all; }
    .str-actions { width: 50px; text-align: right; }
    .str-file-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-1); }
    .str-file-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; }
    .str-file-preview { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 12px 14px; margin: 0; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; color: var(--fg-2); white-space: pre-wrap; max-height: 600px; overflow-y: auto; }
  `],
})
export class StoreComponent implements OnInit {
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  readonly storeTab = signal<'groups' | 'files'>('groups');
  readonly storeGroups = signal<StoreGroup[]>([]);
  readonly storeSelectedGroup = signal<string | null>(null);
  readonly storeEntries = signal<StoreEntry[]>([]);
  readonly storeFiles = signal<StoreFile[]>([]);
  readonly storeSelectedFile = signal<StoreFile | null>(null);

  ngOnInit(): void {
    void this.loadStore();
  }

  async loadStore(): Promise<void> {
    try {
      const [groups, files] = await Promise.all([
        callBridge<{ groups?: StoreGroup[] }>('store_groups', {}),
        callBridge<{ files?: StoreFile[] }>('store_files', {}),
      ]);
      this.storeGroups.set(groups?.groups || []);
      this.storeFiles.set(files?.files || []);
    } catch (e) {
      console.warn('[store] load error:', e);
    }
  }

  async selectStoreGroup(name: string): Promise<void> {
    this.storeSelectedGroup.set(name);
    try {
      const v = await callBridge<{ entries?: StoreEntry[] }>('store_entries', { group: name, limit: 200 });
      this.storeEntries.set(v?.entries || []);
    } catch {
      // ignore
    }
  }

  async deleteStoreEntry(group: string, key: string): Promise<void> {
    try {
      await callBridge('store_delete', { group, key });
      await this.selectStoreGroup(group);
      await this.loadStore();
    } catch {
      // ignore
    }
  }

  selectStoreFile(file: StoreFile): void {
    this.storeSelectedFile.set(file);
  }

  async openStoreFileInEditor(file: StoreFile): Promise<void> {
    await this.fileEditor.openFile(file.path);
    void this.router.navigate(['/dev/explorer']);
  }
}
