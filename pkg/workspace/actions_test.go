package workspace

import (
	"context"
	"testing"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"

	"dappco.re/go/core/ide/pkg/config"
)

func TestActions_Workspace_Good(t *testing.T) {
	c := core.New()
	New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t)).registerActions(c)
	if !c.Action("ide.workspace.scan").Exists() {
		t.Fatal("expected scan action")
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
