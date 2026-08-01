// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"

	core "dappco.re/go"
	storelib "dappco.re/go/store"

	storepkg "dappco.re/go/ide/pkg/store"
)

// store_* bridge tools surface the IDE's already-mounted go-store Service.
// The store lives at ~/.core/ide/store.db (SQLite) and is the persistence
// layer behind UI state, plugin install records, marketplace cache, brain
// snapshots, navigation history. The panel is a KV inspector with
// per-namespace pagination, set/delete actions, and a "config files" tab
// for the YAML/JSON files in ~/.core/.

func (b *MCPBridge) storeService() *storelib.Store {
	svc, _ := core.ServiceFor[*storepkg.Service](b.Core(), "store")
	if svc == nil {
		return nil
	}
	return svc.Store
}

func (b *MCPBridge) toolStoreGroups(_ context.Context, _ map[string]any) map[string]any {
	st := b.storeService()
	if st == nil {
		return errResp("store service unavailable")
	}
	groups, r := st.Groups()
	if !r.OK {
		return resultToResponse(r)
	}
	out := make([]map[string]any, 0, len(groups))
	for _, g := range groups {
		count, _ := st.Count(g)
		out = append(out, map[string]any{"name": g, "count": count})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i]["name"].(string) < out[j]["name"].(string)
	})
	return map[string]any{"ok": true, "value": map[string]any{
		"groups": out,
		"count":  len(out),
	}}
}

// toolStoreEntries returns key/value pairs for a namespace, paginated.
// Default: 200 per page. Values are returned as-is (string) — the
// frontend pretty-prints JSON when applicable.
func (b *MCPBridge) toolStoreEntries(_ context.Context, params map[string]any) map[string]any {
	st := b.storeService()
	if st == nil {
		return errResp("store service unavailable")
	}
	group := paramString(params, "group", "")
	if group == "" {
		return errResp("group required")
	}
	offset := paramInt(params, "offset", 0)
	limit := paramInt(params, "limit", 200)
	page, r := st.GetPage(group, offset, limit)
	if !r.OK {
		return resultToResponse(r)
	}
	total, _ := st.Count(group)
	out := make([]map[string]any, 0, len(page))
	for _, kv := range page {
		out = append(out, map[string]any{
			"key":   kv.Key,
			"value": kv.Value,
		})
	}
	return map[string]any{"ok": true, "value": map[string]any{
		"group":   group,
		"offset":  offset,
		"limit":   limit,
		"total":   total,
		"entries": out,
	}}
}

func (b *MCPBridge) toolStoreSet(_ context.Context, params map[string]any) map[string]any {
	st := b.storeService()
	if st == nil {
		return errResp("store service unavailable")
	}
	group := paramString(params, "group", "")
	key := paramString(params, "key", "")
	value := paramString(params, "value", "")
	if group == "" || key == "" {
		return errResp("group + key required")
	}
	return resultToResponse(st.Set(group, key, value))
}

func (b *MCPBridge) toolStoreDelete(_ context.Context, params map[string]any) map[string]any {
	st := b.storeService()
	if st == nil {
		return errResp("store service unavailable")
	}
	group := paramString(params, "group", "")
	key := paramString(params, "key", "")
	if group == "" || key == "" {
		return errResp("group + key required")
	}
	return resultToResponse(st.Delete(group, key))
}

// toolStoreFiles enumerates the .core/ tree's YAML/JSON config files —
// the OTHER persistence layer (config.yaml, layouts.json, marketplace
// modules, etc.). Surfaces them as a tree with size + mtime + first-bytes
// preview so the user can see exactly what the IDE is writing.
func (b *MCPBridge) toolStoreFiles(_ context.Context, _ map[string]any) map[string]any {
	home, err := os.UserHomeDir()
	if err != nil {
		return errResp("user home not resolvable")
	}
	root := filepath.Join(home, ".core")
	out := []map[string]any{}
	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			// Skip the SQLite-store directory itself (already covered by groups view)
			if filepath.Base(path) == "ide" && filepath.Base(filepath.Dir(path)) == ".core" {
				// allow descent but skip store.db itself
			}
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".yaml" && ext != ".yml" && ext != ".json" {
			return nil
		}
		info, err := os.Stat(path)
		if err != nil {
			return nil
		}
		// Read first ~2KB for preview
		var preview string
		if data, err := os.ReadFile(path); err == nil {
			if len(data) > 2048 {
				preview = string(data[:2048]) + "\n…"
			} else {
				preview = string(data)
			}
		}
		rel, _ := filepath.Rel(home, path)
		out = append(out, map[string]any{
			"path":       path,
			"rel":        rel,
			"name":       filepath.Base(path),
			"ext":        ext,
			"size_bytes": info.Size(),
			"modified":   info.ModTime(),
			"preview":    preview,
		})
		return nil
	})
	sort.Slice(out, func(i, j int) bool {
		return out[i]["rel"].(string) < out[j]["rel"].(string)
	})
	return map[string]any{"ok": true, "value": map[string]any{
		"root":  root,
		"files": out,
		"count": len(out),
	}}
}
