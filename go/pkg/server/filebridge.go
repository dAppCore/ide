// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// fileBridge — typed wails wrapper over MCPBridge file_/dir_/lang_
// tools. Hot path for the explorer panel via FileEditorStore (every
// directory navigation, every Monaco tab open, every save).
type fileBridge struct {
	core *core.Core
}

type DirEntry struct {
	Name      string `json:"name"`
	IsDir     bool   `json:"is_dir"`
	SizeBytes int64  `json:"size_bytes,omitempty"`
	Modified  string `json:"modified,omitempty"`
}

type DirListInput struct {
	Path string `json:"path"`
}

type DirListOutput struct {
	OK      bool       `json:"ok"`
	Path    string     `json:"path,omitempty"`
	Entries []DirEntry `json:"entries,omitempty"`
	Error   string     `json:"error,omitempty"`
}

type FileReadInput struct {
	Path string `json:"path"`
}

type FileReadOutput struct {
	OK      bool   `json:"ok"`
	Path    string `json:"path,omitempty"`
	Content string `json:"content,omitempty"`
	Error   string `json:"error,omitempty"`
}

type FileWriteInput struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type FileWriteOutput struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

type LangDetectInput struct {
	Path string `json:"path"`
}

type LangDetectOutput struct {
	OK    bool   `json:"ok"`
	Lang  string `json:"lang,omitempty"`
	Error string `json:"error,omitempty"`
}

func (b *fileBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// Dir lists a directory's children. Returns OK=false + Error when the
// path doesn't exist or isn't a directory; the explorer surfaces this
// as a tree-row error pill.
func (b *fileBridge) Dir(ctx context.Context, input DirListInput) (DirListOutput, error) {
	m := b.mcp()
	if m == nil {
		return DirListOutput{}, core.E("ide.server.File.Dir", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolDirList(map[string]any{"path": input.Path})
	out := DirListOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if p, _ := raw["path"].(string); p != "" {
		out.Path = p
	}
	if list, ok := raw["entries"].([]any); ok {
		for _, e := range list {
			em, ok := e.(map[string]any)
			if !ok {
				continue
			}
			entry := DirEntry{}
			if s, ok := em["name"].(string); ok {
				entry.Name = s
			}
			if v, ok := em["is_dir"].(bool); ok {
				entry.IsDir = v
			}
			if n, ok := em["size_bytes"].(float64); ok {
				entry.SizeBytes = int64(n)
			}
			if n, ok := em["size_bytes"].(int64); ok {
				entry.SizeBytes = n
			}
			if s, ok := em["modified"].(string); ok {
				entry.Modified = s
			}
			out.Entries = append(out.Entries, entry)
		}
	}
	return out, nil
}

// Read reads a file's full content. Used by Monaco when a tab opens.
func (b *fileBridge) Read(ctx context.Context, input FileReadInput) (FileReadOutput, error) {
	m := b.mcp()
	if m == nil {
		return FileReadOutput{}, core.E("ide.server.File.Read", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolFileRead(map[string]any{"path": input.Path})
	out := FileReadOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if p, _ := raw["path"].(string); p != "" {
		out.Path = p
	}
	if c, _ := raw["content"].(string); c != "" {
		out.Content = c
	}
	return out, nil
}

// Write persists Monaco's buffer back to disk. ⌘S calls this.
func (b *fileBridge) Write(ctx context.Context, input FileWriteInput) (FileWriteOutput, error) {
	m := b.mcp()
	if m == nil {
		return FileWriteOutput{}, core.E("ide.server.File.Write", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolFileWrite(map[string]any{"path": input.Path, "content": input.Content})
	out := FileWriteOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	return out, nil
}

// LangDetect returns the language id for Monaco syntax highlighting.
func (b *fileBridge) LangDetect(ctx context.Context, input LangDetectInput) (LangDetectOutput, error) {
	m := b.mcp()
	if m == nil {
		return LangDetectOutput{}, core.E("ide.server.File.LangDetect", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolLangDetect(map[string]any{"path": input.Path})
	out := LangDetectOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if l, _ := raw["lang"].(string); l != "" {
		out.Lang = l
	}
	return out, nil
}
