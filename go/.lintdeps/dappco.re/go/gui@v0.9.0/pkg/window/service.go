package window

import (
	"context"

	core "dappco.re/go"
	"dappco.re/go/gui/pkg/internal/coreutil"
	"dappco.re/go/gui/pkg/screen"
)

type Options struct{}

type Service struct {
	*core.ServiceRuntime[Options]
	manager  *Manager
	platform Platform
}

func (s *Service) OnStartup(_ context.Context) core.Result {
	// Query config — display registers its handler before us (registration order guarantee).
	// If display is not registered, OK=false and we skip config.
	r := s.Core().QUERY(QueryConfig{})
	if r.OK {
		if windowConfig, ok := r.Value.(map[string]any); ok {
			s.applyConfig(windowConfig)
		}
	}

	s.Core().RegisterQuery(s.handleQuery)
	s.registerTaskActions()
	return core.Result{OK: true}
}

func (s *Service) applyConfig(configData map[string]any) {
	if width, ok := configData["default_width"]; ok {
		if width, ok := width.(int); ok {
			s.manager.SetDefaultWidth(width)
		}
	}
	if height, ok := configData["default_height"]; ok {
		if height, ok := height.(int); ok {
			s.manager.SetDefaultHeight(height)
		}
	}
	if stateFile, ok := configData["state_file"]; ok {
		if stateFile, ok := stateFile.(string); ok {
			s.manager.State().SetPath(stateFile)
		}
	}
}

func (s *Service) HandleIPCEvents(_ *core.Core, _ core.Message) core.Result {
	return core.Result{OK: true}
}

func (s *Service) handleQuery(_ *core.Core, q core.Query) core.Result {
	switch q := q.(type) {
	case QueryWindowList:
		return core.Result{Value: s.queryWindowList(), OK: true}
	case QueryWindowByName:
		return core.Result{Value: s.queryWindowByName(q.Name), OK: true}
	case QueryLayoutList:
		return core.Result{Value: s.manager.Layout().ListLayouts(), OK: true}
	case QueryLayoutGet:
		l, ok := s.manager.Layout().GetLayout(q.Name)
		if !ok {
			return core.Result{Value: (*Layout)(nil), OK: true}
		}
		return core.Result{Value: &l, OK: true}
	case QueryWindowZoom:
		return s.queryWindowZoom(q.Name)
	case QueryWindowBounds:
		return s.queryWindowBounds(q.Name)
	default:
		return core.Result{}
	}
}

func (s *Service) queryWindowList() []WindowInfo {
	names := s.manager.List()
	result := make([]WindowInfo, 0, len(names))
	for _, name := range names {
		if pw, ok := s.manager.Get(name); ok {
			x, y := pw.Position()
			w, h := pw.Size()
			result = append(result, WindowInfo{
				Name: name, Title: pw.Title(), X: x, Y: y, Width: w, Height: h,
				Opacity:   pw.GetOpacity(),
				Maximized: pw.IsMaximised(),
				Focused:   pw.IsFocused(),
			})
		}
	}
	return result
}

func (s *Service) queryWindowByName(name string) *WindowInfo {
	pw, ok := s.manager.Get(name)
	if !ok {
		return nil
	}
	x, y := pw.Position()
	w, h := pw.Size()
	return &WindowInfo{
		Name: name, Title: pw.Title(), X: x, Y: y, Width: w, Height: h,
		Opacity:   pw.GetOpacity(),
		Maximized: pw.IsMaximised(),
		Focused:   pw.IsFocused(),
	}
}

// --- Action Registration ---

