package workspace

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	core "dappco.re/go/core"
	coreio "dappco.re/go/io"
	"dappco.re/go/process"
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

func TestApi_Status_Good(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir core: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "docs"), 0o755); err != nil {
		t.Fatalf("mkdir docs: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644); err != nil {
		t.Fatalf("write manifest: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "CLAUDE.md"), []byte("usage notes\n"), 0o644); err != nil {
		t.Fatalf("write claude: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("readme\n"), 0o644); err != nil {
		t.Fatalf("write readme: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "docs", "development.md"), []byte("dev\n"), 0o644); err != nil {
		t.Fatalf("write docs: %v", err)
	}
	initGitRepo(t, root)

	ensureProcessDefault(t)
	status, err := Status(context.Background(), StatusInput{Root: root})
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	if status.Root != root || status.Git.Branch == "" {
		t.Fatalf("expected populated status, got %#v", status)
	}
	if status.Counts.Total == 0 || len(status.CoreFiles) < 3 {
		t.Fatalf("expected core files to be read, got %#v", status)
	}
}

func TestApi_Conventions_Good(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir core: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "go.mod"), []byte("module example.com/demo\n"), 0o644); err != nil {
		t.Fatalf("write go.mod: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("projectName: demo\n"), 0o644); err != nil {
		t.Fatalf("write build: %v", err)
	}
	initGitRepo(t, root)

	ensureProcessDefault(t)
	out, err := Conventions(context.Background(), ConventionsInput{Root: root})
	if err != nil {
		t.Fatalf("conventions: %v", err)
	}
	if out.Build.ProjectName != "demo" {
		t.Fatalf("expected build project name, got %#v", out.Build)
	}
	if len(out.Conventions) == 0 || len(out.Sources) == 0 {
		t.Fatalf("expected conventions and sources, got %#v", out)
	}
}

func TestApi_Impact_Good(t *testing.T) {
	root := filepath.Join(t.TempDir(), "ide")
	if err := os.MkdirAll(filepath.Join(root, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir core: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "frontend"), 0o755); err != nil {
		t.Fatalf("mkdir frontend: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "repos.yaml"), []byte("repos:\n  - name: sibling\n    depends:\n      - ide\n"), 0o644); err != nil {
		t.Fatalf("write repos: %v", err)
	}
	initGitRepo(t, root)
	_ = os.WriteFile(filepath.Join(root, "frontend", "app.ts"), []byte("console.log('x')\n"), 0o644)
	if err := os.WriteFile(filepath.Join(root, ".core", "manifest.yaml.depends"), []byte("depends: []\n"), 0o644); err != nil {
		t.Fatalf("write depends: %v", err)
	}

	ensureProcessDefault(t)
	out, err := Impact(context.Background(), ImpactInput{Root: root})
	if err != nil {
		t.Fatalf("impact: %v", err)
	}
	if !containsString(out.ImpactedAreas, "frontend") || !containsString(out.ImpactedAreas, "downstream dependents") {
		t.Fatalf("expected impacted areas, got %#v", out)
	}
	if !containsString(out.SuggestedChecks, "cd frontend && npm test") {
		t.Fatalf("expected suggested checks, got %#v", out)
	}
}

func ensureProcessDefault(t *testing.T) {
	t.Helper()
	c := core.New(core.WithService(process.Register))
	svc, ok := core.ServiceFor[*process.Service](c, "process")
	if !ok || svc == nil {
		t.Fatal("expected process service")
	}
	if err := process.SetDefault(svc); err != nil {
		t.Fatalf("set default process service: %v", err)
	}
}
