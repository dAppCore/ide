// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// handlePluginShell serves built-in HTML for fixture marketplace plugins.
// Path layout: /plugin/<code>/[...rest]. For v1 each plugin gets an inline
// shell — real plugin runtime would serve installed module assets from
// ~/.core/ide/marketplace/modules/<code>/dist or similar. The shells exist
// so the marketplace's "Run" UI has something concrete to open into.
//
// All shells are served as origin 127.0.0.1:9877 so they automatically
// inherit the same MCP-bridge addressability that drives core/ide itself —
// webview_eval / webview_query / etc. work against any plugin shell window
// without further plumbing.
func (b *MCPBridge) handlePluginShell(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/plugin/")
	parts := strings.SplitN(path, "/", 2)
	code := strings.TrimSpace(parts[0])
	if code == "" {
		http.Error(w, "plugin code required", http.StatusBadRequest)
		return
	}

	// Plugin sub-routes — treat /plugin/<code>/api/... as the plugin's own
	// Swagger-shaped API surface. The Mining-route pattern: a custom HTML
	// element loaded into the host page calls back to its own plugin API.
	rest := ""
	if len(parts) == 2 {
		rest = parts[1]
	}
	if strings.HasPrefix(rest, "api/") {
		b.handlePluginAPI(w, r, code, strings.TrimPrefix(rest, "api/"))
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	html := pluginShellHTML(code)
	if html == "" {
		http.Error(w, "no shell available for plugin: "+code, http.StatusNotFound)
		return
	}
	_, _ = w.Write([]byte(html))
}

// handlePluginAPI is the v1 Swagger-shaped plugin API for fixture demos.
// Real plugins point at their own server (declared in marketplace manifest);
// the bridge here only mocks the surface so the Mining-route demo plugin
// element has something concrete to call. Future: dispatch into installed
// plugin runtimes via scm/plugin.
func (b *MCPBridge) handlePluginAPI(w http.ResponseWriter, r *http.Request, code, sub string) {
	w.Header().Set("Content-Type", "application/json")
	switch code {
	case "vi":
		b.handleViAPI(w, r, sub)
	case "lemma-runner":
		b.handleLemmaAPI(w, r, sub)
	default:
		http.Error(w, `{"error":"no api for plugin: `+code+`"}`, http.StatusNotFound)
	}
}

func (b *MCPBridge) handleViAPI(w http.ResponseWriter, r *http.Request, sub string) {
	switch sub {
	case "status":
		_ = json.NewEncoder(w).Encode(map[string]any{
			"connected": true,
			"latencyMs": 12,
			"watching":  3,
			"pending":   0,
			"version":   "0.1.0",
			"as_of":     time.Now().UTC().Format(time.RFC3339),
		})
	case "ask":
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"POST required"}`, http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Prompt string `json:"prompt"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"prompt":     body.Prompt,
			"answer":     "(stub) Vi heard: " + body.Prompt + "\n\nWired to a local model in v2; this fixture proves the Mining-route element-talks-to-API loop end-to-end.",
			"confidence": 0.42,
			"answered_at": time.Now().UTC().Format(time.RFC3339),
		})
	default:
		http.Error(w, `{"error":"vi api: unknown route: `+sub+`"}`, http.StatusNotFound)
	}
}

func (b *MCPBridge) handleLemmaAPI(w http.ResponseWriter, r *http.Request, sub string) {
	switch sub {
	case "models":
		_ = json.NewEncoder(w).Encode([]map[string]any{
			{"id": "gemma-4-e2b", "params": "2B", "format": "mxfp8"},
			{"id": "gemma-4-e4b", "params": "4B", "format": "mxfp8"},
			{"id": "qwen3.6-27b-4bit", "params": "27B", "format": "4bit"},
		})
	default:
		http.Error(w, `{"error":"lemma api: unknown route: `+sub+`"}`, http.StatusNotFound)
	}
}

func pluginShellHTML(code string) string {
	switch code {
	case "vi":
		return viShellHTML
	case "lemma-runner":
		return lemmaRunnerShellHTML
	default:
		return ""
	}
}

