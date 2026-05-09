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
