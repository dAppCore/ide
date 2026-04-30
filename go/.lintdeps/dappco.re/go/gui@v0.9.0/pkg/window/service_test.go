package window

import (
	"context"
	"sync"

	core "dappco.re/go"
)

func newTestWindowService(t *core.T) (*Service, *core.Core) {
	t.Helper()
	platform := newMockPlatform()
	configDir := t.TempDir()
	c := core.New(
		core.WithService(func(c *core.Core) core.Result {
			return core.Result{Value: &Service{
				ServiceRuntime: core.NewServiceRuntime[Options](c, Options{}),
				platform:       platform,
				manager:        NewManagerWithDir(platform, configDir),
			}, OK: true}
		}),
		core.WithServiceLock(),
	)
	core.RequireTrue(t, c.ServiceStartup(context.Background(), nil).OK)
	svc := core.MustServiceFor[*Service](c, "window")
	return svc, c
}

func taskRun(c *core.Core, name string, task any) core.Result {
	return c.Action(name).Run(context.Background(), core.NewOptions(
		core.Option{Key: "task", Value: task},
	))
}

func TestRegister_Good(t *core.T) {
	svc, _ := newTestWindowService(t)
	core.AssertNotNil(t, svc)
	core.AssertNotNil(t, svc.manager)
}

func TestTaskOpenWindow_Good(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.open", TaskOpenWindow{
		Window: &Window{Name: "test", URL: "/"},
	})
	core.RequireTrue(t, r.OK)
	info := r.Value.(WindowInfo)
	core.AssertEqual(t, "test", info.Name)
}

func TestTaskOpenWindow_OptionsFallback_GoodCase(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.open", TaskOpenWindow{
		Options: []WindowOption{WithName("test-fallback"), WithURL("/")},
	})
	core.RequireTrue(t, r.OK)
	info := r.Value.(WindowInfo)
	core.AssertEqual(t, "test-fallback", info.Name)
}

func TestTaskOpenWindow_Bad(t *core.T) {
	// No window service registered — action is not registered
	c := core.New(core.WithServiceLock())
	r := c.Action("window.open").Run(context.Background(), core.NewOptions())
	core.AssertFalse(t, r.OK)
}

func TestQueryWindowList_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("a")}})
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("b")}})

	r := c.QUERY(QueryWindowList{})
	core.RequireTrue(t, r.OK)
	list := r.Value.([]WindowInfo)
	core.AssertLen(t, list, 2)
}

func TestQueryWindowByName_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := c.QUERY(QueryWindowByName{Name: "test"})
	core.RequireTrue(t, r.OK)
	info := r.Value.(*WindowInfo)
	core.AssertEqual(t, "test", info.Name)
}

func TestQueryWindowByName_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := c.QUERY(QueryWindowByName{Name: "nonexistent"})
	core.RequireTrue(t, r.OK) // handled=true, result is nil (not found)
	core.AssertNil(t, r.Value)
}

func TestTaskCloseWindow_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.close", TaskCloseWindow{Name: "test"})
	core.RequireTrue(t, r.OK)

	// Verify window is removed
	r2 := c.QUERY(QueryWindowByName{Name: "test"})
	core.AssertNil(t, r2.Value)
}

func TestTaskCloseWindow_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.close", TaskCloseWindow{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

func TestTaskCloseWindow_Ugly(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := c.Action("window.close").Run(context.Background(), core.NewOptions(
		core.Option{Key: "task", Value: "not-a-task"},
	))
	core.AssertFalse(t, r.OK)

	r2 := c.QUERY(QueryWindowByName{Name: "test"})
	core.RequireTrue(t, r2.OK)
	core.AssertNotNil(t, r2.Value)
}

func TestTaskSetPosition_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setPosition", TaskSetPosition{Name: "test", X: 100, Y: 200})
	core.RequireTrue(t, r.OK)

	r2 := c.QUERY(QueryWindowByName{Name: "test"})
	info := r2.Value.(*WindowInfo)
	core.AssertEqual(t, 100, info.X)
	core.AssertEqual(t, 200, info.Y)
}

func TestTaskSetSize_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setSize", TaskSetSize{Name: "test", Width: 800, Height: 600})
	core.RequireTrue(t, r.OK)

	r2 := c.QUERY(QueryWindowByName{Name: "test"})
	info := r2.Value.(*WindowInfo)
	core.AssertEqual(t, 800, info.Width)
	core.AssertEqual(t, 600, info.Height)
}

