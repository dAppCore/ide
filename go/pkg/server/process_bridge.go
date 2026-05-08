// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"syscall"

	core "dappco.re/go"
	"dappco.re/go/process"
)

// process_* extra bridge tools that wrap parts of go-process the IDE
// hadn't surfaced yet. process_start / list / output / kill already exist
// in mcp_bridge.go; this file adds the daemon-registry view + extended
// signal / input / remove operations + duration enrichment for the
// /process panel's UI.

// toolProcessManagedList returns the same data process_list returns, plus
// duration + pid + ringbuffer-size enrichment for nicer UI rendering.
// Bridge tools shadow each other — this is the panel's preferred reader.
func (b *MCPBridge) toolProcessManagedList(_ context.Context, _ map[string]any) map[string]any {
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	procs := svc.List()
	out := make([]map[string]any, 0, len(procs))
	for _, p := range procs {
		info := p.Info()
		row := map[string]any{
			"id":         p.ID,
			"command":    p.Command,
			"args":       p.Args,
			"dir":        p.Dir,
			"status":     string(p.Status),
			"started_at": p.StartedAt,
			"exit_code":  p.ExitCode,
			"duration_ms": p.Duration.Milliseconds(),
			"pid":         info.PID,
		}
		out = append(out, row)
	}
	return map[string]any{"ok": true, "value": map[string]any{
		"processes": out,
		"count":     len(out),
	}}
}

// toolProcessManagedSignal sends a named signal to a managed process.
// name: "term" (default) | "kill" | "hup" | "int" | "usr1" | "usr2".
func (b *MCPBridge) toolProcessManagedSignal(_ context.Context, params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	if id == "" {
		return errResp("id required")
	}
	name := paramString(params, "signal", "term")
	sig := signalForName(name)
	if sig == 0 {
		return errResp("unknown signal: " + name)
	}
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	return resultToResponse(svc.Signal(id, sig))
}

// toolProcessManagedRemove drops an exited process from the registry.
// Acts on stopped processes only — running ones must be killed first.
func (b *MCPBridge) toolProcessManagedRemove(_ context.Context, params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	if id == "" {
		return errResp("id required")
	}
	svc := b.processService()
	if svc == nil {
		return errResp("process service unavailable")
	}
	return resultToResponse(svc.Remove(id))
}

// toolProcessManagedInput writes to a running process's stdin.
func (b *MCPBridge) toolProcessManagedInput(_ context.Context, params map[string]any) map[string]any {
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

// toolProcessDaemonsList returns the cross-process daemon registry —
// JSON files written under ~/.core/daemons/ by other Lethean services
// when they start as daemons. Surfaces PID, health URL, project, etc.
func (b *MCPBridge) toolProcessDaemonsList(_ context.Context, _ map[string]any) map[string]any {
	reg := process.DefaultRegistry()
	if reg == nil {
		return errResp("daemon registry unavailable")
	}
	listRes := reg.List()
	if !listRes.OK {
		return resultToResponse(listRes)
	}
	entries, _ := listRes.Value.([]process.DaemonEntry)
	out := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		out = append(out, map[string]any{
			"code":    e.Code,
			"daemon":  e.Daemon,
			"pid":     e.PID,
			"health":  e.Health,
			"project": e.Project,
			"binary":  e.Binary,
			"started": e.Started,
			"alive":   pidAlive(e.PID),
		})
	}
	return map[string]any{"ok": true, "value": map[string]any{
		"daemons": out,
		"count":   len(out),
	}}
}

// signalForName maps friendly signal names to syscall.Signal values.
func signalForName(name string) syscall.Signal {
	switch name {
	case "term", "TERM", "sigterm":
		return syscall.SIGTERM
	case "kill", "KILL", "sigkill":
		return syscall.SIGKILL
	case "hup", "HUP", "sighup":
		return syscall.SIGHUP
	case "int", "INT", "sigint":
		return syscall.SIGINT
	case "usr1", "USR1":
		return syscall.SIGUSR1
	case "usr2", "USR2":
		return syscall.SIGUSR2
	}
	return 0
}

// pidAlive checks whether a PID is currently a live process. Best-effort
// — sends signal 0 (Posix existence check) and reports the result.
func pidAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	// process.Service has nothing for this; use the canonical Posix probe.
	// signal 0 is "no-op + report errno" in Posix.
	err := syscall.Kill(pid, 0)
	return err == nil
}

// Keep core import live (future: Action-dispatched calls)
var _ = core.E
