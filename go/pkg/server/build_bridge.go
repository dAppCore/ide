// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	core "dappco.re/go"
)

// build_* bridge tools — the IDE's Build panel surfaces over canonical
// go-build pipeline. v1 mirrors go-build/internal/projectdetect's marker
// logic locally (go.mod / wails.json / Dockerfile / CMakeLists.txt /
// Taskfile.yaml / .core/build.yaml) and shells out to whatever build
// binary's available (`core build` if on PATH, else `go build ./...`).
//
// When core/go-build's pkg/build surface is published as a Go module the
// IDE can import + dispatch via c.Action("build.run") instead of process
// spawn — same UI surface, swap the dispatch.

// toolBuildDetect inspects a workspace root and returns the detected
// project type plus the recommended build command. No process spawn —
// pure file-system probing.
func (b *MCPBridge) toolBuildDetect(_ context.Context, params map[string]any) map[string]any {
	root := paramString(params, "path", "")
	if root == "" {
		return errResp("path is required")
	}
	info, err := os.Stat(root)
	if err != nil || !info.IsDir() {
		return errResp("path is not a directory: " + root)
	}

	// DuckDB cache — keyed per-path (each workspace gets its own entry,
	// so detection results for /Users/snider/Code/core and /Code/lthn
	// don't trample). TTL 5min; build markers don't change often.
	const collection = "build_detect"
	const ttl = 5 * time.Minute
	force := paramBool(params, "force", false)

	if !force && cacheAge(collection) < ttl {
		_, raws, hit := cacheGetCollection(collection)
		if hit {
			for _, r := range raws {
				var entry map[string]any
				if err := json.Unmarshal(r, &entry); err != nil {
					continue
				}
				if p, _ := entry["path"].(string); p == root {
					entry["cache_hit"] = true
					entry["cache_age_s"] = int(cacheAge(collection).Seconds())
					return map[string]any{"ok": true, "value": entry}
				}
			}
		}
	}

	kind, command, args := detectProject(root)
	hasCoreBin := false
	if _, err := exec.LookPath("core"); err == nil {
		hasCoreBin = true
	}

	value := map[string]any{
		"path":             root,
		"project_type":     kind,
		"command":          command,
		"args":             args,
		"core_bin_on_path": hasCoreBin,
	}

	// Refresh just this path's entry — preserve other paths' cached data.
	_, raws, _ := cacheGetCollection(collection)
	cacheItems := make([]cacheItem, 0, len(raws)+1)
	for _, r := range raws {
		var entry map[string]any
		if err := json.Unmarshal(r, &entry); err != nil {
			continue
		}
		if p, _ := entry["path"].(string); p != root {
			cacheItems = append(cacheItems, cacheItem{Key: p, Data: entry})
		}
	}
	cacheItems = append(cacheItems, cacheItem{Key: root, Data: value})
	_ = cacheSetCollection(collection, cacheItems)

	out := map[string]any{}
	for k, v := range value {
		out[k] = v
	}
	out["cache_hit"] = false
	out["cache_age_s"] = 0
	return map[string]any{"ok": true, "value": out}
}

// toolBuildRun spawns the build command for a workspace via the existing
// process.Service. Returns the spawned process_id which can be polled
// with process_output / killed with process_stop. Stream-friendly.
func (b *MCPBridge) toolBuildRun(ctx context.Context, params map[string]any) map[string]any {
	root := paramString(params, "path", "")
	if root == "" {
		return errResp("path is required")
	}
	command := paramString(params, "command", "")
	rawArgs := stringSliceParam(params, "args")
	if command == "" {
		_, autoCmd, autoArgs := detectProject(root)
		command = autoCmd
		if len(rawArgs) == 0 {
			rawArgs = autoArgs
		}
	}
	if command == "" {
		return errResp("could not detect a build command for: " + root)
	}

	// Defer to the existing process_start tool — same path the rest of
	// the IDE uses. Wrap the args as []any for paramSlice friendliness.
	procParams := map[string]any{
		"command": command,
		"cwd":     root,
	}
	if len(rawArgs) > 0 {
		anyArgs := make([]any, len(rawArgs))
		for i, a := range rawArgs {
			anyArgs[i] = a
		}
		procParams["args"] = anyArgs
	}
	resp := b.toolProcessStart(ctx, procParams)
	if ok, _ := resp["ok"].(bool); !ok {
		return resp
	}
	resp["build_command"] = command
	resp["build_args"] = rawArgs
	return resp
}

