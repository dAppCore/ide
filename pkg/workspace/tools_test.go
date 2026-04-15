package workspace

import (
	"context"
	"testing"

	coreio "dappco.re/go/core/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

func TestTools_Register_Good(t *testing.T) {
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	subsystem := New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	subsystem.registerTools(svc)
	if len(svc.Tools()) < 4 {
		t.Fatalf("expected workspace tools, got %d", len(svc.Tools()))
	}
}

func TestTools_Register_Bad(t *testing.T) {
	subsystem := New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	if _, _, err := subsystem.handleScan(context.Background(), nil, ScanInput{Depth: -1}); err != nil {
		t.Fatalf("expected handler to normalize depth, got %v", err)
	}
}

func TestTools_Register_Ugly(t *testing.T) {
	subsystem := New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	if _, _, err := subsystem.handleStatus(context.Background(), nil, StatusInput{}); err == nil {
		t.Fatal("expected status handler to surface git error outside repo")
	}
}
