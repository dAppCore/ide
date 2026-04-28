package workspace

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"dappco.re/go/process"

	"dappco.re/go/ide/pkg/config"
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

func TestWorkspace_New_Good(t *testing.T) {
	subsystem := New(config.Workspace{}, nil, nil)
	if subsystem == nil {
		t.Fatal("expected subsystem")
	}
	if subsystem.medium == nil {
		t.Fatalf("expected default medium, got %#v", subsystem)
	}
}

func TestWorkspace_Name_Good(t *testing.T) {
	if got := New(config.Workspace{}, coreio.NewMemoryMedium(), testProcessService(t)).Name(); got != "workspace" {
		t.Fatalf("expected workspace name, got %q", got)
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

func TestWorkspace_Status_Good(t *testing.T) {
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	_ = medium.Write(filepath.Join(root, ".core", "manifest.yaml"), "name: demo\n")
	_ = medium.Write(filepath.Join(root, "CLAUDE.md"), "usage notes\n")
	_ = medium.Write(filepath.Join(root, "README.md"), "readme\n")
	_ = medium.Write(filepath.Join(root, "docs", "development.md"), "dev\n")
	initGitRepo(t, root)
	_ = os.WriteFile(filepath.Join(root, "untracked.txt"), []byte("dirty\n"), 0o644)

	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, medium, testProcessService(t))
	out, err := subsystem.status(context.Background(), StatusInput{})
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	if out.Root != root || out.Git.Branch == "" || out.Git.Clean {
		t.Fatalf("unexpected status output %#v", out)
	}
	if out.Counts.Total == 0 || len(out.CoreFiles) < 3 {
		t.Fatalf("expected core files to be read, got %#v", out)
	}
}

func TestWorkspace_Status_UglySymlinkEscape(t *testing.T) {
	root := t.TempDir()
	secretDir := t.TempDir()
	secretPath := filepath.Join(secretDir, "secret.txt")
	if err := os.WriteFile(secretPath, []byte("super-secret-token\n"), 0o600); err != nil {
		t.Fatalf("write secret: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir core: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644); err != nil {
		t.Fatalf("write manifest: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("projectName: demo\n"), 0o644); err != nil {
		t.Fatalf("write build: %v", err)
	}
	if err := os.Symlink(secretPath, filepath.Join(root, ".core", "leak.txt")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}
	initGitRepo(t, root)

	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, coreio.Local, testProcessService(t))
	out, err := subsystem.status(context.Background(), StatusInput{})
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	for _, file := range out.CoreFiles {
		if strings.Contains(file.Preview, "super-secret-token") {
			t.Fatalf("expected symlink escape to stay unreadable, got %#v", out.CoreFiles)
		}
	}
}

func TestWorkspace_Status_Bad(t *testing.T) {
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, medium, testProcessService(t))
	if _, err := subsystem.status(context.Background(), StatusInput{}); err == nil {
		t.Fatal("expected git status error outside a repo")
	}
}

// TestWorkspace_Status_UglyBrokenSymlink covers Cerberus F25 (Mantis #983):
// rejectsWorkspacePath must fail CLOSED when EvalSymlinks errors out — for
// example on a symlink whose target does not exist. The prior implementation
// (commit 4bacfcc, dangling) returned "not rejected" on resolution errors,
// allowing the broken-symlink path to fall through to medium.Stat / Open
// where the file system might still surface it.
//
// Acceptance: a broken symlink at .core/leak.txt -> /nonexistent/secret must
// NOT appear in the scanned core files — neither by path, by preview, nor by
// inclusion in the count.
func TestWorkspace_Status_UglyBrokenSymlink(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir core: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644); err != nil {
		t.Fatalf("write manifest: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("projectName: demo\n"), 0o644); err != nil {
		t.Fatalf("write build: %v", err)
	}
	// Symlink target does NOT exist — EvalSymlinks will return an error.
	brokenTarget := filepath.Join(t.TempDir(), "nonexistent", "secret")
	leakPath := filepath.Join(root, ".core", "leak.txt")
	if err := os.Symlink(brokenTarget, leakPath); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}
	initGitRepo(t, root)

	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, coreio.Local, testProcessService(t))
	out, err := subsystem.status(context.Background(), StatusInput{})
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	for _, file := range out.CoreFiles {
		if strings.HasSuffix(file.Path, "leak.txt") {
			t.Fatalf("broken symlink leaked into scan output: %#v", file)
		}
	}
}

func TestWorkspace_Conventions_Good(t *testing.T) {
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	_ = medium.Write(filepath.Join(root, "go.mod"), "module example.com/demo\n")
	_ = medium.Write(filepath.Join(root, ".core", "build.yaml"), "projectName: demo\n")
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, medium, testProcessService(t))
	out, err := subsystem.conventions(context.Background(), ConventionsInput{})
	if err != nil {
		t.Fatalf("conventions: %v", err)
	}
	if out.Build.ProjectName != "demo" {
		t.Fatalf("expected build project name, got %#v", out.Build)
	}
	if !containsString(out.Conventions, "Use core primitives and explicit data shapes for public APIs.") {
		t.Fatalf("expected go convention pack, got %#v", out.Conventions)
	}
	out2, err := subsystem.Conventions(context.Background(), ConventionsInput{})
	if err != nil {
		t.Fatalf("Conventions: %v", err)
	}
	if out2.Build.ProjectName != "demo" {
		t.Fatalf("expected exported Conventions method to match, got %#v", out2.Build)
	}
}

