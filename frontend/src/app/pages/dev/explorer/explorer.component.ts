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
    this.fileEditor.closeTab(idx);
  }
  closeAllTabs(): void { this.fileEditor.closeAllTabs(); }
  onEditorChange(value: string): void { this.fileEditor.onEditorChange(value); }
  onEditorSave(value: string): void { void this.fileEditor.onEditorSave(value); }
  saveActiveTab(): void { this.fileEditor.saveActiveTab(); }

  basename(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }
}
