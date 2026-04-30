package workspace

import (
	"context"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"

	"dappco.re/go/ide/pkg/config"
)

func TestActions_Workspace_Good(t *testing.T) {
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	_ = medium.Write(core.JoinPath(root, "go.mod"), "module example.com/demo\n")
	_ = medium.Write(core.JoinPath(root, ".core", "build.yaml"), "projectName: demo\n")
	initGitRepo(t, root)
	c := core.New()
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, medium, testProcessService(t))
	subsystem.registerActions(c)
	for _, name := range []string{
		"ide.workspace.scan",
		"ide.workspace.status",
		"ide.workspace.conventions",
		"ide.workspace.impact",
	} {
		if !c.Action(name).Exists() {
			t.Fatalf("expected %s action", name)
		}
	}
	if result := c.Action("ide.workspace.scan").Run(context.Background(), core.NewOptions(core.Option{Key: "root", Value: root})); !result.OK {
		t.Fatalf("expected scan action success, got %#v", result.Value)
	}
	if result := c.Action("ide.workspace.status").Run(context.Background(), core.NewOptions(core.Option{Key: "root", Value: root})); !result.OK {
		t.Fatalf("expected status action success, got %#v", result.Value)
	}
	if result := c.Action("ide.workspace.conventions").Run(context.Background(), core.NewOptions(core.Option{Key: "root", Value: root})); !result.OK {
		t.Fatalf("expected conventions action success, got %#v", result.Value)
	}
	if result := c.Action("ide.workspace.impact").Run(context.Background(), core.NewOptions(core.Option{Key: "root", Value: root})); !result.OK {
		t.Fatalf("expected impact action success, got %#v", result.Value)
	}
}

func TestActions_Workspace_Bad(t *testing.T) {
	c := core.New()
	New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t)).registerActions(c)
	result := c.Action("ide.workspace.scan").Run(context.Background(), core.NewOptions(core.Option{Key: "depth", Value: "bad"}))
	if result.OK {
		t.Fatalf("expected decode failure, got %#v", result.Value)
	}
}

func TestActions_Workspace_Ugly(t *testing.T) {
	c := core.New()
	New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t)).registerActions(c)
	result := c.Action("ide.workspace.status").Run(context.Background(), core.NewOptions())
	if result.OK {
		t.Fatal("expected git error outside repo")
	}
}
