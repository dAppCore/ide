package server

import (
	"testing"

	coreio "dappco.re/go/io"

	"dappco.re/go/ide/pkg/config"
)

func TestIntegrationActionParity_ToolsHaveActions_Good(t *testing.T) {
	_targetName := "ToolsHaveActions"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	srv, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	toolCount := 0
	for _, tool := range srv.MCP().Tools() {
		action, ok := ideActionForTool(tool.Group, tool.Name)
		if !ok {
			continue
		}
		toolCount++
		if !srv.Core().Action(action).Exists() {
			t.Fatalf("tool %s (%s) missing action %s", tool.Name, tool.Group, action)
		}
	}
	if toolCount == 0 {
		t.Fatal("expected IDE tools to be registered")
	}
}

func TestIntegrationActionParity_ToolsHaveActions_Bad(t *testing.T) {
	_targetName := "ToolsHaveActions"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if action, ok := ideActionForTool("agentic", "agentic_dispatch"); ok {
		t.Fatalf("expected non-IDE tool to be ignored, got %s", action)
	}
}

func TestIntegrationActionParity_ToolsHaveActions_Ugly(t *testing.T) {
	_targetName := "ToolsHaveActions"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	srv, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	seen := map[string]string{}
	for _, tool := range srv.MCP().Tools() {
		action, ok := ideActionForTool(tool.Group, tool.Name)
		if !ok {
			continue
		}
		if previous := seen[action]; previous != "" {
			t.Fatalf("tools %s and %s both map to action %s", previous, tool.Name, action)
		}
		seen[action] = tool.Name
	}
	if _, ok := seen["ide.subagent.dispatch_guided"]; !ok {
		t.Fatal("expected guided dispatch action parity")
	}
	tools := map[string]bool{}
	for _, tool := range srv.MCP().Tools() {
		tools[tool.Name] = true
	}
	for _, action := range srv.Core().Actions() {
		tool, ok := toolForIdeAction(action)
		if !ok {
			continue
		}
		if !tools[tool] {
			t.Fatalf("action %s missing tool %s", action, tool)
		}
	}
}

func ideActionForTool(group, name string) (string, bool) {
	switch group {
	case "brain":
		return "ide.brain." + trimToolPrefix(name, "brain_"), true
	case "workspace":
		return "ide.workspace." + trimToolPrefix(name, "workspace_"), true
	case "subagent":
		return "ide.subagent." + trimToolPrefix(name, "subagent_"), true
	case "navigate":
		if name == "core_navigate" {
			return "ide.navigate", true
		}
	case "pkg":
		return "ide.pkg." + trimToolPrefix(name, "pkg_"), true
	}
	return "", false
}

func trimToolPrefix(name, prefix string) string {
	if len(name) < len(prefix) || name[:len(prefix)] != prefix {
		return name
	}
	return name[len(prefix):]
}

func toolForIdeAction(name string) (string, bool) {
	switch {
	case len(name) > len("ide.brain.") && name[:len("ide.brain.")] == "ide.brain.":
		return "brain_" + name[len("ide.brain."):], true
	case len(name) > len("ide.workspace.") && name[:len("ide.workspace.")] == "ide.workspace.":
		return "workspace_" + name[len("ide.workspace."):], true
	case len(name) > len("ide.subagent.") && name[:len("ide.subagent.")] == "ide.subagent.":
		return "subagent_" + name[len("ide.subagent."):], true
	case name == "ide.navigate":
		return "core_navigate", true
	case len(name) > len("ide.pkg.") && name[:len("ide.pkg.")] == "ide.pkg.":
		return "pkg_" + name[len("ide.pkg."):], true
	default:
		return "", false
	}
}
