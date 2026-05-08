// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"strings"
	"sync"
	"time"

	core "dappco.re/go"
	cfgpkg "dappco.re/go/config"
	"dappco.re/go/gui/pkg/display"
	"dappco.re/go/gui/pkg/webview"
	"dappco.re/go/gui/pkg/window"
	coreio "dappco.re/go/io"
	"dappco.re/go/process"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// defaultIDEWindowName matches GUIShell.WindowName — the canonical IDE window
// identifier. webview-tagged tools use this when params.window is unset.
const defaultIDEWindowName = "core-ide-chat"

// MCPBridge exposes a 109-tool MCP HTTP surface so Cladius (or any MCP-speaking
// agent) can drive and observe the IDE — DOM queries, screenshots, console log
// capture, window control, file/process ops.
//
// This is a SKELETON. The tool dispatch table is correct (matches the
// lthn-desktop POC's contract), but every tool currently returns
// {"error":"not_implemented", ...}. Implementations land iter-by-iter, in
// priority order: webview_console / webview_errors / webview_screenshot /
// webview_dom_tree / webview_eval / webview_navigate first (the "stop flying
// blind" cluster), then window/screen/layout, then file/process.
//
// Reference: lthn-desktop/mcp_bridge.go in core-gui (1135 lines, full
// implementations against pre-canonical APIs). We preserve the contract surface
// but re-implement against core/ide's current canonical Service.Register
// pattern and core.ServiceFor lookup.
type MCPBridge struct {
	*core.ServiceRuntime[MCPBridgeOptions]

	mu      sync.Mutex
	httpSrv *http.Server
	port    int

	// consoleBuf is a ring buffer of console messages forwarded by the JS
	// shim in the webview (POST /internal/console). Universal pattern that
	// avoids the macOS-WebKit-vs-CDP problem.
	consoleMu  sync.Mutex
	consoleBuf []consoleEntry

	errorMu  sync.Mutex
	errorBuf []errorEntry

	// pendingEvals is the request/response map for ExecJS calls that need a
	// return value. The bridge ExecJS's a wrapped script that posts the result
	// to /internal/eval-reply with the request ID; the handler signals the
	// channel below to unblock the waiting tool call.
	evalMu       sync.Mutex
	evalCounter  uint64
	pendingEvals map[string]chan evalReply

	// uiCfg persists user UI preferences (chat panel open/closed, last
	// route, open tabs, etc.) so the IDE comes back the way it was left.
	// Backed by dappco.re/go/config — default path ~/.core/config.yaml,
	// keys live under the "ui.*" namespace.
	uiCfgMu sync.Mutex
	uiCfg   *cfgpkg.Config
}

type evalReply struct {
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

type consoleEntry struct {
	Level   string    `json:"level"`
	Message string    `json:"message"`
	Source  string    `json:"source,omitempty"`
	At      time.Time `json:"at"`
}

type errorEntry struct {
	Message string    `json:"message"`
	Source  string    `json:"source,omitempty"`
	Line    int       `json:"line,omitempty"`
	Col     int       `json:"col,omitempty"`
	Stack   string    `json:"stack,omitempty"`
	At      time.Time `json:"at"`
}

const consoleBufLimit = 1000

// MCPBridgeOptions configures the MCP HTTP server.
//
// Example:
//
//	core.WithService(server.RegisterMCPBridge(server.MCPBridgeOptions{Port: 9877}))
type MCPBridgeOptions struct {
	// Port is the HTTP port for the MCP server. Default: 9877.
	Port int
}

// RegisterMCPBridge returns a Core service factory for the MCP bridge.
//
//	core.WithService(server.RegisterMCPBridge(server.MCPBridgeOptions{Port: 9877}))
func RegisterMCPBridge(opts MCPBridgeOptions) func(*core.Core) core.Result {
	return func(c *core.Core) core.Result {
		if opts.Port == 0 {
			opts.Port = 9877
		}
		b := &MCPBridge{
			ServiceRuntime: core.NewServiceRuntime[MCPBridgeOptions](c, opts),
			port:           opts.Port,
			pendingEvals:   make(map[string]chan evalReply),
		}
		return core.Ok(b)
	}
}

// OnStartup starts the MCP HTTP server in a background goroutine.
func (b *MCPBridge) OnStartup(ctx context.Context) core.Result {
	_ = ctx
	mux := http.NewServeMux()
	mux.HandleFunc("/mcp/info", b.handleInfo)
	mux.HandleFunc("/mcp/tools", b.handleTools)
	mux.HandleFunc("/mcp/call", b.handleCall)
	mux.HandleFunc("/health", b.handleHealth)
	mux.HandleFunc("/internal/console", b.handleInternalConsole)
	mux.HandleFunc("/internal/error", b.handleInternalError)
	mux.HandleFunc("/internal/eval-reply", b.handleInternalEvalReply)
	// dAppServer reverse proxy — load any URL through our origin so the
	// wrapped-eval fetch-back bypasses upstream CSP. See proxy_bridge.go.
	mux.HandleFunc("/proxy", b.handleProxy)
	// Plugin shells — built-in HTML surfaces for fixture marketplace modules.
	// Real plugin runtime would serve installed module assets; the shells
	// exist so fixtures have something concrete to "Run" into.
	mux.HandleFunc("/plugin/", b.handlePluginShell)
	mux.HandleFunc("/internal/ui-state", b.handleInternalUIState)

	b.mu.Lock()
	b.httpSrv = &http.Server{
		Addr:              fmt.Sprintf("127.0.0.1:%d", b.port),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	srv := b.httpSrv
	b.mu.Unlock()

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			core.Print(core.Stderr(), "ide.mcp_bridge: http listen failed: %v", err)
		}
	}()

	return core.Ok(nil)
}

// OnShutdown stops the MCP HTTP server.
func (b *MCPBridge) OnShutdown(ctx context.Context) core.Result {
	b.mu.Lock()
	srv := b.httpSrv
	b.mu.Unlock()
	if srv == nil {
		return core.Ok(nil)
	}
	if err := srv.Shutdown(ctx); err != nil {
		return core.Fail(core.E("ide.mcp_bridge", "http shutdown failed", err))
	}
	return core.Ok(nil)
}

func (b *MCPBridge) handleInfo(w http.ResponseWriter, r *http.Request) {
	_ = r
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"name":    "core",
		"version": "0.1.0",
		"capabilities": map[string]any{
			"webview":       true,
			"display":       false,
			"windowControl": false,
			"screenControl": false,
			"events":        fmt.Sprintf("ws://127.0.0.1:%d/events", b.port),
		},
		"implemented": []string{
			"webview_console",
			"webview_errors",
			"webview_screenshot",
			"webview_dom_tree",
			"webview_eval",
			"webview_navigate",
		},
		"status": "step B — priority webview cluster wired (CDP-backed); other 96 tools return not_implemented",
	})
}

func (b *MCPBridge) handleHealth(w http.ResponseWriter, r *http.Request) {
	_ = r
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status": "ok",
		"mcp":    true,
		"phase":  "skeleton",
	})
}

func (b *MCPBridge) handleTools(w http.ResponseWriter, r *http.Request) {
	_ = r
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	tools := mcpToolManifest()
	_ = json.NewEncoder(w).Encode(map[string]any{"tools": tools})
}

