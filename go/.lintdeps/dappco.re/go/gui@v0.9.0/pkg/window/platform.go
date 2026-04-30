// pkg/window/platform.go
package window

// Platform abstracts the windowing backend (Wails v3).
type Platform interface {
	CreateWindow(options PlatformWindowOptions) PlatformWindow
	GetWindows() []PlatformWindow
}

// PlatformWindowOptions are the backend-specific options passed to CreateWindow.
type PlatformWindowOptions struct {
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
	BackgroundColour    [4]uint8 // RGBA
	DisableResize       bool
	EnableFileDrop      bool
}

// PlatformWindow is a live window handle from the backend.
type PlatformWindow interface {
	// Identity
	Name() string
	Title() string

	// Queries
	Position() (int, int)
	Size() (int, int)
	IsMaximised() bool
	IsFocused() bool
	IsVisible() bool
	IsFullscreen() bool
	IsMinimised() bool
	GetBounds() (x, y, width, height int)
	GetZoom() float64
	GetOpacity() float64

	// Mutations
	SetTitle(title string)
	SetPosition(x, y int)
	SetSize(width, height int)
	SetBackgroundColour(r, g, b, a uint8)
	SetVisibility(visible bool)
	SetAlwaysOnTop(alwaysOnTop bool)
	SetBounds(x, y, width, height int)
	SetURL(url string)
	SetHTML(html string)
	SetZoom(magnification float64)
	SetOpacity(opacity float64)
	SetContentProtection(protection bool)

	// Window state
	Maximise()
	Restore()
	Minimise()
	Focus()
	Close()
	Show()
	Hide()
	Fullscreen()
	UnFullscreen()
	ToggleFullscreen()
	ToggleMaximise()

	// WebView
	ExecJS(js string)

	// Utilities
	Flash(enabled bool)
	Print() error

	// Events
	OnWindowEvent(handler func(event WindowEvent))

	// File drop
	OnFileDrop(handler func(paths []string, targetID string))
}

// WindowEvent is emitted by the backend for window state changes.
type WindowEvent struct {
	Type string // "focus", "blur", "move", "resize", "close"
	Name string // window name
	Data map[string]any
}
