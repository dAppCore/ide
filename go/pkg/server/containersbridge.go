// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// containersBridge — typed wails wrapper over MCPBridge container_*
// tools (runtime detection, list, logs).
type containersBridge struct {
	core *core.Core
}

type ContainerRuntime struct {
	Name                string `json:"name"`
	Available           bool   `json:"available"`
	Version             string `json:"version,omitempty"`
	Path                string `json:"path,omitempty"`
	Description         string `json:"description"`
	HasGPU              bool   `json:"has_gpu"`
	HasNetworkIsolation bool   `json:"has_network_isolation"`
	HasVolumeMounts     bool   `json:"has_volume_mounts"`
	HasEncryption       bool   `json:"has_encryption"`
	HardwareIsolated    bool   `json:"hardware_isolated"`
	SubSecondStart      bool   `json:"sub_second_start"`
}

type ContainerEntry struct {
	ID      string `json:"id"`
	Name    string `json:"name,omitempty"`
	Image   string `json:"image"`
	Status  string `json:"status"`
	Runtime string `json:"runtime"`
	Created string `json:"created,omitempty"`
}

type ContainerDetectInput struct {
	Force bool `json:"force,omitempty"`
}

type ContainerDetectOutput struct {
	OK        bool               `json:"ok"`
	Runtimes  []ContainerRuntime `json:"runtimes,omitempty"`
	Available []ContainerRuntime `json:"available,omitempty"`
	CacheHit  bool               `json:"cache_hit,omitempty"`
	CacheAgeS int                `json:"cache_age_s,omitempty"`
	Error     string             `json:"error,omitempty"`
}

type ContainerListInput struct {
	Runtime string `json:"runtime,omitempty"`
}

type ContainerListOutput struct {
	OK         bool             `json:"ok"`
	Containers []ContainerEntry `json:"containers,omitempty"`
	Count      int              `json:"count,omitempty"`
	Error      string           `json:"error,omitempty"`
}

type ContainerLogsInput struct {
	ID      string `json:"id"`
	Runtime string `json:"runtime,omitempty"`
	Tail    int    `json:"tail,omitempty"`
}

type ContainerLogsOutput struct {
	OK      bool   `json:"ok"`
	ID      string `json:"id,omitempty"`
	Runtime string `json:"runtime,omitempty"`
	Logs    string `json:"logs,omitempty"`
	Output  string `json:"output,omitempty"`
	Error   string `json:"error,omitempty"`
}

func (b *containersBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func decodeContainerRuntimes(raw any) []ContainerRuntime {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]ContainerRuntime, 0, len(list))
	for _, item := range list {
		rm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		r := ContainerRuntime{}
		if s, ok := rm["name"].(string); ok {
			r.Name = s
		}
		if v, ok := rm["available"].(bool); ok {
			r.Available = v
		}
		if s, ok := rm["version"].(string); ok {
			r.Version = s
		}
		if s, ok := rm["path"].(string); ok {
			r.Path = s
		}
		if s, ok := rm["description"].(string); ok {
			r.Description = s
		}
		if v, ok := rm["has_gpu"].(bool); ok {
			r.HasGPU = v
		}
		if v, ok := rm["has_network_isolation"].(bool); ok {
			r.HasNetworkIsolation = v
		}
		if v, ok := rm["has_volume_mounts"].(bool); ok {
			r.HasVolumeMounts = v
		}
		if v, ok := rm["has_encryption"].(bool); ok {
			r.HasEncryption = v
		}
		if v, ok := rm["hardware_isolated"].(bool); ok {
			r.HardwareIsolated = v
		}
		if v, ok := rm["sub_second_start"].(bool); ok {
			r.SubSecondStart = v
		}
		out = append(out, r)
	}
	return out
}

func decodeContainerEntries(raw any) []ContainerEntry {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]ContainerEntry, 0, len(list))
	for _, item := range list {
		em, ok := item.(map[string]any)
		if !ok {
			continue
		}
		e := ContainerEntry{}
		if s, ok := em["id"].(string); ok {
			e.ID = s
		}
		if s, ok := em["name"].(string); ok {
			e.Name = s
		}
		if s, ok := em["image"].(string); ok {
			e.Image = s
		}
		if s, ok := em["status"].(string); ok {
			e.Status = s
		}
		if s, ok := em["runtime"].(string); ok {
			e.Runtime = s
		}
		if s, ok := em["created"].(string); ok {
			e.Created = s
		}
		out = append(out, e)
	}
	return out
}

func (b *containersBridge) Detect(input ContainerDetectInput) (ContainerDetectOutput, error) {
	m := b.mcp()
	if m == nil {
		return ContainerDetectOutput{}, core.E("ide.server.Containers.Detect", "mcp bridge unavailable", nil)
	}
	raw := m.toolContainerDetect(nil, map[string]any{"force": input.Force})
	out := ContainerDetectOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if v, ok := value["cache_hit"].(bool); ok {
		out.CacheHit = v
	}
	if n, ok := value["cache_age_s"].(float64); ok {
		out.CacheAgeS = int(n)
	}
	out.Runtimes = decodeContainerRuntimes(value["runtimes"])
	out.Available = decodeContainerRuntimes(value["available"])
	return out, nil
}

func (b *containersBridge) List(ctx context.Context, input ContainerListInput) (ContainerListOutput, error) {
	m := b.mcp()
	if m == nil {
		return ContainerListOutput{}, core.E("ide.server.Containers.List", "mcp bridge unavailable", nil)
	}
	raw := m.toolContainerList(ctx, map[string]any{"runtime": input.Runtime})
	out := ContainerListOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value != nil {
		if n, ok := value["count"].(float64); ok {
			out.Count = int(n)
		}
		out.Containers = decodeContainerEntries(value["containers"])
	}
	return out, nil
}

func (b *containersBridge) Logs(ctx context.Context, input ContainerLogsInput) (ContainerLogsOutput, error) {
	m := b.mcp()
	if m == nil {
		return ContainerLogsOutput{}, core.E("ide.server.Containers.Logs", "mcp bridge unavailable", nil)
	}
	params := map[string]any{
		"id":      input.ID,
		"runtime": input.Runtime,
	}
	if input.Tail > 0 {
		params["tail"] = input.Tail
	}
	raw := m.toolContainerLogs(ctx, params)
	out := ContainerLogsOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if s, _ := raw["output"].(string); s != "" {
		out.Output = s
	}
	value, _ := raw["value"].(map[string]any)
	if value != nil {
		if s, ok := value["id"].(string); ok {
			out.ID = s
		}
		if s, ok := value["runtime"].(string); ok {
			out.Runtime = s
		}
		if s, ok := value["logs"].(string); ok {
			out.Logs = s
		}
	}
	return out, nil
}