func (b *MCPBridge) handleCall(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "method not allowed"})
		return
	}

	var req struct {
		Tool   string         `json:"tool"`
		Params map[string]any `json:"params"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "invalid json: " + err.Error()})
		return
	}

	start := time.Now()
	resp := b.dispatchTool(r.Context(), req.Tool, req.Params)
	publishBridgeEvent(req.Tool, req.Params, resp, time.Since(start))
	_ = json.NewEncoder(w).Encode(resp)
}

// Tools whose own implementation publishes / reads from the Stream Hub
// — auto-publishing them would cause feedback loops or pointless noise.
var bridgeAutoPublishSkip = map[string]bool{
	"stream_status":         true,
	"stream_channels":       true,
	"stream_recent":         true,
	"stream_publish":        true,
	"webview_console":       true,
	"webview_errors":        true,
	"webview_eval":          true,
	"webview_screenshot":    true,
	"webview_dom_tree":      true,
}

// publishBridgeEvent fires a JSON frame onto bridge.<tool> and a wildcard
// "bridge" channel so /stream becomes a live activity feed of every IDE
// action. Errors are best-effort (Hub may not be initialised yet).
func publishBridgeEvent(tool string, params map[string]any, resp map[string]any, elapsed time.Duration) {
	if bridgeAutoPublishSkip[tool] {
		return
	}
	defer func() { _ = recover() }() // ensure dispatch never fails on publish
	hub := streamHub
	if hub == nil {
		// Lazy-init only when something else has touched the Hub. Avoid
		// spawning the goroutine on first dispatch — let the user open
		// /stream first.
		return
	}
	ok := false
	if v, has := resp["ok"]; has {
		if b, isBool := v.(bool); isBool {
			ok = b
		}
	}
	frame := map[string]any{
		"tool":        tool,
		"ok":          ok,
		"duration_ms": elapsed.Milliseconds(),
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"params":      sanitiseParams(params),
	}
	if !ok {
		if errStr, has := resp["error"]; has {
			frame["error"] = truncateForUI(asString(errStr), 160)
		}
	}
	encoded, err := json.Marshal(frame)
	if err != nil {
		return
	}
	_ = hub.Publish("bridge."+tool, encoded)
	_ = hub.Publish("bridge", encoded)
}

// sanitiseParams returns a shallow copy with string values truncated and
// known token-shaped keys redacted. Keeps the panel readable + safe.
func sanitiseParams(p map[string]any) map[string]any {
	if p == nil {
		return nil
	}
	out := make(map[string]any, len(p))
	for k, v := range p {
		if strings.Contains(strings.ToLower(k), "token") || strings.Contains(strings.ToLower(k), "secret") {
			out[k] = "<redacted>"
			continue
		}
		switch s := v.(type) {
		case string:
			out[k] = truncateForUI(s, 80)
		default:
			out[k] = v
		}
	}
	return out
}

// dispatchTool routes a tool call to the right Core query/action. Implemented
// tools land iter-by-iter; everything else returns not_implemented.
func (b *MCPBridge) dispatchTool(ctx context.Context, tool string, params map[string]any) map[string]any {
	switch tool {
	case "webview_console":
		return b.toolWebviewConsole(params)
	case "webview_errors":
		return b.toolWebviewErrors(params)
	case "webview_screenshot":
		return b.toolWebviewScreenshot(ctx, params)
	case "webview_dom_tree":
		return b.toolWebviewDOMTree(ctx, params)
	case "webview_eval":
		return b.toolWebviewEval(ctx, params)
	case "webview_navigate":
		return b.toolWebviewNavigate(ctx, params)
	case "webview_url":
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName), `return window.location.href;`)
	case "webview_title":
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName), `return document.title;`)
	case "webview_query":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var els=Array.from(document.querySelectorAll(%s));return els.map(function(e){var r=e.getBoundingClientRect();return {tag:e.tagName.toLowerCase(),id:e.id||null,classes:Array.from(e.classList),x:r.x,y:r.y,w:r.width,h:r.height,text:(e.textContent||'').slice(0,200)};});`, string(selectorJS)))
	case "webview_source":
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName), `return document.documentElement.outerHTML;`)
	case "webview_click":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)throw new Error("element not found: "+%s);el.click();return {clicked:true,tag:el.tagName.toLowerCase()};`, string(selectorJS), string(selectorJS)))
	case "webview_type":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		textJS, _ := json.Marshal(paramString(params, "text", ""))
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)throw new Error("element not found: "+%s);el.focus();el.value=%s;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));return {typed:%s,tag:el.tagName.toLowerCase()};`, string(selectorJS), string(selectorJS), string(textJS), string(textJS)))
	case "webview_hover":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)throw new Error("element not found: "+%s);el.dispatchEvent(new MouseEvent("mouseover",{bubbles:true}));el.dispatchEvent(new MouseEvent("mouseenter",{bubbles:true}));return {hovered:true};`, string(selectorJS), string(selectorJS)))
	case "webview_select":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		valueJS, _ := json.Marshal(paramString(params, "value", ""))
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)throw new Error("element not found: "+%s);el.value=%s;el.dispatchEvent(new Event("change",{bubbles:true}));return {selected:%s};`, string(selectorJS), string(selectorJS), string(valueJS), string(valueJS)))
	case "webview_check":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		checked := false
		if v, ok := params["checked"].(bool); ok {
			checked = v
		}
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)throw new Error("element not found: "+%s);el.checked=%v;el.dispatchEvent(new Event("change",{bubbles:true}));return {checked:el.checked};`, string(selectorJS), string(selectorJS), checked))
	case "webview_scroll":
		selector := paramString(params, "selector", "")
		if selector != "" {
			selectorJS, _ := json.Marshal(selector)
			return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
				fmt.Sprintf(`var el=document.querySelector(%s);if(!el)throw new Error("element not found: "+%s);el.scrollIntoView({behavior:"smooth",block:"center"});return {scrolledTo:%s};`, string(selectorJS), string(selectorJS), string(selectorJS)))
		}
		x := paramInt(params, "x", 0)
		y := paramInt(params, "y", 0)
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`window.scrollTo(%d,%d);return {x:%d,y:%d};`, x, y, x, y))
	case "webview_element_info":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)return null;var r=el.getBoundingClientRect();var s=getComputedStyle(el);var attrs={};for(var i=0;i<el.attributes.length;i++){var a=el.attributes[i];attrs[a.name]=a.value;}return {tag:el.tagName.toLowerCase(),id:el.id||null,classes:Array.from(el.classList),attrs:attrs,x:r.x,y:r.y,w:r.width,h:r.height,display:s.display,visibility:s.visibility,opacity:s.opacity,bg:s.backgroundColor,color:s.color,text:(el.textContent||'').slice(0,500),hasShadow:!!el.shadowRoot};`, string(selectorJS)))
	case "webview_computed_style":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		propJS, _ := json.Marshal(paramString(params, "property", ""))
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)return null;var s=getComputedStyle(el);var p=%s;if(p)return s.getPropertyValue(p);var out={};for(var i=0;i<s.length;i++){var k=s[i];out[k]=s.getPropertyValue(k);}return out;`, string(selectorJS), string(propJS)))
	case "webview_highlight":
		selectorJS, _ := json.Marshal(paramString(params, "selector", ""))
		duration := paramInt(params, "duration_ms", 1500)
		return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName),
			fmt.Sprintf(`var el=document.querySelector(%s);if(!el)throw new Error("element not found: "+%s);var prev=el.style.outline;el.style.outline="3px solid magenta";el.style.outlineOffset="2px";setTimeout(function(){el.style.outline=prev;el.style.outlineOffset="";},%d);return {highlighted:true};`, string(selectorJS), string(selectorJS), duration))
	case "webview_console_clear":
		b.consoleMu.Lock()
		b.consoleBuf = nil
		b.consoleMu.Unlock()
		return map[string]any{"ok": true, "cleared": "console"}

	// File operations — wired through core.Fs()
	case "file_read":
		return b.toolFileRead(params)
	case "file_write":
		return b.toolFileWrite(params)
	case "file_edit":
		return b.toolFileEdit(params)
	case "file_delete":
		return b.toolFileDelete(params)
	case "file_exists":
		return b.toolFileExists(params)
	case "file_rename":
		return b.toolFileRename(params)
	case "dir_list":
		return b.toolDirList(params)
	case "dir_create":
		return b.toolDirCreate(params)

	// Process operations — wired through process.Service
	case "process_start":
		return b.toolProcessStart(ctx, params)
	case "process_stop", "process_kill":
		return b.toolProcessKill(params)
	case "process_list":
		return b.toolProcessList(params)
	case "process_output":
		return b.toolProcessOutput(params)
	case "process_input":
		return b.toolProcessInput(params)
	case "workspace_search":
		return b.toolWorkspaceSearch(ctx, params)
	case "git_status":
		return b.toolGitStatus(params)
	case "git_diff":
		return b.toolGitDiff(params)
	case "git_branch":
		return b.toolGitBranch(params)
	case "git_add":
		return b.toolGitAdd(params)
	case "git_unstage":
		return b.toolGitUnstage(params)
	case "git_commit":
		return b.toolGitCommit(params)
	case "git_log":
		return b.toolGitLog(params)

	// System integration — Core IPC dispatch via core/gui display.Service
	case "clipboard_read":
		return b.toolClipboardRead()
	case "clipboard_write":
		return b.toolClipboardWrite(ctx, params)
	case "clipboard_has":
		return b.toolClipboardHas()
	case "clipboard_clear":
		return b.toolClipboardClear(ctx)
	case "theme_get", "theme_system":
		return b.toolThemeGet()
	case "focus_set":
		return b.toolWindowFocus(ctx, params)
	case "screen_list", "screen_primary":
		return b.toolScreenInfo(params)

	// Window control — dispatched through window.Service (tracked, persisted)
	case "window_open":
		return b.toolWindowOpen(ctx, params)
	case "window_focus":
		return b.toolWindowFocus(ctx, params)
	case "window_position":
		return b.toolWindowPosition(ctx, params)
	case "window_size":
		return b.toolWindowSize(ctx, params)
	case "window_bounds":
		return b.toolWindowBounds(ctx, params)
	case "window_center":
		return b.toolWindowCenter(ctx, params)
	case "window_minimize":
		return b.toolWindowMinimise(ctx, params)
	case "window_maximize":
		return b.toolWindowMaximise(ctx, params)
	case "window_fullscreen":
		return b.toolWindowFullscreen(ctx, params)
	case "window_get":
		return b.toolWindowGet(params)
	case "window_list":
		return b.toolWindowList(params)
	case "window_title":
		return b.toolWindowSetTitle(ctx, params)
	case "window_title_get":
		return b.toolWindowGetTitle(params)
	case "window_close":
		return b.toolWindowClose(ctx, params)
	case "window_visibility":
		return b.toolWindowVisibility(ctx, params)
	case "window_always_on_top":
		return b.toolWindowAlwaysOnTop(ctx, params)
	case "window_restore":
		return b.toolWindowRestore(ctx, params)
	case "window_focused":
		return b.toolWindowFocused(params)
	case "lang_detect":
		return b.toolLangDetect(params)
	case "lang_list":
		return b.toolLangList()

	// Multi-repo dashboard — aggregate status across the user's workspace
	// roots (Code/core/* / Code/lthn/* / Code/host-uk/* / Code/lab/*).
	// Different abstraction layer to git_status (per-file in one repo).
	case "repos_status":
		return b.toolReposStatus(ctx, params)

	// Marketplace + plugin install — dispatched through marketplace.Subsystem
	// via Core actions (ide.pkg.search / info / install / installed / remove).
	case "pkg_search":
		return b.toolPkgSearch(ctx, params)
	case "pkg_info":
		return b.toolPkgInfo(ctx, params)
	case "pkg_install":
		return b.toolPkgInstall(ctx, params)
	case "pkg_installed":
		return b.toolPkgInstalled(ctx)
	case "pkg_remove":
		return b.toolPkgRemove(ctx, params)
	case "pkg_menus":
		return b.toolPkgMenus(ctx)

	// Build panel — IDE surface over go-build's pipeline. Detect project
	// type + spawn build via process.Service. See build_bridge.go.
	case "build_detect":
		return b.toolBuildDetect(ctx, params)
	case "build_run":
		return b.toolBuildRun(ctx, params)

	// Containers panel — IDE surface over core/go-container. Detect runtimes,
	// list running containers, fetch logs. See container_bridge.go.
	case "container_detect":
		return b.toolContainerDetect(ctx, params)
	case "container_list":
		return b.toolContainerList(ctx, params)
	case "container_logs":
		return b.toolContainerLogs(ctx, params)

	// Lint panel — IDE surface over core/lint. See lint_bridge.go.
	case "lint_run":
		return b.toolLintRun(ctx, params)
	case "lint_catalog":
		return b.toolLintCatalog(ctx, params)

	// Locales panel — IDE surface over core/go-i18n. See i18n_bridge.go.
	case "i18n_scan":
		return b.toolI18nScan(ctx, params)
	case "i18n_view":
		return b.toolI18nView(ctx, params)

	// Data panel — IDE surface over core/orm. See orm_bridge.go.
	case "orm_tables":
		return b.toolOrmTables(ctx, params)
	case "orm_get":
		return b.toolOrmGet(ctx, params)
	case "orm_count":
		return b.toolOrmCount(ctx, params)
	case "orm_save":
		return b.toolOrmSave(ctx, params)
	case "orm_delete":
		return b.toolOrmDelete(ctx, params)
	case "orm_backend":
		return b.toolOrmBackend(ctx, params)

	// Process panel — extras over the existing process_start/list/output/kill.
	// See process_bridge.go.
	case "process_managed_list":
		return b.toolProcessManagedList(ctx, params)
	case "process_managed_signal":
		return b.toolProcessManagedSignal(ctx, params)
	case "process_managed_remove":
		return b.toolProcessManagedRemove(ctx, params)
	case "process_managed_input":
		return b.toolProcessManagedInput(ctx, params)
	case "process_daemons_list":
		return b.toolProcessDaemonsList(ctx, params)

	// Tenant panel — surface over core/go-tenant. See tenant_bridge.go.
	case "tenant_status":
		return b.toolTenantStatus(ctx, params)
	case "tenant_workspace":
		return b.toolTenantWorkspace(ctx, params)
	case "tenant_user":
		return b.toolTenantUser(ctx, params)
	case "tenant_can":
		return b.toolTenantCan(ctx, params)
	case "tenant_usage":
		return b.toolTenantUsage(ctx, params)

	// Forge panel — surface go-forge Forgejo client. See forge_bridge.go.
	case "forge_status":
		return b.toolForgeStatus(ctx, params)
	case "forge_orgs":
		return b.toolForgeOrgs(ctx, params)
	case "forge_repos":
		return b.toolForgeRepos(ctx, params)
	case "forge_issues":
		return b.toolForgeIssues(ctx, params)
	case "forge_pulls":
		return b.toolForgePulls(ctx, params)
	case "forge_notifications":
		return b.toolForgeNotifications(ctx, params)

	// DevOps panel — surface go-devops devkit + playbooks. See devops_bridge.go.
	case "devops_secrets_scan":
		return b.toolDevopsSecretsScan(ctx, params)
	case "devops_gitleaks":
		return b.toolDevopsGitleaks(ctx, params)
	case "devops_playbooks":
		return b.toolDevopsPlaybooks(ctx, params)

	// PHP panel — surface core/php Laravel discovery. See php_bridge.go.
	case "php_detect":
		return b.toolPHPDetect(ctx, params)
	case "php_project":
		return b.toolPHPProject(ctx, params)

	// Store panel — KV inspector over go-store. See store_bridge.go.
	case "store_groups":
		return b.toolStoreGroups(ctx, params)
	case "store_entries":
		return b.toolStoreEntries(ctx, params)
	case "store_set":
		return b.toolStoreSet(ctx, params)
	case "store_delete":
		return b.toolStoreDelete(ctx, params)
	case "store_files":
		return b.toolStoreFiles(ctx, params)

	// TS panel — TypeScript / Deno / JS project discovery. See ts_bridge.go.
	case "ts_detect":
		return b.toolTSDetect(ctx, params)
	case "ts_script":
		return b.toolTSScript(ctx, params)

	// Updates panel — tool version tracking. See updates_bridge.go.
	case "updates_list":
		return b.toolUpdatesList(ctx, params)
	case "updates_refresh":
		return b.toolUpdatesRefresh(ctx, params)

	// Self-update — wraps dappco.re/go/update for the IDE binary itself.
	case "selfupdate_status":
		return b.toolSelfUpdateStatus(ctx, params)
	case "selfupdate_apply":
		return b.toolSelfUpdateApply(ctx, params)

	// Sessions panel — wraps dappco.re/go/session for Claude Code transcripts.
	case "session_projects_list":
		return b.toolSessionProjectsList(ctx, params)
	case "session_list":
		return b.toolSessionList(ctx, params)
	case "session_inspect":
		return b.toolSessionInspect(ctx, params)
	case "session_search":
		return b.toolSessionSearch(ctx, params)
	case "session_tail":
		return b.toolSessionTail(ctx, params)
	case "session_active_list":
		return b.toolSessionActiveList(ctx, params)

	// PHP scripts panel — composer.json scripts + canonical artisan commands.
	case "php_scripts":
		return b.toolPHPScripts(ctx, params)
	case "php_run":
		return b.toolPHPRun(ctx, params)

	// Memory panel — browse ~/.claude/memory/ frontmatter.
	case "memory_list":
		return b.toolMemoryList(ctx, params)
	case "memory_search":
		return b.toolMemorySearch(ctx, params)

	// App-state cache (DuckDB-backed). Snider's "load up state from a
	// duckdb file so we don't scan every time" architectural shift.
	case "cache_status":
		return b.toolCacheStatus(ctx, params)
	case "cache_clear":
		return b.toolCacheClear(ctx, params)
	case "cache_debug":
		return b.toolCacheDebug(ctx, params)

	// Mantis ticket browser — read-only over tasks.lthn.sh REST API.
	case "mantis_list":
		return b.toolMantisList(ctx, params)
	case "mantis_view":
		return b.toolMantisView(ctx, params)

	// Forge releases — list recent releases per repo.
	case "forge_releases":
		return b.toolForgeReleases(ctx, params)

	// Stream panel — wraps dappco.re/go/stream Hub for in-process pub/sub.
	case "stream_status":
		return b.toolStreamStatus(ctx, params)
	case "stream_channels":
		return b.toolStreamChannels(ctx, params)
	case "stream_recent":
		return b.toolStreamRecent(ctx, params)
	case "stream_publish":
		return b.toolStreamPublish(ctx, params)
	default:
		return map[string]any{
			"error": "not_implemented",
			"tool":  tool,
			"phase": "skeleton",
		}
	}
}

func (b *MCPBridge) toolWebviewConsole(params map[string]any) map[string]any {
	level := paramString(params, "level", "")
	limit := paramInt(params, "limit", 0)
	b.consoleMu.Lock()
	defer b.consoleMu.Unlock()
	out := make([]consoleEntry, 0, len(b.consoleBuf))
	for _, e := range b.consoleBuf {
		if level != "" && e.Level != level {
			continue
		}
		out = append(out, e)
	}
	if limit > 0 && len(out) > limit {
		out = out[len(out)-limit:]
	}
	return map[string]any{"value": out, "ok": true, "count": len(out)}
}

func (b *MCPBridge) toolWebviewErrors(params map[string]any) map[string]any {
	limit := paramInt(params, "limit", 0)
	b.errorMu.Lock()
	defer b.errorMu.Unlock()
	out := append([]errorEntry(nil), b.errorBuf...)
	if limit > 0 && len(out) > limit {
		out = out[len(out)-limit:]
	}
	return map[string]any{"value": out, "ok": true, "count": len(out)}
}

// handleInternalConsole receives console messages from the JS shim in the
// webview and appends them to the ring buffer.
func (b *MCPBridge) handleInternalConsole(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var entry consoleEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
		return
	}
	if entry.At.IsZero() {
		entry.At = time.Now()
	}
	b.consoleMu.Lock()
	b.consoleBuf = append(b.consoleBuf, entry)
	if len(b.consoleBuf) > consoleBufLimit {
		b.consoleBuf = b.consoleBuf[len(b.consoleBuf)-consoleBufLimit:]
	}
	b.consoleMu.Unlock()
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
}

// handleInternalError receives uncaught exceptions / rejections from the JS
// shim in the webview.
func (b *MCPBridge) handleInternalError(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var entry errorEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
		return
	}
	if entry.At.IsZero() {
		entry.At = time.Now()
	}
	b.errorMu.Lock()
	b.errorBuf = append(b.errorBuf, entry)
	if len(b.errorBuf) > consoleBufLimit {
		b.errorBuf = b.errorBuf[len(b.errorBuf)-consoleBufLimit:]
	}
	b.errorMu.Unlock()
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
}

func (b *MCPBridge) toolWebviewScreenshot(ctx context.Context, params map[string]any) map[string]any {
	task := webview.TaskScreenshot{
		Window: paramString(params, "window", defaultIDEWindowName),
	}
	result := b.Core().Action("webview.screenshot").Run(ctx, core.NewOptions(
		core.Option{Key: "task", Value: task},
	))
	return resultToResponse(result)
}

func (b *MCPBridge) toolWebviewDOMTree(ctx context.Context, params map[string]any) map[string]any {
	selector := paramString(params, "selector", "html")
	// JSON-encode selector so it's safely embedded in JS.
	selectorJS, _ := json.Marshal(selector)
	body := fmt.Sprintf(
		`var __el=document.querySelector(%s);return __el?__el.outerHTML:null;`,
		string(selectorJS),
	)
	return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName), body)
}

func (b *MCPBridge) toolWebviewEval(ctx context.Context, params map[string]any) map[string]any {
	script := paramString(params, "script", "")
	if script == "" {
		return map[string]any{"error": "script param is required", "ok": false}
	}
	return b.evalInWindow(ctx, paramString(params, "window", defaultIDEWindowName), script)
}

// evalInWindow runs a JS body in the named webview and returns the value.
// The body is treated as a function body — use `return` to surface a value.
// Result must be JSON-serialisable.
//
// This is the lone remaining direct wails call in mcp_bridge.go. The
// canonical webview.Service path goes via Chromium DevTools Protocol on
// :9222, which macOS WebKit doesn't expose — so on macOS we use Wails's
// native window.ExecJS to inject a wrapped script that posts the result
// back via fetch to /internal/eval-reply. Linux/Windows could route through
// webview.Service's webview.evaluate action when CDP is available; the
// fetch-back shim is universal regardless.
func (b *MCPBridge) evalInWindow(ctx context.Context, windowName, body string) map[string]any {
	app := application.Get()
	if app == nil {
		return map[string]any{"error": "wails application not initialised yet", "ok": false}
	}
	w, ok := app.Window.GetByName(windowName)
	if !ok || w == nil {
		return map[string]any{"error": fmt.Sprintf("window %q not found", windowName), "ok": false}
	}
	wv, ok := w.(*application.WebviewWindow)
	if !ok {
		return map[string]any{"error": "window is not a WebviewWindow", "ok": false}
	}

	b.evalMu.Lock()
	b.evalCounter++
	reqID := fmt.Sprintf("eval-%d", b.evalCounter)
	ch := make(chan evalReply, 1)
	b.pendingEvals[reqID] = ch
	b.evalMu.Unlock()

	defer func() {
		b.evalMu.Lock()
		delete(b.pendingEvals, reqID)
		b.evalMu.Unlock()
	}()

	// Wrap the user body in an IIFE that posts the result back via fetch.
	// reqID is JSON-encoded; body is interpolated raw (caller's responsibility).
	reqIDJS, _ := json.Marshal(reqID)
	wrapped := fmt.Sprintf(`(function(){
  var __id=%s;
  var __post=function(payload){
    try{
      fetch('http://127.0.0.1:%d/internal/eval-reply',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        keepalive:true
      }).catch(function(){});
    }catch(e){}
  };
  try{
    var __r=(function(){%s})();
    __post({reqId:__id, result:__r});
  }catch(e){
    __post({reqId:__id, error:String(e)+(e&&e.stack?'\n'+e.stack:'')});
  }
})();`, string(reqIDJS), b.port, body)

	wv.ExecJS(wrapped)

	select {
	case reply := <-ch:
		if reply.Error != "" {
			return map[string]any{"error": reply.Error, "ok": false}
		}
		return map[string]any{"value": reply.Result, "ok": true}
	case <-time.After(5 * time.Second):
		return map[string]any{"error": "eval timeout (5s)", "ok": false, "reqId": reqID}
	case <-ctx.Done():
		return map[string]any{"error": "context cancelled", "ok": false}
	}
}

// uiConfig returns a lazily-initialised *config.Config rooted at the
// default ~/.core/config.yaml. The .core directory is created by config
// package internals on first Commit().
func (b *MCPBridge) uiConfig() (*cfgpkg.Config, error) {
	b.uiCfgMu.Lock()
	defer b.uiCfgMu.Unlock()
	if b.uiCfg != nil {
		return b.uiCfg, nil
	}
	result := cfgpkg.New(
		cfgpkg.WithMedium(coreio.Local),
	)
	if !result.OK {
		if err, ok := result.Value.(error); ok {
			return nil, err
		}
		return nil, fmt.Errorf("config.New failed")
	}
	cfg, ok := result.Value.(*cfgpkg.Config)
	if !ok {
		return nil, fmt.Errorf("config.New returned unexpected value type %T", result.Value)
	}
	b.uiCfg = cfg
	return cfg, nil
}

// handleInternalUIState reads (GET) or writes (POST) the user's persisted UI
// preferences. State lives under the "ui" namespace in the config file at
// ~/.core/config.yaml.
//
//	GET  /internal/ui-state              → {"ok": true, "ui": {...}}
//	POST /internal/ui-state              → body {"chat":{"visible":true},"route":"explorer",...}
//	                                       merged into ui.* keys, persisted.
func (b *MCPBridge) handleInternalUIState(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	cfg, err := b.uiConfig()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": err.Error(), "ok": false})
		return
	}

	switch r.Method {
	case http.MethodGet:
		var ui map[string]any
		result := cfg.Get("ui", &ui)
		if !result.OK {
			// "key not found" is expected on first launch — return empty.
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "ui": map[string]any{}})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "ui": ui})

	case http.MethodPost:
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": err.Error(), "ok": false})
			return
		}
		// Set the entire ui subtree as a single key — replaces previous state.
		if r := cfg.Set("ui", body); !r.OK {
			w.WriteHeader(http.StatusInternalServerError)
			msg := "set failed"
			if e, ok := r.Value.(error); ok {
				msg = e.Error()
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"error": msg, "ok": false})
			return
		}
		if r := cfg.Commit(); !r.OK {
			w.WriteHeader(http.StatusInternalServerError)
			msg := "commit failed"
			if e, ok := r.Value.(error); ok {
				msg = e.Error()
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"error": msg, "ok": false})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "saved": body})

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// handleInternalEvalReply receives evalInWindow results from the JS shim
// and signals the waiting goroutine.
func (b *MCPBridge) handleInternalEvalReply(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		ReqID  string `json:"reqId"`
		Result any    `json:"result"`
		Error  string `json:"error"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
		return
	}
	b.evalMu.Lock()
	ch, ok := b.pendingEvals[body.ReqID]
	b.evalMu.Unlock()
	if ok {
		select {
		case ch <- evalReply{Result: body.Result, Error: body.Error}:
		default:
		}
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
}

