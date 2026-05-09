// SPDX-Licence-Identifier: EUPL-1.2

import { ElementRef, Injectable, computed, inject, signal } from '@angular/core';
import { callBridgeRaw } from '../../lib/bridge';
import { NotificationService } from '../notification.service';
import { WorkspaceStore } from './workspace.store';

export interface OpenFile {
  path: string;
  content: string;
  language: string;
  dirty: boolean;
}

export interface DirEntry {
  name: string;
  is_dir: boolean;
  type: string;
}

/**
 * Shared editor state for /dev/explorer + /dev/search + any panel that
 * wants to open a file in the IDE's tabs (devops, lint, php, store, …).
 *
 * Owns: open tabs, active tab index, current explorer directory, dir
 * entries, the Monaco ElementRef. Persistence (workspace+open_files
 * survive across restarts) is driven by IdeComponent — it reads these
 * signals and POSTs to /internal/ui-state.
 *
 * Other panels call `openFile(path, line?)` instead of duplicating the
 * "already open? switch tab : fetch + push" dance — replaces the
 * `// TODO: route through a shared FileEditorService when Search extracts.`
 * markers scattered through devops/lint/php/store/etc.
 */
@Injectable({ providedIn: 'root' })
export class FileEditorStore {
  private readonly workspace = inject(WorkspaceStore);
  private readonly notify = inject(NotificationService);

  readonly currentPath = signal<string>(this.workspace.root());
  readonly dirEntries = signal<DirEntry[]>([]);
  readonly explorerLoading = signal(false);

  readonly openFiles = signal<OpenFile[]>([]);
  readonly activeFileIdx = signal<number>(-1);

  readonly activeFile = computed<OpenFile | null>(() => {
    const idx = this.activeFileIdx();
    const files = this.openFiles();
    if (idx < 0 || idx >= files.length) return null;
    return files[idx];
  });

