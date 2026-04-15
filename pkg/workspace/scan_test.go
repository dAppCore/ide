package workspace

import (
	"context"
	"testing"

	coreio "dappco.re/go/core/io"
)

func TestScan_Scan_Good(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: demo\n")
	projects, err := scanProjects(context.Background(), ScanInput{Root: "/workspace", Depth: 2}, medium, nil, "/workspace")
	if err != nil || len(projects) != 1 {
		t.Fatalf("unexpected scan result %#v err=%v", projects, err)
	}
}

func TestScan_Scan_Bad(t *testing.T) {
	projects, err := scanProjects(context.Background(), ScanInput{Root: "/workspace", Depth: 2}, coreio.NewMemoryMedium(), nil, "/workspace")
	if err != nil || len(projects) != 0 {
		t.Fatalf("expected empty project list, got %#v err=%v", projects, err)
	}
}

func TestScan_Scan_Ugly(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/.core/manifest.yaml", "name: root\n")
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: child\n")
	projects, err := scanProjects(context.Background(), ScanInput{Root: "/workspace", Depth: 2}, medium, nil, "/workspace")
	if err != nil || len(projects) == 0 || projects[0].Root != "/workspace" {
		t.Fatalf("expected nearest workspace first, got %#v err=%v", projects, err)
	}
}
