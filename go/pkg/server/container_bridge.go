// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

// container_* bridge tools — IDE surface over the canonical core/go-container
// runtime. v1 mirrors go-container's Detect / DetectAll / List shape via shell
// probes against installed binaries. v2 will swap to direct imports of
// dappco.re/go/container once it's in the IDE's go.work.
//
// The tool surface is shaped to match what go-container exposes — runtime
// capabilities (GPU, NetworkIsolation, HardwareIsolation, etc.) and the
// Container struct (id, name, image, status, ports). Same UI works in both
// implementations.

// ContainerRuntimeInfo describes a detected container runtime + its
// capabilities. Mirrors core/go-container's ContainerRuntime shape.
type ContainerRuntimeInfo struct {
	Name                string `json:"name"`
	Available           bool   `json:"available"`
	Version             string `json:"version,omitempty"`
	Path                string `json:"path,omitempty"`
	HasGPU              bool   `json:"has_gpu"`
	HasNetworkIsolation bool   `json:"has_network_isolation"`
	HasVolumeMounts     bool   `json:"has_volume_mounts"`
	HasEncryption       bool   `json:"has_encryption"`
	HardwareIsolated    bool   `json:"hardware_isolated"`
	SubSecondStart      bool   `json:"sub_second_start"`
	Description         string `json:"description"`
}

// ContainerInfo mirrors core/go-container's Container struct, JSON-shaped
// for the IDE's surface. v1 populates by parsing `docker ps --format` etc.;
// v2 reads from go-container's State.
type ContainerInfo struct {
	ID      string         `json:"id"`
	Name    string         `json:"name,omitempty"`
	Image   string         `json:"image"`
	Status  string         `json:"status"`
	Runtime string         `json:"runtime"`
	Ports   map[string]int `json:"ports,omitempty"`
	Created string         `json:"created,omitempty"`
}

// toolContainerDetect returns the list of runtimes installed on this host
// plus their capabilities. Drives the Containers panel header.
func (b *MCPBridge) toolContainerDetect(_ context.Context, _ map[string]any) map[string]any {
	runtimes := []ContainerRuntimeInfo{
		probeDocker(),
		probePodman(),
		probeLinuxKit(),
		probeQEMU(),
		probeAppleContainer(),
	}
	available := []ContainerRuntimeInfo{}
	for _, rt := range runtimes {
		if rt.Available {
			available = append(available, rt)
		}
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"runtimes":  runtimes,
			"available": available,
		},
	}
}

// toolContainerList enumerates running containers across detected runtimes.
// v1 shells out to `docker ps` / `podman ps`; LinuxKit + Apple containers
// are managed via go-container's State and surface via that path in v2.
func (b *MCPBridge) toolContainerList(ctx context.Context, params map[string]any) map[string]any {
	runtimeFilter := paramString(params, "runtime", "")
	out := []ContainerInfo{}

	if runtimeFilter == "" || runtimeFilter == "docker" {
		out = append(out, listDockerContainers(ctx)...)
	}
	if runtimeFilter == "" || runtimeFilter == "podman" {
		out = append(out, listPodmanContainers(ctx)...)
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"containers": out,
			"count":      len(out),
		},
	}
}

// toolContainerLogs streams the last N lines of a container's logs.
// Bounded for v1 — for live tailing the frontend should poll.
func (b *MCPBridge) toolContainerLogs(ctx context.Context, params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	if id == "" {
		return errResp("id is required")
	}
	runtime := paramString(params, "runtime", "docker")
	tail := paramInt(params, "tail", 200)

	tailArg := "200"
	if tail > 0 {
		tailArg = jsonInt(tail)
	}

	c, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	switch runtime {
	case "docker":
		cmd = exec.CommandContext(c, "docker", "logs", "--tail", tailArg, id)
	case "podman":
		cmd = exec.CommandContext(c, "podman", "logs", "--tail", tailArg, id)
	default:
		return errResp("unsupported runtime: " + runtime)
	}
	output, err := cmd.CombinedOutput()
	if err != nil {
		return map[string]any{
			"ok":     false,
			"error":  err.Error(),
			"output": string(output),
		}
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"id":      id,
			"runtime": runtime,
			"logs":    string(output),
		},
	}
}

// --- runtime probes ---

func probeDocker() ContainerRuntimeInfo {
	info := ContainerRuntimeInfo{
		Name:                "docker",
		Description:         "Docker — OCI containers via Docker daemon",
		HasNetworkIsolation: true,
		HasVolumeMounts:     true,
	}
	if path, err := exec.LookPath("docker"); err == nil {
		info.Available = true
		info.Path = path
		info.Version = quickVersion("docker", "--version")
	}
	return info
}

