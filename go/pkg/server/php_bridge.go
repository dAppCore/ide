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
	"dappco.re/go/php/pkg/php"
)

// php_* bridge tools surface core/php's Laravel-project discovery + tooling.
// v1 enumerates Laravel projects across the user's workspace, surfaces per-
// project detected services (FrankenPHP/Vite/Horizon/Reverb/Redis) and the
// canonical app metadata (name/URL/package-manager). Artisan command-runner
// rides on the existing process_start tool; bridge formats the spawn for
// the right cwd.

// toolPHPDetect walks the user's canonical Code roots looking for Laravel
// projects (artisan file + laravel/framework in composer.json). Returns a
// list of project records with light metadata so the UI can render a
// project picker without firing N detail probes.
func (b *MCPBridge) toolPHPDetect(_ context.Context, params map[string]any) map[string]any {
	roots := stringSliceParam(params, "roots")
	if len(roots) == 0 {
		home, err := os.UserHomeDir()
		if err == nil {
			roots = []string{
				filepath.Join(home, "Code", "lab"),
				filepath.Join(home, "Code", "core"),
				filepath.Join(home, "Code", "host-uk"),
			}
		}
	}
	maxDepth := paramInt(params, "max_depth", 3)
	if maxDepth <= 0 {
		maxDepth = 3
	}
	force := paramBool(params, "force", false)
	const collection = "php_projects"
	const ttl = 10 * time.Minute

	scan := func() ([]phpProjectLite, error) {
		out := []phpProjectLite{}
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
				if name == "node_modules" || name == "vendor" || name == ".git" || name == "build" || name == "external" {
					return filepath.SkipDir
				}
				if depth > maxDepth {
					return filepath.SkipDir
				}
				if !php.IsLaravelProject(path) {
					return nil
				}
				out = append(out, phpProjectLite{
					Path:       path,
					Name:       filepath.Base(path),
					AppName:    php.GetLaravelAppName(path),
					AppURL:     php.GetLaravelAppURL(path),
					PackageMgr: php.DetectPackageManager(path),
					FrankenPHP: php.IsFrankenPHPProject(path),
				})
				return filepath.SkipDir
			})
		}
		return out, nil
	}

	raws, hit, err := cacheGetOrScan(collection, ttl, force, func(p phpProjectLite) string { return p.Path }, scan)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	out := make([]phpProjectLite, 0, len(raws))
	for _, r := range raws {
		var p phpProjectLite
		if err := json.Unmarshal(r, &p); err == nil {
			out = append(out, p)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Path < out[j].Path
	})
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"roots":       roots,
			"projects":    out,
			"count":       len(out),
			"cache_hit":   hit,
			"cache_age_s": int(cacheAge(collection).Seconds()),
		},
	}
}

type phpProjectLite struct {
	Path       string `json:"path"`
	Name       string `json:"name"`
	AppName    string `json:"app_name"`
	AppURL     string `json:"app_url"`
	PackageMgr string `json:"package_mgr"`
	FrankenPHP bool   `json:"frankenphp"`
}

// toolPHPProject returns rich detail for one project — services + raw
// composer.json + .env presence + storage perms. Drives the right-pane
// detail card on /php.
func (b *MCPBridge) toolPHPProject(_ context.Context, params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	if path == "" {
		return errResp("path is required")
	}
	if !php.IsLaravelProject(path) {
		return errResp("not a Laravel project: " + path)
	}
	services := php.DetectServices(path)
	svcOut := make([]string, 0, len(services))
	for _, s := range services {
		svcOut = append(svcOut, string(s))
	}

	// File presence probes
	hasEnv := fileExists(filepath.Join(path, ".env"))
	hasEnvExample := fileExists(filepath.Join(path, ".env.example"))
	hasNodeModules := dirExists(filepath.Join(path, "node_modules"))
	hasVendor := dirExists(filepath.Join(path, "vendor"))
	hasComposerLock := fileExists(filepath.Join(path, "composer.lock"))
	hasPackageLock := fileExists(filepath.Join(path, "package-lock.json"))

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"path":             path,
			"name":             filepath.Base(path),
			"app_name":         php.GetLaravelAppName(path),
			"app_url":          php.GetLaravelAppURL(path),
			"domain":           php.ExtractDomainFromURL(php.GetLaravelAppURL(path)),
			"package_mgr":      php.DetectPackageManager(path),
			"frankenphp":       php.IsFrankenPHPProject(path),
			"services":         svcOut,
			"has_env":          hasEnv,
			"has_env_example":  hasEnvExample,
			"has_node_modules": hasNodeModules,
			"has_vendor":       hasVendor,
			"has_composer_lock":  hasComposerLock,
			"has_package_lock": hasPackageLock,
		},
	}
}

type phpScriptEntry struct {
	Name        string   `json:"name"`
	Command     string   `json:"command"` // first concrete shell line for display
	Lines       int      `json:"lines"`   // how many composite lines the script has
	Source      string   `json:"source"`  // "composer" | "artisan-canonical"
	ArtisanArgs []string `json:"artisan_args,omitempty"`
}