func (b *MCPBridge) toolWebviewNavigate(ctx context.Context, params map[string]any) map[string]any {
	windowName := paramString(params, "window", defaultIDEWindowName)
	url := paramString(params, "url", "")
	if url == "" {
		return errResp("url param is required")
	}
	result := b.Core().Action("webview.navigate").Run(ctx, core.NewOptions(
		core.Option{Key: "task", Value: webview.TaskNavigate{Window: windowName, URL: url}},
	))
	if !result.OK {
		return resultToResponse(result)
	}
	return map[string]any{"ok": true, "navigated": url, "window": windowName}
}

// errResp is a small helper for {error, ok:false} responses.
func errResp(msg string) map[string]any {
	return map[string]any{"error": msg, "ok": false}
}

// File ops

func (b *MCPBridge) toolFileRead(params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	if path == "" {
		return errResp("path required")
	}
	return resultToResponse(b.Core().Fs().Read(path))
}

func (b *MCPBridge) toolFileWrite(params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	content := paramString(params, "content", "")
	if path == "" {
		return errResp("path required")
	}
	return resultToResponse(b.Core().Fs().Write(path, content))
}

// toolFileEdit replaces the FIRST occurrence of params.old with params.new.
// If params.old is empty, params.new becomes the whole file content.
func (b *MCPBridge) toolFileEdit(params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	oldText := paramString(params, "old", "")
	newText := paramString(params, "new", "")
	if path == "" {
		return errResp("path required")
	}
	fs := b.Core().Fs()
	if oldText == "" {
		return resultToResponse(fs.Write(path, newText))
	}
	rd := fs.Read(path)
	if !rd.OK {
		return resultToResponse(rd)
	}
	content, _ := rd.Value.(string)
	if !strings.Contains(content, oldText) {
		return errResp("old text not found in file")
	}
	updated := strings.Replace(content, oldText, newText, 1)
	return resultToResponse(fs.Write(path, updated))
}

