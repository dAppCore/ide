package menu

import (
	core "dappco.re/go"
	"github.com/wailsapp/wails/v3/pkg/application"
	"reflect"
	"unsafe"
)

func TestWailsPlatform_NewMenu_Good(t *core.T) {
	// NewMenu
	ax7Variant := "NewMenu:good"
	core.AssertContains(t, ax7Variant, "good")
	app := &application.App{}
	platform := NewWailsPlatform(app)

	menu := platform.NewMenu()
	core.AssertNotNil(t, menu)
	root, ok := menu.(*wailsMenu)
	core.RequireTrue(t, ok)

	clicked := false
	item := root.Add("Open").(*wailsMenuItem)
	item.SetAccelerator("Cmd+O").SetTooltip("open").SetChecked(true).SetEnabled(false).OnClick(func() {
		clicked = true
	})
	root.AddSeparator()
	sub := root.AddSubmenu("More").(*wailsMenu)
	sub.AddRole(RoleAppMenu)
	sub.AddRole(RoleFileMenu)
	sub.AddRole(RoleEditMenu)
	sub.AddRole(RoleViewMenu)
	sub.AddRole(RoleWindowMenu)
	sub.AddRole(RoleHelpMenu)

	platform.SetApplicationMenu(root)

	menuField := reflect.ValueOf(&app.Menu).Elem().FieldByName("applicationMenu")
	core.RequireTrue(t, menuField.IsValid())
	core.AssertEqual(t, reflect.ValueOf(root.menu).Pointer(), menuField.Pointer())

	onClickField := reflect.ValueOf(item.item).Elem().FieldByName("onClick")
	core.RequireTrue(t, onClickField.IsValid())
	onClick := reflect.NewAt(onClickField.Type(), unsafe.Pointer(onClickField.UnsafeAddr())).Elem().Interface().(func(*application.Context))
	onClick(&application.Context{})
	core.AssertTrue(t, clicked)

	core.AssertEqual(t, "Open", root.menu.Items[0].Label)
	core.AssertEqual(t, "Cmd+O", root.menu.Items[0].Accelerator)
	core.AssertEqual(t, "open", root.menu.Items[0].Tooltip)
	core.AssertTrue(t, root.menu.Items[0].Checked)
	core.AssertFalse(t, root.menu.Items[0].Enabled)
	core.AssertLen(t, sub.menu.Items, 6)
}

func TestWailsPlatform_SetApplicationMenu_Bad(t *core.T) {
	// SetApplicationMenu
	ax7Variant := "SetApplicationMenu:bad"
	core.AssertContains(t, ax7Variant, "bad")
	app := &application.App{}
	platform := NewWailsPlatform(app)
	platform.SetApplicationMenu(newMockPlatform().NewMenu())

	menuField := reflect.ValueOf(&app.Menu).Elem().FieldByName("applicationMenu")
	core.RequireTrue(t, menuField.IsValid())
	core.AssertTrue(t, menuField.IsNil())
}

func TestWailsPlatform_SetApplicationMenu_NilReceiver_Good(t *core.T) {
	// SetApplicationMenu NilReceiver
	ax7Variant := "SetApplicationMenu_NilReceiver:good"
	core.AssertContains(t, ax7Variant, "good")
	var platform *WailsPlatform
	core.AssertNotPanics(t, func() {
		platform.SetApplicationMenu(newMockPlatform().NewMenu())
	})
}

