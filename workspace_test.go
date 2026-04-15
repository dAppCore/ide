package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadCoreFiles_Good(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("version: 1\nproject:\n  name: demo\n"), 0o644))

	files, counts, sourceFiles, err := readCoreFiles(root)
	require.NoError(t, err)
	require.Len(t, files, 1)
	assert.Equal(t, 1, counts.Total)
	assert.Equal(t, 1, counts.Text)
	assert.Equal(t, []string{".core/build.yaml"}, sourceFiles)
	assert.Equal(t, ".core/build.yaml", files[0].Path)
	assert.True(t, files[0].IsText)
}

func TestParseBuildConfig_Good(t *testing.T) {
	content, err := os.ReadFile(filepath.Join(".core", "build.yaml"))
	require.NoError(t, err)

	files := []workspaceFile{{Path: ".core/build.yaml", Content: string(content)}}

	summary := parseBuildConfig(files)
	assert.Equal(t, "1", summary.Version)
	assert.Equal(t, "core-ide", summary.ProjectName)
	assert.Equal(t, "Core IDE - Development Environment", summary.ProjectDescription)
	assert.Equal(t, "core-ide", summary.Binary)
	assert.Equal(t, "wails", summary.BuildType)
	assert.True(t, summary.CGO)
	assert.Equal(t, []string{"-trimpath"}, summary.Flags)
	assert.Equal(t, []string{"-s", "-w"}, summary.Ldflags)
	require.Len(t, summary.Targets, 3)
	assert.Equal(t, "darwin", summary.Targets[0].OS)
	assert.Equal(t, "arm64", summary.Targets[0].Arch)
	assert.Equal(t, "linux", summary.Targets[1].OS)
	assert.Equal(t, "amd64", summary.Targets[1].Arch)
	assert.Equal(t, "windows", summary.Targets[2].OS)
	assert.Equal(t, "amd64", summary.Targets[2].Arch)
}

func TestReadGitStatus_Good(t *testing.T) {
	root := t.TempDir()
	runGit(t, root, "init")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test User")
	require.NoError(t, os.WriteFile(filepath.Join(root, "README.md"), []byte("hello\n"), 0o644))
	runGit(t, root, "add", "README.md")
	runGit(t, root, "commit", "-m", "initial")
	require.NoError(t, os.WriteFile(filepath.Join(root, "README.md"), []byte("hello world\n"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(root, "new.txt"), []byte("new\n"), 0o644))

	status, err := readGitStatus(root)
	require.NoError(t, err)
	assert.False(t, status.Clean)
	assert.NotEmpty(t, status.Branch)
	assert.GreaterOrEqual(t, len(status.Changes), 2)
	assert.GreaterOrEqual(t, status.ChangeCounts.Unstaged, 1)
	assert.GreaterOrEqual(t, status.ChangeCounts.Untracked, 1)
}

func TestClassifyImpact_Good(t *testing.T) {
	areas := classifyImpact([]gitChange{
		{Path: ".core/build.yaml"},
		{Path: "main.go"},
		{Path: "frontend/src/app/app.ts"},
		{Path: "docs/index.md"},
	}, []string{".core/build.yaml"})

	assert.Contains(t, areas, "build configuration")
	assert.Contains(t, areas, "Go backend")
	assert.Contains(t, areas, "Angular frontend")
	assert.Contains(t, areas, "documentation")
	assert.Contains(t, areas, "workspace metadata")
}

func TestWorkspaceAPI_BasePath(t *testing.T) {
	api := NewWorkspaceAPI(".")
	assert.Equal(t, "workspace-api", api.Name())
	assert.Equal(t, "/api/v1/workspace", api.BasePath())
}

func TestWorkspaceConventionsForRoot_Good_MergesLanguagePacks(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("project:\n  name: demo\n"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(root, "go.mod"), []byte("module demo\n"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(root, "package.json"), []byte("{}\n"), 0o644))

	resp, err := workspaceConventionsForRoot(root)
	require.NoError(t, err)
	assert.Equal(t, root, resp.Root)
	assert.Contains(t, resp.Conventions, "Use core primitives and explicit data shapes for public APIs.")
	assert.Contains(t, resp.Conventions, "Prefer deterministic component inputs and outputs over hidden ambient state.")
	assert.Contains(t, strings.Join(resp.Notes, "\n"), "Go pack loaded")
	assert.Contains(t, strings.Join(resp.Notes, "\n"), "TypeScript pack loaded")
	assert.Contains(t, strings.Join(resp.Notes, "\n"), "Build manifest detected for demo.")
}

func TestWorkspaceConventionsForRoot_Good_RespectsConfiguredPacks(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("project:\n  name: demo\n"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(root, "go.mod"), []byte("module demo\n"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(root, "package.json"), []byte("{}\n"), 0o644))

	resp, err := workspaceConventionsForRoot(root, "go")
	require.NoError(t, err)
	assert.Contains(t, strings.Join(resp.Notes, "\n"), "Go pack loaded")
	assert.NotContains(t, strings.Join(resp.Notes, "\n"), "TypeScript pack loaded")
}

func TestWorkspaceConventionsForRoot_Bad_UnknownLanguageFallsBack(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("project:\n  name: demo\n"), 0o644))

	resp, err := workspaceConventionsForRoot(root)
	require.NoError(t, err)
	assert.NotContains(t, strings.Join(resp.Notes, "\n"), "Go pack loaded")
	assert.NotContains(t, strings.Join(resp.Notes, "\n"), "TypeScript pack loaded")
}

