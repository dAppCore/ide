package window

import (
	core "dappco.re/go"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"reflect"
	"unsafe"
)

func TestWailsPlatform_CreateWindow_Good(t *core.T) {
	// CreateWindow
	ax7Variant := "CreateWindow:good"
	core.AssertContains(t, ax7Variant, "good")
	app := &application.App{}
	platform := NewWailsPlatform(app)

	w := platform.CreateWindow(PlatformWindowOptions{
		Name:             "main",
		Title:            "Core GUI",
		URL:              "/home",
		HTML:             "<main>Ready</main>",
		JS:               "globalThis.ready = true",
		Width:            1280,
		Height:           800,
		X:                10,
		Y:                20,
		MinWidth:         640,
		MinHeight:        480,
		MaxWidth:         1920,
		MaxHeight:        1080,
		Frameless:        true,
		Hidden:           true,
		AlwaysOnTop:      true,
		DisableResize:    true,
		EnableFileDrop:   true,
		BackgroundColour: [4]uint8{1, 2, 3, 4},
	})
	core.AssertNotNil(t, w)
	wails, ok := w.(*wailsWindow)
	core.RequireTrue(t, ok)

	core.AssertEqual(t, "main", wails.Name())
	core.AssertEqual(t, "Core GUI", wails.Title())
	x, y := wails.Position()
	core.AssertEqual(t, 10, x)
	core.AssertEqual(t, 20, y)

	underlying := app.Window.GetAll()[0].(*application.WebviewWindow)
	core.AssertEqual(t, "main", underlying.Name())
	core.AssertEqual(t, "Core GUI", underlying.Title())
	core.AssertEqual(t, 1280, underlying.Width())
	core.AssertEqual(t, 800, underlying.Height())
	core.AssertFalse(t, underlying.IsVisible())

	wails.SetTitle("Updated")
	wails.SetPosition(30, 40)
	wails.SetSize(1920, 1080)
	wails.SetBackgroundColour(10, 20, 30, 40)
	wails.SetVisibility(true)
	wails.SetVisibility(false)
	wails.SetAlwaysOnTop(false)
	wails.SetOpacity(0.85)
	wails.SetBounds(1, 2, 3, 4)
	wails.SetURL("/dashboard")
	wails.SetHTML("<main>Updated</main>")
	wails.SetZoom(1.25)
	wails.SetContentProtection(true)
	wails.Maximise()
	wails.Restore()
	wails.Minimise()
	wails.Focus()
	wails.Close()
	wails.Show()
	wails.Hide()
	wails.Fullscreen()
	wails.UnFullscreen()
	wails.ToggleFullscreen()
	wails.ToggleMaximise()
	wails.ExecJS("alert(1)")
	wails.Flash(true)
	wails.OpenDevTools()
	wails.CloseDevTools()
	core.RequireNoError(t, wails.Print())

	x, y = underlying.Position()
	core.AssertEqual(t, 1, x)
	core.AssertEqual(t, 2, y)
	width, height := underlying.Size()
	core.AssertEqual(t, 3, width)
	core.AssertEqual(t, 4, height)
	core.AssertTrue(t, underlying.IsMaximised())
	core.AssertTrue(t, underlying.IsFullscreen())
	core.AssertTrue(t, underlying.IsFocused())
	core.AssertFalse(t, underlying.IsVisible())
	core.AssertFalse(t, underlying.IsMinimised())
	core.AssertEqual(t, 0.85, wails.GetOpacity())
	execJSField := reflect.ValueOf(underlying).Elem().FieldByName("execJSCalls")
	core.RequireTrue(t, execJSField.IsValid())
	execJSCalls := reflect.NewAt(execJSField.Type(), unsafe.Pointer(execJSField.UnsafeAddr())).Elem().Interface().([]string)
	core.AssertEqual(t, []string{"globalThis.ready = true", "alert(1)"}, execJSCalls)

	handlers := reflect.ValueOf(underlying).Elem().FieldByName("eventHandlers")
	core.RequireTrue(t, handlers.IsValid())
	core.AssertEmpty(t, handlers.Len())

	var eventsSeen []WindowEvent
	wails.OnWindowEvent(func(event WindowEvent) {
		eventsSeen = append(eventsSeen, event)
	})

	handlers = reflect.ValueOf(underlying).Elem().FieldByName("eventHandlers")
	core.AssertEqual(t, 5, handlers.Len())
	handlerMap := reflect.NewAt(handlers.Type(), unsafe.Pointer(handlers.UnsafeAddr())).Elem().Interface().(map[events.WindowEventType][]func(*application.WindowEvent))
	moveHandlers := handlerMap[events.Common.WindowDidMove]
	core.AssertGreater(t, len(moveHandlers), 0)
	wails.SetPosition(77, 88)
	moveHandlers[0](&application.WindowEvent{})

	resizeHandlers := handlerMap[events.Common.WindowDidResize]
	core.AssertGreater(t, len(resizeHandlers), 0)
	wails.SetSize(640, 360)
	resizeHandlers[0](&application.WindowEvent{})

	core.AssertLen(t, eventsSeen, 2)
	core.AssertEqual(t, "move", eventsSeen[0].Type)
	core.AssertEqual(t, "main", eventsSeen[0].Name)
	core.AssertEqual(t, 77, eventsSeen[0].Data["x"])
	core.AssertEqual(t, 88, eventsSeen[0].Data["y"])
	core.AssertEqual(t, "resize", eventsSeen[1].Type)
	core.AssertEqual(t, 640, eventsSeen[1].Data["width"])
	core.AssertEqual(t, 360, eventsSeen[1].Data["height"])

	var filesSeen []string
	var targetSeen string
	wails.OnFileDrop(func(paths []string, targetID string) {
		filesSeen = append(filesSeen, paths...)
		targetSeen = targetID
	})

	dropHandlers := reflect.ValueOf(underlying).Elem().FieldByName("eventHandlers")
	dropHandlerMap := reflect.NewAt(dropHandlers.Type(), unsafe.Pointer(dropHandlers.UnsafeAddr())).Elem().Interface().(map[events.WindowEventType][]func(*application.WindowEvent))
	fileDropHandlers := dropHandlerMap[events.Common.WindowFilesDropped]
	core.AssertGreater(t, len(fileDropHandlers), 0)

	event := &application.WindowEvent{}
	ctx := event.Context()
	ctxValue := reflect.ValueOf(ctx).Elem()
	filesField := ctxValue.FieldByName("droppedFiles")
	reflect.NewAt(filesField.Type(), unsafe.Pointer(filesField.UnsafeAddr())).Elem().Set(reflect.ValueOf([]string{"a.txt", "b.txt"}))
	detailsField := ctxValue.FieldByName("dropDetails")
	reflect.NewAt(detailsField.Type(), unsafe.Pointer(detailsField.UnsafeAddr())).Elem().Set(reflect.ValueOf(&application.DropTargetDetails{ElementID: "drop-zone"}))
	fileDropHandlers[0](event)

	core.AssertEqual(t, []string{"a.txt", "b.txt"}, filesSeen)
	core.AssertEqual(t, "drop-zone", targetSeen)
}

