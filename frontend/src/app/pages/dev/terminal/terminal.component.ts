// SPDX-Licence-Identifier: EUPL-1.2

import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import * as TerminalBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/terminalbridge';
import { WorkspaceStore } from '../../../services/store/workspace.store';

const MCP_HOST = '127.0.0.1:9877';

/**
 * Terminal panel — xterm.js client over the in-IDE WebSocket bridge at
 * /terminal/ws/:sid on the MCPBridge. Backend is a charmbracelet/ssh +
 * creack/pty session pool shared with the SSH server on :9876, so the same
 * PTY engine serves both transports.
 *
 * v1: single session, opened on first view, killed on destroy. Multi-session
 * tabs are a v2 surface — the bridge already keys by session ID so adding
 * tabs is a UI-only change.
 *
 * Theme is bound to Lethean tokens. The xterm.js theme keys take hex strings,
 * so we resolve the CSS custom properties at construction time. Live theme
 * switching (Lethean → Awesome → Premium) requires re-resolving + reapplying
 * via term.options.theme; that's a follow-up.
 */
@Component({
  selector: 'dev-terminal',
  standalone: true,
  imports: [],
  template: `
    <section class="block term-block">
      <div class="block-header term-header">
        <h2 class="block-title">Terminal</h2>
        <span class="editorial subtitle">
          @if (sessionId(); as sid) {
            <code>{{ sid.slice(0, 12) }}</code> · {{ shell() }} · {{ cwd() }}
          } @else if (error()) {
            <span class="term-status-error">{{ error() }}</span>
          } @else {
            connecting…
          }
        </span>
      </div>
      <div #host class="term-host"></div>
    </section>
  `,
  styles: [`
    /* The component element itself needs explicit fill behaviour — Angular
       component element defaults to display:block and doesn't inherit flex
       sizing from the .content wrapper. Without this, .term-host's flex:1
       has no constrained parent height and xterm's row stack stretches the
       page vertically. Tag selector (not :host) because ViewEncapsulation.None
       takes us out of the Shadow DOM model where :host has meaning. */
    dev-terminal { display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%; overflow: hidden; }
    .term-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .term-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .term-header code { font-family: var(--font-mono); font-size: 11px; color: var(--brand-200); }
    .term-status-error { color: #f87171; font-size: 12px; }
    .term-host {
      flex: 1;
      min-height: 0;
      background: var(--ink-0);
      padding: 10px 14px;
      overflow: hidden;
    }
    /* xterm.js renders its own DOM into .term-host. ViewEncapsulation.None
       is set on the component so these selectors reach the dynamically-created
       .xterm subtree (Angular's emulated encapsulation otherwise scopes them
       to elements present at template-compile time only).
       FitAddon handles cols/rows calculation against the host's
       clientWidth/clientHeight on resize. */
    .term-host .xterm { height: 100%; padding: 6px 0; }
    .term-host .xterm-viewport { background: var(--ink-0) !important; }
    .term-host .xterm-screen { width: 100% !important; }
  `],
  encapsulation: ViewEncapsulation.None,
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  private readonly workspace = inject(WorkspaceStore);
  private term?: Terminal;
  private fitAddon?: FitAddon;
  private socket?: WebSocket;
  private resizeObserver?: ResizeObserver;

  readonly sessionId = signal<string | null>(null);
  readonly shell = signal<string>('');
  readonly cwd = signal<string>('');
  readonly error = signal<string | null>(null);

  async ngAfterViewInit(): Promise<void> {
    const theme = this.resolveTheme();
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: this.cssVar('--font-mono') || 'Menlo, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 5000,
      allowProposedApi: true,
      theme,
    });
    this.term = term;

    const fit = new FitAddon();
    this.fitAddon = fit;
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());

    term.open(this.host.nativeElement);
    fit.fit();

    // Kick off the session AFTER xterm has measured its viewport so we send
    // sane initial cols/rows to the PTY (avoids a noisy first SIGWINCH).
    try {
      const opened = await TerminalBridge.OpenSession({
        cwd: this.workspace.root() || '',
        cols: term.cols,
        rows: term.rows,
        term: 'xterm-256color',
      });
      if (!opened.ok || !opened.id) {
        this.error.set(opened.error || 'failed to open session');
        return;
      }
      this.sessionId.set(opened.id);
      this.shell.set(opened.shell || '');
      this.cwd.set(opened.cwd || '');
      this.connect(opened.id);
    } catch (e) {
      this.error.set('bridge: ' + (e instanceof Error ? e.message : String(e)));
    }

    // Resize observer — when the container changes size (sidebar collapse,
    // window resize, panel layout shift), refit and notify the PTY so the
    // shell draws at the new dimensions.
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.socket?.close();
    if (this.term) {
      try { this.term.dispose(); } catch { /* xterm.js may have already torn down */ }
    }
    const id = this.sessionId();
    if (id) {
      void TerminalBridge.CloseSession(id);
    }
  }

  private connect(sid: string): void {
    const url = `ws://${MCP_HOST}/terminal/ws/${sid}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.socket = ws;

    ws.addEventListener('open', () => {
      // Forward keystrokes as binary frames — the most efficient path.
      this.term?.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(new TextEncoder().encode(data));
        }
      });
      // Push our actual measured size now that the socket is up; the bridge
      // already saw cols/rows at OpenSession but the FE may have refit since.
      this.sendResize();
    });

    ws.addEventListener('message', (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(ev.data);
        this.term?.write(bytes);
      } else if (typeof ev.data === 'string') {
        // Text frame — currently unused; kept for symmetry with control envelopes.
        this.term?.write(ev.data);
      }
    });

    ws.addEventListener('error', () => {
      this.error.set('websocket error');
    });

    ws.addEventListener('close', () => {
      this.term?.write('\r\n\x1b[2;33m[session closed]\x1b[0m\r\n');
    });
  }

  private handleResize(): void {
    if (!this.term || !this.fitAddon) return;
    try {
      this.fitAddon.fit();
      this.sendResize();
    } catch { /* xterm sometimes throws during teardown — safe to ignore */ }
  }

  private sendResize(): void {
    const id = this.sessionId();
    const term = this.term;
    if (!id || !term) return;
    // Push via bridge (control plane) AND through the WS as a JSON envelope.
    // Either path resizes the PTY; double-emit means the bridge has the
    // authoritative latest cols/rows for ListSessions even if the WS is
    // momentarily down.
    void TerminalBridge.Resize(id, term.cols, term.rows);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  }

  private resolveTheme() {
    const fg = this.cssVar('--fg-1') || '#f8fafc';
    const bg = this.cssVar('--ink-0') || '#0f172a';
    const cursor = this.cssVar('--brand-400') || '#3b82f6';
    const selection = this.cssVar('--brand-500') || '#2563eb';
    return {
      foreground: fg,
      background: bg,
      cursor: cursor,
      cursorAccent: bg,
      selectionBackground: selection + '55',
      // Standard 16-colour table — kept close to Tomorrow Night palette so
      // ANSI tools (lint, build, ls --color) render legibly. Brand accent
      // bleeds in via cursor + selection only; ANSI palette stays neutral.
      black: '#1f2937',
      red: '#f87171',
      green: '#34d399',
      yellow: '#fbbf24',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: '#e5e7eb',
      brightBlack: '#475569',
      brightRed: '#fca5a5',
      brightGreen: '#6ee7b7',
      brightYellow: '#fcd34d',
      brightBlue: '#93c5fd',
      brightMagenta: '#d8b4fe',
      brightCyan: '#67e8f9',
      brightWhite: '#f8fafc',
    };
  }

  private cssVar(name: string): string {
    if (typeof window === 'undefined') return '';
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return v ? v.trim() : '';
  }
}