// canonical artisan commands surfaced for every Laravel project so users
// don't have to scan composer.json to find them. Drop the most common
// dev-time and ops-time entries; user can always run anything via the
// terminal directly.
var canonicalArtisan = []phpScriptEntry{
	{Name: "serve", Command: "php artisan serve", Source: "artisan-canonical", ArtisanArgs: []string{"serve"}},
	{Name: "tinker", Command: "php artisan tinker", Source: "artisan-canonical", ArtisanArgs: []string{"tinker"}},
	{Name: "migrate", Command: "php artisan migrate", Source: "artisan-canonical", ArtisanArgs: []string{"migrate"}},
	{Name: "migrate:fresh", Command: "php artisan migrate:fresh --seed", Source: "artisan-canonical", ArtisanArgs: []string{"migrate:fresh", "--seed"}},
	{Name: "route:list", Command: "php artisan route:list", Source: "artisan-canonical", ArtisanArgs: []string{"route:list"}},
	{Name: "cache:clear", Command: "php artisan cache:clear", Source: "artisan-canonical", ArtisanArgs: []string{"cache:clear"}},
	{Name: "config:cache", Command: "php artisan config:cache", Source: "artisan-canonical", ArtisanArgs: []string{"config:cache"}},
	{Name: "queue:work", Command: "php artisan queue:work", Source: "artisan-canonical", ArtisanArgs: []string{"queue:work"}},
	{Name: "pail", Command: "php artisan pail", Source: "artisan-canonical", ArtisanArgs: []string{"pail"}},
	{Name: "horizon", Command: "php artisan horizon", Source: "artisan-canonical", ArtisanArgs: []string{"horizon"}},
}

// toolPHPScripts reads composer.json's scripts section + emits canonical
// artisan commands. Symmetric to ts_detect's scripts arrays — gives the UI
// a clickable grid of "things you can run in this Laravel project".
func (b *MCPBridge) toolPHPScripts(_ context.Context, params map[string]any) map[string]any {
	path := strings.TrimSpace(paramString(params, "path", ""))
	if path == "" {
		return map[string]any{"ok": false, "error": "path required"}
	}
	composerPath := filepath.Join(path, "composer.json")
	composerScripts := []phpScriptEntry{}
	if data, err := os.ReadFile(composerPath); err == nil {
		var manifest struct {
			Scripts json.RawMessage `json:"scripts"`
		}
		if err := json.Unmarshal(data, &manifest); err == nil && len(manifest.Scripts) > 0 {
			var parsed map[string]json.RawMessage
			if err := json.Unmarshal(manifest.Scripts, &parsed); err == nil {
				names := make([]string, 0, len(parsed))
				for n := range parsed {
					names = append(names, n)
				}
				sort.Strings(names)
				for _, name := range names {
					raw := parsed[name]
					entry := phpScriptEntry{Name: name, Source: "composer"}
					// scripts can be either a string or a string[]
					var asString string
					if err := json.Unmarshal(raw, &asString); err == nil {
						entry.Command = asString
						entry.Lines = 1
					} else {
						var asArray []string
						if err := json.Unmarshal(raw, &asArray); err == nil {
							entry.Lines = len(asArray)
							for _, line := range asArray {
								// pick the first concrete shell line for display;
								// Composer pseudo-directives (Composer\\Config::...) skipped
								if strings.Contains(line, "::") {
									continue
								}
								entry.Command = line
								break
							}
							if entry.Command == "" && len(asArray) > 0 {
								entry.Command = asArray[0]
							}
						}
					}
					if entry.Command == "" {
						continue
					}
					composerScripts = append(composerScripts, entry)
				}
			}
		}
	}

	hasArtisan := fileExists(filepath.Join(path, "artisan"))
	canonical := []phpScriptEntry{}
	if hasArtisan {
		canonical = append(canonical, canonicalArtisan...)
	}

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"path":             path,
			"composer_scripts": composerScripts,
			"artisan_scripts":  canonical,
			"has_artisan":      hasArtisan,
			"has_composer":     fileExists(composerPath),
		},
	}
}

// toolPHPRun spawns a composer or artisan invocation via process_start in
// the project's cwd. mode = "composer" (composer run-script <name>) or
// "artisan" (php artisan <args...>) or "raw" (sh -c "<command>").
func (b *MCPBridge) toolPHPRun(ctx context.Context, params map[string]any) map[string]any {
	path := strings.TrimSpace(paramString(params, "path", ""))
	mode := strings.ToLower(strings.TrimSpace(paramString(params, "mode", "")))
	if path == "" || mode == "" {
		return map[string]any{"ok": false, "error": "path and mode required"}
	}

	var spawnParams map[string]any
	switch mode {
	case "composer":
		name := strings.TrimSpace(paramString(params, "name", ""))
		if name == "" {
			return map[string]any{"ok": false, "error": "name required for composer mode"}
		}
		spawnParams = map[string]any{
			"command": "composer",
			"args":    []string{"run-script", name},
			"dir":     path,
		}
	case "artisan":
		args := stringSliceParam(params, "args")
		if len(args) == 0 {
			return map[string]any{"ok": false, "error": "args required for artisan mode"}
		}
		spawnParams = map[string]any{
			"command": "php",
			"args":    append([]string{"artisan"}, args...),
			"dir":     path,
		}
	case "raw":
		cmd := strings.TrimSpace(paramString(params, "command", ""))
		if cmd == "" {
			return map[string]any{"ok": false, "error": "command required for raw mode"}
		}
		spawnParams = map[string]any{
			"command": "sh",
			"args":    []string{"-c", cmd},
			"dir":     path,
		}
	default:
		return map[string]any{"ok": false, "error": "unknown mode " + mode}
	}

	// Hand off to the existing process_start path so the spawn shows up
	// on /process automatically.
	return b.toolProcessStart(ctx, spawnParams)
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// keep core import live for future c.Action dispatch
var _ = core.E
