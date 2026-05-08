// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	core "dappco.re/go"
)

// ts_* bridge tools — TypeScript / Deno / JS project discovery surface.
// v1 walks the workspace looking for package.json or deno.json; classifies
// project (npm / deno / Angular / React / Vue / Lit / Vite / Next / etc.)
// from dependencies + scripts; exposes scripts as one-click runners that
// dispatch through process_start (output streams in /process panel).
//
// Pure file-probe — no core/ts dependency. When CoreTS sidecar wiring
// happens it lives in a separate lane (run TS modules in a sandboxed
// Deno Worker with permission gating).

type tsProject struct {
	Path           string   `json:"path"`
	Name           string   `json:"name"`
	Version        string   `json:"version"`
	Description    string   `json:"description"`
	PackageManager string   `json:"package_manager"`
	Frameworks     []string `json:"frameworks"`
	Scripts        []tsScript `json:"scripts"`
	Deno           bool     `json:"deno"`
	Workspace      bool     `json:"workspace"`
	HasNodeModules bool     `json:"has_node_modules"`
	HasLockfile    bool     `json:"has_lockfile"`
	HasTsconfig    bool     `json:"has_tsconfig"`
	Modified       string   `json:"modified"`
}

type tsScript struct {
	Name string `json:"name"`
	Cmd  string `json:"cmd"`
}

// toolTSDetect walks the user's Code roots looking for TS/JS/Deno projects.
// Skips node_modules / vendor / .git / build / dist. Returns one record
// per project found (project root = dir containing package.json or deno.json).
func (b *MCPBridge) toolTSDetect(_ context.Context, params map[string]any) map[string]any {
	roots := stringSliceParam(params, "roots")
	if len(roots) == 0 {
		home, err := os.UserHomeDir()
		if err == nil {
			roots = []string{
				filepath.Join(home, "Code", "core"),
				filepath.Join(home, "Code", "lab"),
				filepath.Join(home, "Code", "lthn"),
				filepath.Join(home, "Code", "host-uk"),
				filepath.Join(home, "Code", "snider"),
			}
		}
	}
	maxDepth := paramInt(params, "max_depth", 3)
	if maxDepth <= 0 {
		maxDepth = 3
	}
	force := paramBool(params, "force", false)
	const collection = "ts_projects"
	const ttl = 10 * time.Minute // longer TTL — TS projects don't appear/vanish often

	scan := func() ([]tsProject, error) {
		var projects []tsProject
		for _, root := range roots {
			_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				if !d.IsDir() {
					return nil
				}
				rel, _ := filepath.Rel(root, path)
				depth := strings.Count(rel, string(os.PathSeparator))
				name := d.Name()
				if name == "node_modules" || name == "vendor" || name == ".git" || name == "build" || name == "dist" || name == ".next" || name == ".turbo" {
					return filepath.SkipDir
				}
				if depth > maxDepth {
					return filepath.SkipDir
				}

				pkgPath := filepath.Join(path, "package.json")
				denoPath := filepath.Join(path, "deno.json")
				hasPkg := fileExists(pkgPath)
				hasDeno := fileExists(denoPath)
				if !hasPkg && !hasDeno {
					return nil
				}

				proj := buildTSProject(path, hasPkg, hasDeno)
				if proj == nil {
					return nil
				}
				projects = append(projects, *proj)
				// Don't recurse into the project's sub-dirs — keeps monorepo
				// children visible only when the parent declares workspaces.
				return filepath.SkipDir
			})
		}
		return projects, nil
	}

	raws, hit, err := cacheGetOrScan(collection, ttl, force, func(p tsProject) string { return p.Path }, scan)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	projects := make([]tsProject, 0, len(raws))
	for _, r := range raws {
		var p tsProject
		if err := json.Unmarshal(r, &p); err == nil {
			projects = append(projects, p)
		}
	}
	sort.Slice(projects, func(i, j int) bool {
		return projects[i].Path < projects[j].Path
	})
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"roots":       roots,
			"projects":    projects,
			"count":       len(projects),
			"cache_hit":   hit,
			"cache_age_s": int(cacheAge(collection).Seconds()),
		},
	}
}

// toolTSScript runs a script for a project via process_start. Forwards to
// the existing process tool so the output streams in /process.
func (b *MCPBridge) toolTSScript(ctx context.Context, params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	script := paramString(params, "script", "")
	pm := paramString(params, "package_manager", "npm")
	if path == "" || script == "" {
		return errResp("path + script required")
	}
	cmd := pm + " run " + script
	if pm == "deno" {
		cmd = "deno task " + script
	}
	procParams := map[string]any{
		"command": "sh",
		"args":    []any{"-c", "cd '" + path + "' && " + cmd},
	}
	return b.toolProcessStart(ctx, procParams)
}

