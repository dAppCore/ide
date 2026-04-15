package workspace

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	coreio "dappco.re/go/core/io"
)

func TestApi_Scan_Good(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644); err != nil {
		t.Fatalf("write manifest: %v", err)
	}

	projects, err := Scan(context.Background(), ScanInput{Root: root, Depth: 2})
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(projects) != 1 {
		t.Fatalf("expected one project, got %#v", projects)
	}
	if projects[0].Root != root {
		t.Fatalf("expected root %q, got %#v", root, projects[0])
	}
}

func TestApi_Scan_Bad(t *testing.T) {
	projects, err := ScanWithMedium(context.Background(), coreio.NewMemoryMedium(), ScanInput{Root: "/workspace", Depth: 1})
	if err != nil {
		t.Fatalf("scan with medium: %v", err)
	}
	if len(projects) != 0 {
		t.Fatalf("expected no projects, got %#v", projects)
	}
}

func TestApi_Scan_Ugly(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: child\n")
	_ = medium.Write("/.core/manifest.yaml", "name: root\n")

	projects, err := ScanWithMedium(context.Background(), medium, ScanInput{Root: "/workspace", Depth: 2})
	if err != nil {
		t.Fatalf("scan with medium: %v", err)
	}
	if len(projects) == 0 || projects[0].Root != "/workspace" {
		t.Fatalf("expected nearest project first, got %#v", projects)
	}
}