func probePodman() ContainerRuntimeInfo {
	info := ContainerRuntimeInfo{
		Name:                "podman",
		Description:         "Podman — daemonless OCI containers (rootless capable)",
		HasNetworkIsolation: true,
		HasVolumeMounts:     true,
	}
	if path, err := exec.LookPath("podman"); err == nil {
		info.Available = true
		info.Path = path
		info.Version = quickVersion("podman", "--version")
	}
	return info
}

func probeLinuxKit() ContainerRuntimeInfo {
	info := ContainerRuntimeInfo{
		Name:                "linuxkit",
		Description:         "LinuxKit — image builder for portable Linux VMs",
		HasNetworkIsolation: true,
		HasVolumeMounts:     true,
		HardwareIsolated:    true,
	}
	if path, err := exec.LookPath("linuxkit"); err == nil {
		info.Available = true
		info.Path = path
		info.Version = quickVersion("linuxkit", "version")
	}
	return info
}

func probeQEMU() ContainerRuntimeInfo {
	info := ContainerRuntimeInfo{
		Name:                "qemu",
		Description:         "QEMU — full machine emulator + virtualiser",
		HasGPU:              true,
		HasNetworkIsolation: true,
		HasVolumeMounts:     true,
		HardwareIsolated:    true,
	}
	if path, err := exec.LookPath("qemu-system-x86_64"); err == nil {
		info.Available = true
		info.Path = path
		info.Version = quickVersion("qemu-system-x86_64", "--version")
	}
	return info
}

func probeAppleContainer() ContainerRuntimeInfo {
	info := ContainerRuntimeInfo{
		Name:                "apple",
		Description:         "Apple Native Containers — macOS 15.4+ Container.framework",
		HasNetworkIsolation: true,
		HasVolumeMounts:     true,
		HardwareIsolated:    true,
		HasEncryption:       true,
		SubSecondStart:      true,
	}
	if path, err := exec.LookPath("container"); err == nil {
		info.Available = true
		info.Path = path
		info.Version = quickVersion("container", "--version")
	}
	return info
}

// --- container listing ---

func listDockerContainers(ctx context.Context) []ContainerInfo {
	c, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	cmd := exec.CommandContext(c, "docker", "ps", "--format",
		"{{json .}}", "--no-trunc")
	out, err := cmd.Output()
	if err != nil {
		return nil
	}
	var containers []ContainerInfo
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		var raw struct {
			ID      string `json:"ID"`
			Names   string `json:"Names"`
			Image   string `json:"Image"`
			Status  string `json:"Status"`
			Created string `json:"CreatedAt"`
			Ports   string `json:"Ports"`
		}
		if err := json.Unmarshal(scanner.Bytes(), &raw); err != nil {
			continue
		}
		containers = append(containers, ContainerInfo{
			ID:      shortID(raw.ID, 12),
			Name:    raw.Names,
			Image:   raw.Image,
			Status:  raw.Status,
			Runtime: "docker",
			Created: raw.Created,
		})
	}
	return containers
}

func listPodmanContainers(ctx context.Context) []ContainerInfo {
	c, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	cmd := exec.CommandContext(c, "podman", "ps", "--format", "json")
	out, err := cmd.Output()
	if err != nil {
		return nil
	}
	var raws []struct {
		ID     string   `json:"Id"`
		Names  []string `json:"Names"`
		Image  string   `json:"Image"`
		Status string   `json:"State"`
	}
	if err := json.Unmarshal(out, &raws); err != nil {
		return nil
	}
	containers := make([]ContainerInfo, 0, len(raws))
	for _, raw := range raws {
		name := ""
		if len(raw.Names) > 0 {
			name = raw.Names[0]
		}
		containers = append(containers, ContainerInfo{
			ID:      shortID(raw.ID, 12),
			Name:    name,
			Image:   raw.Image,
			Status:  raw.Status,
			Runtime: "podman",
		})
	}
	return containers
}

// --- helpers ---

func quickVersion(cmd string, flag string) string {
	c, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	out, err := exec.CommandContext(c, cmd, flag).CombinedOutput()
	if err != nil {
		return ""
	}
	first := strings.SplitN(string(out), "\n", 2)[0]
	return strings.TrimSpace(first)
}

func shortID(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

func jsonInt(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

// keep http import live (future: container exec via WS streaming)
var _ = http.StatusOK
