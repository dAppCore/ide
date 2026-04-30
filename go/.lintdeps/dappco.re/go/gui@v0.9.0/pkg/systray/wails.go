// pkg/systray/wails.go
package systray

import (
	core "dappco.re/go"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// WailsPlatform implements Platform using Wails v3.
// Use: platform := systray.NewWailsPlatform(app)
type WailsPlatform struct {
	app *application.App
}

// NewWailsPlatform creates a Wails-backed tray platform.
// Use: platform := systray.NewWailsPlatform(app)
func NewWailsPlatform(app *application.App) *WailsPlatform {
	return &WailsPlatform{app: app}
}

// NewTray creates a Wails system tray handle.
// Use: tray := platform.NewTray()
func (wp *WailsPlatform) NewTray() PlatformTray {
	return &wailsTray{tray: wp.app.SystemTray.New()}
}

// NewMenu creates a Wails tray menu handle.
// Use: menu := platform.NewMenu()
func (wp *WailsPlatform) NewMenu() PlatformMenu {
	return &wailsTrayMenu{menu: wp.app.NewMenu()}
}

type wailsTray struct {
	tray *application.SystemTray
}

func (wt *wailsTray) SetIcon(data []byte)         { wt.tray.SetIcon(data) }
func (wt *wailsTray) SetTemplateIcon(data []byte) { wt.tray.SetTemplateIcon(data) }
func (wt *wailsTray) SetTooltip(text string)      { wt.tray.SetTooltip(text) }
func (wt *wailsTray) SetLabel(text string)        { wt.tray.SetLabel(text) }

func (wt *wailsTray) SetMenu(menu PlatformMenu) {
	if wm, ok := menu.(*wailsTrayMenu); ok {
		wt.tray.SetMenu(wm.menu)
	}
}

func (wt *wailsTray) AttachWindow(w WindowHandle) {
	_ = w
	// Wails expects an application.Window implementation here, but the GUI
	// package passes a lighter abstraction. Keep this as a no-op until the
	// bridge is routed through a concrete Wails window wrapper.
}

func (wt *wailsTray) ShowMessage(title, message string) error {
	_ = title
	_ = message
	return core.E("systray.wailsTray.ShowMessage", "tray balloon messages are not supported by this backend", nil)
}

// wailsTrayMenu wraps *application.Menu for the PlatformMenu interface.
type wailsTrayMenu struct {
	menu *application.Menu
}

func (m *wailsTrayMenu) Add(label string) PlatformMenuItem {
	return &wailsTrayMenuItem{item: m.menu.Add(label)}
}

func (m *wailsTrayMenu) AddSeparator() {
	m.menu.AddSeparator()
}

func (m *wailsTrayMenu) AddSubmenu(label string) PlatformMenu {
	return &wailsTrayMenu{menu: m.menu.AddSubmenu(label)}
}

// wailsTrayMenuItem wraps *application.MenuItem for the PlatformMenuItem interface.
type wailsTrayMenuItem struct {
	item *application.MenuItem
}

func (mi *wailsTrayMenuItem) SetTooltip(text string)  { mi.item.SetTooltip(text) }
func (mi *wailsTrayMenuItem) SetChecked(checked bool) { mi.item.SetChecked(checked) }
func (mi *wailsTrayMenuItem) SetEnabled(enabled bool) { mi.item.SetEnabled(enabled) }
func (mi *wailsTrayMenuItem) OnClick(fn func()) {
	mi.item.OnClick(func(ctx *application.Context) { fn() })
}