// registerTaskActions registers all window task handlers as named Core actions.
func (s *Service) registerTaskActions() {
	c := s.Core()
	c.Action("window.open", func(_ context.Context, opts core.Options) core.Result {
		t := taskOpenWindowFromOptions(opts)
		return s.taskOpenWindow(t)
	})
	c.Action("gui.window.create", func(_ context.Context, opts core.Options) core.Result {
		t := taskOpenWindowFromOptions(opts)
		return s.taskOpenWindow(t)
	})
	c.Action("gui.window.open", func(_ context.Context, opts core.Options) core.Result {
		t := taskOpenWindowFromOptions(opts)
		return s.taskOpenWindow(t)
	})
	c.Action("window.close", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskCloseWindow]("window.close", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskCloseWindow(t.Name))
	})
	c.Action("window.setPosition", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetPosition]("window.setPosition", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetPosition(t.Name, t.X, t.Y))
	})
	c.Action("window.setSize", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetSize]("window.setSize", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetSize(t.Name, t.Width, t.Height))
	})
	c.Action("window.maximise", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskMaximise]("window.maximise", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskMaximise(t.Name))
	})
	c.Action("window.minimise", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskMinimise]("window.minimise", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskMinimise(t.Name))
	})
	c.Action("window.focus", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskFocus]("window.focus", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskFocus(t.Name))
	})
	c.Action("window.restore", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskRestore]("window.restore", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskRestore(t.Name))
	})
	c.Action("window.setTitle", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetTitle]("window.setTitle", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetTitle(t.Name, t.Title))
	})
	c.Action("window.setAlwaysOnTop", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetAlwaysOnTop]("window.setAlwaysOnTop", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetAlwaysOnTop(t.Name, t.AlwaysOnTop))
	})
	c.Action("window.setOpacity", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetOpacity]("window.setOpacity", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetOpacity(t.Name, t.Opacity))
	})
	c.Action("window.setBackgroundColour", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetBackgroundColour]("window.setBackgroundColour", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetBackgroundColour(t.Name, t.Red, t.Green, t.Blue, t.Alpha))
	})
	c.Action("window.setVisibility", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetVisibility]("window.setVisibility", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetVisibility(t.Name, t.Visible))
	})
	c.Action("window.fullscreen", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskFullscreen]("window.fullscreen", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskFullscreen(t.Name, t.Fullscreen))
	})
	c.Action("window.saveLayout", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSaveLayout]("window.saveLayout", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSaveLayout(t.Name))
	})
	c.Action("window.restoreLayout", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskRestoreLayout]("window.restoreLayout", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskRestoreLayout(t.Name))
	})
	c.Action("window.deleteLayout", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskDeleteLayout]("window.deleteLayout", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		s.manager.Layout().DeleteLayout(t.Name)
		return core.Result{OK: true}
	})
	c.Action("window.tileWindows", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskTileWindows]("window.tileWindows", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskTileWindows(t.Mode, t.Windows))
	})
	c.Action("window.stackWindows", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskStackWindows]("window.stackWindows", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskStackWindows(t.Windows, t.OffsetX, t.OffsetY))
	})
	c.Action("window.snapWindow", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSnapWindow]("window.snapWindow", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSnapWindow(t.Name, t.Position))
	})
	c.Action("window.applyWorkflow", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskApplyWorkflow]("window.applyWorkflow", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskApplyWorkflow(t.Workflow, t.Windows))
	})
	c.Action("window.layoutBesideEditor", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskLayoutBesideEditor]("window.layoutBesideEditor", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		result, err := s.taskLayoutBesideEditor(t)
		return core.Result{}.New(result, err)
	})
	c.Action("window.layoutSuggest", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskLayoutSuggest]("window.layoutSuggest", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: s.taskLayoutSuggest(t), OK: true}
	})
	c.Action("window.findSpace", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskScreenFindSpace]("window.findSpace", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: s.taskScreenFindSpace(t), OK: true}
	})
	c.Action("window.arrangePair", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskWindowArrangePair]("window.arrangePair", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		result, err := s.taskWindowArrangePair(t)
		return core.Result{}.New(result, err)
	})
	c.Action("window.setZoom", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetZoom]("window.setZoom", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetZoom(t.Name, t.Magnification))
	})
	c.Action("window.zoomIn", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskZoomIn]("window.zoomIn", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskZoomIn(t.Name))
	})
	c.Action("window.zoomOut", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskZoomOut]("window.zoomOut", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskZoomOut(t.Name))
	})
	c.Action("window.zoomReset", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskZoomReset]("window.zoomReset", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskZoomReset(t.Name))
	})
	c.Action("window.setURL", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetURL]("window.setURL", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetURL(t.Name, t.URL))
	})
	c.Action("window.setHTML", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetHTML]("window.setHTML", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetHTML(t.Name, t.HTML))
	})
	c.Action("window.execJS", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskExecJS]("window.execJS", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskExecJS(t.Name, t.JS))
	})
	c.Action("window.toggleFullscreen", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskToggleFullscreen]("window.toggleFullscreen", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskToggleFullscreen(t.Name))
	})
	c.Action("window.toggleMaximise", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskToggleMaximise]("window.toggleMaximise", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskToggleMaximise(t.Name))
	})
	c.Action("window.setBounds", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetBounds]("window.setBounds", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetBounds(t.Name, t.X, t.Y, t.Width, t.Height))
	})
	c.Action("window.setContentProtection", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskSetContentProtection]("window.setContentProtection", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskSetContentProtection(t.Name, t.Protection))
	})
	c.Action("window.flash", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskFlash]("window.flash", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskFlash(t.Name, t.Enabled))
	})
	c.Action("window.print", func(_ context.Context, opts core.Options) core.Result {
		t, err := taskFromOptions[TaskPrint]("window.print", opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: nil, OK: true}.New(s.taskPrint(t.Name))
	})
}

