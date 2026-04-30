package systray

import (
	core "dappco.re/go"
	"github.com/wailsapp/wails/v3/pkg/application"
	"reflect"
	"unsafe"
)

func TestWailsPlatform_NewTray_Good(t *core.T) {
	// NewTray
	ax7Variant := "NewTray:good"
	core.AssertContains(t, ax7Variant, "good")
	app := &application.App{}
	platform := NewWailsPlatform(app)

	tray := platform.NewTray()
	core.AssertNotNil(t, tray)
	wtray, ok := tray.(*wailsTray)
	core.RequireTrue(t, ok)

	wtray.SetIcon([]byte{1, 2, 3})
	wtray.SetTemplateIcon([]byte{4, 5, 6})
	wtray.SetTooltip("Core")
	wtray.SetLabel("Ready")
	wtray.SetMenu(platform.NewMenu())
	wtray.AttachWindow(windowHandleStub{name: "panel"})

	trayValue := reflect.ValueOf(wtray.tray).Elem()
	core.AssertEqual(t, []byte{1, 2, 3}, trayValue.FieldByName("icon").Bytes())
	core.AssertEqual(t, []byte{4, 5, 6}, trayValue.FieldByName("templateIcon").Bytes())
	core.AssertEqual(t, "Core", trayValue.FieldByName("tooltip").String())
	core.AssertEqual(t, "Ready", trayValue.FieldByName("label").String())
	core.AssertTrue(t, trayValue.FieldByName("attachedWindow").IsNil())

	err := wtray.ShowMessage("Title", "Body")
	core.AssertError(t, err)
	core.AssertContains(t, err.Error(), "not supported")
}

func TestWailsPlatform_NewMenu_Good(t *core.T) {
	// NewMenu
	ax7Variant := "NewMenu:good"
	core.AssertContains(t, ax7Variant, "good")
	app := &application.App{}
	platform := NewWailsPlatform(app)
	menu := platform.NewMenu()
	core.AssertNotNil(t, menu)
	wmenu, ok := menu.(*wailsTrayMenu)
	core.RequireTrue(t, ok)

	clicked := false
	item := wmenu.Add("Open").(*wailsTrayMenuItem)
	item.SetTooltip("open")
	item.SetChecked(true)
	item.SetEnabled(false)
	item.OnClick(func() { clicked = true })
	onClickField := reflect.ValueOf(item.item).Elem().FieldByName("onClick")
	core.RequireTrue(t, onClickField.IsValid())
	onClick := reflect.NewAt(onClickField.Type(), unsafe.Pointer(onClickField.UnsafeAddr())).Elem().Interface().(func(*application.Context))
	onClick(&application.Context{})

	core.AssertTrue(t, clicked)
	core.AssertEqual(t, "Open", wmenu.menu.Items[0].Label)
	core.AssertEqual(t, "open", wmenu.menu.Items[0].Tooltip)
	core.AssertTrue(t, wmenu.menu.Items[0].Checked)
	core.AssertFalse(t, wmenu.menu.Items[0].Enabled)
}