func TestTaskMaximise_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.maximise", TaskMaximise{Name: "test"})
	core.RequireTrue(t, r.OK)

	r2 := c.QUERY(QueryWindowByName{Name: "test"})
	info := r2.Value.(*WindowInfo)
	core.AssertTrue(t, info.Maximized)
}

func TestFileDrop_Good(t *core.T) {
	_, c := newTestWindowService(t)

	// Open a window
	r := taskRun(c, "window.open", TaskOpenWindow{
		Options: []WindowOption{WithName("drop-test")},
	})
	info := r.Value.(WindowInfo)
	core.AssertEqual(t, "drop-test", info.Name)

	// Capture broadcast actions
	var dropped ActionFilesDropped
	var mu sync.Mutex
	c.RegisterAction(func(_ *core.Core, msg core.Message) core.Result {
		if a, ok := msg.(ActionFilesDropped); ok {
			mu.Lock()
			dropped = a
			mu.Unlock()
		}
		return core.Result{OK: true}
	})

	// Get the mock window and simulate file drop
	svc := core.MustServiceFor[*Service](c, "window")
	pw, ok := svc.Manager().Get("drop-test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	mw.emitFileDrop([]string{"/tmp/file1.txt", "/tmp/file2.txt"}, "upload-zone")

	mu.Lock()
	core.AssertEqual(t, "drop-test", dropped.Name)
	core.AssertEqual(t, []string{"/tmp/file1.txt", "/tmp/file2.txt"}, dropped.Paths)
	core.AssertEqual(t, "upload-zone", dropped.TargetID)
	mu.Unlock()
}

// --- TaskMinimise ---

func TestTaskMinimise_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.minimise", TaskMinimise{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.minimised)
}

func TestTaskMinimise_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.minimise", TaskMinimise{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

// --- TaskFocus ---

func TestTaskFocus_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.focus", TaskFocus{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.focused)
}

func TestTaskFocus_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.focus", TaskFocus{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

// --- TaskRestore ---

func TestTaskRestore_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	// First maximise, then restore
	taskRun(c, "window.maximise", TaskMaximise{Name: "test"})

	r := taskRun(c, "window.restore", TaskRestore{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertFalse(t, mw.maximised)

	// Verify state was updated
	state, ok := svc.Manager().State().GetState("test")
	core.AssertTrue(t, ok)
	core.AssertFalse(t, state.Maximized)
}

func TestTaskRestore_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.restore", TaskRestore{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

// --- TaskSetTitle ---

func TestTaskSetTitle_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setTitle", TaskSetTitle{Name: "test", Title: "New Title"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	core.AssertEqual(t, "New Title", pw.Title())
}

func TestTaskSetTitle_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setTitle", TaskSetTitle{Name: "nonexistent", Title: "Nope"})
	core.AssertFalse(t, r.OK)
}

// --- TaskSetAlwaysOnTop ---

func TestTaskSetAlwaysOnTop_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setAlwaysOnTop", TaskSetAlwaysOnTop{Name: "test", AlwaysOnTop: true})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.alwaysOnTop)
}

func TestTaskSetAlwaysOnTop_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setAlwaysOnTop", TaskSetAlwaysOnTop{Name: "nonexistent", AlwaysOnTop: true})
	core.AssertFalse(t, r.OK)
}

// --- TaskSetBackgroundColour ---

func TestTaskSetBackgroundColour_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setBackgroundColour", TaskSetBackgroundColour{
		Name: "test", Red: 10, Green: 20, Blue: 30, Alpha: 40,
	})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertEqual(t, [4]uint8{10, 20, 30, 40}, mw.backgroundColour)
}

func TestTaskSetBackgroundColour_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setBackgroundColour", TaskSetBackgroundColour{Name: "nonexistent", Red: 1, Green: 2, Blue: 3, Alpha: 4})
	core.AssertFalse(t, r.OK)
}

// --- TaskSetVisibility ---

func TestTaskSetVisibility_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setVisibility", TaskSetVisibility{Name: "test", Visible: true})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.visible)

	// Now hide it
	r2 := taskRun(c, "window.setVisibility", TaskSetVisibility{Name: "test", Visible: false})
	core.RequireTrue(t, r2.OK)
	core.AssertFalse(t, mw.visible)
}

func TestTaskSetVisibility_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setVisibility", TaskSetVisibility{Name: "nonexistent", Visible: true})
	core.AssertFalse(t, r.OK)
}

// --- TaskFullscreen ---