func TestWorkspace_Conventions_Bad(t *testing.T) {
	root := t.TempDir()
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	out, err := subsystem.conventions(context.Background(), ConventionsInput{})
	if err != nil {
		t.Fatalf("conventions: %v", err)
	}
	if len(out.Conventions) != 0 {
		t.Fatalf("expected no convention pack, got %#v", out)
	}
}

func TestWorkspace_Impact_Good(t *testing.T) {
	root := filepath.Join(t.TempDir(), "ide")
	medium := coreio.NewMemoryMedium()
	_ = medium.Write(filepath.Join(root, "repos.yaml"), "repos:\n  - name: sibling\n    depends:\n      - ide\n")
	initGitRepo(t, root)
	_ = os.WriteFile(filepath.Join(root, "frontend", "app.ts"), []byte("console.log('x')\n"), 0o644)
	_ = os.WriteFile(filepath.Join(root, ".core", "manifest.yaml.depends"), []byte("depends: []\n"), 0o644)

	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, medium, testProcessService(t))
	out, err := subsystem.impact(context.Background(), ImpactInput{})
	if err != nil {
		t.Fatalf("impact: %v", err)
	}
	if !containsString(out.ImpactedAreas, "frontend") || !containsString(out.ImpactedAreas, "core config") || !containsString(out.ImpactedAreas, "downstream dependents") {
		t.Fatalf("expected impact areas, got %#v", out)
	}
	if !containsString(out.SuggestedChecks, "cd frontend && npm test") || !containsString(out.SuggestedChecks, "core build") {
		t.Fatalf("expected suggested checks, got %#v", out)
	}
}

func TestWorkspace_Impact_Bad(t *testing.T) {
	subsystem := New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	_, err := subsystem.impact(context.Background(), ImpactInput{})
	if err == nil {
		t.Fatal("expected git status error outside a repo")
	}
}

func TestWorkspace_GitStatus_Good(t *testing.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	_ = os.WriteFile(filepath.Join(root, "dirty.txt"), []byte("dirty\n"), 0o644)
	status, err := gitStatus(context.Background(), testProcessService(t), root)
	if err != nil {
		t.Fatalf("git status: %v", err)
	}
	if status.Branch == "" || status.Clean {
		t.Fatalf("expected dirty repo with branch, got %#v", status)
	}
	if len(status.Changes) == 0 {
		t.Fatalf("expected changes, got %#v", status)
	}
}

func TestWorkspace_GitStatus_Bad(t *testing.T) {
	if _, err := gitStatus(context.Background(), nil, t.TempDir()); err == nil {
		t.Fatal("expected nil process service error")
	}
}

func TestWorkspace_GitStatus_Ugly(t *testing.T) {
	cases := []struct {
		line     string
		expected string
	}{
		{line: "## main...origin/main", expected: "main"},
		{line: "## HEAD (no branch)", expected: "HEAD"},
		{line: "## HEAD detached at abc123", expected: "abc123"},
	}
	for _, tc := range cases {
		if got := parseBranch(tc.line); got != tc.expected {
			t.Fatalf("parseBranch(%q) expected %q, got %q", tc.line, tc.expected, got)
		}
	}
	change := parseChange("?? untracked.txt")
	if change.Code != "??" || change.Path != "untracked.txt" {
		t.Fatalf("unexpected change %#v", change)
	}
}

func TestWorkspace_RegisterActions_Good(t *testing.T) {
	coreInstance := core.New()
	svc := New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	svc.RegisterActions(coreInstance)
	for _, name := range []string{"ide.workspace.status", "ide.workspace.conventions", "ide.workspace.impact", "ide.workspace.scan"} {
		if !coreInstance.Action(name).Exists() {
			t.Fatalf("expected action %s to exist", name)
		}
	}
}

func TestWorkspace_RegisterTools_Good(t *testing.T) {
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	subsystem := New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	subsystem.RegisterTools(svc)
	names := map[string]bool{}
	for _, tool := range svc.Tools() {
		names[tool.Name] = true
	}
	for _, name := range []string{"workspace_status", "workspace_conventions", "workspace_impact", "workspace_scan"} {
		if !names[name] {
			t.Fatalf("expected tool %s to be registered", name)
		}
	}
}

func TestWorkspace_Decode_Good(t *testing.T) {
	input, err := decode[ScanInput](core.NewOptions(
		core.Option{Key: "root", Value: "/workspace"},
		core.Option{Key: "depth", Value: 2},
	))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if input.Root != "/workspace" || input.Depth != 2 {
		t.Fatalf("unexpected decoded input %#v", input)
	}
}

func TestWorkspace_Decode_Bad(t *testing.T) {
	if _, err := decode[struct {
		Depth int `json:"depth"`
	}](core.NewOptions(core.Option{Key: "depth", Value: "bad"})); err == nil {
		t.Fatal("expected type mismatch error")
	}
}

func initGitRepo(t *testing.T, root string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(root, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "frontend"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "docs"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = root
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", strings.Join(args, " "), err, out)
		}
	}
	run("init")
	run("config", "user.email", "test@example.com")
	run("config", "user.name", "Test User")
	_ = os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("tracked\n"), 0o644)
	run("add", ".")
	run("commit", "-m", "init")
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func testProcessService(t *testing.T) *process.Service {
	t.Helper()
	c := core.New(core.WithService(process.Register))
	svc, ok := core.ServiceFor[*process.Service](c, "process")
	if !ok || svc == nil {
		t.Fatal("expected process service")
	}
	return svc
}
