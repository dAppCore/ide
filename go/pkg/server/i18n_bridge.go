// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// i18n_* bridge tools — IDE surface over core/go-i18n.
//
// Today (v1) walks the workspace looking for locales/ directories and
// returns per-package × per-locale coverage. v2 will import dappco.re/go/i18n
// directly to call its catalog/grammar surface (live MessageID lookup,
// grammar-aware preview, GrammarImprint reversal — see RFC.md).
//
// Pattern matches the wrap-don't-reinvent rule established for build /
// containers / lint: lightweight bridge tools, frontend renders, swap
// underlying impl when the package gains a public Go API.

type LocaleInfo struct {
	Name        string `json:"name"`     // "en", "fr", "ja", etc.
	Path        string `json:"path"`     // absolute path to the JSON file
	Keys        int    `json:"keys"`     // total leaf keys (recursive)
	MissingVsEn int    `json:"missing_vs_en"`
	SizeBytes   int64  `json:"size_bytes"`
}

type LocalePackage struct {
	Code        string       `json:"code"`        // package short name (e.g. "go-build")
	Path        string       `json:"path"`        // absolute path to the locales/ directory
	HasEnglish  bool         `json:"has_english"`
	BaselineKeys int         `json:"baseline_keys"` // key count of en.json (or first locale)
	Locales     []LocaleInfo `json:"locales"`
}

type LocaleScanOutput struct {
	Roots         []string        `json:"roots"`
	Packages      []LocalePackage `json:"packages"`
	UniqueLocales []string        `json:"unique_locales"` // union across all packages
	Total         int             `json:"total"`
}

// toolI18nScan walks the user-configured workspace roots looking for
// locales/ directories that contain *.json files. Returns the coverage
// matrix the /locales panel renders.
func (b *MCPBridge) toolI18nScan(_ context.Context, params map[string]any) map[string]any {
	roots := stringSliceParam(params, "roots")
	if len(roots) == 0 {
		// Default scan roots — same canonical workspace shape used by the
		// repos panel. Top-level package directories under ~/Code/core.
		home, err := os.UserHomeDir()
		if err == nil {
			roots = []string{filepath.Join(home, "Code", "core")}
		}
	}
	maxDepth := paramInt(params, "max_depth", 3)
	if maxDepth <= 0 {
		maxDepth = 3
	}

	pkgs := []LocalePackage{}
	uniq := map[string]struct{}{}

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
			// Skip vendor / node_modules / build artefacts / our own external
			name := d.Name()
			if name == "node_modules" || name == "vendor" || name == ".git" || name == "build" || name == "external" {
				return filepath.SkipDir
			}
			if depth > maxDepth {
				return filepath.SkipDir
			}
			if name == "locales" {
				if pkg := scanLocaleDir(path); pkg != nil {
					pkgs = append(pkgs, *pkg)
					for _, loc := range pkg.Locales {
						uniq[loc.Name] = struct{}{}
					}
				}
				return filepath.SkipDir
			}
			return nil
		})
	}

	uniqList := make([]string, 0, len(uniq))
	for k := range uniq {
		uniqList = append(uniqList, k)
	}
	sort.Strings(uniqList)
	sort.Slice(pkgs, func(i, j int) bool { return pkgs[i].Code < pkgs[j].Code })

	return map[string]any{
		"ok": true,
		"value": LocaleScanOutput{
			Roots:         roots,
			Packages:      pkgs,
			UniqueLocales: uniqList,
			Total:         len(pkgs),
		},
	}
}

// toolI18nView returns the parsed contents of a locale JSON file. Frontend
// renders as a collapsible tree.
func (b *MCPBridge) toolI18nView(_ context.Context, params map[string]any) map[string]any {
	path := paramString(params, "path", "")
	if path == "" {
		return errResp("path is required")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	var content any
	if err := json.Unmarshal(data, &content); err != nil {
		return map[string]any{"ok": false, "error": "parse: " + err.Error()}
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"path":    path,
			"content": content,
			"keys":    countLeafKeys(content),
		},
	}
}

func scanLocaleDir(dir string) *LocalePackage {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	pkgRoot := filepath.Dir(dir)
	if filepath.Base(pkgRoot) == "go" {
		// Conventional: <package>/go/locales/ — name comes from the package.
		pkgRoot = filepath.Dir(pkgRoot)
	}
	pkgCode := filepath.Base(pkgRoot)

	pkg := LocalePackage{
		Code:    pkgCode,
		Path:    dir,
		Locales: []LocaleInfo{},
	}

	var enKeys int
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		full := filepath.Join(dir, name)
		info, err := os.Stat(full)
		if err != nil {
			continue
		}
		data, err := os.ReadFile(full)
		if err != nil {
			continue
		}
		var content any
		if err := json.Unmarshal(data, &content); err != nil {
			continue
		}
		keys := countLeafKeys(content)
		locName := strings.TrimSuffix(name, ".json")
		if locName == "en" || locName == "en_GB" || locName == "en_US" {
			pkg.HasEnglish = true
			if locName == "en" || enKeys == 0 {
				enKeys = keys
			}
		}
		pkg.Locales = append(pkg.Locales, LocaleInfo{
			Name:      locName,
			Path:      full,
			Keys:      keys,
			SizeBytes: info.Size(),
		})
	}

	pkg.BaselineKeys = enKeys
	if enKeys > 0 {
		for i := range pkg.Locales {
			gap := enKeys - pkg.Locales[i].Keys
			if gap < 0 {
				gap = 0
			}
			pkg.Locales[i].MissingVsEn = gap
		}
	}
	sort.Slice(pkg.Locales, func(i, j int) bool {
		// English first, then alphabetical
		a := pkg.Locales[i].Name
		b := pkg.Locales[j].Name
		isEnA := a == "en" || a == "en_GB" || a == "en_US"
		isEnB := b == "en" || b == "en_GB" || b == "en_US"
		if isEnA != isEnB {
			return isEnA
		}
		return a < b
	})
	if len(pkg.Locales) == 0 {
		return nil
	}
	return &pkg
}

// countLeafKeys recurses through the parsed JSON and counts terminal
// (non-object) leaves — the rough "translatable string count".
func countLeafKeys(v any) int {
	switch x := v.(type) {
	case map[string]any:
		n := 0
		for _, child := range x {
			n += countLeafKeys(child)
		}
		return n
	case []any:
		n := 0
		for _, child := range x {
			n += countLeafKeys(child)
		}
		return n
	default:
		return 1
	}
}
