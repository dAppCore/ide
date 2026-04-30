// pkg/window/window.go
package window

import (
	"sync"

	core "dappco.re/go"
)

// Window is CoreGUI's own window descriptor — NOT a Wails type alias.
type Window struct {
	Name                string
	Title               string
	URL                 string
	HTML                string
	JS                  string
	Width, Height       int
	X, Y                int
	MinWidth, MinHeight int
	MaxWidth, MaxHeight int
	Frameless           bool
	Hidden              bool
	AlwaysOnTop         bool
	BackgroundColour    [4]uint8
	DisableResize       bool
	EnableFileDrop      bool
}

// ToPlatformOptions converts a Window to PlatformWindowOptions for the backend.
func (w *Window) ToPlatformOptions() PlatformWindowOptions {
	return PlatformWindowOptions{
		Name: w.Name, Title: w.Title, URL: w.URL, HTML: w.HTML, JS: w.JS,
		Width: w.Width, Height: w.Height, X: w.X, Y: w.Y,
		MinWidth: w.MinWidth, MinHeight: w.MinHeight,
		MaxWidth: w.MaxWidth, MaxHeight: w.MaxHeight,
		Frameless: w.Frameless, Hidden: w.Hidden,
		AlwaysOnTop: w.AlwaysOnTop, BackgroundColour: w.BackgroundColour,
		DisableResize: w.DisableResize, EnableFileDrop: w.EnableFileDrop,
	}
}

// Manager manages window lifecycle through a Platform backend.
type Manager struct {
	platform      Platform
	state         *StateManager
	layout        *LayoutManager
	windows       map[string]PlatformWindow
	defaultWidth  int
	defaultHeight int
	mu            sync.RWMutex
}

// NewManager creates a window Manager with the given platform backend.
func NewManager(platform Platform) *Manager {
	return &Manager{
		platform: platform,
		state:    NewStateManager(),
		layout:   NewLayoutManager(),
		windows:  make(map[string]PlatformWindow),
	}
}

// NewManagerWithDir creates a window Manager with a custom config directory for state/layout persistence.
// Useful for testing or when the default config directory is not appropriate.
func NewManagerWithDir(platform Platform, configDir string) *Manager {
	return &Manager{
		platform: platform,
		state:    NewStateManagerWithDir(configDir),
		layout:   NewLayoutManagerWithDir(configDir),
		windows:  make(map[string]PlatformWindow),
	}
}

func (m *Manager) SetDefaultWidth(width int) {
	if width > 0 {
		m.defaultWidth = width
	}
}

func (m *Manager) SetDefaultHeight(height int) {
	if height > 0 {
		m.defaultHeight = height
	}
}

// Open creates a window from compatibility options.
// Use: manager.Open(window.WithName("main"), window.WithURL("/"), window.WithSize(1280, 800))
func (m *Manager) Open(options ...WindowOption) (PlatformWindow, error) {
	windowSpec, err := ApplyOptions(options...)
	if err != nil {
		return nil, core.E("window.Manager.Open", "failed to apply options", err)
	}
	return m.Create(windowSpec)
}

// Create creates a window from a Window descriptor.
func (m *Manager) Create(w *Window) (PlatformWindow, error) {
	if w.Name == "" {
		w.Name = "main"
	}
	if w.Title == "" {
		w.Title = "Core"
	}
	if w.Width == 0 {
		if m.defaultWidth > 0 {
			w.Width = m.defaultWidth
		} else {
			w.Width = 1280
		}
	}
	if w.Height == 0 {
		if m.defaultHeight > 0 {
			w.Height = m.defaultHeight
		} else {
			w.Height = 800
		}
	}
	if w.URL == "" {
		w.URL = "/"
	}

	// Apply saved state if available
	m.state.ApplyState(w)

	pw := m.platform.CreateWindow(w.ToPlatformOptions())

	m.mu.Lock()
	m.windows[w.Name] = pw
	m.mu.Unlock()

	return pw, nil
}

// Get returns a tracked window by name.
func (m *Manager) Get(name string) (PlatformWindow, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	pw, ok := m.windows[name]
	return pw, ok
}

// List returns all tracked window names.
func (m *Manager) List() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	names := make([]string, 0, len(m.windows))
	for name := range m.windows {
		names = append(names, name)
	}
	return names
}

// Remove stops tracking a window by name.
func (m *Manager) Remove(name string) {
	m.mu.Lock()
	delete(m.windows, name)
	m.mu.Unlock()
}

// Platform returns the underlying platform for direct access.
func (m *Manager) Platform() Platform {
	return m.platform
}

// State returns the state manager for window persistence.
func (m *Manager) State() *StateManager {
	return m.state
}

// Layout returns the layout manager.
func (m *Manager) Layout() *LayoutManager {
	return m.layout
}
