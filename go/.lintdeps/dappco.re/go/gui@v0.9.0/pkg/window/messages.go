package window

type WindowInfo struct {
	Name      string  `json:"name"`
	Title     string  `json:"title"`
	X         int     `json:"x"`
	Y         int     `json:"y"`
	Width     int     `json:"width"`
	Height    int     `json:"height"`
	Opacity   float64 `json:"opacity"`
	Maximized bool    `json:"maximized"`
	Focused   bool    `json:"focused"`
}

type QueryWindowList struct{}

type QueryWindowByName struct{ Name string }

type QueryConfig struct{}

type TaskOpenWindow struct {
	Window  *Window
	Options []WindowOption
}

type TaskCloseWindow struct{ Name string }

type TaskSetPosition struct {
	Name string
	X, Y int
}

type TaskSetSize struct {
	Name          string
	Width, Height int
}

type TaskMaximise struct{ Name string }

type TaskMinimise struct{ Name string }

type TaskFocus struct{ Name string }

type TaskRestore struct{ Name string }

type TaskSetTitle struct {
	Name  string
	Title string
}

type TaskSetAlwaysOnTop struct {
	Name        string
	AlwaysOnTop bool
}

type TaskSetOpacity struct {
	Name    string
	Opacity float64
}

type TaskSetBackgroundColour struct {
	Name  string
	Red   uint8
	Green uint8
	Blue  uint8
	Alpha uint8
}

type TaskSetVisibility struct {
	Name    string
	Visible bool
}

type TaskFullscreen struct {
	Name       string
	Fullscreen bool
}

type QueryLayoutList struct{}

type QueryLayoutGet struct{ Name string }

type TaskSaveLayout struct{ Name string }

type TaskRestoreLayout struct{ Name string }

type TaskDeleteLayout struct{ Name string }

type TaskTileWindows struct {
	Mode    string   // "left-right", "grid", "left-half", "right-half", etc.
	Windows []string // window names; empty = all
}

type TaskStackWindows struct {
	Windows []string // window names; empty = all
	OffsetX int
	OffsetY int
}

type TaskSnapWindow struct {
	Name     string // window name
	Position string // "left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right", "center"
}

type TaskApplyWorkflow struct {
	Workflow string
	Windows  []string // window names; empty = all
}

type TaskSaveConfig struct{ Config map[string]any }

type ActionWindowOpened struct{ Name string }
type ActionWindowClosed struct{ Name string }

type ActionWindowMoved struct {
	Name string
	X, Y int
}

type ActionWindowResized struct {
	Name          string
	Width, Height int
}

type ActionWindowFocused struct{ Name string }
type ActionWindowBlurred struct{ Name string }

type ActionFilesDropped struct {
	Name     string   `json:"name"` // window name
	Paths    []string `json:"paths"`
	TargetID string   `json:"targetId,omitempty"`
}

// --- Zoom ---

type QueryWindowZoom struct{ Name string }

type TaskSetZoom struct {
	Name          string
	Magnification float64
}

type TaskZoomIn struct{ Name string }

type TaskZoomOut struct{ Name string }

type TaskZoomReset struct{ Name string }

// --- Content ---

type TaskSetURL struct {
	Name string
	URL  string
}

type TaskSetHTML struct {
	Name string
	HTML string
}

type TaskExecJS struct {
	Name string
	JS   string
}

// --- State toggles ---

type TaskToggleFullscreen struct{ Name string }

type TaskToggleMaximise struct{ Name string }

// --- Bounds ---

type QueryWindowBounds struct{ Name string }

type WindowBounds struct {
	X, Y, Width, Height int
}

type TaskSetBounds struct {
	Name                string
	X, Y, Width, Height int
}

// --- Content protection ---

type TaskSetContentProtection struct {
	Name       string
	Protection bool
}

// --- Flash ---

type TaskFlash struct {
	Name    string
	Enabled bool
}

// --- Print ---

type TaskPrint struct{ Name string }

// --- Smart layout ---

type TaskLayoutBesideEditor struct {
	Name   string  `json:"name"`
	Editor string  `json:"editor,omitempty"`
	Side   string  `json:"side,omitempty"`
	Ratio  float64 `json:"ratio,omitempty"`
}

type LayoutBesideEditorResult struct {
	Editor       string       `json:"editor"`
	EditorBounds WindowBounds `json:"editor_bounds"`
	WindowBounds WindowBounds `json:"window_bounds"`
	Side         string       `json:"side"`
	ScreenID     string       `json:"screen_id,omitempty"`
}

type TaskLayoutSuggest struct {
	ScreenID    string `json:"screen_id,omitempty"`
	WindowCount int    `json:"window_count,omitempty"`
}

type LayoutSuggestion struct {
	Mode     string `json:"mode"`
	Reason   string `json:"reason"`
	ScreenID string `json:"screen_id,omitempty"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
}

type TaskScreenFindSpace struct {
	ScreenID string `json:"screen_id,omitempty"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Padding  int    `json:"padding,omitempty"`
}

type ScreenSpace struct {
	ScreenID string `json:"screen_id,omitempty"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
}

type TaskWindowArrangePair struct {
	Primary   string  `json:"primary"`
	Secondary string  `json:"secondary"`
	ScreenID  string  `json:"screen_id,omitempty"`
	Ratio     float64 `json:"ratio,omitempty"`
}

type PairArrangement struct {
	Primary     WindowBounds `json:"primary"`
	Secondary   WindowBounds `json:"secondary"`
	Orientation string       `json:"orientation"`
	ScreenID    string       `json:"screen_id,omitempty"`
}