  readonly pathSegments = computed<{ name: string; path: string }[]>(() => {
    const p = this.currentPath();
    const segs: { name: string; path: string }[] = [];
    const parts = p.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc += '/' + part;
      segs.push({ name: part, path: acc });
    }
    return segs;
  });

  /**
   * Monaco ElementRef — set by ExplorerComponent's @ViewChild on init,
   * cleared on destroy. Other panels (search) call revealLine through
   * here so they don't need their own ref.
   */
  private editorRef: ElementRef<HTMLElement> | null = null;

  /** State change hook — IdeComponent wires this to its debounced UI-state saver. */
  private onChange: (() => void) | null = null;

  setEditorRef(ref: ElementRef<HTMLElement> | null): void {
    this.editorRef = ref;
  }

  /**
   * Explicitly set the explorer's currentPath without triggering a
   * dir_list fetch. Used at boot (loadUIState) + after Settings save
   * to sync the explorer to the workspace root without forcing an
   * eager fetch — the actual fetch happens lazily when the user
   * visits /dev/explorer.
   */
  setExplorerPath(path: string): void {
    this.currentPath.set(path);
  }

  setOnChange(fn: (() => void) | null): void {
    this.onChange = fn;
  }

  private notifyChange(): void {
    this.onChange?.();
  }

  async loadDir(path: string): Promise<void> {
    this.explorerLoading.set(true);
    try {
      const data = await callBridgeRaw('dir_list', { path });
      if (data.ok && Array.isArray(data.value)) {
        const entries = (data.value as DirEntry[])
          .slice()
          .sort((a, b) => {
            if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        this.currentPath.set(path);
        this.dirEntries.set(entries);
        this.workspace.setRoot(path);
        this.notifyChange();
      }
    } finally {
      this.explorerLoading.set(false);
    }
  }

  navigateUp(): void {
    const p = this.currentPath();
    const idx = p.lastIndexOf('/');
    if (idx > 0) {
      void this.loadDir(p.slice(0, idx));
    }
  }

  async openFileFromTree(name: string, isDir: boolean): Promise<void> {
    const path = this.currentPath().replace(/\/$/, '') + '/' + name;
    if (isDir) {
      await this.loadDir(path);
      return;
    }
    await this.openFile(path);
  }

  /**
   * Open a file in the tabs. If already open, just switches to it.
   * Caller is responsible for routing to /dev/explorer if needed and
   * for calling `revealLine()` to jump.
   */
  async openFile(path: string): Promise<number> {
    const existing = this.openFiles().findIndex((f) => f.path === path);
    if (existing >= 0) {
      this.activeFileIdx.set(existing);
      this.notifyChange();
      return existing;
    }
    const [data, lang] = await Promise.all([
      callBridgeRaw('file_read', { path }),
      callBridgeRaw('lang_detect', { path }),
    ]);
    const content = data.ok
      ? typeof data.value === 'string'
        ? data.value
        : JSON.stringify(data.value, null, 2)
      : `(error: ${data.error || 'unknown'})`;
    const language = ((lang as any).language as string) || 'plaintext';
    this.openFiles.update((files) => [...files, { path, content, language, dirty: false }]);
    const idx = this.openFiles().length - 1;
    this.activeFileIdx.set(idx);
    this.notifyChange();
    return idx;
  }

  /**
   * After openFile (or selectTab), reveal a specific line. Defers so
   * Monaco has time to switch its model.
   */
  revealLine(line: number, column: number = 1): void {
    setTimeout(() => {
      const monacoEl = this.editorRef?.nativeElement as
        | (HTMLElement & { revealLine?: (line: number, column?: number) => void })
        | undefined;
      monacoEl?.revealLine?.(line, column);
    }, 250);
  }

  selectTab(idx: number): void {
    if (idx >= 0 && idx < this.openFiles().length) {
      this.activeFileIdx.set(idx);
      this.notifyChange();
    }
  }

  async closeTab(idx: number): Promise<void> {
    const files = this.openFiles();
    const f = files[idx];
    if (!f) return;
    if (f.dirty) {
      const ok = await this.notify.confirm({
        title: 'Discard unsaved changes?',
        message: `${this.basename(f.path)} has unsaved changes that will be lost.`,
        confirmLabel: 'Discard',
        variant: 'danger',
      });
      if (!ok) return;
    }
    const monacoEl = this.editorRef?.nativeElement as
      | (HTMLElement & { closeModel?: (path: string) => void })
      | undefined;
    monacoEl?.closeModel?.(f.path);

    this.openFiles.update((arr) => arr.filter((_, i) => i !== idx));
    const remaining = this.openFiles().length;
    const cur = this.activeFileIdx();
    if (remaining === 0) {
      this.activeFileIdx.set(-1);
    } else if (cur >= remaining) {
      this.activeFileIdx.set(remaining - 1);
    } else if (cur > idx) {
      this.activeFileIdx.set(cur - 1);
    }
    this.notifyChange();
  }

  async closeAllTabs(): Promise<void> {
    const dirty = this.openFiles().filter((f) => f.dirty);
    if (dirty.length > 0) {
      const ok = await this.notify.confirm({
        title: 'Discard unsaved changes?',
        message: `${dirty.length} file(s) have unsaved changes that will be lost.`,
        confirmLabel: 'Discard all',
        variant: 'danger',
      });
      if (!ok) return;
    }
    const monacoEl = this.editorRef?.nativeElement as
      | (HTMLElement & { closeModel?: (path: string) => void })
      | undefined;
    if (monacoEl?.closeModel) {
      for (const f of this.openFiles()) monacoEl.closeModel(f.path);
    }
    this.openFiles.set([]);
    this.activeFileIdx.set(-1);
    this.notifyChange();
  }

  onEditorChange(value: string): void {
    const idx = this.activeFileIdx();
    if (idx < 0) return;
    this.openFiles.update((files) =>
      files.map((f, i) =>
        i === idx ? { ...f, content: value, dirty: value !== f.content || f.dirty } : f,
      ),
    );
  }

  async onEditorSave(value: string): Promise<void> {
    const idx = this.activeFileIdx();
    if (idx < 0) return;
    const f = this.openFiles()[idx];
    if (!f) return;
    const data = await callBridgeRaw('file_write', { path: f.path, content: value });
    if (data.ok) {
      this.openFiles.update((files) =>
        files.map((file, i) =>
          i === idx ? { ...file, content: value, dirty: false } : file,
        ),
      );
    } else {
      this.notify.notify({
        message: `Save failed: ${(data as any).error || 'unknown'}`,
        variant: 'danger',
        icon: 'triangle-exclamation',
      });
    }
  }

  saveActiveTab(): void {
    const f = this.activeFile();
    if (f) void this.onEditorSave(f.content);
  }

  /**
   * Restore a single file path into the tabs without prompting or
   * marking dirty — used by IdeComponent.loadUIState() at boot.
   */
  async restoreOpenFile(path: string): Promise<boolean> {
    const data = await callBridgeRaw('file_read', { path });
    if (!data.ok) return false;
    const lang = await callBridgeRaw('lang_detect', { path });
    const content = typeof data.value === 'string' ? data.value : JSON.stringify(data.value, null, 2);
    const language = ((lang as any).language as string) || 'plaintext';
    this.openFiles.update((arr) => [...arr, { path, content, language, dirty: false }]);
    return true;
  }

  basename(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }

}