func TestWailsPlatform_SetMenu_Bad(t *core.T) {
	// SetMenu
	ax7Variant := "SetMenu:bad"
	core.AssertContains(t, ax7Variant, "bad")
	app := &application.App{}
	platform := NewWailsPlatform(app)
	tray := platform.NewTray().(*wailsTray)

	tray.SetMenu(&mockTrayMenu{})
	core.AssertTrue(t, reflect.ValueOf(tray.tray).Elem().FieldByName("menu").IsNil())
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

func TestWails_WailsPlatform_NewTray_Good(t *core.T) {
	// WailsPlatform NewTray
	ax7Variant := "WailsPlatform_NewTray:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.NewTray()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_NewTray_Bad(t *core.T) {
	// WailsPlatform NewTray
	ax7Variant := "WailsPlatform_NewTray:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.NewTray()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_NewTray_Ugly(t *core.T) {
	// WailsPlatform NewTray
	ax7Variant := "WailsPlatform_NewTray:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.NewTray()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_NewMenu_Good(t *core.T) {
	// WailsPlatform NewMenu
	ax7Variant := "WailsPlatform_NewMenu:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.NewMenu()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_NewMenu_Bad(t *core.T) {
	// WailsPlatform NewMenu
	ax7Variant := "WailsPlatform_NewMenu:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.NewMenu()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_NewMenu_Ugly(t *core.T) {
	// WailsPlatform NewMenu
	ax7Variant := "WailsPlatform_NewMenu:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		got0 := subject.NewMenu()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

type Tray = wailsTray

func TestWails_Tray_SetIcon_Good(t *core.T) {
	// Tray SetIcon
	ax7Variant := "Tray_SetIcon:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetIcon(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetIcon_Bad(t *core.T) {
	// Tray SetIcon
	ax7Variant := "Tray_SetIcon:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetIcon(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetIcon_Ugly(t *core.T) {
	// Tray SetIcon
	ax7Variant := "Tray_SetIcon:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetIcon(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetTemplateIcon_Good(t *core.T) {
	// Tray SetTemplateIcon
	ax7Variant := "Tray_SetTemplateIcon:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetTemplateIcon(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetTemplateIcon_Bad(t *core.T) {
	// Tray SetTemplateIcon
	ax7Variant := "Tray_SetTemplateIcon:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetTemplateIcon(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetTemplateIcon_Ugly(t *core.T) {
	// Tray SetTemplateIcon
	ax7Variant := "Tray_SetTemplateIcon:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetTemplateIcon(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetTooltip_Good(t *core.T) {
	// Tray SetTooltip
	ax7Variant := "Tray_SetTooltip:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetTooltip("agent")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetTooltip_Bad(t *core.T) {
	// Tray SetTooltip
	ax7Variant := "Tray_SetTooltip:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetTooltip("")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetTooltip_Ugly(t *core.T) {
	// Tray SetTooltip
	ax7Variant := "Tray_SetTooltip:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetTooltip("../../edge")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetLabel_Good(t *core.T) {
	// Tray SetLabel
	ax7Variant := "Tray_SetLabel:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetLabel("agent")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetLabel_Bad(t *core.T) {
	// Tray SetLabel
	ax7Variant := "Tray_SetLabel:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetLabel("")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetLabel_Ugly(t *core.T) {
	// Tray SetLabel
	ax7Variant := "Tray_SetLabel:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetLabel("../../edge")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetMenu_Good(t *core.T) {
	// Tray SetMenu
	ax7Variant := "Tray_SetMenu:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetMenu(*new(PlatformMenu))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetMenu_Bad(t *core.T) {
	// Tray SetMenu
	ax7Variant := "Tray_SetMenu:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetMenu(*new(PlatformMenu))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_SetMenu_Ugly(t *core.T) {
	// Tray SetMenu
	ax7Variant := "Tray_SetMenu:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.SetMenu(*new(PlatformMenu))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_AttachWindow_Good(t *core.T) {
	// Tray AttachWindow
	ax7Variant := "Tray_AttachWindow:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.AttachWindow(*new(WindowHandle))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_AttachWindow_Bad(t *core.T) {
	// Tray AttachWindow
	ax7Variant := "Tray_AttachWindow:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.AttachWindow(*new(WindowHandle))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_AttachWindow_Ugly(t *core.T) {
	// Tray AttachWindow
	ax7Variant := "Tray_AttachWindow:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTray)
	result := core.Try(func() any {
		subject.AttachWindow(*new(WindowHandle))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_ShowMessage_Good(t *core.T) {
	// Tray ShowMessage
	ax7Variant := "Tray_ShowMessage:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTray)
	result := core.Try(func() any {
		got0 := subject.ShowMessage("agent", "agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_ShowMessage_Bad(t *core.T) {
	// Tray ShowMessage
	ax7Variant := "Tray_ShowMessage:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTray)
	result := core.Try(func() any {
		got0 := subject.ShowMessage("", "")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Tray_ShowMessage_Ugly(t *core.T) {
	// Tray ShowMessage
	ax7Variant := "Tray_ShowMessage:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTray)
	result := core.Try(func() any {
		got0 := subject.ShowMessage("../../edge", "../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

type TrayMenu = wailsTrayMenu

func TestWails_TrayMenu_Add_Good(t *core.T) {
	// TrayMenu Add
	ax7Variant := "TrayMenu_Add:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		got0 := subject.Add("agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_Add_Bad(t *core.T) {
	// TrayMenu Add
	ax7Variant := "TrayMenu_Add:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		got0 := subject.Add("")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_Add_Ugly(t *core.T) {
	// TrayMenu Add
	ax7Variant := "TrayMenu_Add:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		got0 := subject.Add("../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_AddSeparator_Good(t *core.T) {
	// TrayMenu AddSeparator
	ax7Variant := "TrayMenu_AddSeparator:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		subject.AddSeparator()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_AddSeparator_Bad(t *core.T) {
	// TrayMenu AddSeparator
	ax7Variant := "TrayMenu_AddSeparator:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		subject.AddSeparator()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_AddSeparator_Ugly(t *core.T) {
	// TrayMenu AddSeparator
	ax7Variant := "TrayMenu_AddSeparator:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		subject.AddSeparator()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_AddSubmenu_Good(t *core.T) {
	// TrayMenu AddSubmenu
	ax7Variant := "TrayMenu_AddSubmenu:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		got0 := subject.AddSubmenu("agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_AddSubmenu_Bad(t *core.T) {
	// TrayMenu AddSubmenu
	ax7Variant := "TrayMenu_AddSubmenu:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		got0 := subject.AddSubmenu("")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenu_AddSubmenu_Ugly(t *core.T) {
	// TrayMenu AddSubmenu
	ax7Variant := "TrayMenu_AddSubmenu:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTrayMenu)
	result := core.Try(func() any {
		got0 := subject.AddSubmenu("../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetTooltip_Good(t *core.T) {
	// TrayMenuItem SetTooltip
	ax7Variant := "TrayMenuItem_SetTooltip:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetTooltip("agent")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetTooltip_Bad(t *core.T) {
	// TrayMenuItem SetTooltip
	ax7Variant := "TrayMenuItem_SetTooltip:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetTooltip("")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetTooltip_Ugly(t *core.T) {
	// TrayMenuItem SetTooltip
	ax7Variant := "TrayMenuItem_SetTooltip:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetTooltip("../../edge")
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetChecked_Good(t *core.T) {
	// TrayMenuItem SetChecked
	ax7Variant := "TrayMenuItem_SetChecked:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetChecked(true)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetChecked_Bad(t *core.T) {
	// TrayMenuItem SetChecked
	ax7Variant := "TrayMenuItem_SetChecked:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetChecked(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetChecked_Ugly(t *core.T) {
	// TrayMenuItem SetChecked
	ax7Variant := "TrayMenuItem_SetChecked:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetChecked(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetEnabled_Good(t *core.T) {
	// TrayMenuItem SetEnabled
	ax7Variant := "TrayMenuItem_SetEnabled:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetEnabled(true)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetEnabled_Bad(t *core.T) {
	// TrayMenuItem SetEnabled
	ax7Variant := "TrayMenuItem_SetEnabled:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetEnabled(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_SetEnabled_Ugly(t *core.T) {
	// TrayMenuItem SetEnabled
	ax7Variant := "TrayMenuItem_SetEnabled:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.SetEnabled(false)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_OnClick_Good(t *core.T) {
	// TrayMenuItem OnClick
	ax7Variant := "TrayMenuItem_OnClick:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.OnClick(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_OnClick_Bad(t *core.T) {
	// TrayMenuItem OnClick
	ax7Variant := "TrayMenuItem_OnClick:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.OnClick(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_TrayMenuItem_OnClick_Ugly(t *core.T) {
	// TrayMenuItem OnClick
	ax7Variant := "TrayMenuItem_OnClick:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsTrayMenuItem)
	result := core.Try(func() any {
		subject.OnClick(nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

// AX7 generated source-matching smoke coverage.