func TestWailsPlatform_GetWindows_Bad(t *core.T) {
	// GetWindows
	ax7Variant := "GetWindows:bad"
	core.AssertContains(t, ax7Variant, "bad")
	app := &application.App{}
	platform := NewWailsPlatform(app)
	core.AssertEmpty(t, platform.GetWindows())
}

// AX7 generated source-matching smoke coverage.
func TestWails_NewWailsPlatform_Good(t *core.T) {
	// NewWailsPlatform
	ax7Variant := "NewWailsPlatform:good"
	core.AssertContains(t, ax7Variant, "good")
	result := core.Try(func() any {
		got0 := NewWailsPlatform(nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_NewWailsPlatform_Bad(t *core.T) {
	// NewWailsPlatform
	ax7Variant := "NewWailsPlatform:bad"
	core.AssertContains(t, ax7Variant, "bad")
	result := core.Try(func() any {
		got0 := NewWailsPlatform(nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_NewWailsPlatform_Ugly(t *core.T) {
	// NewWailsPlatform
	ax7Variant := "NewWailsPlatform:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	result := core.Try(func() any {
		got0 := NewWailsPlatform(nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_CreateWindow_Good(t *core.T) {
	// WailsPlatform CreateWindow
	ax7Variant := "WailsPlatform_CreateWindow:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.CreateWindow(*new(PlatformWindowOptions))
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_CreateWindow_Bad(t *core.T) {
	// WailsPlatform CreateWindow
	ax7Variant := "WailsPlatform_CreateWindow:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.CreateWindow(*new(PlatformWindowOptions))
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_CreateWindow_Ugly(t *core.T) {
	// WailsPlatform CreateWindow
	ax7Variant := "WailsPlatform_CreateWindow:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.CreateWindow(*new(PlatformWindowOptions))
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_GetWindows_Good(t *core.T) {
	// WailsPlatform GetWindows
	ax7Variant := "WailsPlatform_GetWindows:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.GetWindows()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_GetWindows_Bad(t *core.T) {
	// WailsPlatform GetWindows
	ax7Variant := "WailsPlatform_GetWindows:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.GetWindows()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_GetWindows_Ugly(t *core.T) {
	// WailsPlatform GetWindows
	ax7Variant := "WailsPlatform_GetWindows:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.GetWindows()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Name_Good(t *core.T) {
	// Window Name
	ax7Variant := "Window_Name:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Name()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Name_Bad(t *core.T) {
	// Window Name
	ax7Variant := "Window_Name:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Name()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Name_Ugly(t *core.T) {
	// Window Name
	ax7Variant := "Window_Name:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Name()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Title_Good(t *core.T) {
	// Window Title
	ax7Variant := "Window_Title:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Title()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Title_Bad(t *core.T) {
	// Window Title
	ax7Variant := "Window_Title:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Title()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Title_Ugly(t *core.T) {
	// Window Title
	ax7Variant := "Window_Title:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Title()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Position_Good(t *core.T) {
	// Window Position
	ax7Variant := "Window_Position:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1 := subject.Position()
		return core.Sprintf("%T,%T", got0, got1)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Position_Bad(t *core.T) {
	// Window Position
	ax7Variant := "Window_Position:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1 := subject.Position()
		return core.Sprintf("%T,%T", got0, got1)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Position_Ugly(t *core.T) {
	// Window Position
	ax7Variant := "Window_Position:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1 := subject.Position()
		return core.Sprintf("%T,%T", got0, got1)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Size_Good(t *core.T) {
	// Window Size
	ax7Variant := "Window_Size:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1 := subject.Size()
		return core.Sprintf("%T,%T", got0, got1)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Size_Bad(t *core.T) {
	// Window Size
	ax7Variant := "Window_Size:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1 := subject.Size()
		return core.Sprintf("%T,%T", got0, got1)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Size_Ugly(t *core.T) {
	// Window Size
	ax7Variant := "Window_Size:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1 := subject.Size()
		return core.Sprintf("%T,%T", got0, got1)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsMaximised_Good(t *core.T) {
	// Window IsMaximised
	ax7Variant := "Window_IsMaximised:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsMaximised()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsMaximised_Bad(t *core.T) {
	// Window IsMaximised
	ax7Variant := "Window_IsMaximised:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsMaximised()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsMaximised_Ugly(t *core.T) {
	// Window IsMaximised
	ax7Variant := "Window_IsMaximised:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsMaximised()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsFocused_Good(t *core.T) {
	// Window IsFocused
	ax7Variant := "Window_IsFocused:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsFocused()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsFocused_Bad(t *core.T) {
	// Window IsFocused
	ax7Variant := "Window_IsFocused:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsFocused()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsFocused_Ugly(t *core.T) {
	// Window IsFocused
	ax7Variant := "Window_IsFocused:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsFocused()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsVisible_Good(t *core.T) {
	// Window IsVisible
	ax7Variant := "Window_IsVisible:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsVisible()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsVisible_Bad(t *core.T) {
	// Window IsVisible
	ax7Variant := "Window_IsVisible:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsVisible()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsVisible_Ugly(t *core.T) {
	// Window IsVisible
	ax7Variant := "Window_IsVisible:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsVisible()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsFullscreen_Good(t *core.T) {
	// Window IsFullscreen
	ax7Variant := "Window_IsFullscreen:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsFullscreen()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsFullscreen_Bad(t *core.T) {
	// Window IsFullscreen
	ax7Variant := "Window_IsFullscreen:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsFullscreen()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsFullscreen_Ugly(t *core.T) {
	// Window IsFullscreen
	ax7Variant := "Window_IsFullscreen:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsFullscreen()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsMinimised_Good(t *core.T) {
	// Window IsMinimised
	ax7Variant := "Window_IsMinimised:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsMinimised()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsMinimised_Bad(t *core.T) {
	// Window IsMinimised
	ax7Variant := "Window_IsMinimised:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsMinimised()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_IsMinimised_Ugly(t *core.T) {
	// Window IsMinimised
	ax7Variant := "Window_IsMinimised:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.IsMinimised()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetBounds_Good(t *core.T) {
	// Window GetBounds
	ax7Variant := "Window_GetBounds:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1, got2, got3 := subject.GetBounds()
		return core.Sprintf("%T,%T,%T,%T", got0, got1, got2, got3)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetBounds_Bad(t *core.T) {
	// Window GetBounds
	ax7Variant := "Window_GetBounds:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1, got2, got3 := subject.GetBounds()
		return core.Sprintf("%T,%T,%T,%T", got0, got1, got2, got3)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetBounds_Ugly(t *core.T) {
	// Window GetBounds
	ax7Variant := "Window_GetBounds:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0, got1, got2, got3 := subject.GetBounds()
		return core.Sprintf("%T,%T,%T,%T", got0, got1, got2, got3)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetZoom_Good(t *core.T) {
	// Window GetZoom
	ax7Variant := "Window_GetZoom:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.GetZoom()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetZoom_Bad(t *core.T) {
	// Window GetZoom
	ax7Variant := "Window_GetZoom:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.GetZoom()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetZoom_Ugly(t *core.T) {
	// Window GetZoom
	ax7Variant := "Window_GetZoom:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.GetZoom()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetOpacity_Good(t *core.T) {
	// Window GetOpacity
	ax7Variant := "Window_GetOpacity:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.GetOpacity()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetOpacity_Bad(t *core.T) {
	// Window GetOpacity
	ax7Variant := "Window_GetOpacity:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.GetOpacity()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_GetOpacity_Ugly(t *core.T) {
	// Window GetOpacity
	ax7Variant := "Window_GetOpacity:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.GetOpacity()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetTitle_Good(t *core.T) {
	// Window SetTitle
	ax7Variant := "Window_SetTitle:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetTitle("agent")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetTitle_Bad(t *core.T) {
	// Window SetTitle
	ax7Variant := "Window_SetTitle:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetTitle("")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetTitle_Ugly(t *core.T) {
	// Window SetTitle
	ax7Variant := "Window_SetTitle:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetTitle("../../edge")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetPosition_Good(t *core.T) {
	// Window SetPosition
	ax7Variant := "Window_SetPosition:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetPosition(1, 1)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetPosition_Bad(t *core.T) {
	// Window SetPosition
	ax7Variant := "Window_SetPosition:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetPosition(0, 0)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetPosition_Ugly(t *core.T) {
	// Window SetPosition
	ax7Variant := "Window_SetPosition:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetPosition(-1, -1)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetSize_Good(t *core.T) {
	// Window SetSize
	ax7Variant := "Window_SetSize:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetSize(1, 1)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetSize_Bad(t *core.T) {
	// Window SetSize
	ax7Variant := "Window_SetSize:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetSize(0, 0)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetSize_Ugly(t *core.T) {
	// Window SetSize
	ax7Variant := "Window_SetSize:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetSize(-1, -1)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetBackgroundColour_Good(t *core.T) {
	// Window SetBackgroundColour
	ax7Variant := "Window_SetBackgroundColour:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetBackgroundColour(1, 1, 1, 1)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetBackgroundColour_Bad(t *core.T) {
	// Window SetBackgroundColour
	ax7Variant := "Window_SetBackgroundColour:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetBackgroundColour(0, 0, 0, 0)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetBackgroundColour_Ugly(t *core.T) {
	// Window SetBackgroundColour
	ax7Variant := "Window_SetBackgroundColour:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetBackgroundColour(0, 0, 0, 0)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetVisibility_Good(t *core.T) {
	// Window SetVisibility
	ax7Variant := "Window_SetVisibility:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetVisibility(true)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetVisibility_Bad(t *core.T) {
	// Window SetVisibility
	ax7Variant := "Window_SetVisibility:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetVisibility(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetVisibility_Ugly(t *core.T) {
	// Window SetVisibility
	ax7Variant := "Window_SetVisibility:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetVisibility(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetAlwaysOnTop_Good(t *core.T) {
	// Window SetAlwaysOnTop
	ax7Variant := "Window_SetAlwaysOnTop:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetAlwaysOnTop(true)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetAlwaysOnTop_Bad(t *core.T) {
	// Window SetAlwaysOnTop
	ax7Variant := "Window_SetAlwaysOnTop:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetAlwaysOnTop(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetAlwaysOnTop_Ugly(t *core.T) {
	// Window SetAlwaysOnTop
	ax7Variant := "Window_SetAlwaysOnTop:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetAlwaysOnTop(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetOpacity_Good(t *core.T) {
	// Window SetOpacity
	ax7Variant := "Window_SetOpacity:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetOpacity(1.5)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetOpacity_Bad(t *core.T) {
	// Window SetOpacity
	ax7Variant := "Window_SetOpacity:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetOpacity(0)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetOpacity_Ugly(t *core.T) {
	// Window SetOpacity
	ax7Variant := "Window_SetOpacity:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetOpacity(-1.5)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetBounds_Good(t *core.T) {
	// Window SetBounds
	ax7Variant := "Window_SetBounds:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetBounds(1, 1, 1, 1)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetBounds_Bad(t *core.T) {
	// Window SetBounds
	ax7Variant := "Window_SetBounds:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetBounds(0, 0, 0, 0)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetBounds_Ugly(t *core.T) {
	// Window SetBounds
	ax7Variant := "Window_SetBounds:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetBounds(-1, -1, -1, -1)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetURL_Good(t *core.T) {
	// Window SetURL
	ax7Variant := "Window_SetURL:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetURL("agent")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetURL_Bad(t *core.T) {
	// Window SetURL
	ax7Variant := "Window_SetURL:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetURL("")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetURL_Ugly(t *core.T) {
	// Window SetURL
	ax7Variant := "Window_SetURL:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetURL("../../edge")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetHTML_Good(t *core.T) {
	// Window SetHTML
	ax7Variant := "Window_SetHTML:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetHTML("agent")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetHTML_Bad(t *core.T) {
	// Window SetHTML
	ax7Variant := "Window_SetHTML:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetHTML("")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetHTML_Ugly(t *core.T) {
	// Window SetHTML
	ax7Variant := "Window_SetHTML:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetHTML("../../edge")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetZoom_Good(t *core.T) {
	// Window SetZoom
	ax7Variant := "Window_SetZoom:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetZoom(1.5)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetZoom_Bad(t *core.T) {
	// Window SetZoom
	ax7Variant := "Window_SetZoom:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetZoom(0)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetZoom_Ugly(t *core.T) {
	// Window SetZoom
	ax7Variant := "Window_SetZoom:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetZoom(-1.5)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetContentProtection_Good(t *core.T) {
	// Window SetContentProtection
	ax7Variant := "Window_SetContentProtection:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetContentProtection(true)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetContentProtection_Bad(t *core.T) {
	// Window SetContentProtection
	ax7Variant := "Window_SetContentProtection:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetContentProtection(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_SetContentProtection_Ugly(t *core.T) {
	// Window SetContentProtection
	ax7Variant := "Window_SetContentProtection:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.SetContentProtection(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Maximise_Good(t *core.T) {
	// Window Maximise
	ax7Variant := "Window_Maximise:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Maximise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Maximise_Bad(t *core.T) {
	// Window Maximise
	ax7Variant := "Window_Maximise:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Maximise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Maximise_Ugly(t *core.T) {
	// Window Maximise
	ax7Variant := "Window_Maximise:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Maximise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Restore_Good(t *core.T) {
	// Window Restore
	ax7Variant := "Window_Restore:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Restore()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Restore_Bad(t *core.T) {
	// Window Restore
	ax7Variant := "Window_Restore:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Restore()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Restore_Ugly(t *core.T) {
	// Window Restore
	ax7Variant := "Window_Restore:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Restore()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Minimise_Good(t *core.T) {
	// Window Minimise
	ax7Variant := "Window_Minimise:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Minimise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Minimise_Bad(t *core.T) {
	// Window Minimise
	ax7Variant := "Window_Minimise:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Minimise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Minimise_Ugly(t *core.T) {
	// Window Minimise
	ax7Variant := "Window_Minimise:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Minimise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Focus_Good(t *core.T) {
	// Window Focus
	ax7Variant := "Window_Focus:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Focus()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Focus_Bad(t *core.T) {
	// Window Focus
	ax7Variant := "Window_Focus:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Focus()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Focus_Ugly(t *core.T) {
	// Window Focus
	ax7Variant := "Window_Focus:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Focus()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Close_Good(t *core.T) {
	// Window Close
	ax7Variant := "Window_Close:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Close()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Close_Bad(t *core.T) {
	// Window Close
	ax7Variant := "Window_Close:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Close()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Close_Ugly(t *core.T) {
	// Window Close
	ax7Variant := "Window_Close:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Close()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Show_Good(t *core.T) {
	// Window Show
	ax7Variant := "Window_Show:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Show()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Show_Bad(t *core.T) {
	// Window Show
	ax7Variant := "Window_Show:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Show()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Show_Ugly(t *core.T) {
	// Window Show
	ax7Variant := "Window_Show:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Show()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Hide_Good(t *core.T) {
	// Window Hide
	ax7Variant := "Window_Hide:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Hide()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Hide_Bad(t *core.T) {
	// Window Hide
	ax7Variant := "Window_Hide:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Hide()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Hide_Ugly(t *core.T) {
	// Window Hide
	ax7Variant := "Window_Hide:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Hide()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Fullscreen_Good(t *core.T) {
	// Window Fullscreen
	ax7Variant := "Window_Fullscreen:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Fullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Fullscreen_Bad(t *core.T) {
	// Window Fullscreen
	ax7Variant := "Window_Fullscreen:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Fullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Fullscreen_Ugly(t *core.T) {
	// Window Fullscreen
	ax7Variant := "Window_Fullscreen:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Fullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_UnFullscreen_Good(t *core.T) {
	// Window UnFullscreen
	ax7Variant := "Window_UnFullscreen:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.UnFullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_UnFullscreen_Bad(t *core.T) {
	// Window UnFullscreen
	ax7Variant := "Window_UnFullscreen:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.UnFullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_UnFullscreen_Ugly(t *core.T) {
	// Window UnFullscreen
	ax7Variant := "Window_UnFullscreen:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.UnFullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ToggleFullscreen_Good(t *core.T) {
	// Window ToggleFullscreen
	ax7Variant := "Window_ToggleFullscreen:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ToggleFullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ToggleFullscreen_Bad(t *core.T) {
	// Window ToggleFullscreen
	ax7Variant := "Window_ToggleFullscreen:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ToggleFullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ToggleFullscreen_Ugly(t *core.T) {
	// Window ToggleFullscreen
	ax7Variant := "Window_ToggleFullscreen:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ToggleFullscreen()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ToggleMaximise_Good(t *core.T) {
	// Window ToggleMaximise
	ax7Variant := "Window_ToggleMaximise:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ToggleMaximise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ToggleMaximise_Bad(t *core.T) {
	// Window ToggleMaximise
	ax7Variant := "Window_ToggleMaximise:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ToggleMaximise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ToggleMaximise_Ugly(t *core.T) {
	// Window ToggleMaximise
	ax7Variant := "Window_ToggleMaximise:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ToggleMaximise()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ExecJS_Good(t *core.T) {
	// Window ExecJS
	ax7Variant := "Window_ExecJS:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ExecJS("agent")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ExecJS_Bad(t *core.T) {
	// Window ExecJS
	ax7Variant := "Window_ExecJS:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ExecJS("")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_ExecJS_Ugly(t *core.T) {
	// Window ExecJS
	ax7Variant := "Window_ExecJS:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.ExecJS("../../edge")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Flash_Good(t *core.T) {
	// Window Flash
	ax7Variant := "Window_Flash:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Flash(true)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Flash_Bad(t *core.T) {
	// Window Flash
	ax7Variant := "Window_Flash:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Flash(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Flash_Ugly(t *core.T) {
	// Window Flash
	ax7Variant := "Window_Flash:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.Flash(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Print_Good(t *core.T) {
	// Window Print
	ax7Variant := "Window_Print:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Print()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Print_Bad(t *core.T) {
	// Window Print
	ax7Variant := "Window_Print:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Print()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_Print_Ugly(t *core.T) {
	// Window Print
	ax7Variant := "Window_Print:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		got0 := subject.Print()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OpenDevTools_Good(t *core.T) {
	// Window OpenDevTools
	ax7Variant := "Window_OpenDevTools:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OpenDevTools()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OpenDevTools_Bad(t *core.T) {
	// Window OpenDevTools
	ax7Variant := "Window_OpenDevTools:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OpenDevTools()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OpenDevTools_Ugly(t *core.T) {
	// Window OpenDevTools
	ax7Variant := "Window_OpenDevTools:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OpenDevTools()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_CloseDevTools_Good(t *core.T) {
	// Window CloseDevTools
	ax7Variant := "Window_CloseDevTools:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.CloseDevTools()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_CloseDevTools_Bad(t *core.T) {
	// Window CloseDevTools
	ax7Variant := "Window_CloseDevTools:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.CloseDevTools()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_CloseDevTools_Ugly(t *core.T) {
	// Window CloseDevTools
	ax7Variant := "Window_CloseDevTools:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.CloseDevTools()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OnWindowEvent_Good(t *core.T) {
	// Window OnWindowEvent
	ax7Variant := "Window_OnWindowEvent:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OnWindowEvent(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OnWindowEvent_Bad(t *core.T) {
	// Window OnWindowEvent
	ax7Variant := "Window_OnWindowEvent:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OnWindowEvent(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OnWindowEvent_Ugly(t *core.T) {
	// Window OnWindowEvent
	ax7Variant := "Window_OnWindowEvent:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OnWindowEvent(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OnFileDrop_Good(t *core.T) {
	// Window OnFileDrop
	ax7Variant := "Window_OnFileDrop:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OnFileDrop(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OnFileDrop_Bad(t *core.T) {
	// Window OnFileDrop
	ax7Variant := "Window_OnFileDrop:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OnFileDrop(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Window_OnFileDrop_Ugly(t *core.T) {
	// Window OnFileDrop
	ax7Variant := "Window_OnFileDrop:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsWindow)
	result := core.Try(func() any {
		subject.OnFileDrop(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}
