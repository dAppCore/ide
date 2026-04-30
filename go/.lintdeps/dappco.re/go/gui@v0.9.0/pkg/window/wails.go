// pkg/window/wails.go
package window

import (
	"reflect"

	core "dappco.re/go"
	"dappco.re/go/gui/pkg/preload"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// WailsPlatform implements Platform using Wails v3.
type WailsPlatform struct {
	app *application.App
}

// NewWailsPlatform creates a Wails-backed Platform.
func NewWailsPlatform(app *application.App) *WailsPlatform {
	return &WailsPlatform{app: app}
}

func (wp *WailsPlatform) CreateWindow(options PlatformWindowOptions) PlatformWindow {
	wOpts := application.WebviewWindowOptions{
		Name:             options.Name,
		Title:            options.Title,
		URL:              options.URL,
		HTML:             options.HTML,
		JS:               options.JS,
		Width:            options.Width,
		Height:           options.Height,
		X:                options.X,
		Y:                options.Y,
		MinWidth:         options.MinWidth,
		MinHeight:        options.MinHeight,
		MaxWidth:         options.MaxWidth,
		MaxHeight:        options.MaxHeight,
		Frameless:        options.Frameless,
		Hidden:           options.Hidden,
		AlwaysOnTop:      options.AlwaysOnTop,
		DisableResize:    options.DisableResize,
		EnableFileDrop:   options.EnableFileDrop,
		BackgroundColour: application.NewRGBA(options.BackgroundColour[0], options.BackgroundColour[1], options.BackgroundColour[2], options.BackgroundColour[3]),
	}
	var windowHandle *application.WebviewWindow
	if wirePreloadOnPageLoad(&wOpts, options.URL, func(origin string, target preload.Webview) {
		if target == nil {
			target = windowHandle
		}
		if target == nil {
			return
		}
		if err := preload.InjectPreload(target, origin); err != nil {
			return
		}
		if extra := postPageLoadWindowJS(options.JS); core.Trim(extra) != "" {
			target.ExecJS(extra)
		}
	}) {
		wOpts.JS = ""
	}
	w := wp.app.Window.NewWithOptions(wOpts)
	windowHandle = w
	return &wailsWindow{w: w, title: options.Title, opacity: 1.0}
}

func wirePreloadOnPageLoad(options *application.WebviewWindowOptions, fallbackOrigin string, inject func(origin string, target preload.Webview)) bool {
	if options == nil || inject == nil {
		return false
	}

	value := reflect.ValueOf(options)
	if value.Kind() != reflect.Pointer || value.IsNil() {
		return false
	}
	structValue := value.Elem()
	if structValue.Kind() != reflect.Struct {
		return false
	}

	field := structValue.FieldByName("OnPageLoad")
	if !field.IsValid() || !field.CanSet() || field.Kind() != reflect.Func {
		return false
	}

	fnType := field.Type()
	field.Set(reflect.MakeFunc(fnType, func(args []reflect.Value) []reflect.Value {
		inject(extractPageLoadOrigin(args, fallbackOrigin), extractPageLoadWebview(args))
		return zeroReturnValues(fnType)
	}))
	return true
}

func extractPageLoadOrigin(args []reflect.Value, fallback string) string {
	for _, arg := range args {
		if !arg.IsValid() {
			continue
		}
		if arg.Kind() == reflect.Pointer {
			if arg.IsNil() {
				continue
			}
			arg = arg.Elem()
		}
		switch arg.Kind() {
		case reflect.String:
			if value := core.Trim(arg.String()); value != "" {
				return value
			}
		case reflect.Struct:
			for _, name := range []string{"URL", "Url", "Origin", "Location"} {
				field := arg.FieldByName(name)
				if field.IsValid() && field.Kind() == reflect.String {
					if value := core.Trim(field.String()); value != "" {
						return value
					}
				}
			}
		}
	}
	return fallback
}

func extractPageLoadWebview(args []reflect.Value) preload.Webview {
	for _, arg := range args {
		if !arg.IsValid() || !arg.CanInterface() {
			continue
		}
		if target, ok := arg.Interface().(preload.Webview); ok {
			return target
		}
	}
	return nil
}

func zeroReturnValues(fnType reflect.Type) []reflect.Value {
	if fnType.NumOut() == 0 {
		return nil
	}
	out := make([]reflect.Value, 0, fnType.NumOut())
	for i := 0; i < fnType.NumOut(); i++ {
		out = append(out, reflect.Zero(fnType.Out(i)))
	}
	return out
}

func postPageLoadWindowJS(raw string) string {
	if looksLikeLegacyDisplayPreload(raw) {
		return ""
	}
	return raw
}

func looksLikeLegacyDisplayPreload(raw string) bool {
	trimmed := core.Trim(raw)
	if trimmed == "" {
		return false
	}
	return core.Contains(trimmed, "const __corePageURL =") &&
		core.Contains(trimmed, "globalThis.core.ml") &&
		core.Contains(trimmed, "Document.prototype, 'cookie'")
}

func (wp *WailsPlatform) GetWindows() []PlatformWindow {
	all := wp.app.Window.GetAll()
	out := make([]PlatformWindow, 0, len(all))
	for _, w := range all {
		if wv, ok := w.(*application.WebviewWindow); ok {
			out = append(out, &wailsWindow{w: wv})
		}
	}
	return out
}

// wailsWindow wraps *application.WebviewWindow to implement PlatformWindow.
// It stores the title and opacity locally because Wails v3 does not expose getters for both.
type wailsWindow struct {
	w       *application.WebviewWindow
	title   string
	opacity float64
}

func (ww *wailsWindow) Name() string         { return ww.w.Name() }
func (ww *wailsWindow) Title() string        { return ww.title }
func (ww *wailsWindow) Position() (int, int) { return ww.w.Position() }
func (ww *wailsWindow) Size() (int, int)     { return ww.w.Size() }
func (ww *wailsWindow) IsMaximised() bool    { return ww.w.IsMaximised() }
func (ww *wailsWindow) IsFocused() bool      { return ww.w.IsFocused() }
func (ww *wailsWindow) IsVisible() bool      { return ww.w.IsVisible() }
func (ww *wailsWindow) IsFullscreen() bool   { return ww.w.IsFullscreen() }
func (ww *wailsWindow) IsMinimised() bool    { return ww.w.IsMinimised() }
func (ww *wailsWindow) GetBounds() (int, int, int, int) {
	r := ww.w.Bounds()
	return r.X, r.Y, r.Width, r.Height
}
func (ww *wailsWindow) GetZoom() float64          { return ww.w.GetZoom() }
func (ww *wailsWindow) GetOpacity() float64       { return ww.opacity }
func (ww *wailsWindow) SetTitle(title string)     { ww.title = title; ww.w.SetTitle(title) }
func (ww *wailsWindow) SetPosition(x, y int)      { ww.w.SetPosition(x, y) }
func (ww *wailsWindow) SetSize(width, height int) { ww.w.SetSize(width, height) }
func (ww *wailsWindow) SetBackgroundColour(r, g, b, a uint8) {
	ww.w.SetBackgroundColour(application.NewRGBA(r, g, b, a))
}
func (ww *wailsWindow) SetVisibility(visible bool) {
	if visible {
		ww.w.Show()
	} else {
		ww.w.Hide()
	}
}
func (ww *wailsWindow) SetAlwaysOnTop(alwaysOnTop bool) { ww.w.SetAlwaysOnTop(alwaysOnTop) }
func (ww *wailsWindow) SetOpacity(opacity float64) {
	ww.opacity = opacity
	if setter, ok := any(ww.w).(interface{ SetOpacity(float64) }); ok {
		setter.SetOpacity(opacity)
	}
}
func (ww *wailsWindow) SetBounds(x, y, width, height int) {
	ww.w.SetBounds(application.Rect{X: x, Y: y, Width: width, Height: height})
}
func (ww *wailsWindow) SetURL(url string)             { ww.w.SetURL(url) }
func (ww *wailsWindow) SetHTML(html string)           { ww.w.SetHTML(html) }
func (ww *wailsWindow) SetZoom(magnification float64) { ww.w.SetZoom(magnification) }
func (ww *wailsWindow) SetContentProtection(protection bool) {
	ww.w.SetContentProtection(protection)
}
func (ww *wailsWindow) Maximise()          { ww.w.Maximise() }
func (ww *wailsWindow) Restore()           { ww.w.Restore() }
func (ww *wailsWindow) Minimise()          { ww.w.Minimise() }
func (ww *wailsWindow) Focus()             { ww.w.Focus() }
func (ww *wailsWindow) Close()             { ww.w.Close() }
func (ww *wailsWindow) Show()              { ww.w.Show() }
func (ww *wailsWindow) Hide()              { ww.w.Hide() }
func (ww *wailsWindow) Fullscreen()        { ww.w.Fullscreen() }
func (ww *wailsWindow) UnFullscreen()      { ww.w.UnFullscreen() }
func (ww *wailsWindow) ToggleFullscreen()  { ww.w.ToggleFullscreen() }
func (ww *wailsWindow) ToggleMaximise()    { ww.w.ToggleMaximise() }
func (ww *wailsWindow) ExecJS(js string)   { ww.w.ExecJS(js) }
func (ww *wailsWindow) Flash(enabled bool) { ww.w.Flash(enabled) }
func (ww *wailsWindow) Print() error       { return ww.w.Print() }
func (ww *wailsWindow) OpenDevTools()      { ww.w.OpenDevTools() }
func (ww *wailsWindow) CloseDevTools() {
	if closer, ok := any(ww.w).(interface{ CloseDevTools() }); ok {
		closer.CloseDevTools()
	}
}

func (ww *wailsWindow) OnWindowEvent(handler func(event WindowEvent)) {
	name := ww.w.Name()

	// Map common Wails window events to our WindowEvent type.
	eventMap := map[events.WindowEventType]string{
		events.Common.WindowFocus:     "focus",
		events.Common.WindowLostFocus: "blur",
		events.Common.WindowDidMove:   "move",
		events.Common.WindowDidResize: "resize",
		events.Common.WindowClosing:   "close",
	}

	for eventType, eventName := range eventMap {
		typeName := eventName // capture for closure
		ww.w.OnWindowEvent(eventType, func(event *application.WindowEvent) {
			data := make(map[string]any)
			switch typeName {
			case "move":
				x, y := ww.w.Position()
				data["x"] = x
				data["y"] = y
			case "resize":
				w, h := ww.w.Size()
				data["width"] = w
				data["height"] = h
			}
			handler(WindowEvent{
				Type: typeName,
				Name: name,
				Data: data,
			})
		})
	}
}

func (ww *wailsWindow) OnFileDrop(handler func(paths []string, targetID string)) {
	ww.w.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		files := event.Context().DroppedFiles()
		details := event.Context().DropTargetDetails()
		targetID := ""
		if details != nil {
			targetID = details.ElementID
		}
		handler(files, targetID)
	})
}

// Ensure wailsWindow satisfies PlatformWindow at compile time.
var _ PlatformWindow = (*wailsWindow)(nil)

// Ensure WailsPlatform satisfies Platform at compile time.
var _ Platform = (*WailsPlatform)(nil)
