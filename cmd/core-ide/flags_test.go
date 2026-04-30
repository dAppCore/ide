package main

import "testing"

func TestFlags_ParseRuntimeFlags_Good(t *testing.T) {
	_targetName := "ParseRuntimeFlags"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	flags, err := parseRuntimeFlags([]string{
		"--mcp",
		"--no-gui",
		"--http", " 127.0.0.1:9880 ",
		"--token", " secret ",
		"--config", " /tmp/ide.yaml ",
	})
	if err != nil {
		t.Fatalf("parseRuntimeFlags: %v", err)
	}
	if !flags.MCPOnly || !flags.NoGUI {
		t.Fatalf("expected boolean flags to be set, got %#v", flags)
	}
	if flags.HTTPAddr != "127.0.0.1:9880" {
		t.Fatalf("expected trimmed http addr, got %q", flags.HTTPAddr)
	}
	if flags.Token != "secret" {
		t.Fatalf("expected trimmed token, got %q", flags.Token)
	}
	if flags.ConfigPath != "/tmp/ide.yaml" {
		t.Fatalf("expected trimmed config path, got %q", flags.ConfigPath)
	}
}

func TestFlags_ParseRuntimeFlags_Bad(t *testing.T) {
	_targetName := "ParseRuntimeFlags"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if _, err := parseRuntimeFlags([]string{"--http"}); err == nil {
		t.Fatal("expected malformed args to fail")
	}
}

func TestFlags_ParseRuntimeFlags_Ugly(t *testing.T) {
	_targetName := "ParseRuntimeFlags"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	flags, err := parseRuntimeFlags([]string{
		"--http", " :9880 ",
		"--mcp",
		"--token", "   ",
	})
	if err != nil {
		t.Fatalf("parseRuntimeFlags: %v", err)
	}
	if flags.HTTPAddr != ":9880" {
		t.Fatalf("expected trimmed http addr, got %q", flags.HTTPAddr)
	}
	if flags.Token != "" {
		t.Fatalf("expected empty trimmed token, got %q", flags.Token)
	}
	if got := transportMode(flags); got != "http" {
		t.Fatalf("expected http to win over mcp, got %q", got)
	}
}

func TestFlags_TransportMode_Good(t *testing.T) {
	_targetName := "TransportMode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if got := transportMode(runtimeFlags{MCPOnly: true}); got != "stdio" {
		t.Fatalf("expected stdio, got %q", got)
	}
}

func TestFlags_TransportMode_Bad(t *testing.T) {
	_targetName := "TransportMode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if got := transportMode(runtimeFlags{}); got != "" {
		t.Fatalf("expected empty transport mode, got %q", got)
	}
}

func TestFlags_TransportMode_Ugly(t *testing.T) {
	_targetName := "TransportMode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if got := transportMode(runtimeFlags{MCPOnly: true, HTTPAddr: "127.0.0.1:9880"}); got != "http" {
		t.Fatalf("expected http precedence, got %q", got)
	}
}