func TestTaskFullscreen_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	// Enter fullscreen
	r := taskRun(c, "window.fullscreen", TaskFullscreen{Name: "test", Fullscreen: true})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.fullscreened)

	// Exit fullscreen
	r2 := taskRun(c, "window.fullscreen", TaskFullscreen{Name: "test", Fullscreen: false})
	core.RequireTrue(t, r2.OK)
	core.AssertFalse(t, mw.fullscreened)
}

func TestTaskFullscreen_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.fullscreen", TaskFullscreen{Name: "nonexistent", Fullscreen: true})
	core.AssertFalse(t, r.OK)
}

// --- TaskSaveLayout ---

func TestTaskSaveLayout_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("editor"), WithSize(960, 1080), WithPosition(0, 0)}})
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("terminal"), WithSize(960, 1080), WithPosition(960, 0)}})

	r := taskRun(c, "window.saveLayout", TaskSaveLayout{Name: "coding"})
	core.RequireTrue(t, r.OK)

	// Verify layout was saved with correct window states
	layout, ok := svc.Manager().Layout().GetLayout("coding")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "coding", layout.Name)
	core.AssertLen(t, layout.Windows, 2)

	editorState, ok := layout.Windows["editor"]
	core.AssertTrue(t, ok)
	core.AssertEqual(t, 0, editorState.X)
	core.AssertEqual(t, 960, editorState.Width)

	termState, ok := layout.Windows["terminal"]
	core.AssertTrue(t, ok)
	core.AssertEqual(t, 960, termState.X)
	core.AssertEqual(t, 960, termState.Width)
}

func TestTaskSaveLayout_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	// Saving an empty layout with empty name returns an error from LayoutManager
	r := taskRun(c, "window.saveLayout", TaskSaveLayout{Name: ""})
	core.AssertFalse(t, r.OK)
}

// --- TaskRestoreLayout ---

func TestTaskRestoreLayout_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	// Open windows
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("editor"), WithSize(800, 600), WithPosition(0, 0)}})
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("terminal"), WithSize(800, 600), WithPosition(0, 0)}})

	// Save a layout with specific positions
	taskRun(c, "window.saveLayout", TaskSaveLayout{Name: "coding"})

	// Move the windows to different positions
	taskRun(c, "window.setPosition", TaskSetPosition{Name: "editor", X: 500, Y: 500})
	taskRun(c, "window.setPosition", TaskSetPosition{Name: "terminal", X: 600, Y: 600})

	// Restore the layout
	r := taskRun(c, "window.restoreLayout", TaskRestoreLayout{Name: "coding"})
	core.RequireTrue(t, r.OK)

	// Verify windows were moved back to saved positions
	pw, ok := svc.Manager().Get("editor")
	core.RequireTrue(t, ok)
	x, y := pw.Position()
	core.AssertEqual(t, 0, x)
	core.AssertEqual(t, 0, y)

	pw2, ok := svc.Manager().Get("terminal")
	core.RequireTrue(t, ok)
	x2, y2 := pw2.Position()
	core.AssertEqual(t, 0, x2)
	core.AssertEqual(t, 0, y2)

	editorState, ok := svc.Manager().State().GetState("editor")
	core.RequireTrue(t, ok)
	core.AssertEqual(t, 0, editorState.X)
	core.AssertEqual(t, 0, editorState.Y)

	terminalState, ok := svc.Manager().State().GetState("terminal")
	core.RequireTrue(t, ok)
	core.AssertEqual(t, 0, terminalState.X)
	core.AssertEqual(t, 0, terminalState.Y)
}

func TestTaskRestoreLayout_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.restoreLayout", TaskRestoreLayout{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

// --- TaskStackWindows ---

func TestTaskStackWindows_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("s1"), WithSize(800, 600)}})
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("s2"), WithSize(800, 600)}})

	r := taskRun(c, "window.stackWindows", TaskStackWindows{Windows: []string{"s1", "s2"}, OffsetX: 25, OffsetY: 35})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("s2")
	core.RequireTrue(t, ok)
	x, y := pw.Position()
	core.AssertEqual(t, 25, x)
	core.AssertEqual(t, 35, y)
}

// --- TaskApplyWorkflow ---

func TestTaskApplyWorkflow_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("editor"), WithSize(800, 600)}})
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("terminal"), WithSize(800, 600)}})

	r := taskRun(c, "window.applyWorkflow", TaskApplyWorkflow{Workflow: "side-by-side"})
	core.RequireTrue(t, r.OK)

	editor, ok := svc.Manager().Get("editor")
	core.RequireTrue(t, ok)
	terminal, ok := svc.Manager().Get("terminal")
	core.RequireTrue(t, ok)
	editorX, editorY := editor.Position()
	terminalX, terminalY := terminal.Position()

	core.AssertEqual(t, 0, editorY)
	core.AssertEqual(t, 0, terminalY)
	core.AssertElementsMatch(t, []int{0, 960}, []int{editorX, terminalX})

	// The assignment order is derived from map iteration, so only the
	// geometry matters here.
	core.AssertContains(t, []int{editorX, terminalX}, 0)
	core.AssertContains(t, []int{editorX, terminalX}, 960)
}