func taskFromOptions[T any](action string, opts core.Options) (T, error) {
	var zero T
	task := opts.Get("task")
	if !task.OK {
		return zero, core.E(action, "missing task payload", nil)
	}
	switch value := task.Value.(type) {
	case T:
		return value, nil
	case map[string]any:
		var decoded T
		if result := core.JSONUnmarshalString(core.JSONMarshalString(value), &decoded); result.OK {
			return decoded, nil
		}
	}
	return zero, core.E(action, "invalid task payload", nil)
}

func taskOpenWindowFromOptions(opts core.Options) TaskOpenWindow {
	if task := opts.Get("task"); task.OK {
		switch value := task.Value.(type) {
		case TaskOpenWindow:
			return value
		case map[string]any:
			var decoded TaskOpenWindow
			if result := core.JSONUnmarshalString(core.JSONMarshalString(value), &decoded); result.OK {
				return decoded
			}
		}
	}

	var decoded TaskOpenWindow
	if result := core.JSONUnmarshalString(core.JSONMarshalString(optsToMap(opts)), &decoded); result.OK {
		return decoded
	}
	return TaskOpenWindow{}
}

func optsToMap(opts core.Options) map[string]any {
	items := make(map[string]any, opts.Len())
	for _, item := range opts.Items() {
		items[item.Key] = item.Value
	}
	return items
}

func (s *Service) primaryScreenArea() (int, int, int, int) {
	const fallbackX = 0
	const fallbackY = 0
	const fallbackWidth = 1920
	const fallbackHeight = 1080

	r := s.Core().QUERY(screen.QueryPrimary{})
	if !r.OK {
		return fallbackX, fallbackY, fallbackWidth, fallbackHeight
	}

	primary, ok := r.Value.(*screen.Screen)
	if !ok || primary == nil {
		return fallbackX, fallbackY, fallbackWidth, fallbackHeight
	}

	x := primary.WorkArea.X
	y := primary.WorkArea.Y
	width := primary.WorkArea.Width
	height := primary.WorkArea.Height
	if width <= 0 || height <= 0 {
		x = primary.Bounds.X
		y = primary.Bounds.Y
		width = primary.Bounds.Width
		height = primary.Bounds.Height
	}
	if width <= 0 || height <= 0 {
		return fallbackX, fallbackY, fallbackWidth, fallbackHeight
	}

	return x, y, width, height
}

