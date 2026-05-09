// SPDX-Licence-Identifier: EUPL-1.2

import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FileEditorStore } from '../../../services/store/file-editor.store';
import { SettingsStore } from '../../../services/store/settings.store';

/**
 * Explorer panel — directory tree + tabs + Monaco editor. Backed by
 * FileEditorStore so Search (and any other panel) can open a file in
 * the same tab list and reveal a line.
 *
 * Editor settings (font-size / tab-size / word-wrap / line-numbers /
 * minimap / render-whitespace) bind live to SettingsStore — change
 * the values in /dev/settings and Monaco re-applies on the next
 * change-detection tick.
 *
 * Custom elements: <lethean-monaco> is a Lit web component; we register
 * CUSTOM_ELEMENTS_SCHEMA so Angular doesn't complain about the unknown
 * tag.
 */
@Component({
  selector: 'dev-explorer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="block explorer-block">
      <div class="block-header explorer-header">
        <h2 class="block-title">Explorer</h2>
        <div class="breadcrumb">
          @for (seg of fileEditor.pathSegments(); track seg.path; let isLast = $last) {
            <button class="crumb" (click)="loadDir(seg.path)">{{ seg.name }}</button>
            @if (!isLast) {
              <span class="crumb-sep">/</span>
            }
          }
        </div>
      </div>

      <div class="explorer-grid" [class.has-file]="fileEditor.openFiles().length > 0">
        <!-- Directory listing -->
        <div class="explorer-tree">
          <div class="tree-row up" (click)="navigateUp()" title="Up one directory">
            <span class="tree-icon">⤴</span>
            <span class="tree-name">..</span>
          </div>
          @if (fileEditor.explorerLoading()) {
            <div class="tree-row loading">loading…</div>
          }
          @for (entry of fileEditor.dirEntries(); track entry.name) {
            <div
              class="tree-row"
              [class.dir]="entry.is_dir"
              [class.file]="!entry.is_dir"
              [class.active]="!entry.is_dir && fileEditor.activeFile()?.path === fileEditor.currentPath() + '/' + entry.name"
              (click)="openFromTree(entry.name, entry.is_dir)"
            >
              <span class="tree-icon">{{ entry.is_dir ? '▸' : '·' }}</span>
              <span class="tree-name">{{ entry.name }}</span>
            </div>
          }
          @if (!fileEditor.explorerLoading() && fileEditor.dirEntries().length === 0) {
            <div class="tree-row empty">(empty)</div>
          }
        </div>

        <!-- Tabs + editor -->
        @if (fileEditor.openFiles().length > 0) {
          <div class="explorer-viewer">
            <!-- Tab bar -->
            <div class="tab-bar">
              <div class="tab-list">
                @for (f of fileEditor.openFiles(); track f.path; let i = $index) {
                  <div
                    class="tab"
                    [class.active]="i === fileEditor.activeFileIdx()"
                    [title]="f.path"
                    (click)="selectTab(i)"
                    (auxclick)="closeTab(i, $event)"
                  >
                    <span class="tab-name">{{ basename(f.path) }}</span>
                    <span class="tab-dirty" [class.show]="f.dirty">●</span>
                    <button
                      class="tab-close"
                      title="Close tab"
                      (click)="closeTab(i, $event)"
                    >×</button>
                  </div>
                }
              </div>
              <button
                class="tab-close-all"
                title="Close all tabs"
                (click)="closeAllTabs()"
                [disabled]="fileEditor.openFiles().length === 0"
              >× all</button>
            </div>

            <!-- Active file metadata -->
            @if (fileEditor.activeFile(); as f) {
              <div class="viewer-header">
                <span class="viewer-path">{{ f.path }}</span>
                <span class="viewer-lang">{{ f.language }}</span>
                @if (f.dirty) {
                  <span class="viewer-dirty" title="unsaved changes">●</span>
                }
                <button class="viewer-save" (click)="saveActiveTab()" title="Save (⌘S)">Save</button>
              </div>

              <!-- Monaco — single instance, switches model per tab -->
              <div class="viewer-monaco">
                <lethean-monaco
                  #editorRef
                  [attr.path]="f.path"
                  [attr.language]="f.language"
                  [attr.value]="f.content"
                  theme="vs-dark"
                  [attr.font-size]="settings.settings().editorFontSize"
                  [attr.tab-size]="settings.settings().editorTabSize"
                  [attr.word-wrap]="settings.settings().editorWordWrap ? 'on' : 'off'"
                  [attr.line-numbers]="settings.settings().editorLineNumbers ? 'on' : 'off'"
                  [attr.minimap]="settings.settings().editorMinimap ? '' : null"
                  [attr.render-whitespace]="settings.settings().editorRenderWhitespace"
                  (lethean-editor-change)="onEditorChange($any($event).detail.value)"
                  (lethean-editor-save)="onEditorSave($any($event).detail.value)"
                ></lethean-monaco>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    /* Explorer — file tree + viewer */
    .explorer-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .explorer-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-3);
      flex-wrap: wrap;
    }
    .crumb {
      background: transparent;
      border: 0;
      color: var(--brand-200);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      font: inherit;
    }
    .crumb:hover { background: var(--ink-2); color: var(--brand-100); }
    .crumb-sep { color: var(--fg-4); }
    .explorer-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: 0;
      overflow: hidden;
    }
    .explorer-grid:not(.has-file) { grid-template-columns: 1fr; }
    .explorer-tree {
      border-right: 1px solid var(--line-1);
      overflow: auto;
      padding: 6px 0;
      min-height: 0;
    }
    .tree-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      font-size: 12.5px;
      font-family: var(--font-mono);
      color: var(--fg-1);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tree-row:hover { background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2)); }
    .tree-row.dir { color: var(--brand-200); }
    .tree-row.file { color: var(--fg-2); }
    .tree-row.file.active {
      background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2));
      color: var(--fg-0);
    }
    .tree-row.up { color: var(--fg-3); border-bottom: 1px solid var(--line-1); margin-bottom: 4px; }
    .tree-row.loading, .tree-row.empty { color: var(--fg-4); font-style: italic; cursor: default; }
    .tree-row.loading:hover, .tree-row.empty:hover { background: transparent; }
    .tree-icon { width: 12px; text-align: center; flex-shrink: 0; opacity: 0.7; }
    /* Tab bar */
    .tab-bar {
      display: flex;
      align-items: stretch;
      background: var(--ink-2);
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
      min-height: 30px;
    }
    .tab-list {
      flex: 1;
      display: flex;
      align-items: stretch;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .tab-list::-webkit-scrollbar { height: 3px; }
    .tab-list::-webkit-scrollbar-thumb { background: var(--line-2); }
    .tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px 6px 12px;
      border-right: 1px solid var(--line-1);
      cursor: pointer;
      max-width: 220px;
      min-width: 80px;
      user-select: none;
      font-size: 11.5px;
      font-family: var(--font-mono);
      color: var(--fg-2);
      background: var(--ink-2);
      flex-shrink: 0;
      position: relative;
    }
    .tab:hover { background: var(--ink-3); color: var(--fg-1); }
    .tab.active {
      background: var(--ink-1);
      color: var(--fg-0);
      box-shadow: inset 0 2px 0 0 var(--brand-400);
    }
    .tab-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tab-dirty {
      width: 8px;
      color: var(--brand-300);
      font-size: 13px;
      line-height: 1;
      visibility: hidden;
      flex-shrink: 0;
    }
    .tab-dirty.show { visibility: visible; }
    .tab-close {
      width: 16px;
      height: 16px;
      background: transparent;
      border: 0;
      border-radius: 3px;
      color: var(--fg-3);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }
    .tab-close:hover {
      background: var(--ink-3);
      color: var(--fg-0);
    }
    .tab-close-all {
      padding: 0 12px;
      background: transparent;
      border: 0;
      border-left: 1px solid var(--line-1);
      color: var(--fg-3);
      font-size: 11px;
      font-family: var(--font-mono);
      cursor: pointer;
      flex-shrink: 0;
    }
    .tab-close-all:hover { color: var(--fg-0); background: var(--ink-3); }
    .tab-close-all:disabled { opacity: 0.3; cursor: default; }
    .explorer-viewer {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .viewer-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      border-bottom: 1px solid var(--line-1);
      background: var(--ink-2);
      flex-shrink: 0;
    }
    .viewer-path {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      direction: rtl;
      text-align: left;
    }
    .viewer-lang {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--fg-4);
      background: var(--ink-3);
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .viewer-dirty {
      color: var(--brand-300);
      font-size: 16px;
      line-height: 1;
      margin-right: 4px;
    }
    .viewer-save {
      padding: 3px 10px;
      background: var(--brand-500);
      color: var(--fg-0);
      border: 1px solid var(--brand-400);
      border-radius: 4px;
      font: 500 11px / 1 inherit;
      cursor: pointer;
    }
    .viewer-save:hover {
      background: color-mix(in oklch, var(--brand-500) 90%, white);
    }
    .viewer-close {
      width: 22px;
      height: 22px;
      background: transparent;
      border: 1px solid var(--line-2);
      border-radius: 4px;
      color: var(--fg-3);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
    .viewer-close:hover { color: var(--fg-0); border-color: var(--line-1); }
    .viewer-monaco {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
    }
    .viewer-monaco lethean-monaco {
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .viewer-body {
      flex: 1;
      margin: 0;
      padding: 14px 18px;
      overflow: auto;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.55;
      color: var(--fg-1);
      background: var(--ink-1);
      white-space: pre;
      tab-size: 2;
      min-height: 0;
    }
    .viewer-body code { font: inherit; color: inherit; }
  `],
})
export class ExplorerComponent implements OnInit, OnDestroy {
  readonly fileEditor = inject(FileEditorStore);
  readonly settings = inject(SettingsStore);

  @ViewChild('editorRef') editorRef?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Eager-load the dir if the store hasn't already fetched.
    if (this.fileEditor.dirEntries().length === 0) {
      void this.fileEditor.loadDir(this.fileEditor.currentPath());
    }
    // Hand the Monaco ref to the store so search can call revealLine().
    queueMicrotask(() => {
      if (this.editorRef) this.fileEditor.setEditorRef(this.editorRef);
    });
  }

  ngOnDestroy(): void {
    this.fileEditor.setEditorRef(null);
  }

  loadDir(path: string): void { void this.fileEditor.loadDir(path); }
  navigateUp(): void { this.fileEditor.navigateUp(); }
  openFromTree(name: string, isDir: boolean): void {
    void this.fileEditor.openFileFromTree(name, isDir);
  }
  selectTab(idx: number): void { this.fileEditor.selectTab(idx); }
  closeTab(idx: number, ev?: Event): void {
    ev?.stopPropagation();
    void this.fileEditor.closeTab(idx);
  }
  closeAllTabs(): void { void this.fileEditor.closeAllTabs(); }
  onEditorChange(value: string): void { this.fileEditor.onEditorChange(value); }
  onEditorSave(value: string): void { void this.fileEditor.onEditorSave(value); }
  saveActiveTab(): void { this.fileEditor.saveActiveTab(); }

  basename(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }
}
