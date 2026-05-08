// SPDX-Licence-Identifier: EUPL-1.2

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type * as monacoTypes from 'monaco-editor';

// Monaco's pre-built distribution lives at /monaco/vs/ (copied from
// node_modules/monaco-editor/min/vs into frontend/public/monaco/vs by setup).
// The AMD loader (vs/loader.js) bootstraps everything — fonts, languages,
// workers — without going through the Angular esbuild bundler. That avoids
// the "no loader for .ttf" problem the bundled-import path hits.
//
// One-time global load; subsequent <lethean-monaco> instances reuse the same
// monaco namespace.

declare global {
  interface Window {
    monaco?: typeof monacoTypes;
    require?: {
      (deps: string[], cb: () => void): void;
      config: (opts: { paths: Record<string, string> }) => void;
    };
    MonacoEnvironment?: monacoTypes.Environment;
  }
}

let monacoLoadingPromise: Promise<typeof monacoTypes> | null = null;

function ensureMonacoLoaded(): Promise<typeof monacoTypes> {
  if (window.monaco) return Promise.resolve(window.monaco);
  if (monacoLoadingPromise) return monacoLoadingPromise;

  // Skip workers — degrades TS IntelliSense but keeps highlighting / find /
  // multi-cursor / indentation. Wire workers later if we ship a build with
  // language services as a real requirement.
  window.MonacoEnvironment = {
    getWorker: () => {
      const blob = new Blob(['self.onmessage=function(){};'], {
        type: 'application/javascript',
      });
      return new Worker(URL.createObjectURL(blob));
    },
  };

  monacoLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/monaco/vs/loader.js';
    script.onload = () => {
      const req = window.require;
      if (!req) {
        reject(new Error('monaco loader.js did not provide global require'));
        return;
      }
      req.config({ paths: { vs: '/monaco/vs' } });
      req(['vs/editor/editor.main'], () => {
        if (window.monaco) {
          resolve(window.monaco);
        } else {
          reject(new Error('monaco loader completed without exporting monaco'));
        }
      });
    };
    script.onerror = () => reject(new Error('failed to fetch /monaco/vs/loader.js'));
    document.head.appendChild(script);
  });
  return monacoLoadingPromise;
}

/**
 * <lethean-monaco>
 *
 * Monaco editor mounted inside the IDE. Light DOM so the host's flex layout
 * cascades into the editor's host div without shadow boundary fights.
 *
 * Properties:
 *   value     — current editor content
 *   language  — Monaco language id (typescript, go, markdown, etc.)
 *   path      — display only; carried through change/save events
 *   readonly  — when true, edits are rejected
 *   theme     — vs / vs-dark / hc-black
 *
 * Events:
 *   lethean-editor-save   — Ctrl/Cmd+S, detail: { path, value }
 *   lethean-editor-change — every edit, detail: { path, value }
 */
@customElement('lethean-monaco')
export class LetheanMonaco extends LitElement {
  @property() value = '';
  @property() language = 'plaintext';
  @property() path = '';
  @property({ type: Boolean }) readonly = false;
  @property() theme: 'vs' | 'vs-dark' | 'hc-black' = 'vs-dark';

  // Editor knobs — live-applied via editor.updateOptions on change.
  // Defaults preserve historical Monaco init values.
  @property({ type: Number, attribute: 'font-size' }) fontSize = 12.5;
  @property({ type: Number, attribute: 'tab-size' }) tabSize = 2;
  @property({ attribute: 'word-wrap' }) wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded' = 'off';
  @property({ attribute: 'line-numbers' }) lineNumbers: 'on' | 'off' | 'relative' | 'interval' = 'on';
  @property({ type: Boolean }) minimap = false;
  @property({ attribute: 'render-whitespace' }) renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all' = 'selection';

  @state() private mounted = false;
  private editor?: monacoTypes.editor.IStandaloneCodeEditor;
  private resizeObs?: ResizeObserver;

