package workspace

import (
	"context"
	"testing"

	coreio "dappco.re/go/core/io"

	"dappco.re/go/core/ide/pkg/config"
)

func TestWorkspace_Scan_Good(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: demo\n")
	subsystem := New(config.Workspace{Root: "/workspace", ScanDepth: 2}, medium, nil)
	out, err := subsystem.scan(context.Background(), ScanInput{})
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(out.Projects) != 1 {
		t.Fatalf("expected one project, got %#v", out)
	}
}

func TestWorkspace_Scan_Bad(t *testing.T) {
	subsystem := New(config.Workspace{Root: "/workspace", ScanDepth: 1}, coreio.NewMemoryMedium(), nil)
	out, err := subsystem.scan(context.Background(), ScanInput{})
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(out.Projects) != 0 {
		t.Fatalf("expected no projects, got %#v", out)
	}
}

func TestWorkspace_Scan_Ugly(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: child\n")
	_ = medium.Write("/.core/manifest.yaml", "name: root\n")
	subsystem := New(config.Workspace{Root: "/workspace", ScanDepth: 2}, medium, nil)
	out, err := subsystem.scan(context.Background(), ScanInput{})
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(out.Projects) == 0 || out.Projects[0].Root != "/workspace" {
		t.Fatalf("expected nearest workspace first, got %#v", out)
	}
}
