// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"

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

	out := []map[string]any{}
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
			out = append(out, map[string]any{
				"path":           path,
				"name":           filepath.Base(path),
				"app_name":       php.GetLaravelAppName(path),
				"app_url":        php.GetLaravelAppURL(path),
				"package_mgr":    php.DetectPackageManager(path),
				"frankenphp":     php.IsFrankenPHPProject(path),
			})
			// Don't recurse into a Laravel project's sub-dirs.
			return filepath.SkipDir
		})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i]["path"].(string) < out[j]["path"].(string)
	})
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"roots":    roots,
			"projects": out,
			"count":    len(out),
		},
	}
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