func (s *Service) taskOpenWindow(t TaskOpenWindow) core.Result {
	spec, err := s.buildWindowSpec(t)
	if err != nil {
		return core.Result{Value: err, OK: false}
	}
	if err := s.prepareWindowSpec(spec); err != nil {
		return core.Result{Value: err, OK: false}
	}

	pw, err := s.manager.Create(spec)
	if err != nil {
		return core.Result{Value: err, OK: false}
	}
	x, y := pw.Position()
	w, h := pw.Size()
	info := WindowInfo{Name: pw.Name(), Title: pw.Title(), X: x, Y: y, Width: w, Height: h, Opacity: pw.GetOpacity()}

	// Attach platform event listeners that convert to IPC actions
	s.trackWindow(pw)

	// Broadcast to all listeners
	coreutil.DispatchAction(s.Core(), "window.create", ActionWindowOpened{Name: pw.Name()})
	return core.Result{Value: info, OK: true}
}

// trackWindow attaches platform event listeners that emit IPC actions.
func (s *Service) trackWindow(pw PlatformWindow) {
	pw.OnWindowEvent(func(e WindowEvent) {
		switch e.Type {
		case "focus":
			coreutil.DispatchAction(s.Core(), "window.focus", ActionWindowFocused{Name: e.Name})
		case "blur":
			coreutil.DispatchAction(s.Core(), "window.blur", ActionWindowBlurred{Name: e.Name})
		case "move":
			if data := e.Data; data != nil {
				x, _ := data["x"].(int)
				y, _ := data["y"].(int)
				coreutil.DispatchAction(s.Core(), "window.move", ActionWindowMoved{Name: e.Name, X: x, Y: y})
			}
		case "resize":
			if data := e.Data; data != nil {
				w, _ := data["w"].(int)
				h, _ := data["h"].(int)
				coreutil.DispatchAction(s.Core(), "window.resize", ActionWindowResized{Name: e.Name, Width: w, Height: h})
			}
		case "close":
			coreutil.DispatchAction(s.Core(), "window.closeEvent", ActionWindowClosed{Name: e.Name})
		}
	})
	pw.OnFileDrop(func(paths []string, targetID string) {
		coreutil.DispatchAction(s.Core(), "window.fileDrop", ActionFilesDropped{
			Name:     pw.Name(),
			Paths:    paths,
			TargetID: targetID,
		})
	})
}

func (s *Service) taskCloseWindow(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskClose", "window not found: "+name, nil)
	}
	// Persist state BEFORE closing (spec requirement)
	s.manager.State().CaptureState(pw)
	pw.Close()
	s.manager.Remove(name)
	coreutil.DispatchAction(s.Core(), "window.taskClose", ActionWindowClosed{Name: name})
	return nil
}

func (s *Service) taskSetPosition(name string, x, y int) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetPosition", "window not found: "+name, nil)
	}
	pw.SetPosition(x, y)
	s.manager.State().UpdatePosition(name, x, y)
	return nil
}

func (s *Service) taskSetSize(name string, width, height int) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetSize", "window not found: "+name, nil)
	}
	pw.SetSize(width, height)
	s.manager.State().UpdateSize(name, width, height)
	return nil
}

func (s *Service) taskMaximise(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskMaximise", "window not found: "+name, nil)
	}
	pw.Maximise()
	s.manager.State().UpdateMaximized(name, true)
	return nil
}

func (s *Service) taskMinimise(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskMinimise", "window not found: "+name, nil)
	}
	pw.Minimise()
	return nil
}

func (s *Service) taskFocus(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskFocus", "window not found: "+name, nil)
	}
	pw.Focus()
	return nil
}

func (s *Service) taskRestore(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskRestore", "window not found: "+name, nil)
	}
	pw.Restore()
	s.manager.State().UpdateMaximized(name, false)
	return nil
}

func (s *Service) taskSetTitle(name, title string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetTitle", "window not found: "+name, nil)
	}
	pw.SetTitle(title)
	return nil
}

func (s *Service) taskSetAlwaysOnTop(name string, alwaysOnTop bool) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetAlwaysOnTop", "window not found: "+name, nil)
	}
	pw.SetAlwaysOnTop(alwaysOnTop)
	return nil
}

func (s *Service) taskSetOpacity(name string, opacity float64) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetOpacity", "window not found: "+name, nil)
	}
	if opacity < 0 {
		opacity = 0
	}
	if opacity > 1 {
		opacity = 1
	}
	pw.SetOpacity(opacity)
	return nil
}