func (b *MCPBridge) toolFileDelete(params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	if path == "" {
		return errResp("path required")
	}
	return resultToResponse(b.Core().Fs().Delete(path))
}

func (b *MCPBridge) toolFileExists(params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	if path == "" {
		return errResp("path required")
	}
	return map[string]any{"ok": true, "exists": b.Core().Fs().Exists(path)}
}

func (b *MCPBridge) toolFileRename(params map[string]any) map[string]any {
	from := paramString(params, "from", "")
	to := paramString(params, "to", "")
	if from == "" || to == "" {
		return errResp("from and to required")
	}
	return resultToResponse(b.Core().Fs().Rename(from, to))
}

func (b *MCPBridge) toolDirList(params map[string]any) map[string]any {
	path := paramString(params, "path", ".")
	result := b.Core().Fs().List(path)
	if !result.OK {
		return resultToResponse(result)
	}
	entries, ok := result.Value.([]fs.DirEntry)
	if !ok {
		return errResp(fmt.Sprintf("unexpected list type %T", result.Value))
	}
	out := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		out = append(out, map[string]any{
			"name":   e.Name(),
			"is_dir": e.IsDir(),
			"type":   e.Type().String(),
		})
	}
	return map[string]any{"ok": true, "value": out, "count": len(out)}
}