  // One model per path → each tab keeps its own undo stack, cursor, scroll.
  // Models live until closeModel() is called or the element disconnects.
  private models = new Map<string, monacoTypes.editor.ITextModel>();
  private activePath?: string;
  private suppressNextChangeEvent = false;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override async connectedCallback() {
    super.connectedCallback();
    try {
      await ensureMonacoLoaded();
      // Wait one frame for the host to size the .editor-mount div.
      requestAnimationFrame(() => this.mount());
    } catch (e) {
      // Surface load failures to the bridge via console.error (the JS shim
      // will forward them — the dev sees them via webview_console).
      console.error('lethean-monaco: failed to load monaco', e);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObs?.disconnect();
    this.editor?.dispose();
    this.editor = undefined;
    for (const m of this.models.values()) m.dispose();
    this.models.clear();
  }

  /**
   * Reveal a specific line in the editor (used by search → open-at-line).
   * Centres the line, places the cursor at column 1, focuses the editor.
   */
  revealLine(line: number, column = 1) {
    if (!this.editor || line < 1) return;
    this.editor.revealLineInCenter(line);
    this.editor.setPosition({ lineNumber: line, column });
    this.editor.focus();
  }

  /**
   * Dispose the model for a given path. Called by the host (IdeComponent)
   * when a tab is closed so the model's memory is reclaimed.
   */
  closeModel(path: string) {
    const m = this.models.get(path);
    if (!m) return;
    if (this.editor?.getModel() === m) {
      this.editor.setModel(null);
    }
    m.dispose();
    this.models.delete(path);
    if (this.activePath === path) this.activePath = undefined;
  }

  private mount() {
    if (this.editor || !this.isConnected || !window.monaco) return;
    const host = this.querySelector('.editor-mount') as HTMLElement | null;
    if (!host) return;

    const m = window.monaco;
    this.editor = m.editor.create(host, {
      // value/language are managed via models below — leave the editor
      // model-less here, then call setModel() in switchToPath().
      theme: this.theme,
      readOnly: this.readonly,
      automaticLayout: false,
      minimap: { enabled: this.minimap },
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: this.fontSize,
      lineNumbers: this.lineNumbers,
      renderWhitespace: this.renderWhitespace,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: this.tabSize,
      wordWrap: this.wordWrap,
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.suppressNextChangeEvent) {
        this.suppressNextChangeEvent = false;
        return;
      }
      const v = this.editor?.getValue() ?? '';
      this.value = v;
      this.dispatchEvent(
        new CustomEvent('lethean-editor-change', {
          detail: { path: this.activePath ?? this.path, value: v },
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.KeyS, () => {
      this.dispatchEvent(
        new CustomEvent('lethean-editor-save', {
          detail: {
            path: this.activePath ?? this.path,
            value: this.editor?.getValue() ?? '',
          },
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.resizeObs = new ResizeObserver(() => this.editor?.layout());
    this.resizeObs.observe(host);

    this.mounted = true;
    if (this.path) this.switchToPath(this.path);
  }

  private switchToPath(path: string) {
    if (!this.editor || !window.monaco) return;
    let model = this.models.get(path);
    if (!model) {
      // URI must have an authority component (RFC 3986). "model" works.
      // Avoids monaco's UriError on triple-slashes.
      model = window.monaco.editor.createModel(
        this.value,
        this.language,
        window.monaco.Uri.parse('inmemory://model/' + encodeURIComponent(path)),
      );
      this.models.set(path, model);
    }
    this.editor.setModel(model);
    this.activePath = path;
  }

  override updated(changed: Map<string, unknown>) {
    if (!this.editor || !window.monaco) return;

    // Live-apply editor option changes without re-creating the editor.
    const optionKeys = ['fontSize', 'tabSize', 'wordWrap', 'lineNumbers', 'minimap', 'renderWhitespace', 'readonly', 'theme'];
    if (optionKeys.some(k => changed.has(k))) {
      this.editor.updateOptions({
        fontSize: this.fontSize,
        tabSize: this.tabSize,
        wordWrap: this.wordWrap,
        lineNumbers: this.lineNumbers,
        minimap: { enabled: this.minimap },
        renderWhitespace: this.renderWhitespace,
        readOnly: this.readonly,
        theme: this.theme,
      });
      // tabSize is a model option — Monaco needs it set on the model too.
      const model = this.editor.getModel();
      if (model && changed.has('tabSize')) {
        model.updateOptions({ tabSize: this.tabSize });
      }
    }

    if (changed.has('path') && this.path) {
      this.switchToPath(this.path);
    }
    // After path-switch the model already has the right value (it was
    // created with `this.value`). Only reset value when path didn't change
    // but the host pushed new content (e.g. external file reload).
    if (changed.has('value') && !changed.has('path')) {
      const model = this.editor.getModel();
      if (model && model.getValue() !== this.value) {
        this.suppressNextChangeEvent = true;
        model.setValue(this.value);
      }
    }
    if (changed.has('language')) {
      const model = this.editor.getModel();
      if (model) window.monaco.editor.setModelLanguage(model, this.language);
    }
    if (changed.has('readonly')) {
      this.editor.updateOptions({ readOnly: this.readonly });
    }
    if (changed.has('theme')) {
      window.monaco.editor.setTheme(this.theme);
    }
  }

  override render() {
    return html`
      <div
        class="editor-mount"
        style="
          width: 100%;
          height: 100%;
          min-height: 0;
        "
      ></div>
      ${this.mounted
        ? ''
        : html`<div
            style="padding:14px;font-size:12px;color:var(--fg-3);font-family:var(--font-mono);"
          >
            loading editor…
          </div>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-monaco': LetheanMonaco;
  }
}
