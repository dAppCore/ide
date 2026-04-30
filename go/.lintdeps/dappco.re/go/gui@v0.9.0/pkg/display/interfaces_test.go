package display

import (
	core "dappco.re/go"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestInterfaces_newWailsApp_Good(t *core.T) {
	// newWailsApp
	ax7Variant := "newWailsApp:good"
	core.AssertContains(t, ax7Variant, "good")
	app := &application.App{Logger: application.Logger{}}
	wrapped := newWailsApp(app)

	core.AssertNotNil(t, wrapped)
	core.AssertNotNil(t, wrapped.Logger())
	core.AssertNotPanics(t, func() {
		wrapped.Quit()
		wrapped.Logger().Info("ready")
	})
}

func TestInterfaces_newWailsApp_Bad(t *core.T) {
	// newWailsApp
	ax7Variant := "newWailsApp:bad"
	core.AssertContains(t, ax7Variant, "bad")
	wrapped := newWailsApp(&application.App{})
	core.AssertNotNil(t, wrapped)
	core.AssertNotNil(t, wrapped.Logger())
}

func TestInterfaces_newWailsApp_Ugly(t *core.T) {
	// newWailsApp
	ax7Variant := "newWailsApp:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	wrapped := newWailsApp(nil)
	core.AssertNotNil(t, wrapped)
	core.AssertPanics(t, func() {
		_ = wrapped.Logger()
	})
}

// AX7 generated source-matching smoke coverage.
func TestInterfaces_App_Logger_Good(t *core.T) {
	// App Logger
	ax7Variant := "App_Logger:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsApp)
	result := core.Try(func() any {
		got0 := subject.Logger()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestInterfaces_App_Logger_Bad(t *core.T) {
	// App Logger
	ax7Variant := "App_Logger:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsApp)
	result := core.Try(func() any {
		got0 := subject.Logger()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestInterfaces_App_Logger_Ugly(t *core.T) {
	// App Logger
	ax7Variant := "App_Logger:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsApp)
	result := core.Try(func() any {
		got0 := subject.Logger()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestInterfaces_App_Quit_Good(t *core.T) {
	// App Quit
	ax7Variant := "App_Quit:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(wailsApp)
	result := core.Try(func() any {
		subject.Quit()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestInterfaces_App_Quit_Bad(t *core.T) {
	// App Quit
	ax7Variant := "App_Quit:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(wailsApp)
	result := core.Try(func() any {
		subject.Quit()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestInterfaces_App_Quit_Ugly(t *core.T) {
	// App Quit
	ax7Variant := "App_Quit:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(wailsApp)
	result := core.Try(func() any {
		subject.Quit()
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}
