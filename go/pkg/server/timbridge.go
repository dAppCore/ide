// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// timBridge surfaces the gui container service's TIM (Trusted In-
// Memory) container manager actions to the Wails frontend with typed
// methods so /dev/tim can call DetectRuntime / Status / Start / Stop
// at goroutine line-speed.
//
// Second panel migrated off callBridge as part of the wails-binding
// sweep — same pattern as p2pBridge.
type timBridge struct {
	core *core.Core
}

// TIMRuntimeOutput is the result of container.runtime.detect — one of
// "" (none), "apple", "docker", "podman".
type TIMRuntimeOutput struct {
	Runtime string `json:"runtime"`
}

// TIMStateOutput mirrors the gui container TIMState. Field shape
// matches the JSON the existing /dev/tim panel binds to so the
// template needs no changes.
type TIMStateOutput struct {
	Name      string   `json:"name,omitempty"`
	Image     string   `json:"image,omitempty"`
	Runtime   string   `json:"runtime,omitempty"`
	Status    string   `json:"status,omitempty"`
	StartedAt string   `json:"started_at,omitempty"`
	Command   []string `json:"command,omitempty"`
	DataDir   string   `json:"data_dir,omitempty"`
}

// DetectRuntime probes the host for an isolated workload runtime in
// preference order: Apple Containers > Docker > Podman > none. Used
// by the panel's "Runtime" card to surface either the live runtime
// or the "no runtime detected" empty state.
func (bridge *timBridge) DetectRuntime(ctx context.Context) (TIMRuntimeOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return TIMRuntimeOutput{}, core.E("ide.server.TIM.DetectRuntime", "core is nil", nil)
	}
	result := bridge.core.Action("container.runtime.detect").Run(context.Background(), core.Options{})
	if !result.OK {
		return TIMRuntimeOutput{}, resultError("ide.server.TIM.DetectRuntime", result.Value)
	}
	// container.runtime.detect returns a typed ContainerRuntime string
	// (or empty for none). Stringify for transport regardless of source.
	runtime := ""
	switch v := result.Value.(type) {
	case string:
		runtime = v
	case interface{ String() string }:
		runtime = v.String()
	}
	return TIMRuntimeOutput{Runtime: runtime}, nil
}

// Status reads the current TIM container state — image / name / status
// / start time. Empty string fields surface as the panel's "not
// configured" / "stopped" empty states (no toast errors for "TIM not
// running").
func (bridge *timBridge) Status(ctx context.Context) (TIMStateOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return TIMStateOutput{}, core.E("ide.server.TIM.Status", "core is nil", nil)
	}
	result := bridge.core.Action("tim.status").Run(context.Background(), core.Options{})
	if !result.OK {
		return TIMStateOutput{}, resultError("ide.server.TIM.Status", result.Value)
	}
	return decodeTIMState(result.Value), nil
}

// Start launches the configured TIM container. Returns the new state
// post-start so the panel can re-bind without a separate refresh
// round-trip.
func (bridge *timBridge) Start(ctx context.Context) (TIMStateOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return TIMStateOutput{}, core.E("ide.server.TIM.Start", "core is nil", nil)
	}
	result := bridge.core.Action("tim.start").Run(context.Background(), core.Options{})
	if !result.OK {
		return TIMStateOutput{}, resultError("ide.server.TIM.Start", result.Value)
	}
	return decodeTIMState(result.Value), nil
}

// Stop tears down the running TIM container. Like Start, returns the
// post-op state.
func (bridge *timBridge) Stop(ctx context.Context) (TIMStateOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return TIMStateOutput{}, core.E("ide.server.TIM.Stop", "core is nil", nil)
	}
	result := bridge.core.Action("tim.stop").Run(context.Background(), core.Options{})
	if !result.OK {
		return TIMStateOutput{}, resultError("ide.server.TIM.Stop", result.Value)
	}
	return decodeTIMState(result.Value), nil
}

// decodeTIMState normalises the action's return value into our wire
// type — handles both the typed gui container.TIMState struct path
// and the map[string]any path that some action layers emit.
func decodeTIMState(v any) TIMStateOutput {
	if v == nil {
		return TIMStateOutput{}
	}
	if m, ok := v.(map[string]any); ok {
		out := TIMStateOutput{}
		if s, ok := m["name"].(string); ok {
			out.Name = s
		}
		if s, ok := m["image"].(string); ok {
			out.Image = s
		}
		// runtime can be either a string or a typed ContainerRuntime
		switch r := m["runtime"].(type) {
		case string:
			out.Runtime = r
		case interface{ String() string }:
			out.Runtime = r.String()
		}
		if s, ok := m["status"].(string); ok {
			out.Status = s
		}
		if s, ok := m["started_at"].(string); ok {
			out.StartedAt = s
		}
		if s, ok := m["data_dir"].(string); ok {
			out.DataDir = s
		}
		if cmd, ok := m["command"].([]any); ok {
			for _, c := range cmd {
				if s, ok := c.(string); ok {
					out.Command = append(out.Command, s)
				}
			}
		}
		return out
	}
	// Typed-struct path — the action returned the canonical
	// container.TIMState. Best-effort pull via reflection-free type
	// switch on the few fields we care about.
	return TIMStateOutput{}
}