func TestWorkspaceConventionsForRoot_Ugly_DirtyWorktreeAddsNote(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("project:\n  name: demo\n"), 0o644))
	runGit(t, root, "init")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test User")
	require.NoError(t, os.WriteFile(filepath.Join(root, "untracked.txt"), []byte("dirty\n"), 0o644))

	resp, err := workspaceConventionsForRoot(root)
	require.NoError(t, err)
	assert.Contains(t, strings.Join(resp.Notes, "\n"), "dirty")
}

func TestWorkspaceImpactForRoot_Good_FindsDownstreamDependents(t *testing.T) {
	parent := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(parent, "repos.yaml"), []byte(`
version: 1
org: forge
base_path: .
repos:
  alpha:
    depends:
      - beta
  beta:
    depends: []
`), 0o644))

	root := filepath.Join(parent, "beta")
	require.NoError(t, os.MkdirAll(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: beta\n"), 0o644))
	runGit(t, root, "init")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test User")

	resp, err := workspaceImpactForRoot(root)
	require.NoError(t, err)
	assert.Contains(t, resp.ImpactedAreas, "downstream dependents")
	assert.Contains(t, strings.Join(resp.Notes, "\n"), "alpha")
	assert.Contains(t, strings.Join(resp.SuggestedChecks, "\n"), "review downstream dependents: alpha")
}

func TestWorkspaceImpactForRoot_Bad_NoRegistryNoCrash(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: beta\n"), 0o644))
	runGit(t, root, "init")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test User")

	resp, err := workspaceImpactForRoot(root)
	require.NoError(t, err)
	assert.NotContains(t, strings.Join(resp.ImpactedAreas, "\n"), "downstream dependents")
}

func TestWorkspaceImpactForRoot_Ugly_IgnoresMissingManifestChangeMarker(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: beta\n"), 0o644))
	runGit(t, root, "init")
	runGit(t, root, "config", "user.email", "test@example.com")
	runGit(t, root, "config", "user.name", "Test User")

	resp, err := workspaceImpactForRoot(root)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.ImpactedAreas)
	assert.NotContains(t, strings.Join(resp.SuggestedChecks, "\n"), "review downstream dependents")
}

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
	out, err := cmd.CombinedOutput()
	require.NoError(t, err, string(out))
}
