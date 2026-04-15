package server

import (
	"testing"

	"dappco.re/go/core/ide/pkg/config"
)

func TestOptions_Default_Good(t *testing.T) {
	options := Options{Config: config.IDEConfig{}.WithDefaults()}
	if options.Config.Ide.Transport.Mode != "stdio" {
		t.Fatalf("unexpected default options %#v", options)
	}
}

func TestOptions_Default_Bad(t *testing.T) {
	options := Options{}
	if options.Medium != nil {
		t.Fatalf("expected zero-value medium, got %#v", options.Medium)
	}
}

func TestOptions_Default_Ugly(t *testing.T) {
	options := Options{GUI: true, MCP: true, PreferConfiguredTransport: true}
	if !options.GUI || !options.MCP || !options.PreferConfiguredTransport {
		t.Fatalf("expected flags to stick, got %#v", options)
	}
}