func (s *Service) taskSetBackgroundColour(name string, red, green, blue, alpha uint8) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetBackgroundColour", "window not found: "+name, nil)
	}
	pw.SetBackgroundColour(red, green, blue, alpha)
	return nil
}

func (s *Service) taskSetVisibility(name string, visible bool) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetVisibility", "window not found: "+name, nil)
	}
	pw.SetVisibility(visible)
	return nil
}

func (s *Service) taskFullscreen(name string, fullscreen bool) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskFullscreen", "window not found: "+name, nil)
	}
	if fullscreen {
		pw.Fullscreen()
	} else {
		pw.UnFullscreen()
	}
	return nil
}

func (s *Service) taskSaveLayout(name string) error {
	windows := s.queryWindowList()
	states := make(map[string]WindowState, len(windows))
	for _, w := range windows {
		states[w.Name] = WindowState{
			X: w.X, Y: w.Y, Width: w.Width, Height: w.Height,
			Maximized: w.Maximized,
		}
	}
	return s.manager.Layout().SaveLayout(name, states)
}

func (s *Service) taskRestoreLayout(name string) error {
	layout, ok := s.manager.Layout().GetLayout(name)
	if !ok {
		return core.E("window.taskRestoreLayout", "layout not found: "+name, nil)
	}
	for winName, state := range layout.Windows {
		pw, found := s.manager.Get(winName)
		if !found {
			continue
		}
		pw.SetPosition(state.X, state.Y)
		pw.SetSize(state.Width, state.Height)
		if state.Maximized {
			pw.Maximise()
		} else {
			pw.Restore()
		}
		s.manager.State().CaptureState(pw)
	}
	return nil
}

var tileModeMap = map[string]TileMode{
	"left-half": TileModeLeftHalf, "right-half": TileModeRightHalf,
	"top-half": TileModeTopHalf, "bottom-half": TileModeBottomHalf,
	"top-left": TileModeTopLeft, "top-right": TileModeTopRight,
	"bottom-left": TileModeBottomLeft, "bottom-right": TileModeBottomRight,
	"left-right": TileModeLeftRight, "grid": TileModeGrid,
}

func (s *Service) taskTileWindows(mode string, names []string) error {
	tm, ok := tileModeMap[mode]
	if !ok {
		return core.E("window.taskTileWindows", "unknown tile mode: "+mode, nil)
	}
	if len(names) == 0 {
		names = s.manager.List()
	}
	originX, originY, screenWidth, screenHeight := s.primaryScreenArea()
	return s.manager.TileWindows(tm, names, screenWidth, screenHeight, originX, originY)
}

func (s *Service) taskStackWindows(names []string, offsetX, offsetY int) error {
	if len(names) == 0 {
		names = s.manager.List()
	}
	originX, originY, _, _ := s.primaryScreenArea()
	return s.manager.StackWindows(names, offsetX, offsetY, originX, originY)
}

var snapPosMap = map[string]SnapPosition{
	"left": SnapLeft, "right": SnapRight,
	"top": SnapTop, "bottom": SnapBottom,
	"top-left": SnapTopLeft, "top-right": SnapTopRight,
	"bottom-left": SnapBottomLeft, "bottom-right": SnapBottomRight,
	"center": SnapCenter, "centre": SnapCenter,
}

func (s *Service) taskSnapWindow(name, position string) error {
	pos, ok := snapPosMap[position]
	if !ok {
		return core.E("window.taskSnapWindow", "unknown snap position: "+position, nil)
	}
	originX, originY, screenWidth, screenHeight := s.primaryScreenArea()
	return s.manager.SnapWindow(name, pos, screenWidth, screenHeight, originX, originY)
}

var workflowLayoutMap = map[string]WorkflowLayout{
	"coding":       WorkflowCoding,
	"debugging":    WorkflowDebugging,
	"presenting":   WorkflowPresenting,
	"side-by-side": WorkflowSideBySide,
}

