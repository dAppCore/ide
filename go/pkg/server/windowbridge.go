// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// windowBridge — typed wails wrapper over MCPBridge window_* tools.
//
// The window surface IS the application-framework primitive in CoreIDE.
// Plugins (CoreAgent, Lem.Lab, etc.) mount as named windows and the IDE
// drives them identically — open, position, focus, query state. This
// bridge gives plugins (and panels) a typed entry-point with no
// callBridge round-trip.
type windowBridge struct {
	core *core.Core
}

type WindowOpenInput struct {
	Name   string `json:"name"`
	Title  string `json:"title,omitempty"`
	URL    string `json:"url,omitempty"`
	HTML   string `json:"html,omitempty"`
	Width  int    `json:"width,omitempty"`
	Height int    `json:"height,omitempty"`
	X      int    `json:"x,omitempty"`
	Y      int    `json:"y,omitempty"`
}

type WindowOpenOutput struct {
	OK     bool   `json:"ok"`
	Window string `json:"window,omitempty"`
	URL    string `json:"url,omitempty"`
	Width  int    `json:"width,omitempty"`
	Height int    `json:"height,omitempty"`
	Error  string `json:"error,omitempty"`
}

type WindowNameInput struct {
	Window string `json:"window,omitempty"`
}

type WindowSetPositionInput struct {
	Window string `json:"window,omitempty"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

type WindowSetSizeInput struct {
	Window string `json:"window,omitempty"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type WindowSetBoundsInput struct {
	Window string `json:"window,omitempty"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
	Width  int    `json:"width,omitempty"`
	Height int    `json:"height,omitempty"`
}

type WindowSetTitleInput struct {
	Window string `json:"window,omitempty"`
	Title  string `json:"title"`
}

type WindowVisibilityInput struct {
	Window  string `json:"window,omitempty"`
	Visible bool   `json:"visible"`
}

type WindowAlwaysOnTopInput struct {
	Window string `json:"window,omitempty"`
	On     bool   `json:"on"`
}

type WindowFullscreenInput struct {
	Window     string `json:"window,omitempty"`
	Fullscreen bool   `json:"fullscreen"`
}

// WindowMutationOutput covers all the {ok, window, …reflective fields}
// shapes of the window controllers. Each field is independently optional;
// the caller usually only cares about OK + Error + the field they set.
type WindowMutationOutput struct {
	OK           bool   `json:"ok"`
	Window       string `json:"window,omitempty"`
	X            int    `json:"x,omitempty"`
	Y            int    `json:"y,omitempty"`
	Width        int    `json:"width,omitempty"`
	Height       int    `json:"height,omitempty"`
	Title        string `json:"title,omitempty"`
	Visible      bool   `json:"visible,omitempty"`
	AlwaysOnTop  bool   `json:"always_on_top,omitempty"`
	Fullscreen   bool   `json:"fullscreen,omitempty"`
	Closed       string `json:"closed,omitempty"`
	Restored     string `json:"restored,omitempty"`
	Focused      string `json:"focused,omitempty"`
	Note         string `json:"note,omitempty"`
	Error        string `json:"error,omitempty"`
}

type WindowInfoOutput struct {
	OK        bool   `json:"ok"`
	Name      string `json:"name,omitempty"`
	Title     string `json:"title,omitempty"`
	X         int    `json:"x,omitempty"`
	Y         int    `json:"y,omitempty"`
	Width     int    `json:"width,omitempty"`
	Height    int    `json:"height,omitempty"`
	Opacity   float64 `json:"opacity,omitempty"`
	Maximised bool   `json:"maximised,omitempty"`
	Focused   bool   `json:"focused,omitempty"`
	Error     string `json:"error,omitempty"`
}

type WindowFocusedOutput struct {
	OK      bool   `json:"ok"`
	Window  string `json:"window,omitempty"`
	Focused bool   `json:"focused"`
	Error   string `json:"error,omitempty"`
}

type WindowTitleOutput struct {
	OK    bool   `json:"ok"`
	Name  string `json:"name,omitempty"`
	Title string `json:"title,omitempty"`
	Error string `json:"error,omitempty"`
}

type WindowEntry struct {
	Name      string `json:"name"`
	Title     string `json:"title,omitempty"`
	X         int    `json:"x,omitempty"`
	Y         int    `json:"y,omitempty"`
	Width     int    `json:"width,omitempty"`
	Height    int    `json:"height,omitempty"`
	Focused   bool   `json:"focused,omitempty"`
	Maximised bool   `json:"maximised,omitempty"`
}

type WindowListOutput struct {
	OK      bool          `json:"ok"`
	Windows []WindowEntry `json:"windows,omitempty"`
	Count   int           `json:"count,omitempty"`
	Error   string        `json:"error,omitempty"`
}

func (b *windowBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// decodeMutation flattens the canonical {ok, window, …action-specific
// fields, error} response shape — every window mutation tool returns
// some subset of these.
func decodeWindowMutation(raw map[string]any) WindowMutationOutput {
	out := WindowMutationOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if s, ok := raw["window"].(string); ok {
		out.Window = s
	}
	if n, ok := raw["x"].(float64); ok {
		out.X = int(n)
	} else if n, ok := raw["x"].(int); ok {
		out.X = n
	}
	if n, ok := raw["y"].(float64); ok {
		out.Y = int(n)
	} else if n, ok := raw["y"].(int); ok {
		out.Y = n
	}
	if n, ok := raw["width"].(float64); ok {
		out.Width = int(n)
	} else if n, ok := raw["width"].(int); ok {
		out.Width = n
	}
	if n, ok := raw["height"].(float64); ok {
		out.Height = int(n)
	} else if n, ok := raw["height"].(int); ok {
		out.Height = n
	}
	if s, ok := raw["title"].(string); ok {
		out.Title = s
	}
	if v, ok := raw["visible"].(bool); ok {
		out.Visible = v
	}
	if v, ok := raw["always_on_top"].(bool); ok {
		out.AlwaysOnTop = v
	}
	if v, ok := raw["fullscreen"].(bool); ok {
		out.Fullscreen = v
	}
	if s, ok := raw["closed"].(string); ok {
		out.Closed = s
	}
	if s, ok := raw["restored"].(string); ok {
		out.Restored = s
	}
	if s, ok := raw["focused"].(string); ok {
		out.Focused = s
	}
	if s, ok := raw["note"].(string); ok {
		out.Note = s
	}
	return out
}

func (b *windowBridge) Open(ctx context.Context, input WindowOpenInput) (WindowOpenOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowOpenOutput{}, core.E("ide.server.Window.Open", "mcp bridge unavailable", nil)
	}
	params := map[string]any{
		"name":   input.Name,
		"title":  input.Title,
		"url":    input.URL,
		"html":   input.HTML,
		"width":  input.Width,
		"height": input.Height,
		"x":      input.X,
		"y":      input.Y,
	}
	raw := m.toolWindowOpen(ctx, params)
	out := WindowOpenOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if s, ok := raw["window"].(string); ok {
		out.Window = s
	}
	if s, ok := raw["url"].(string); ok {
		out.URL = s
	}
	if size, ok := raw["size"].(map[string]any); ok {
		if n, ok := size["width"].(float64); ok {
			out.Width = int(n)
		} else if n, ok := size["width"].(int); ok {
			out.Width = n
		}
		if n, ok := size["height"].(float64); ok {
			out.Height = int(n)
		} else if n, ok := size["height"].(int); ok {
			out.Height = n
		}
	}
	return out, nil
}

func (b *windowBridge) Close(ctx context.Context, input WindowNameInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Close", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowClose(ctx, map[string]any{"window": input.Window})), nil
}

func (b *windowBridge) Focus(ctx context.Context, input WindowNameInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Focus", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowFocus(ctx, map[string]any{"window": input.Window})), nil
}

func (b *windowBridge) Position(ctx context.Context, input WindowSetPositionInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Position", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowPosition(ctx, map[string]any{
		"window": input.Window,
		"x":      input.X,
		"y":      input.Y,
	})), nil
}

func (b *windowBridge) Size(ctx context.Context, input WindowSetSizeInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Size", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowSize(ctx, map[string]any{
		"window": input.Window,
		"width":  input.Width,
		"height": input.Height,
	})), nil
}

func (b *windowBridge) Bounds(ctx context.Context, input WindowSetBoundsInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Bounds", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowBounds(ctx, map[string]any{
		"window": input.Window,
		"x":      input.X,
		"y":      input.Y,
		"width":  input.Width,
		"height": input.Height,
	})), nil
}

func (b *windowBridge) Center(ctx context.Context, input WindowNameInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Center", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowCenter(ctx, map[string]any{"window": input.Window})), nil
}

func (b *windowBridge) Minimise(ctx context.Context, input WindowNameInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Minimise", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowMinimise(ctx, map[string]any{"window": input.Window})), nil
}

func (b *windowBridge) Maximise(ctx context.Context, input WindowNameInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Maximise", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowMaximise(ctx, map[string]any{"window": input.Window})), nil
}

func (b *windowBridge) Fullscreen(ctx context.Context, input WindowFullscreenInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Fullscreen", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowFullscreen(ctx, map[string]any{
		"window":     input.Window,
		"fullscreen": input.Fullscreen,
	})), nil
}

func (b *windowBridge) Restore(ctx context.Context, input WindowNameInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Restore", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowRestore(ctx, map[string]any{"window": input.Window})), nil
}

func (b *windowBridge) Visibility(ctx context.Context, input WindowVisibilityInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.Visibility", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowVisibility(ctx, map[string]any{
		"window":  input.Window,
		"visible": input.Visible,
	})), nil
}

func (b *windowBridge) AlwaysOnTop(ctx context.Context, input WindowAlwaysOnTopInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.AlwaysOnTop", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowAlwaysOnTop(ctx, map[string]any{
		"window": input.Window,
		"on":     input.On,
	})), nil
}

func (b *windowBridge) SetTitle(ctx context.Context, input WindowSetTitleInput) (WindowMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowMutationOutput{}, core.E("ide.server.Window.SetTitle", "mcp bridge unavailable", nil)
	}
	return decodeWindowMutation(m.toolWindowSetTitle(ctx, map[string]any{
		"window": input.Window,
		"title":  input.Title,
	})), nil
}

func (b *windowBridge) GetTitle(input WindowNameInput) (WindowTitleOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowTitleOutput{}, core.E("ide.server.Window.GetTitle", "mcp bridge unavailable", nil)
	}
	raw := m.toolWindowGetTitle(map[string]any{"window": input.Window})
	out := WindowTitleOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if s, ok := raw["name"].(string); ok {
		out.Name = s
	}
	if s, ok := raw["title"].(string); ok {
		out.Title = s
	}
	return out, nil
}

func (b *windowBridge) Get(input WindowNameInput) (WindowInfoOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowInfoOutput{}, core.E("ide.server.Window.Get", "mcp bridge unavailable", nil)
	}
	raw := m.toolWindowGet(map[string]any{"window": input.Window})
	out := WindowInfoOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if s, ok := raw["name"].(string); ok {
		out.Name = s
	}
	if s, ok := raw["title"].(string); ok {
		out.Title = s
	}
	if n, ok := raw["x"].(float64); ok {
		out.X = int(n)
	} else if n, ok := raw["x"].(int); ok {
		out.X = n
	}
	if n, ok := raw["y"].(float64); ok {
		out.Y = int(n)
	} else if n, ok := raw["y"].(int); ok {
		out.Y = n
	}
	if n, ok := raw["width"].(float64); ok {
		out.Width = int(n)
	} else if n, ok := raw["width"].(int); ok {
		out.Width = n
	}
	if n, ok := raw["height"].(float64); ok {
		out.Height = int(n)
	} else if n, ok := raw["height"].(int); ok {
		out.Height = n
	}
	if n, ok := raw["opacity"].(float64); ok {
		out.Opacity = n
	}
	if v, ok := raw["maximised"].(bool); ok {
		out.Maximised = v
	}
	if v, ok := raw["focused"].(bool); ok {
		out.Focused = v
	}
	return out, nil
}

func (b *windowBridge) List() (WindowListOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowListOutput{}, core.E("ide.server.Window.List", "mcp bridge unavailable", nil)
	}
	raw := m.toolWindowList(map[string]any{})
	out := WindowListOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if n, ok := raw["count"].(float64); ok {
		out.Count = int(n)
	} else if n, ok := raw["count"].(int); ok {
		out.Count = n
	}
	if list, ok := raw["windows"].([]any); ok {
		for _, item := range list {
			wm, ok := item.(map[string]any)
			if !ok {
				continue
			}
			e := WindowEntry{}
			if s, ok := wm["name"].(string); ok {
				e.Name = s
			}
			if s, ok := wm["title"].(string); ok {
				e.Title = s
			}
			if n, ok := wm["x"].(float64); ok {
				e.X = int(n)
			} else if n, ok := wm["x"].(int); ok {
				e.X = n
			}
			if n, ok := wm["y"].(float64); ok {
				e.Y = int(n)
			} else if n, ok := wm["y"].(int); ok {
				e.Y = n
			}
			if n, ok := wm["width"].(float64); ok {
				e.Width = int(n)
			} else if n, ok := wm["width"].(int); ok {
				e.Width = n
			}
			if n, ok := wm["height"].(float64); ok {
				e.Height = int(n)
			} else if n, ok := wm["height"].(int); ok {
				e.Height = n
			}
			if v, ok := wm["focused"].(bool); ok {
				e.Focused = v
			}
			if v, ok := wm["maximised"].(bool); ok {
				e.Maximised = v
			}
			out.Windows = append(out.Windows, e)
		}
	}
	return out, nil
}

func (b *windowBridge) Focused(input WindowNameInput) (WindowFocusedOutput, error) {
	m := b.mcp()
	if m == nil {
		return WindowFocusedOutput{}, core.E("ide.server.Window.Focused", "mcp bridge unavailable", nil)
	}
	raw := m.toolWindowFocused(map[string]any{"window": input.Window})
	out := WindowFocusedOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if s, ok := raw["window"].(string); ok {
		out.Window = s
	}
	if v, ok := raw["focused"].(bool); ok {
		out.Focused = v
	}
	return out, nil
}
