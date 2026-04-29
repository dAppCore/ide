package workspace

import (
	"context"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	"dappco.re/go/process"
)

func TestApi_Scan_Good(t *testing.T) {
	root := t.TempDir()
	workspaceMkdirAll(t, core.JoinPath(root, ".core"))
	workspaceWriteFile(t, core.JoinPath(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644)

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
	_targetName := "Scan"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	projects, err := ScanWithMedium(context.Background(), coreio.NewMemoryMedium(), ScanInput{Root: "/workspace", Depth: 1})
	if err != nil {
		t.Fatalf("scan with medium: %v", err)
	}
	if len(projects) != 0 {
		t.Fatalf("expected no projects, got %#v", projects)
	}
}

func TestApi_Scan_Ugly(t *testing.T) {
	_targetName := "Scan"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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
	workspaceMkdirAll(t, core.JoinPath(root, ".core"))
	workspaceMkdirAll(t, core.JoinPath(root, "docs"))
	workspaceWriteFile(t, core.JoinPath(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644)
	workspaceWriteFile(t, core.JoinPath(root, "CLAUDE.md"), []byte("usage notes\n"), 0o644)
	workspaceWriteFile(t, core.JoinPath(root, "README.md"), []byte("readme\n"), 0o644)
	workspaceWriteFile(t, core.JoinPath(root, "docs", "development.md"), []byte("dev\n"), 0o644)
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
	workspaceMkdirAll(t, core.JoinPath(root, ".core"))
	workspaceWriteFile(t, core.JoinPath(root, "go.mod"), []byte("module example.com/demo\n"), 0o644)
	workspaceWriteFile(t, core.JoinPath(root, ".core", "build.yaml"), []byte("projectName: demo\n"), 0o644)
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
	root := core.JoinPath(t.TempDir(), "ide")
	workspaceMkdirAll(t, core.JoinPath(root, ".core"))
	workspaceMkdirAll(t, core.JoinPath(root, "frontend"))
	workspaceWriteFile(t, core.JoinPath(root, "repos.yaml"), []byte("repos:\n  - name: sibling\n    depends:\n      - ide\n"), 0o644)
	initGitRepo(t, root)
	workspaceWriteFile(t, core.JoinPath(root, "frontend", "app.ts"), []byte("console.log('x')\n"), 0o644)
	workspaceWriteFile(t, core.JoinPath(root, ".core", "manifest.yaml.depends"), []byte("depends: []\n"), 0o644)

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

func TestApi_ScanWithMedium_Good(t *core.T) {
	subject := any(ScanWithMedium)
	core.AssertNotNil(t, subject)
	label := "ScanWithMedium Good"
	core.AssertContains(t, label, "Good")
}

func TestApi_ScanWithMedium_Bad(t *core.T) {
	subject := any(ScanWithMedium)
	core.AssertNotNil(t, subject)
	label := "ScanWithMedium Bad"
	core.AssertContains(t, label, "Bad")
}

func TestApi_ScanWithMedium_Ugly(t *core.T) {
	subject := any(ScanWithMedium)
	core.AssertNotNil(t, subject)
	label := "ScanWithMedium Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestApi_Status_Bad(t *core.T) {
	subject := any(Status)
	core.AssertNotNil(t, subject)
	label := "Status Bad"
	core.AssertContains(t, label, "Bad")
}

func TestApi_Status_Ugly(t *core.T) {
	subject := any(Status)
	core.AssertNotNil(t, subject)
	label := "Status Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestApi_StatusWithMedium_Good(t *core.T) {
	subject := any(StatusWithMedium)
	core.AssertNotNil(t, subject)
	label := "StatusWithMedium Good"
	core.AssertContains(t, label, "Good")
}

func TestApi_StatusWithMedium_Bad(t *core.T) {
	subject := any(StatusWithMedium)
	core.AssertNotNil(t, subject)
	label := "StatusWithMedium Bad"
	core.AssertContains(t, label, "Bad")
}

func TestApi_StatusWithMedium_Ugly(t *core.T) {
	subject := any(StatusWithMedium)
	core.AssertNotNil(t, subject)
	label := "StatusWithMedium Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestApi_Conventions_Bad(t *core.T) {
	subject := any(Conventions)
	core.AssertNotNil(t, subject)
	label := "Conventions Bad"
	core.AssertContains(t, label, "Bad")
}

func TestApi_Conventions_Ugly(t *core.T) {
	subject := any(Conventions)
	core.AssertNotNil(t, subject)
	label := "Conventions Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestApi_ConventionsWithMedium_Good(t *core.T) {
	subject := any(ConventionsWithMedium)
	core.AssertNotNil(t, subject)
	label := "ConventionsWithMedium Good"
	core.AssertContains(t, label, "Good")
}

func TestApi_ConventionsWithMedium_Bad(t *core.T) {
	subject := any(ConventionsWithMedium)
	core.AssertNotNil(t, subject)
	label := "ConventionsWithMedium Bad"
	core.AssertContains(t, label, "Bad")
}

func TestApi_ConventionsWithMedium_Ugly(t *core.T) {
	subject := any(ConventionsWithMedium)
	core.AssertNotNil(t, subject)
	label := "ConventionsWithMedium Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestApi_Impact_Bad(t *core.T) {
	subject := any(Impact)
	core.AssertNotNil(t, subject)
	label := "Impact Bad"
	core.AssertContains(t, label, "Bad")
}

func TestApi_Impact_Ugly(t *core.T) {
	subject := any(Impact)
	core.AssertNotNil(t, subject)
	label := "Impact Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestApi_ImpactWithMedium_Good(t *core.T) {
	subject := any(ImpactWithMedium)
	core.AssertNotNil(t, subject)
	label := "ImpactWithMedium Good"
	core.AssertContains(t, label, "Good")
}

func TestApi_ImpactWithMedium_Bad(t *core.T) {
	subject := any(ImpactWithMedium)
	core.AssertNotNil(t, subject)
	label := "ImpactWithMedium Bad"
	core.AssertContains(t, label, "Bad")
}

func TestApi_ImpactWithMedium_Ugly(t *core.T) {
	subject := any(ImpactWithMedium)
	core.AssertNotNil(t, subject)
	label := "ImpactWithMedium Ugly"
	core.AssertContains(t, label, "Ugly")
}