func (s *Service) taskApplyWorkflow(workflow string, names []string) error {
	layout, ok := workflowLayoutMap[workflow]
	if !ok {
		return core.E("window.taskApplyWorkflow", "unknown workflow layout: "+workflow, nil)
	}
	if len(names) == 0 {
		names = s.manager.List()
	}
	originX, originY, screenWidth, screenHeight := s.primaryScreenArea()
	return s.manager.ApplyWorkflow(layout, names, screenWidth, screenHeight, originX, originY)
}

// --- Zoom ---

func (s *Service) queryWindowZoom(name string) core.Result {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.Result{Value: core.E("window.queryWindowZoom", "window not found: "+name, nil), OK: false}
	}
	return core.Result{Value: pw.GetZoom(), OK: true}
}

func (s *Service) taskSetZoom(name string, magnification float64) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetZoom", "window not found: "+name, nil)
	}
	pw.SetZoom(magnification)
	return nil
}

func (s *Service) taskZoomIn(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskZoomIn", "window not found: "+name, nil)
	}
	current := pw.GetZoom()
	pw.SetZoom(current + 0.1)
	return nil
}

func (s *Service) taskZoomOut(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskZoomOut", "window not found: "+name, nil)
	}
	current := pw.GetZoom()
	next := current - 0.1
	if next < 0.1 {
		next = 0.1
	}
	pw.SetZoom(next)
	return nil
}

func (s *Service) taskZoomReset(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskZoomReset", "window not found: "+name, nil)
	}
	pw.SetZoom(1.0)
	return nil
}

// --- Content ---

func (s *Service) taskSetURL(name, url string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetURL", "window not found: "+name, nil)
	}
	if core.HasPrefix(url, "core://") {
		resolved, ok, err := s.resolveCoreScheme(url)
		if err != nil {
			return err
		}
		if !ok {
			return core.E("window.taskSetURL", "core scheme handler unavailable for "+url, nil)
		}
		pw.SetHTML(resolved.Body)
		preload := s.buildPreload(url)
		if preload != "" {
			pw.ExecJS(preload)
		}
		return nil
	}
	pw.SetURL(url)
	preload := s.buildPreload(url)
	if preload != "" {
		pw.ExecJS(preload)
	}
	return nil
}

func (s *Service) taskSetHTML(name, html string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetHTML", "window not found: "+name, nil)
	}
	pw.SetHTML(html)
	return nil
}

func (s *Service) taskExecJS(name, js string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskExecJS", "window not found: "+name, nil)
	}
	pw.ExecJS(js)
	return nil
}

// --- State toggles ---

func (s *Service) taskToggleFullscreen(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskToggleFullscreen", "window not found: "+name, nil)
	}
	pw.ToggleFullscreen()
	return nil
}

func (s *Service) taskToggleMaximise(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskToggleMaximise", "window not found: "+name, nil)
	}
	pw.ToggleMaximise()
	return nil
}

// --- Bounds ---

func (s *Service) queryWindowBounds(name string) core.Result {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.Result{Value: core.E("window.queryWindowBounds", "window not found: "+name, nil), OK: false}
	}
	x, y, width, height := pw.GetBounds()
	return core.Result{Value: WindowBounds{X: x, Y: y, Width: width, Height: height}, OK: true}
}

func (s *Service) taskSetBounds(name string, x, y, width, height int) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetBounds", "window not found: "+name, nil)
	}
	pw.SetBounds(x, y, width, height)
	s.manager.State().UpdatePosition(name, x, y)
	s.manager.State().UpdateSize(name, width, height)
	return nil
}

// --- Content protection ---

func (s *Service) taskSetContentProtection(name string, protection bool) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskSetContentProtection", "window not found: "+name, nil)
	}
	pw.SetContentProtection(protection)
	return nil
}

// --- Flash ---

func (s *Service) taskFlash(name string, enabled bool) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskFlash", "window not found: "+name, nil)
	}
	pw.Flash(enabled)
	return nil
}

// --- Print ---

func (s *Service) taskPrint(name string) error {
	pw, ok := s.manager.Get(name)
	if !ok {
		return core.E("window.taskPrint", "window not found: "+name, nil)
	}
	return pw.Print()
}

// Manager returns the underlying window Manager for direct access.
func (s *Service) Manager() *Manager {
	return s.manager
}