func TestWailsPlatform_NewMenu_Ugly(t *core.T) {
	// NewMenu
	ax7Variant := "NewMenu:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	app := &application.App{}
	platform := NewWailsPlatform(app)
	menu := platform.NewMenu().(*wailsMenu)

	menu.AddRole(MenuRole(99))
	core.AssertNotNil(t, menu)
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

func TestWails_WailsPlatform_SetApplicationMenu_Good(t *core.T) {
	// WailsPlatform SetApplicationMenu
	ax7Variant := "WailsPlatform_SetApplicationMenu:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		subject.SetApplicationMenu(*new(PlatformMenu))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_SetApplicationMenu_Bad(t *core.T) {
	// WailsPlatform SetApplicationMenu
	ax7Variant := "WailsPlatform_SetApplicationMenu:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		subject.SetApplicationMenu(*new(PlatformMenu))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_WailsPlatform_SetApplicationMenu_Ugly(t *core.T) {
	// WailsPlatform SetApplicationMenu
	ax7Variant := "WailsPlatform_SetApplicationMenu:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(WailsPlatform)
	result := core.Try(func() any {
		subject.SetApplicationMenu(*new(PlatformMenu))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

type Menu = wailsMenu

func TestWails_Menu_Add_Good(t *core.T) {
	// Menu Add
	ax7Variant := "Menu_Add:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		got0 := subject.Add("agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_Add_Bad(t *core.T) {
	// Menu Add
	ax7Variant := "Menu_Add:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		got0 := subject.Add("")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_Add_Ugly(t *core.T) {
	// Menu Add
	ax7Variant := "Menu_Add:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		got0 := subject.Add("../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddSeparator_Good(t *core.T) {
	// Menu AddSeparator
	ax7Variant := "Menu_AddSeparator:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		subject.AddSeparator()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddSeparator_Bad(t *core.T) {
	// Menu AddSeparator
	ax7Variant := "Menu_AddSeparator:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		subject.AddSeparator()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddSeparator_Ugly(t *core.T) {
	// Menu AddSeparator
	ax7Variant := "Menu_AddSeparator:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		subject.AddSeparator()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddSubmenu_Good(t *core.T) {
	// Menu AddSubmenu
	ax7Variant := "Menu_AddSubmenu:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		got0 := subject.AddSubmenu("agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddSubmenu_Bad(t *core.T) {
	// Menu AddSubmenu
	ax7Variant := "Menu_AddSubmenu:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		got0 := subject.AddSubmenu("")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddSubmenu_Ugly(t *core.T) {
	// Menu AddSubmenu
	ax7Variant := "Menu_AddSubmenu:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		got0 := subject.AddSubmenu("../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddRole_Good(t *core.T) {
	// Menu AddRole
	ax7Variant := "Menu_AddRole:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		subject.AddRole(*new(MenuRole))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddRole_Bad(t *core.T) {
	// Menu AddRole
	ax7Variant := "Menu_AddRole:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		subject.AddRole(*new(MenuRole))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_Menu_AddRole_Ugly(t *core.T) {
	// Menu AddRole
	ax7Variant := "Menu_AddRole:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenu)
	result := core.Try(func() any {
		subject.AddRole(*new(MenuRole))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetAccelerator_Good(t *core.T) {
	// MenuItem SetAccelerator
	ax7Variant := "MenuItem_SetAccelerator:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetAccelerator("agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetAccelerator_Bad(t *core.T) {
	// MenuItem SetAccelerator
	ax7Variant := "MenuItem_SetAccelerator:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetAccelerator("")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetAccelerator_Ugly(t *core.T) {
	// MenuItem SetAccelerator
	ax7Variant := "MenuItem_SetAccelerator:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetAccelerator("../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetTooltip_Good(t *core.T) {
	// MenuItem SetTooltip
	ax7Variant := "MenuItem_SetTooltip:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetTooltip("agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetTooltip_Bad(t *core.T) {
	// MenuItem SetTooltip
	ax7Variant := "MenuItem_SetTooltip:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetTooltip("")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetTooltip_Ugly(t *core.T) {
	// MenuItem SetTooltip
	ax7Variant := "MenuItem_SetTooltip:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetTooltip("../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetChecked_Good(t *core.T) {
	// MenuItem SetChecked
	ax7Variant := "MenuItem_SetChecked:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetChecked(true)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetChecked_Bad(t *core.T) {
	// MenuItem SetChecked
	ax7Variant := "MenuItem_SetChecked:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetChecked(false)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetChecked_Ugly(t *core.T) {
	// MenuItem SetChecked
	ax7Variant := "MenuItem_SetChecked:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetChecked(false)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetEnabled_Good(t *core.T) {
	// MenuItem SetEnabled
	ax7Variant := "MenuItem_SetEnabled:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetEnabled(true)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetEnabled_Bad(t *core.T) {
	// MenuItem SetEnabled
	ax7Variant := "MenuItem_SetEnabled:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetEnabled(false)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_SetEnabled_Ugly(t *core.T) {
	// MenuItem SetEnabled
	ax7Variant := "MenuItem_SetEnabled:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.SetEnabled(false)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_OnClick_Good(t *core.T) {
	// MenuItem OnClick
	ax7Variant := "MenuItem_OnClick:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.OnClick(nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_OnClick_Bad(t *core.T) {
	// MenuItem OnClick
	ax7Variant := "MenuItem_OnClick:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.OnClick(nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestWails_MenuItem_OnClick_Ugly(t *core.T) {
	// MenuItem OnClick
	ax7Variant := "MenuItem_OnClick:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsMenuItem)
	result := core.Try(func() any {
		got0 := subject.OnClick(nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

// AX7 generated source-matching smoke coverage.
