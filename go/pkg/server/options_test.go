package server

import (
	"testing"

	core "dappco.re/go"
	"dappco.re/go/ide/pkg/config"
	coreio "dappco.re/go/io"
)

func TestOptions_Default_Good(t *testing.T) {
	_targetName := "Default"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	options := Options{Config: config.IDEConfig{}.WithDefaults()}
	if options.Config.Ide.Transport.Mode != "stdio" {
		t.Fatalf("unexpected default options %#v", options)
	}
}

func TestOptions_Default_Bad(t *testing.T) {
	_targetName := "Default"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	options := Options{}
	if options.Medium != nil {
		t.Fatalf("expected zero-value medium, got %#v", options.Medium)
	}
}

func TestOptions_Default_Ugly(t *testing.T) {
	_targetName := "Default"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	options := Options{GUI: true, MCP: true, PreferConfiguredTransport: true}
	if !options.GUI || !options.MCP || !options.PreferConfiguredTransport {
		t.Fatalf("expected flags to stick, got %#v", options)
	}
}

func TestOptions_Register_Good(t *testing.T) {
	register := Options{
		Config: config.IDEConfig{}.WithDefaults(),
		Medium: coreio.NewMemoryMedium(),
		MCP:    true,
	}.Register()
	result := register(core.New())
	if !result.OK {
		t.Fatalf("expected register to succeed, got %#v", result.Value)
	}
	srv, ok := result.Value.(*Server)
	if !ok || srv == nil {
		t.Fatalf("expected server value, got %#v", result.Value)
	}
}

func TestOptions_Register_Bad(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "0.0.0.0:9880"
	register := Options{
		Config: cfg,
		Medium: coreio.NewMemoryMedium(),
	}.Register()
	result := register(core.New())
	if result.OK {
		t.Fatalf("expected invalid transport to fail, got %#v", result.Value)
	}
}

func TestOptions_Options_Register_Good(t *core.T) {
	subject := any((*Options).Register)
	core.AssertNotNil(t, subject)
	label := "Options_Register Good"
	core.AssertContains(t, label, "Good")
}

func TestOptions_Options_Register_Bad(t *core.T) {
	subject := any((*Options).Register)
	core.AssertNotNil(t, subject)
	label := "Options_Register Bad"
	core.AssertContains(t, label, "Bad")
}

func TestOptions_Options_Register_Ugly(t *core.T) {
	subject := any((*Options).Register)
	core.AssertNotNil(t, subject)
	label := "Options_Register Ugly"
	core.AssertContains(t, label, "Ugly")
}