func (b *MCPBridge) toolDirCreate(params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	if path == "" {
		return errResp("path required")
	}
	return resultToResponse(b.Core().Fs().EnsureDir(path))
}

// Process ops — uses the registered process.Service

func (b *MCPBridge) processService() *process.Service {
	svc, _ := core.ServiceFor[*process.Service](b.Core(), "process")
	return svc
}

func (b *MCPBridge) toolProcessStart(ctx context.Context, params map[string]any) map[string]any {
	_ = ctx
	cmd := paramString(params, "command", "")
	if cmd == "" {
		return errResp("command required")
	}
	var args []string
	if raw, ok := params["args"].([]any); ok {
		for _, v := range raw {
			if s, ok := v.(string); ok {
				args = append(args, s)
			}
		}
	}
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	// Use the bridge's long-lived context (Service runtime), NOT the HTTP
	// request context — otherwise the spawned process dies the moment the
	// MCP /mcp/call response is flushed.
	bgCtx := b.Core().Context()
	if bgCtx == nil {
		bgCtx = context.Background()
	}
	result := svc.Start(bgCtx, cmd, args...)
	if !result.OK {
		return resultToResponse(result)
	}
	proc, _ := result.Value.(*process.Process)
	if proc == nil {
		return map[string]any{"ok": true, "value": result.Value}
	}
	return map[string]any{
		"ok":      true,
		"id":      proc.ID,
		"command": proc.Command,
		"args":    proc.Args,
	}
}

func (b *MCPBridge) toolProcessKill(params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	if id == "" {
		return errResp("id required")
	}
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	return resultToResponse(svc.Kill(id))
}

func (b *MCPBridge) toolProcessList(params map[string]any) map[string]any {
	_ = params
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	procs := svc.List()
	list := make([]map[string]any, 0, len(procs))
	for _, p := range procs {
		list = append(list, map[string]any{
			"id":         p.ID,
			"command":    p.Command,
			"args":       p.Args,
			"status":     string(p.Status),
			"started_at": p.StartedAt,
			"exit_code":  p.ExitCode,
		})
	}
	return map[string]any{"ok": true, "value": list, "count": len(list)}
}

func (b *MCPBridge) toolProcessOutput(params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	if id == "" {
		return errResp("id required")
	}
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	return resultToResponse(svc.Output(id))
}

// Workspace search — wraps ripgrep --json via process.Service. Falls back
// to a clear error if rg isn't on PATH so the frontend can prompt the user.
//
// Params:
//   query        (string, required) — pattern (regex by default, see literal)
//   path         (string, required) — workspace root
//   max_results  (int, default 200)
//   literal      (bool, default true)  — when true, use --fixed-strings
//   ignore_case  (bool, default true)
//
// Returns: {ok, matches: [{path, line, text}], count, truncated}.
func (b *MCPBridge) toolWorkspaceSearch(ctx context.Context, params map[string]any) map[string]any {
	_ = ctx
	query := paramString(params, "query", "")
	root := paramString(params, "path", "")
	if query == "" {
		return errResp("query param required")
	}
	if root == "" {
		return errResp("path param required")
	}
	maxResults := paramInt(params, "max_results", 200)
	literal := true
	if v, ok := params["literal"].(bool); ok {
		literal = v
	}
	ignoreCase := true
	if v, ok := params["ignore_case"].(bool); ok {
		ignoreCase = v
	}

	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}

	args := []string{"--json", "--max-filesize", "1M", "--max-count", fmt.Sprintf("%d", maxResults)}
	if literal {
		args = append(args, "--fixed-strings")
	}
	if ignoreCase {
		args = append(args, "--ignore-case")
	}
	args = append(args, "--", query, root)

	bgCtx := b.Core().Context()
	if bgCtx == nil {
		bgCtx = context.Background()
	}
	result := svc.Run(bgCtx, "rg", args...)
	// rg exits 1 when there are no matches — that's a successful empty result,
	// not an error. The Run helper treats nonzero exit as failure, so we look
	// at the captured output regardless.
	output := ""
	if s, ok := result.Value.(string); ok {
		output = s
	}
	matches := parseRipgrepJSONLines(output, maxResults)
	if len(matches) == 0 && !result.OK {
		// Distinguish "no matches" from "rg not installed" / real errors.
		errMsg := "search failed"
		if err, ok := result.Value.(error); ok {
			errMsg = err.Error()
		}
		if strings.Contains(errMsg, "executable file not found") ||
			strings.Contains(errMsg, "no such file") {
			return map[string]any{
				"error": "ripgrep (rg) not found on PATH — install via `brew install ripgrep` (macOS) / `apt install ripgrep` (linux)",
				"ok":    false,
			}
		}
		// Likely "no matches" — return empty success.
		return map[string]any{"ok": true, "matches": []map[string]any{}, "count": 0, "truncated": false}
	}
	return map[string]any{
		"ok":        true,
		"matches":   matches,
		"count":     len(matches),
		"truncated": len(matches) >= maxResults,
	}
}

// Git source-control tools — per-file, single-repo operations for the IDE's
// editor surface (status/diff/stage/unstage/commit on the active workspace).
//
// Three distinct abstraction layers in the core ecosystem — DO NOT confuse:
//
//  1. THIS file (mcp_bridge.go git_*)         — per-file, per-repo, editor-
//     time. Wraps `git` via process.Service. Backs the Source Control panel.
//
//  2. dappco.re/go/git AND dappco.re/go/scm/git  — multi-repo aggregate
//     dashboard. Status returns {Modified, Untracked, Staged, Ahead, Behind}
//     per repo across many repos. Push/Pull single + multi. Used for "18
//     Core repos: which need attention?". Bridge could expose this via
//     c.QUERY(git.QueryStatus{...}) for a future dashboard surface.
//
//  3. dappco.re/go/scm (core/go-scm)          — Lethean's full content
//     framework. Sub-packages: marketplace (Index/Discovery/Builder),
//     plugin (manifest/registry/runtime), manifest (signed packages),
//     collect (ingest from bitcointalk/github/papers/market), repos
//     (Registry/GitState/KBConfig/WorkConfig). NOT per-file source control —
//     content sourcing + extension management for IDE surfaces beyond
//     the file editor.
//
// No canonical core-package primitive exists for per-file diff/add/commit
// today — that's why this file shells out to git directly. When such APIs
// land in core/go-git or core/go-scm/git, these dispatchers swap to
// c.Action(...) calls and the process_start path retires.
//
// All tools below use the bridge's long-lived context, never the HTTP
// request context — process.Start has the kill-on-ctx-done behaviour, so
// the request context would terminate git mid-flight.

// runGit spawns `git -C <repo> <args...>`, runs to completion, returns the
// captured stdout. Non-zero exit codes are treated as errors EXCEPT for git
// status which uses code 0 always.
func (b *MCPBridge) runGit(repo string, args ...string) (string, error) {
	svc := b.processService()
	if svc == nil {
		return "", fmt.Errorf("process service unavailable")
	}
	bgCtx := b.Core().Context()
	if bgCtx == nil {
		bgCtx = context.Background()
	}
	full := append([]string{"-C", repo}, args...)
	result := svc.Run(bgCtx, "git", full...)
	out, _ := result.Value.(string)
	if !result.OK {
		if err, ok := result.Value.(error); ok {
			return out, err
		}
		// Run returns Failure on non-zero exit; output is the captured stderr/stdout.
		return out, fmt.Errorf("git exit non-zero")
	}
	return out, nil
}

// gitRepoRoot resolves params.path → either the explicit path or the bridge's
// configured workspace root.
func gitRepoRoot(params map[string]any) string {
	if p := paramString(params, "path", ""); p != "" {
		return p
	}
	return paramString(params, "repo", "")
}

func (b *MCPBridge) toolGitStatus(params map[string]any) map[string]any {
	repo := gitRepoRoot(params)
	if repo == "" {
		return errResp("path (repo root) required")
	}
	out, err := b.runGit(repo, "status", "--porcelain=v1", "-z")
	if err != nil && out == "" {
		return errResp(fmt.Sprintf("git status: %v", err))
	}
	// -z uses NUL separators between entries; rename uses NUL between old and new.
	type entry struct {
		Path         string `json:"path"`
		IndexStatus  string `json:"index_status"`
		WorktreeStat string `json:"worktree_status"`
		Staged       bool   `json:"staged"`
		Unstaged     bool   `json:"unstaged"`
		Untracked    bool   `json:"untracked"`
	}
	entries := []entry{}
	tokens := strings.Split(out, "\x00")
	for i := 0; i < len(tokens); i++ {
		t := tokens[i]
		if len(t) < 3 {
			continue
		}
		idx := string(t[0])
		wt := string(t[1])
		path := t[3:]
		// Renames are formatted "R  new\x00old" — consume the next token.
		if idx == "R" || idx == "C" {
			if i+1 < len(tokens) {
				i++
			}
		}
		entries = append(entries, entry{
			Path:         path,
			IndexStatus:  idx,
			WorktreeStat: wt,
			Staged:       idx != " " && idx != "?",
			Unstaged:     wt != " " && wt != "?",
			Untracked:    idx == "?" && wt == "?",
		})
	}
	return map[string]any{"ok": true, "entries": entries, "count": len(entries)}
}

