// SPDX-License-Identifier: EUPL-1.2

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

/**
 * <lethean-vi-plugin> — the Mining-route demonstration plugin element.
 *
 * Lives in the host's DOM tree (no iframe), runs in the host's JS context,
 * and talks to its plugin API server at /plugin/vi/api/* (Swagger-shaped).
 * The IDE host doesn't know what Vi does — it just renders this element
 * and lets it federate to its own backend.
 *
 * For v1 this is bundled into the IDE's frontend so the pattern is
 * demonstrable end-to-end; v2 will load via dynamic ESM import from a
 * plugin's declared element-url so genuinely external plugins drop in.
 *
 * The plugin element re-uses the IDE's existing CSS variable palette
 * (var(--ink-*) / var(--brand-*)) so it automatically inherits the host
 * theme without coupling.
 */
@customElement('lethean-vi-plugin')
export class LetheanViPlugin extends LitElement {
  @state() private status: { connected: boolean; latencyMs: number; watching: number; pending: number } | null = null;
  @state() private prompt = '';
  @state() private answer = '';
  @state() private busy = false;
  @state() private error: string | null = null;

  // Plugin's API base — Swagger-shaped endpoints served by the IDE bridge
  // for v1 fixture demo. Real plugins would point at their own server
  // (https://api.vi.lthn.sh, http://localhost:8090, etc.) declared in the
  // marketplace manifest.
  private readonly apiBase = 'http://127.0.0.1:9877/plugin/vi/api';

  override connectedCallback() {
    super.connectedCallback();
    void this.loadStatus();
  }

  static override styles = css`
    :host {
      display: block;
      padding: 16px 18px;
      font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
      color: var(--fg-1, #e6edf3);
      background: var(--ink-1, #11161d);
    }
    .panel {
      background: var(--ink-2, #1a212b);
      border: 1px solid var(--line-1, #232b36);
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 12px;
    }
    h3 { font-size: 12px; margin: 0 0 8px; color: var(--fg-2, #b8c1cb); text-transform: uppercase; letter-spacing: 0.06em; }
    .status-line { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 11px;
      background: var(--ink-1, #0a0d11);
      color: var(--fg-3, #6e7783);
    }
    .pill.connected { background: color-mix(in oklch, #34d399 18%, var(--ink-1, #0a0d11)); color: #34d399; }
    .pill.disconnected { background: color-mix(in oklch, #f87171 18%, var(--ink-1, #0a0d11)); color: #f87171; }
    .row { display: flex; gap: 8px; align-items: center; }
    input {
      flex: 1;
      background: var(--ink-1, #0a0d11);
      border: 1px solid var(--line-1, #232b36);
      color: var(--fg-1, #e6edf3);
      padding: 7px 10px;
      border-radius: 5px;
      font-size: 13px;
    }
    input:focus { border-color: #a78bfa; outline: none; }
    button {
      background: #a78bfa;
      color: #0a0d11;
      border: none;
      padding: 7px 14px;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { filter: brightness(1.1); }
    button:disabled { opacity: 0.5; cursor: wait; }
    pre {
      background: var(--ink-1, #0a0d11);
      border: 1px solid var(--line-1, #232b36);
      border-radius: 5px;
      padding: 12px 14px;
      margin: 10px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--fg-2, #b8c1cb);
      white-space: pre-wrap;
      min-height: 40px;
    }
    .err {
      color: #f87171;
      font-size: 12px;
      padding: 6px 10px;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2, #1a212b));
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .meta {
      font-size: 11px;
      color: var(--fg-3, #6e7783);
      margin-top: 6px;
    }
  `;

  override render() {
    return html`
      ${this.error ? html`<div class="err">${this.error}</div>` : null}

      <div class="panel">
        <h3>Vi presence</h3>
        ${this.status ? html`
          <div class="status-line">
            <span class="pill ${this.status.connected ? 'connected' : 'disconnected'}">
              ${this.status.connected ? 'connected' : 'reconnecting'}
            </span>
            <span>watching <strong>${this.status.watching} ${this.status.watching === 1 ? 'site' : 'sites'}</strong></span>
            <span>${this.status.latencyMs}ms</span>
            ${this.status.pending > 0 ? html`<span>${this.status.pending} pending</span>` : null}
          </div>
        ` : html`<div class="status-line"><span class="pill">loading…</span></div>`}
      </div>

      <div class="panel">
        <h3>Ask Vi</h3>
        <div class="row">
          <input
            type="text"
            placeholder="e.g. summarise the last day's site activity"
            .value=${this.prompt}
            @input=${(e: InputEvent) => (this.prompt = (e.target as HTMLInputElement).value)}
            @keyup=${(e: KeyboardEvent) => { if (e.key === 'Enter') void this.ask(); }} />
          <button @click=${() => this.ask()} ?disabled=${this.busy || !this.prompt.trim()}>
            ${this.busy ? 'asking…' : 'Ask'}
          </button>
        </div>
        <pre>${this.answer || 'Vi waiting for prompt…'}</pre>
        <div class="meta">→ POST ${this.apiBase}/ask</div>
      </div>
    `;
  }

  private async loadStatus() {
    try {
      const res = await fetch(`${this.apiBase}/status`);
      if (!res.ok) throw new Error('status ' + res.status);
      this.status = await res.json();
      this.error = null;
    } catch (e: any) {
      this.error = `Vi API unreachable: ${e?.message || String(e)}`;
    }
  }

  private async ask() {
    if (!this.prompt.trim() || this.busy) return;
    this.busy = true;
    this.error = null;
    try {
      const res = await fetch(`${this.apiBase}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: this.prompt }),
      });
      if (!res.ok) throw new Error('ask ' + res.status);
      const body = await res.json();
      this.answer = body.answer || '(empty response)';
    } catch (e: any) {
      this.error = `ask failed: ${e?.message || String(e)}`;
    } finally {
      this.busy = false;
    }
  }
}
