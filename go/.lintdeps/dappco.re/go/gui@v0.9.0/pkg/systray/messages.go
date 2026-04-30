// pkg/systray/messages.go
package systray

type QueryConfig struct{}

type QueryInfo struct{}

type TaskSetTrayIcon struct{ Data []byte }

type TaskSetTrayTooltip struct{ Tooltip string }

type TaskSetTrayLabel struct{ Label string }

type TaskSetTrayMenu struct{ Items []TrayMenuItem }

type TaskShowMessage struct {
	Title   string `json:"title"`
	Message string `json:"message"`
}

type TaskShowPanel struct{}

type TaskHidePanel struct{}

type TaskSaveConfig struct{ Config map[string]any }

type ActionTrayClicked struct{}

type ActionTrayMenuItemClicked struct{ ActionID string }