func (b *MCPBridge) toolGitDiff(params map[string]any) map[string]any {
	repo := gitRepoRoot(params)
	if repo == "" {
		return errResp("path (repo root) required")
	}
	file := paramString(params, "file", "")
	staged := false
	if v, ok := params["staged"].(bool); ok {
		staged = v
	}
	args := []string{"diff", "--no-color"}
	if staged {
		args = append(args, "--staged")
	}
	if file != "" {
		args = append(args, "--", file)
	}
	out, err := b.runGit(repo, args...)
	if err != nil && out == "" {
		return errResp(fmt.Sprintf("git diff: %v", err))
	}
	return map[string]any{"ok": true, "diff": out, "file": file, "staged": staged}
}

func (b *MCPBridge) toolGitBranch(params map[string]any) map[string]any {
	repo := gitRepoRoot(params)
	if repo == "" {
		return errResp("path (repo root) required")
	}
	branch, err := b.runGit(repo, "branch", "--show-current")
	if err != nil {
		return errResp(fmt.Sprintf("git branch: %v", err))
	}
	branch = strings.TrimSpace(branch)
	// Get ahead/behind count if there's an upstream
	ahead, behind := 0, 0
	if branch != "" {
		counts, err := b.runGit(repo, "rev-list", "--left-right", "--count", "@{u}...HEAD")
		if err == nil {
			parts := strings.Fields(strings.TrimSpace(counts))
			if len(parts) == 2 {
				fmt.Sscanf(parts[0], "%d", &behind)
				fmt.Sscanf(parts[1], "%d", &ahead)
			}
		}
	}
	return map[string]any{"ok": true, "branch": branch, "ahead": ahead, "behind": behind}
}

func (b *MCPBridge) toolGitAdd(params map[string]any) map[string]any {
	repo := gitRepoRoot(params)
	if repo == "" {
		return errResp("path (repo root) required")
	}
	files, _ := params["files"].([]any)
	all := false
	if v, ok := params["all"].(bool); ok {
		all = v
	}
	args := []string{"add"}
	if all || len(files) == 0 {
		args = append(args, "-A")
	} else {
		args = append(args, "--")
		for _, f := range files {
			if s, ok := f.(string); ok {
				args = append(args, s)
			}
		}
	}
	out, err := b.runGit(repo, args...)
	if err != nil {
		return map[string]any{"error": fmt.Sprintf("git add: %v", err), "ok": false, "output": out}
	}
	return map[string]any{"ok": true, "added": files, "all": all || len(files) == 0}
}

func (b *MCPBridge) toolGitUnstage(params map[string]any) map[string]any {
	repo := gitRepoRoot(params)
	if repo == "" {
		return errResp("path (repo root) required")
	}
	files, _ := params["files"].([]any)
	args := []string{"restore", "--staged"}
	if len(files) == 0 {
		args = append(args, ".")
	} else {
		args = append(args, "--")
		for _, f := range files {
			if s, ok := f.(string); ok {
				args = append(args, s)
			}
		}
	}
	out, err := b.runGit(repo, args...)
	if err != nil {
		return map[string]any{"error": fmt.Sprintf("git unstage: %v", err), "ok": false, "output": out}
	}
	return map[string]any{"ok": true, "unstaged": files}
}

func (b *MCPBridge) toolGitCommit(params map[string]any) map[string]any {
	repo := gitRepoRoot(params)
	if repo == "" {
		return errResp("path (repo root) required")
	}
	msg := paramString(params, "message", "")
	if msg == "" {
		return errResp("message required")
	}
	out, err := b.runGit(repo, "commit", "-m", msg)
	if err != nil {
		return map[string]any{"error": fmt.Sprintf("git commit: %v", err), "ok": false, "output": out}
	}
	return map[string]any{"ok": true, "output": out}
}

func (b *MCPBridge) toolGitLog(params map[string]any) map[string]any {
	repo := gitRepoRoot(params)
	if repo == "" {
		return errResp("path (repo root) required")
	}
	limit := paramInt(params, "limit", 20)
	out, err := b.runGit(repo, "log",
		fmt.Sprintf("--max-count=%d", limit),
		"--pretty=format:%H%x09%h%x09%an%x09%ad%x09%s",
		"--date=short")
	if err != nil {
		return errResp(fmt.Sprintf("git log: %v", err))
	}
	type commit struct {
		Hash     string `json:"hash"`
		ShortSHA string `json:"short_sha"`
		Author   string `json:"author"`
		Date     string `json:"date"`
		Subject  string `json:"subject"`
	}
	commits := []commit{}
	for _, line := range strings.Split(out, "\n") {
		parts := strings.SplitN(line, "\t", 5)
		if len(parts) < 5 {
			continue
		}
		commits = append(commits, commit{Hash: parts[0], ShortSHA: parts[1], Author: parts[2], Date: parts[3], Subject: parts[4]})
	}
	return map[string]any{"ok": true, "commits": commits, "count": len(commits)}
}

// parseRipgrepJSONLines walks rg's --json line stream and extracts match
// rows. Each line is one JSON object; we only care about type:"match".
func parseRipgrepJSONLines(s string, max int) []map[string]any {
	matches := make([]map[string]any, 0, 32)
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var rec struct {
			Type string `json:"type"`
			Data struct {
				Path struct {
					Text string `json:"text"`
				} `json:"path"`
				Lines struct {
					Text string `json:"text"`
				} `json:"lines"`
				LineNumber int `json:"line_number"`
			} `json:"data"`
		}
		if err := json.Unmarshal([]byte(line), &rec); err != nil {
			continue
		}
		if rec.Type != "match" {
			continue
		}
		text := strings.TrimRight(rec.Data.Lines.Text, "\n")
		if len(text) > 240 {
			text = text[:240] + "…"
		}
		matches = append(matches, map[string]any{
			"path": rec.Data.Path.Text,
			"line": rec.Data.LineNumber,
			"text": text,
		})
		if len(matches) >= max {
			break
		}
	}
	return matches
}

func (b *MCPBridge) toolProcessInput(params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	input := paramString(params, "input", "")
	if id == "" {
		return errResp("id required")
	}
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	return resultToResponse(svc.Input(id, input))
}

// Window controls — close / visibility / always-on-top / restore / focused
// — all via Core IPC (window.Service tracks them in manager).

func (b *MCPBridge) toolWindowClose(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	resp := b.windowActionTask(ctx, "window.close", window.TaskCloseWindow{Name: name})
	if ok, _ := resp["ok"].(bool); ok {
		resp["closed"] = name
	}
	return resp
}

func (b *MCPBridge) toolWindowVisibility(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	visible := true
	if v, ok := params["visible"].(bool); ok {
		visible = v
	}
	resp := b.windowActionTask(ctx, "window.set_visibility", window.TaskSetVisibility{Name: name, Visible: visible})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"], resp["visible"] = name, visible
	}
	return resp
}

func (b *MCPBridge) toolWindowAlwaysOnTop(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	on := true
	if v, ok := params["on"].(bool); ok {
		on = v
	}
	resp := b.windowActionTask(ctx, "window.set_always_on_top", window.TaskSetAlwaysOnTop{Name: name, AlwaysOnTop: on})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"], resp["always_on_top"] = name, on
	}
	return resp
}

func (b *MCPBridge) toolWindowRestore(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	resp := b.windowActionTask(ctx, "window.restore", window.TaskRestore{Name: name})
	if ok, _ := resp["ok"].(bool); ok {
		resp["restored"] = name
	}
	return resp
}

func (b *MCPBridge) toolWindowFocused(params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	result := b.Core().QUERY(window.QueryWindowByName{Name: name})
	if !result.OK || result.Value == nil {
		return errResp(fmt.Sprintf("window %q not found", name))
	}
	info, _ := result.Value.(*window.WindowInfo)
	if info == nil {
		return map[string]any{"ok": true, "focused": false, "window": name}
	}
	return map[string]any{"ok": true, "focused": info.Focused, "window": info.Name}
}

// Lang — static extension → language map.

var langByExt = map[string]string{
	".go":   "go",
	".ts":   "typescript",
	".tsx":  "typescript",
	".js":   "javascript",
	".jsx":  "javascript",
	".mjs":  "javascript",
	".py":   "python",
	".rs":   "rust",
	".rb":   "ruby",
	".php":  "php",
	".java": "java",
	".kt":   "kotlin",
	".swift": "swift",
	".c":    "c",
	".cc":   "cpp",
	".cpp":  "cpp",
	".cxx":  "cpp",
	".h":    "c",
	".hpp":  "cpp",
	".cs":   "csharp",
	".sh":   "bash",
	".zsh":  "bash",
	".bash": "bash",
	".sql":  "sql",
	".html": "html",
	".htm":  "html",
	".css":  "css",
	".scss": "scss",
	".sass": "sass",
	".less": "less",
	".md":   "markdown",
	".markdown": "markdown",
	".json": "json",
	".yaml": "yaml",
	".yml":  "yaml",
	".toml": "toml",
	".xml":  "xml",
	".svg":  "svg",
	".dockerfile": "dockerfile",
	".lua":  "lua",
	".vue":  "vue",
	".svelte": "svelte",
}

func (b *MCPBridge) toolLangDetect(params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	if path == "" {
		return errResp("path required")
	}
	dot := strings.LastIndex(path, ".")
	if dot < 0 {
		base := path
		if i := strings.LastIndex(path, "/"); i >= 0 {
			base = path[i+1:]
		}
		// special: filenames without extension (Dockerfile, Makefile, etc.)
		switch strings.ToLower(base) {
		case "dockerfile":
			return map[string]any{"ok": true, "language": "dockerfile"}
		case "makefile":
			return map[string]any{"ok": true, "language": "makefile"}
		}
		return map[string]any{"ok": true, "language": "plaintext"}
	}
	ext := strings.ToLower(path[dot:])
	if lang, ok := langByExt[ext]; ok {
		return map[string]any{"ok": true, "language": lang}
	}
	return map[string]any{"ok": true, "language": "plaintext"}
}