func buildTSProject(path string, hasPkg, hasDeno bool) *tsProject {
	proj := &tsProject{
		Path: path,
		Name: filepath.Base(path),
		Deno: hasDeno && !hasPkg,
	}
	if info, err := os.Stat(path); err == nil {
		proj.Modified = info.ModTime().Format("2006-01-02")
	}

	// Lockfile + node_modules + tsconfig
	for _, f := range []string{"pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb", "deno.lock"} {
		if fileExists(filepath.Join(path, f)) {
			proj.HasLockfile = true
			break
		}
	}
	proj.HasNodeModules = dirExists(filepath.Join(path, "node_modules"))
	proj.HasTsconfig = fileExists(filepath.Join(path, "tsconfig.json")) ||
		fileExists(filepath.Join(path, "tsconfig.app.json")) ||
		fileExists(filepath.Join(path, "tsconfig.base.json"))

	if hasDeno {
		parseDenoConfig(filepath.Join(path, "deno.json"), proj)
	}
	if hasPkg {
		parsePackageJSON(filepath.Join(path, "package.json"), proj)
	}

	// Package manager detection — lock files are authoritative
	switch {
	case fileExists(filepath.Join(path, "pnpm-lock.yaml")):
		proj.PackageManager = "pnpm"
	case fileExists(filepath.Join(path, "yarn.lock")):
		proj.PackageManager = "yarn"
	case fileExists(filepath.Join(path, "bun.lockb")):
		proj.PackageManager = "bun"
	case fileExists(filepath.Join(path, "deno.lock")) || hasDeno:
		proj.PackageManager = "deno"
	default:
		proj.PackageManager = "npm"
	}

	// Project name fallback
	if proj.Name == "" {
		proj.Name = filepath.Base(path)
	}
	return proj
}

func parsePackageJSON(path string, proj *tsProject) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	var pkg struct {
		Name        string            `json:"name"`
		Version     string            `json:"version"`
		Description string            `json:"description"`
		Scripts     map[string]string `json:"scripts"`
		Workspaces  any               `json:"workspaces"`
		Deps        map[string]string `json:"dependencies"`
		DevDeps     map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return
	}
	if pkg.Name != "" {
		proj.Name = pkg.Name
	}
	proj.Version = pkg.Version
	proj.Description = pkg.Description
	proj.Workspace = pkg.Workspaces != nil
	for k, v := range pkg.Scripts {
		proj.Scripts = append(proj.Scripts, tsScript{Name: k, Cmd: v})
	}
	sort.Slice(proj.Scripts, func(i, j int) bool {
		return proj.Scripts[i].Name < proj.Scripts[j].Name
	})

	// Framework detection from deps + devDeps
	all := map[string]string{}
	for k, v := range pkg.Deps {
		all[k] = v
	}
	for k, v := range pkg.DevDeps {
		all[k] = v
	}
	checks := []struct{ key, label string }{
		{"@angular/core", "Angular"},
		{"react", "React"},
		{"vue", "Vue"},
		{"svelte", "Svelte"},
		{"solid-js", "Solid"},
		{"lit", "Lit"},
		{"next", "Next.js"},
		{"nuxt", "Nuxt"},
		{"vite", "Vite"},
		{"@nestjs/core", "NestJS"},
		{"electron", "Electron"},
		{"@wailsio/runtime", "Wails"},
		{"playwright", "Playwright"},
		{"vitest", "Vitest"},
		{"jest", "Jest"},
		{"typescript", "TypeScript"},
	}
	for _, c := range checks {
		if _, ok := all[c.key]; ok {
			proj.Frameworks = append(proj.Frameworks, c.label)
		}
	}
}

func parseDenoConfig(path string, proj *tsProject) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	var cfg struct {
		Name    string            `json:"name"`
		Version string            `json:"version"`
		Tasks   map[string]string `json:"tasks"`
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return
	}
	if cfg.Name != "" {
		proj.Name = cfg.Name
	}
	if cfg.Version != "" {
		proj.Version = cfg.Version
	}
	for k, v := range cfg.Tasks {
		proj.Scripts = append(proj.Scripts, tsScript{Name: k, Cmd: v})
	}
	sort.Slice(proj.Scripts, func(i, j int) bool {
		return proj.Scripts[i].Name < proj.Scripts[j].Name
	})
	proj.Frameworks = append(proj.Frameworks, "Deno")
}

// keep core import live (future: c.Action dispatch)
var _ = core.E