// detectProject mirrors core/go-build's projectdetect logic at a high
// level — checks for marker files in priority order, returns the project
// type + the canonical invocation. Keeps the IDE's Build panel consistent
// with what `core build` would do without needing to import the package.
//
// When `core` binary is on PATH it always wins (delegates to go-build).
// Without it the detector picks a sensible fallback per project type.
func detectProject(root string) (kind, command string, args []string) {
	core := hasCore()
	// .core/build.yaml wins — explicit project config. With core binary,
	// `core build` reads the config; without, fall through to per-marker.
	hasConfig := exists(filepath.Join(root, ".core", "build.yaml"))
	if hasConfig && core {
		return "config", "core", []string{"build"}
	}
	// Wails — desktop app
	if exists(filepath.Join(root, "wails.json")) {
		if core {
			return "wails", "core", []string{"build"}
		}
		return "wails", "wails", []string{"build"}
	}
	// Go module — direct or in canonical go/ subdir. Embed absolute paths
	// in the sh -c form so process_start doesn't need cwd support.
	if exists(filepath.Join(root, "go.mod")) {
		if core {
			return "go", "core", []string{"build"}
		}
		return "go", "sh", []string{"-c", "cd " + shellQuote(root) + " && go build -o /dev/null ./..."}
	}
	if exists(filepath.Join(root, "go", "go.mod")) {
		if core {
			return "go-subdir", "core", []string{"build"}
		}
		return "go-subdir", "sh", []string{"-c", "cd " + shellQuote(filepath.Join(root, "go")) + " && go build -o /dev/null ./..."}
	}
	// go.work workspace
	if exists(filepath.Join(root, "go.work")) {
		if core {
			return "go-work", "core", []string{"build"}
		}
		return "go-work", "sh", []string{"-c", "cd " + shellQuote(root) + " && go build -o /dev/null ./..."}
	}
	// Docker
	if exists(filepath.Join(root, "Dockerfile")) {
		if core {
			return "docker", "core", []string{"build"}
		}
		return "docker", "docker", []string{"build", "."}
	}
	// CMake / C++
	if exists(filepath.Join(root, "CMakeLists.txt")) {
		return "cpp", "cmake", []string{"--build", "build"}
	}
	// Taskfile
	if exists(filepath.Join(root, "Taskfile.yaml")) || exists(filepath.Join(root, "Taskfile.yml")) {
		return "taskfile", "task", []string{"build"}
	}
	// composer.json / Laravel — common in Lethean repos
	if exists(filepath.Join(root, "composer.json")) {
		return "php", "composer", []string{"install"}
	}
	// package.json — frontend / npm
	if exists(filepath.Join(root, "package.json")) {
		return "node", "npm", []string{"run", "build"}
	}
	if hasConfig {
		// Last resort: config exists but no recognised markers — surface
		// the config but no command, UI shows "needs core binary".
		return "config", "", nil
	}
	return "unknown", "", nil
}

func hasCore() bool {
	_, err := exec.LookPath("core")
	return err == nil
}

func coreBin() string {
	if hasCore() {
		return "core"
	}
	// Fallback: try `go run` of the build cmd. Best-effort — caller can
	// override via the command param.
	return "go"
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// shellQuote single-quotes a path for safe inclusion in `sh -c "..."`
// invocations. Only escapes single quotes within the path; other shell
// metacharacters are neutralised by the surrounding quotes.
func shellQuote(s string) string {
	if s == "" {
		return "''"
	}
	out := "'"
	for _, r := range s {
		if r == '\'' {
			out += `'\''`
		} else {
			out += string(r)
		}
	}
	out += "'"
	return out
}

// keep core import live — used by future c.Action dispatch when go-build
// publishes its pkg/build surface.
var _ = core.Trim