func (b *MCPBridge) toolLangList() map[string]any {
	seen := map[string]bool{}
	out := []string{}
	for _, lang := range langByExt {
		if !seen[lang] {
			seen[lang] = true
			out = append(out, lang)
		}
	}
	return map[string]any{"ok": true, "languages": out, "count": len(out)}
}

// Clipboard / theme / screens — all dispatched through core/gui's
// display.Service via core.ServiceFor. No direct wails imports here.

func (b *MCPBridge) displayService() *display.Service {
	svc, _ := core.ServiceFor[*display.Service](b.Core(), "display")
	return svc
}

func (b *MCPBridge) toolClipboardRead() map[string]any {
	svc := b.displayService()
	if svc == nil {
		return errResp("display service unavailable")
	}
	text, err := svc.ReadClipboard()
	if err != nil {
		return map[string]any{"error": err.Error(), "ok": false}
	}
	return map[string]any{"ok": true, "value": text, "has_text": text != ""}
}

func (b *MCPBridge) toolClipboardWrite(ctx context.Context, params map[string]any) map[string]any {
	text := paramString(params, "text", "")
	result := b.Core().Action("clipboard.set_text").Run(ctx, core.NewOptions(
		core.Option{Key: "text", Value: text},
	))
	if !result.OK {
		return resultToResponse(result)
	}
	return map[string]any{"ok": true, "wrote": text}
}

func (b *MCPBridge) toolClipboardHas() map[string]any {
	svc := b.displayService()
	if svc == nil {
		return errResp("display service unavailable")
	}
	text, err := svc.ReadClipboard()
	if err != nil {
		return map[string]any{"error": err.Error(), "ok": false}
	}
	return map[string]any{"ok": true, "has": text != ""}
}

func (b *MCPBridge) toolClipboardClear(ctx context.Context) map[string]any {
	result := b.Core().Action("clipboard.clear").Run(ctx, core.NewOptions())
	if !result.OK {
		return resultToResponse(result)
	}
	return map[string]any{"ok": true, "cleared": true}
}

func (b *MCPBridge) toolThemeGet() map[string]any {
	svc := b.displayService()
	if svc == nil {
		return errResp("display service unavailable")
	}
	t := svc.GetTheme()
	if t == nil {
		return map[string]any{"ok": true, "theme": "light", "dark": false}
	}
	theme := "light"
	if t.IsDark {
		theme = "dark"
	}
	return map[string]any{"ok": true, "theme": theme, "dark": t.IsDark}
}

func (b *MCPBridge) toolScreenInfo(params map[string]any) map[string]any {
	_ = params
	svc := b.displayService()
	if svc == nil {
		return errResp("display service unavailable")
	}
	primary, err := svc.GetPrimaryScreen()
	if err != nil {
		return map[string]any{"error": err.Error(), "ok": false}
	}
	all := svc.GetScreens()
	out := make([]map[string]any, 0, len(all))
	for _, s := range all {
		out = append(out, map[string]any{
			"id":     s.ID,
			"name":   s.Name,
			"x":      s.X,
			"y":      s.Y,
			"width":  s.Width,
			"height": s.Height,
		})
	}
	return map[string]any{
		"ok":      true,
		"primary": map[string]any{"id": primary.ID, "name": primary.Name, "width": primary.Width, "height": primary.Height},
		"screens": out,
		"count":   len(out),
	}
}

// All window control flows through window.Service via Core IPC. User moves
// then become tracked by window.Service so save_layout captures them.

func (b *MCPBridge) windowActionTask(ctx context.Context, action string, task any) map[string]any {
	result := b.Core().Action(action).Run(ctx, core.NewOptions(
		core.Option{Key: "task", Value: task},
	))
	if !result.OK {
		return resultToResponse(result)
	}
	return map[string]any{"ok": true}
}

// toolWindowOpen creates a new tracked WebView2 window. URL is the load
// target (use about:blank for an empty shell). Every window the user opens
// inherits the same MCP-bridge addressability — pkg_search, webview_eval,
// dom_tree, click, type, screenshot, etc. all accept a `window` param.
//
// This is the dAppServer / Web3-application-layer story: every running
// surface is a sandboxed, scriptable webview, not a black-box subprocess.
// Compile output, browser doc lookup, a chat session, a remote agent's
// dashboard — all just windows the agent can drive identically.
func (b *MCPBridge) toolWindowOpen(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "name", "")
	if name == "" {
		return errResp("name is required")
	}
	w := &window.Window{
		Name:   name,
		Title:  paramString(params, "title", name),
		URL:    paramString(params, "url", ""),
		HTML:   paramString(params, "html", ""),
		Width:  paramInt(params, "width", 1024),
		Height: paramInt(params, "height", 768),
		X:      paramInt(params, "x", 100),
		Y:      paramInt(params, "y", 100),
	}
	result := b.Core().Action("window.open").Run(ctx, core.NewOptions(
		core.Option{Key: "task", Value: window.TaskOpenWindow{Window: w}},
	))
	if !result.OK {
		return resultToResponse(result)
	}
	return map[string]any{
		"ok":     true,
		"window": name,
		"url":    w.URL,
		"size":   map[string]int{"width": w.Width, "height": w.Height},
	}
}

func (b *MCPBridge) toolWindowFocus(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	resp := b.windowActionTask(ctx, "window.focus", window.TaskFocus{Name: name})
	if ok, _ := resp["ok"].(bool); ok {
		resp["focused"] = name
	}
	return resp
}

func (b *MCPBridge) toolWindowPosition(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	x, y := paramInt(params, "x", 0), paramInt(params, "y", 0)
	resp := b.windowActionTask(ctx, "window.set_position", window.TaskSetPosition{Name: name, X: x, Y: y})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"], resp["x"], resp["y"] = name, x, y
	}
	return resp
}

func (b *MCPBridge) toolWindowSize(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	w, h := paramInt(params, "width", 0), paramInt(params, "height", 0)
	if w <= 0 || h <= 0 {
		return errResp("width and height required (positive ints)")
	}
	resp := b.windowActionTask(ctx, "window.set_size", window.TaskSetSize{Name: name, Width: w, Height: h})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"], resp["width"], resp["height"] = name, w, h
	}
	return resp
}

func (b *MCPBridge) toolWindowBounds(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	x, y := paramInt(params, "x", 0), paramInt(params, "y", 0)
	posResp := b.windowActionTask(ctx, "window.set_position", window.TaskSetPosition{Name: name, X: x, Y: y})
	if ok, _ := posResp["ok"].(bool); !ok {
		return posResp
	}
	w, h := paramInt(params, "width", 0), paramInt(params, "height", 0)
	if w > 0 && h > 0 {
		sizeResp := b.windowActionTask(ctx, "window.set_size", window.TaskSetSize{Name: name, Width: w, Height: h})
		if ok, _ := sizeResp["ok"].(bool); !ok {
			return sizeResp
		}
	}
	return map[string]any{"ok": true, "window": name, "x": x, "y": y, "width": w, "height": h}
}

func (b *MCPBridge) toolWindowCenter(ctx context.Context, params map[string]any) map[string]any {
	// window.Service doesn't expose a center action; compute via primary
	// screen + window size. For now, use a no-op (return ok) until needed.
	_ = ctx
	name := paramString(params, "window", defaultIDEWindowName)
	return map[string]any{"ok": true, "window": name, "note": "center action not yet wired through window.Service"}
}

func (b *MCPBridge) toolWindowMinimise(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	resp := b.windowActionTask(ctx, "window.minimise", window.TaskMinimise{Name: name})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"] = name
	}
	return resp
}

func (b *MCPBridge) toolWindowMaximise(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	resp := b.windowActionTask(ctx, "window.maximise", window.TaskMaximise{Name: name})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"] = name
	}
	return resp
}

func (b *MCPBridge) toolWindowFullscreen(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	full := true
	if v, ok := params["fullscreen"].(bool); ok {
		full = v
	}
	resp := b.windowActionTask(ctx, "window.fullscreen", window.TaskFullscreen{Name: name, Fullscreen: full})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"], resp["fullscreen"] = name, full
	}
	return resp
}

func (b *MCPBridge) toolWindowSetTitle(ctx context.Context, params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	title := paramString(params, "title", "")
	if title == "" {
		return errResp("title param required")
	}
	resp := b.windowActionTask(ctx, "window.set_title", window.TaskSetTitle{Name: name, Title: title})
	if ok, _ := resp["ok"].(bool); ok {
		resp["window"], resp["title"] = name, title
	}
	return resp
}

func (b *MCPBridge) toolWindowGetTitle(params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	result := b.Core().QUERY(window.QueryWindowByName{Name: name})
	if !result.OK || result.Value == nil {
		return errResp(fmt.Sprintf("window %q not found", name))
	}
	if info, ok := result.Value.(*window.WindowInfo); ok && info != nil {
		return map[string]any{"ok": true, "name": info.Name, "title": info.Title}
	}
	return map[string]any{"ok": true, "name": name}
}

func (b *MCPBridge) toolWindowGet(params map[string]any) map[string]any {
	name := paramString(params, "window", defaultIDEWindowName)
	result := b.Core().QUERY(window.QueryWindowByName{Name: name})
	if !result.OK || result.Value == nil {
		return errResp(fmt.Sprintf("window %q not found", name))
	}
	info, ok := result.Value.(*window.WindowInfo)
	if !ok || info == nil {
		return errResp("unexpected window query result")
	}
	return map[string]any{
		"ok":        true,
		"name":      info.Name,
		"title":     info.Title,
		"x":         info.X,
		"y":         info.Y,
		"width":     info.Width,
		"height":    info.Height,
		"opacity":   info.Opacity,
		"maximised": info.Maximized,
		"focused":   info.Focused,
	}
}