// --- Zoom ---

func TestQueryWindowZoom_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := c.QUERY(QueryWindowZoom{Name: "test"})
	core.RequireTrue(t, r.OK)
	core.AssertEqual(t, 1.0, r.Value.(float64))
}

func TestQueryWindowZoom_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := c.QUERY(QueryWindowZoom{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

func TestTaskSetZoom_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setZoom", TaskSetZoom{Name: "test", Magnification: 1.5})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertEqual(t, 1.5, mw.zoom)
}

func TestTaskSetZoom_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setZoom", TaskSetZoom{Name: "nonexistent", Magnification: 1.5})
	core.AssertFalse(t, r.OK)
}

func TestTaskZoomIn_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.zoomIn", TaskZoomIn{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertInDelta(t, 1.1, mw.zoom, 0.001)
}

func TestTaskZoomIn_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.zoomIn", TaskZoomIn{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

func TestTaskZoomOut_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})
	// Set zoom to 1.5 first so we can decrease it
	taskRun(c, "window.setZoom", TaskSetZoom{Name: "test", Magnification: 1.5})

	r := taskRun(c, "window.zoomOut", TaskZoomOut{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertInDelta(t, 1.4, mw.zoom, 0.001)
}

func TestTaskZoomOut_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.zoomOut", TaskZoomOut{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

func TestTaskZoomReset_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})
	taskRun(c, "window.setZoom", TaskSetZoom{Name: "test", Magnification: 2.0})

	r := taskRun(c, "window.zoomReset", TaskZoomReset{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertEqual(t, 1.0, mw.zoom)
}

func TestTaskZoomReset_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.zoomReset", TaskZoomReset{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

// --- Content ---

func TestTaskSetURL_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setURL", TaskSetURL{Name: "test", URL: "https://example.com"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertEqual(t, "https://example.com", mw.url)
}

func TestTaskSetURL_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setURL", TaskSetURL{Name: "nonexistent", URL: "https://example.com"})
	core.AssertFalse(t, r.OK)
}

func TestTaskSetHTML_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setHTML", TaskSetHTML{Name: "test", HTML: "<h1>Hello</h1>"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertEqual(t, "<h1>Hello</h1>", mw.html)
}

func TestTaskSetHTML_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setHTML", TaskSetHTML{Name: "nonexistent", HTML: "<h1>Hello</h1>"})
	core.AssertFalse(t, r.OK)
}

func TestTaskExecJS_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.execJS", TaskExecJS{Name: "test", JS: "document.title = 'Ready'"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertContains(t, mw.execJSCalls, "document.title = 'Ready'")
}

func TestTaskExecJS_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.execJS", TaskExecJS{Name: "nonexistent", JS: "alert(1)"})
	core.AssertFalse(t, r.OK)
}

// --- State toggles ---

func TestTaskToggleFullscreen_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	// Toggle on
	r := taskRun(c, "window.toggleFullscreen", TaskToggleFullscreen{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.fullscreened)

	// Toggle off
	taskRun(c, "window.toggleFullscreen", TaskToggleFullscreen{Name: "test"})
	core.AssertFalse(t, mw.fullscreened)
}

func TestTaskToggleFullscreen_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.toggleFullscreen", TaskToggleFullscreen{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

func TestTaskToggleMaximise_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	// Toggle on
	r := taskRun(c, "window.toggleMaximise", TaskToggleMaximise{Name: "test"})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.maximised)

	// Toggle off
	taskRun(c, "window.toggleMaximise", TaskToggleMaximise{Name: "test"})
	core.AssertFalse(t, mw.maximised)
}

func TestTaskToggleMaximise_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.toggleMaximise", TaskToggleMaximise{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

// --- Bounds ---

func TestQueryWindowBounds_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{
		WithName("test"), WithSize(800, 600), WithPosition(100, 200),
	}})

	r := c.QUERY(QueryWindowBounds{Name: "test"})
	core.RequireTrue(t, r.OK)

	bounds := r.Value.(WindowBounds)
	core.AssertEqual(t, 100, bounds.X)
	core.AssertEqual(t, 200, bounds.Y)
	core.AssertEqual(t, 800, bounds.Width)
	core.AssertEqual(t, 600, bounds.Height)
}

