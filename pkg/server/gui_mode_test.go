// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"testing"

	core "dappco.re/go"
	gui_chat "dappco.re/go/gui/pkg/chat"
	guimcp "dappco.re/go/gui/pkg/mcp"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
)

func TestGUIMode_Compose_Good_DefaultStartsGUIWithChat(t *testing.T) {
	srv, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), GUI: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose gui mode: %v", err)
	}
	if srv.transport.Mode != "gui" {
		t.Fatalf("expected default no-flag mode to select GUI transport, got %#v", srv.transport)
	}
	coreInstance := srv.Core()
	if _, ok := core.ServiceFor[*gui_chat.Service](coreInstance, "chat"); !ok {
		t.Fatal("expected chat service in default GUI mode")
	}
	if _, ok := core.ServiceFor[*guimcp.Subsystem](coreInstance, "gui_mcp"); !ok {
		t.Fatal("expected gui_mcp subsystem in default GUI mode")
	}
	if _, ok := core.ServiceFor[*GUIShell](coreInstance, "gui_shell"); !ok {
		t.Fatal("expected Wails-aware gui shell in default GUI mode")
	}
	mcpService, ok := core.ServiceFor[*coremcp.Service](coreInstance, "mcp")
	if !ok || mcpService == nil {
		t.Fatal("expected mcp service in default GUI mode")
	}
	result := coreInstance.Action("gui.chat.tools").Run(context.Background(), core.Options{})
	if !result.OK {
		t.Fatalf("chat tools action failed: %v", result.Value)
	}
	descriptors, ok := result.Value.([]guimcp.ToolDescriptor)
	if !ok {
		t.Fatalf("expected chat tool descriptors, got %T", result.Value)
	}
	if len(descriptors) != len(mcpService.Tools()) || len(descriptors) != 19 {
		t.Fatalf("expected chat and MCP to share 19 tools, chat=%d mcp=%d", len(descriptors), len(mcpService.Tools()))
	}
	manifest := coreInstance.Action("gui.chat.tool_manifest").Run(context.Background(), core.Options{})
	text, _ := manifest.Value.(string)
	if !manifest.OK || !core.Contains(text, "brain_recall") {
		t.Fatalf("expected chat manifest to include MCP tools, ok=%v text=%q", manifest.OK, text)
	}
}

func TestGUIMode_Compose_Bad_NoGUIFlagSkipsChat(t *testing.T) {
	coreInstance, err := Compose(Options{Config: config.IDEConfig{}.WithDefaults(), GUI: false, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose no-gui mode: %v", err)
	}
	if _, ok := core.ServiceFor[*gui_chat.Service](coreInstance, "chat"); ok {
		t.Fatal("expected chat service to be absent with --no-gui")
	}
	if _, ok := core.ServiceFor[*guimcp.Subsystem](coreInstance, "gui_mcp"); ok {
		t.Fatal("expected gui_mcp subsystem to be absent with --no-gui")
	}
	if _, ok := core.ServiceFor[*coremcp.Service](coreInstance, "mcp"); !ok {
		t.Fatal("expected mcp service to remain registered with --no-gui")
	}
}

func TestGUIMode_Compose_Ugly_MCPOnlyForcesNoGUI(t *testing.T) {
	srv, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), GUI: true, MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose mcp-only mode: %v", err)
	}
	if srv.transport.Mode != "stdio" {
		t.Fatalf("expected --mcp to force stdio transport, got %#v", srv.transport)
	}
	if _, ok := core.ServiceFor[*gui_chat.Service](srv.Core(), "chat"); ok {
		t.Fatal("expected chat service to be absent with --mcp")
	}
	if _, ok := core.ServiceFor[*guimcp.Subsystem](srv.Core(), "gui_mcp"); ok {
		t.Fatal("expected gui_mcp subsystem to be absent with --mcp")
	}
}