// pluginShellLayout wraps content with shared chrome — Lethean dark palette,
// branded header. Uses inline CSS rather than linking to the IDE's stylesheet
// so a plugin window stands on its own as a dApp shell.
func pluginShellLayout(title, accent, body string) string {
	return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>` + title + ` · Lethean Plugin</title>
<style>
  :root {
    --ink-0: #0a0d11;
    --ink-1: #11161d;
    --ink-2: #1a212b;
    --line-1: #232b36;
    --fg-1: #e6edf3;
    --fg-2: #b8c1cb;
    --fg-3: #6e7783;
    --brand: ` + accent + `;
    --brand-soft: color-mix(in oklch, ` + accent + ` 18%, var(--ink-2));
    --r-md: 8px;
    --r-sm: 5px;
    font-family: ui-sans-serif, -apple-system, "Inter", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ink-0); color: var(--fg-1); min-height: 100vh; display: flex; flex-direction: column; }
  header { padding: 14px 24px; border-bottom: 1px solid var(--line-1); display: flex; align-items: center; gap: 14px; flex-shrink: 0; background: var(--ink-1); }
  header .brand-mark { width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, var(--brand), var(--brand-soft)); }
  header .title { font-size: 14px; font-weight: 600; }
  header .subtitle { font-size: 11px; color: var(--fg-3); margin-left: auto; font-family: ui-monospace, monospace; }
  main { flex: 1; padding: 28px 32px; overflow-y: auto; }
  h1, h2, h3 { color: var(--fg-1); }
  h1 { font-size: 22px; margin: 0 0 12px; }
  h2 { font-size: 14px; margin: 22px 0 10px; color: var(--fg-2); text-transform: uppercase; letter-spacing: 0.06em; }
  p { color: var(--fg-2); line-height: 1.5; max-width: 64ch; }
  code { font-family: ui-monospace, monospace; background: var(--ink-2); padding: 1px 6px; border-radius: 3px; font-size: 12px; color: var(--fg-1); }
  .panel { background: var(--ink-1); border: 1px solid var(--line-1); border-radius: var(--r-md); padding: 18px 20px; margin: 14px 0; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  button { background: var(--brand); color: var(--ink-0); border: none; padding: 8px 14px; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; cursor: pointer; }
  button:hover { filter: brightness(1.1); }
  button.ghost { background: var(--ink-2); color: var(--fg-1); border: 1px solid var(--line-1); }
  input, textarea, select { background: var(--ink-2); color: var(--fg-1); border: 1px solid var(--line-1); padding: 7px 10px; border-radius: var(--r-sm); font-size: 13px; font-family: inherit; }
  input:focus, textarea:focus, select:focus { border-color: var(--brand); outline: none; }
  pre { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: var(--r-sm); padding: 12px 14px; font-size: 12px; line-height: 1.5; overflow-x: auto; color: var(--fg-2); }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: var(--brand-soft); color: var(--brand); font-size: 11px; font-weight: 500; }
</style>
</head><body>
<header>
  <span class="brand-mark"></span>
  <span class="title">` + title + `</span>
  <span class="subtitle">plugin · 127.0.0.1:9877</span>
</header>
<main>` + body + `</main>
</body></html>`
}

const viShellBody = `
<h1>Vi — your local IDE companion</h1>
<p>Vi watches your sites, surfaces alerts, and runs local agents. This shell is the entry surface for the plugin — driven by the same MCP bridge that drives core/ide itself.</p>

<div class="panel">
  <h2>Status</h2>
  <p><span class="pill" id="vi-status">connected</span> watching <strong id="vi-watching">3 sites</strong> · <strong id="vi-pending">0 pending</strong></p>
</div>

<div class="panel">
  <h2>Ask Vi</h2>
  <div class="row">
    <input id="vi-prompt" type="text" placeholder="e.g. summarise the last day's site activity" style="flex: 1;" />
    <button onclick="viAsk()">Ask</button>
  </div>
  <pre id="vi-out" style="margin-top: 12px; min-height: 60px;">Vi waiting for prompt…</pre>
</div>

<div class="panel">
  <h2>About this plugin</h2>
  <p>This window is loaded from <code>http://127.0.0.1:9877/plugin/vi/</code>. Cladius (or any agent connected to the bridge) can drive it via <code>webview_eval</code>, <code>webview_query</code>, etc — same surface as the IDE chrome itself.</p>
</div>

<script>
  function viAsk() {
    var prompt = document.getElementById('vi-prompt').value.trim();
    if (!prompt) return;
    var out = document.getElementById('vi-out');
    out.textContent = '> ' + prompt + '\n\n(Stub — wire to /vi or local model.)';
  }
</script>
`

const lemmaRunnerShellBody = `
<h1>Lemma local runner</h1>
<p>Browse local models, generate completions, fine-tune on Lethean Community conversations. Runs against go-mlx for native Apple Metal inference.</p>

<div class="panel">
  <h2>Available models</h2>
  <div class="row">
    <select id="lemma-model" style="min-width: 240px;">
      <option>gemma-4-e2b</option>
      <option>gemma-4-e4b</option>
      <option>qwen3.6-27b-4bit</option>
      <option>llama-3.3-70b-q4</option>
    </select>
    <button onclick="lemmaPing()">Ping model</button>
  </div>
  <pre id="lemma-out" style="margin-top: 12px; min-height: 60px;">Select a model and ping to verify.</pre>
</div>

<div class="panel">
  <h2>Generate</h2>
  <textarea id="lemma-prompt" rows="4" style="width: 100%;" placeholder="prompt the model…"></textarea>
  <div class="row" style="margin-top: 8px;">
    <button onclick="lemmaGen()">Generate</button>
    <span style="color: var(--fg-3); font-size: 11px;">temperature: 0.7 · max tokens: 256</span>
  </div>
  <pre id="lemma-gen-out" style="margin-top: 12px; min-height: 80px;">Output will appear here.</pre>
</div>

<script>
  function lemmaPing() {
    var model = document.getElementById('lemma-model').value;
    document.getElementById('lemma-out').textContent =
      '$ violet ping --model ' + model + '\n(Stub — wire to violet sidecar at /run/violet.sock)';
  }
  function lemmaGen() {
    var p = document.getElementById('lemma-prompt').value;
    document.getElementById('lemma-gen-out').textContent =
      'Generating with ' + document.getElementById('lemma-model').value + '...\n(Stub — wire to local inference endpoint.)';
  }
</script>
`

var viShellHTML = pluginShellLayout("Vi", "#a78bfa", viShellBody)
var lemmaRunnerShellHTML = pluginShellLayout("Lemma runner", "#34d399", lemmaRunnerShellBody)