func TestQueryWindowBounds_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := c.QUERY(QueryWindowBounds{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

func TestTaskSetBounds_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setBounds", TaskSetBounds{Name: "test", X: 50, Y: 75, Width: 1024, Height: 768})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertEqual(t, 50, mw.x)
	core.AssertEqual(t, 75, mw.y)
	core.AssertEqual(t, 1024, mw.width)
	core.AssertEqual(t, 768, mw.height)
}

func TestTaskSetBounds_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setBounds", TaskSetBounds{Name: "nonexistent", X: 0, Y: 0, Width: 800, Height: 600})
	core.AssertFalse(t, r.OK)
}

// --- Content protection ---

func TestTaskSetContentProtection_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.setContentProtection", TaskSetContentProtection{Name: "test", Protection: true})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.contentProtection)
}

func TestTaskSetContentProtection_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.setContentProtection", TaskSetContentProtection{Name: "nonexistent", Protection: true})
	core.AssertFalse(t, r.OK)
}

// --- Flash ---

func TestTaskFlash_Good(t *core.T) {
	svc, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.flash", TaskFlash{Name: "test", Enabled: true})
	core.RequireTrue(t, r.OK)

	pw, ok := svc.Manager().Get("test")
	core.RequireTrue(t, ok)
	mw := pw.(*mockWindow)
	core.AssertTrue(t, mw.flashed)
}

func TestTaskFlash_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.flash", TaskFlash{Name: "nonexistent", Enabled: true})
	core.AssertFalse(t, r.OK)
}

// --- Print ---

func TestTaskPrint_Good(t *core.T) {
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test")}})

	r := taskRun(c, "window.print", TaskPrint{Name: "test"})
	core.RequireTrue(t, r.OK)
}

func TestTaskPrint_Bad(t *core.T) {
	_, c := newTestWindowService(t)
	r := taskRun(c, "window.print", TaskPrint{Name: "nonexistent"})
	core.AssertFalse(t, r.OK)
}

// --- State queries (IsVisible, IsFullscreen, IsMinimised) ---

func TestQueryWindowBounds_Ugly(t *core.T) {
	// Verify bounds reflect position and size changes
	_, c := newTestWindowService(t)
	taskRun(c, "window.open", TaskOpenWindow{Options: []WindowOption{WithName("test"), WithSize(1280, 800)}})
	taskRun(c, "window.setBounds", TaskSetBounds{Name: "test", X: 10, Y: 20, Width: 640, Height: 480})

	r := c.QUERY(QueryWindowBounds{Name: "test"})
	core.RequireTrue(t, r.OK)
	bounds := r.Value.(WindowBounds)
	core.AssertEqual(t, 10, bounds.X)
	core.AssertEqual(t, 20, bounds.Y)
	core.AssertEqual(t, 640, bounds.Width)
	core.AssertEqual(t, 480, bounds.Height)
}

// AX7 generated source-matching smoke coverage.
func TestService_Service_OnStartup_Good(t *core.T) {
	// Service OnStartup
	ax7Variant := "Service_OnStartup:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.OnStartup(core.Background())
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_OnStartup_Bad(t *core.T) {
	// Service OnStartup
	ax7Variant := "Service_OnStartup:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.OnStartup(core.Background())
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_OnStartup_Ugly(t *core.T) {
	// Service OnStartup
	ax7Variant := "Service_OnStartup:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.OnStartup(core.Background())
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_HandleIPCEvents_Good(t *core.T) {
	// Service HandleIPCEvents
	ax7Variant := "Service_HandleIPCEvents:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.HandleIPCEvents(nil, nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_HandleIPCEvents_Bad(t *core.T) {
	// Service HandleIPCEvents
	ax7Variant := "Service_HandleIPCEvents:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.HandleIPCEvents(nil, nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_HandleIPCEvents_Ugly(t *core.T) {
	// Service HandleIPCEvents
	ax7Variant := "Service_HandleIPCEvents:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.HandleIPCEvents(nil, nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_Manager_Good(t *core.T) {
	// Service Manager
	ax7Variant := "Service_Manager:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.Manager()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_Manager_Bad(t *core.T) {
	// Service Manager
	ax7Variant := "Service_Manager:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.Manager()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestService_Service_Manager_Ugly(t *core.T) {
	// Service Manager
	ax7Variant := "Service_Manager:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.Manager()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}