func (b *MCPBridge) toolWindowList(params map[string]any) map[string]any {
	_ = params
	result := b.Core().QUERY(window.QueryWindowList{})
	if !result.OK {
		return resultToResponse(result)
	}
	infos, _ := result.Value.([]window.WindowInfo)
	out := make([]map[string]any, 0, len(infos))
	for _, info := range infos {
		out = append(out, map[string]any{
			"name":      info.Name,
			"title":     info.Title,
			"x":         info.X,
			"y":         info.Y,
			"width":     info.Width,
			"height":    info.Height,
			"focused":   info.Focused,
			"maximised": info.Maximized,
		})
	}
	return map[string]any{"ok": true, "windows": out, "count": len(out)}
}

func paramString(params map[string]any, key, fallback string) string {
	if v, ok := params[key].(string); ok && v != "" {
		return v
	}
	return fallback
}

func paramInt(params map[string]any, key string, fallback int) int {
	switch v := params[key].(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	}
	return fallback
}

func paramBool(params map[string]any, key string, fallback bool) bool {
	switch v := params[key].(type) {
	case bool:
		return v
	case string:
		return v == "true" || v == "1"
	}
	return fallback
}

func resultToResponse(result core.Result) map[string]any {
	if !result.OK {
		if err, ok := result.Value.(error); ok {
			return map[string]any{"error": err.Error(), "ok": false}
		}
		if result.Value == nil {
			return map[string]any{
				"error": "no handler returned an OK result (Core.Query swallows non-OK responses; webview-via-CDP may be unavailable on macOS WebKit — see :9222 listener)",
				"ok":    false,
				"hint":  "macOS Wails uses native WebKit, not Chromium DevTools Protocol",
			}
		}
		return map[string]any{"error": fmt.Sprintf("core call failed: %v", result.Value), "ok": false}
	}
	return map[string]any{"value": result.Value, "ok": true}
}

// mcpToolManifest returns the canonical 109-tool surface preserved from the
// lthn-desktop POC. The contract is stable across implementations — MCP
// clients (Cladius's MCP server) bind to these tool names and parameter
// shapes; only the implementations under the hood change.
func mcpToolManifest() []map[string]string {
	return []map[string]string{
		// File operations
		{"name": "file_read", "description": "Read the contents of a file"},
		{"name": "file_write", "description": "Write content to a file"},
		{"name": "file_edit", "description": "Edit a file by replacing text"},
		{"name": "file_delete", "description": "Delete a file"},
		{"name": "file_exists", "description": "Check if file exists"},
		{"name": "file_rename", "description": "Rename or move a file"},
		{"name": "dir_list", "description": "List directory contents"},
		{"name": "dir_create", "description": "Create a directory"},
		{"name": "lang_detect", "description": "Detect file language"},
		{"name": "lang_list", "description": "List supported languages"},
		// Process management
		{"name": "process_start", "description": "Start a process"},
		{"name": "process_stop", "description": "Stop a process"},
		{"name": "process_kill", "description": "Kill a process"},
		{"name": "process_list", "description": "List processes"},
		{"name": "process_output", "description": "Get process output"},
		{"name": "process_input", "description": "Send input to process"},
		// WebSocket streaming
		{"name": "ws_start", "description": "Start WebSocket server"},
		{"name": "ws_info", "description": "Get WebSocket info"},
		// WebView interaction (JS runtime, console, DOM)
		{"name": "webview_list", "description": "List windows"},
		{"name": "webview_eval", "description": "Execute JavaScript"},
		{"name": "webview_console", "description": "Get console messages"},
		{"name": "webview_console_clear", "description": "Clear console buffer"},
		{"name": "webview_click", "description": "Click element"},
		{"name": "webview_type", "description": "Type into element"},
		{"name": "webview_query", "description": "Query DOM elements"},
		{"name": "webview_navigate", "description": "Navigate to URL"},
		{"name": "webview_source", "description": "Get page source"},
		{"name": "webview_url", "description": "Get current page URL"},
		{"name": "webview_title", "description": "Get current page title"},
		{"name": "webview_screenshot", "description": "Capture page as base64 PNG"},
		{"name": "webview_screenshot_element", "description": "Capture specific element as PNG"},
		{"name": "webview_scroll", "description": "Scroll to element or position"},
		{"name": "webview_hover", "description": "Hover over element"},
		{"name": "webview_select", "description": "Select option in dropdown"},
		{"name": "webview_check", "description": "Check/uncheck checkbox or radio"},
		{"name": "webview_element_info", "description": "Get detailed info about element"},
		{"name": "webview_computed_style", "description": "Get computed styles for element"},
		{"name": "webview_highlight", "description": "Visually highlight element"},
		{"name": "webview_dom_tree", "description": "Get DOM tree structure"},
		{"name": "webview_errors", "description": "Get captured error messages"},
		{"name": "webview_performance", "description": "Get performance metrics"},
		{"name": "webview_resources", "description": "List loaded resources"},
		{"name": "webview_network", "description": "Get network requests log"},
		{"name": "webview_network_clear", "description": "Clear network request log"},
		{"name": "webview_network_inject", "description": "Inject network interceptor for detailed logging"},
		{"name": "webview_pdf", "description": "Export page as PDF (base64 data URI)"},
		{"name": "webview_print", "description": "Open print dialog for window"},
		// Window/Display control (native app control)
		{"name": "window_list", "description": "List all windows with positions"},
		{"name": "window_get", "description": "Get info about a specific window"},
		{"name": "window_create", "description": "Create a new window at specific position"},
		{"name": "window_close", "description": "Close a window by name"},
		{"name": "window_position", "description": "Move a window to specific coordinates"},
		{"name": "window_size", "description": "Resize a window"},
		{"name": "window_bounds", "description": "Set position and size in one call"},
		{"name": "window_maximize", "description": "Maximize a window"},
		{"name": "window_minimize", "description": "Minimize a window"},
		{"name": "window_restore", "description": "Restore from maximized/minimized"},
		{"name": "window_focus", "description": "Bring window to front"},
		{"name": "window_focused", "description": "Get currently focused window"},
		{"name": "window_visibility", "description": "Show or hide a window"},
		{"name": "window_always_on_top", "description": "Pin window above others"},
		{"name": "window_title", "description": "Change window title"},
		{"name": "window_title_get", "description": "Get current window title"},
		{"name": "window_fullscreen", "description": "Toggle fullscreen mode"},
		{"name": "screen_list", "description": "List all screens/monitors"},
		{"name": "screen_get", "description": "Get specific screen by ID"},
		{"name": "screen_primary", "description": "Get primary screen info"},
		{"name": "screen_at_point", "description": "Get screen containing a point"},
		{"name": "screen_for_window", "description": "Get screen a window is on"},
		{"name": "screen_work_areas", "description": "Get usable screen space (excluding dock/menubar)"},
		// Layout management
		{"name": "layout_save", "description": "Save current window arrangement with a name"},
		{"name": "layout_restore", "description": "Restore a saved layout by name"},
		{"name": "layout_list", "description": "List all saved layouts"},
		{"name": "layout_delete", "description": "Delete a saved layout"},
		{"name": "layout_get", "description": "Get details of a specific layout"},
		{"name": "layout_tile", "description": "Auto-tile windows (left/right/grid/quadrants)"},
		{"name": "layout_snap", "description": "Snap window to screen edge/corner"},
		{"name": "layout_stack", "description": "Stack windows in cascade pattern"},
		{"name": "layout_workflow", "description": "Apply preset workflow layout (coding/debugging/presenting)"},
		// System tray
		{"name": "tray_set_icon", "description": "Set system tray icon"},
		{"name": "tray_set_tooltip", "description": "Set system tray tooltip"},
		{"name": "tray_set_label", "description": "Set system tray label"},
		{"name": "tray_set_menu", "description": "Set system tray menu items"},
		{"name": "tray_info", "description": "Get system tray info"},
		// Window background colour (for transparency)
		{"name": "window_background_colour", "description": "Set window background colour with alpha"},
		// System integration
		{"name": "clipboard_read", "description": "Read text from system clipboard"},
		{"name": "clipboard_write", "description": "Write text to system clipboard"},
		{"name": "clipboard_has", "description": "Check if clipboard has content"},
		{"name": "clipboard_clear", "description": "Clear the clipboard"},
		{"name": "notification_show", "description": "Show native system notification"},
		{"name": "notification_permission_request", "description": "Request notification permission"},
		{"name": "notification_permission_check", "description": "Check notification permission status"},
		{"name": "theme_get", "description": "Get current system theme (dark/light)"},
		{"name": "theme_system", "description": "Get system theme preference"},
		{"name": "focus_set", "description": "Set focus to specific window"},
		// Dialogs
		{"name": "dialog_open_file", "description": "Show file open dialog"},
		{"name": "dialog_save_file", "description": "Show file save dialog"},
		{"name": "dialog_open_directory", "description": "Show directory picker"},
		{"name": "dialog_confirm", "description": "Show confirmation dialog (yes/no)"},
		{"name": "dialog_prompt", "description": "Show input prompt dialog (not supported natively)"},
		// Event subscriptions (WebSocket)
		{"name": "event_info", "description": "Get WebSocket event server info and connected clients"},
	}
}
