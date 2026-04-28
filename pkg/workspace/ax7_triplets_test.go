package workspace

import (
	"context"
	goio "io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
)

func TestAX7_ScanWithMedium_Good(t *core.T) {
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write("/workspace/.core/manifest.yaml", "name: demo\n"))
	projects, err := ScanWithMedium(context.Background(), medium, ScanInput{Root: "/workspace", Depth: 2})
	core.RequireNoError(t, err)
	core.AssertLen(t, projects, 1)
	core.AssertEqual(t, "/workspace", projects[0].Root)
}

func TestAX7_ScanWithMedium_Bad(t *core.T) {
	projects, err := ScanWithMedium(context.Background(), coreio.NewMemoryMedium(), ScanInput{Root: "/workspace", Depth: 1})
	core.RequireNoError(t, err)
	core.AssertEmpty(t, projects)
	core.AssertLen(t, projects, 0)
}

func TestAX7_ScanWithMedium_Ugly(t *core.T) {
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write("/workspace/.core/manifest.yaml", "name: parent\n"))
	core.RequireNoError(t, medium.Write("/workspace/child/.core/manifest.yaml", "name: child\n"))
	projects, err := ScanWithMedium(context.Background(), medium, ScanInput{Root: "/workspace/child", Depth: 2})
	core.RequireNoError(t, err)
	core.AssertEqual(t, "/workspace/child", projects[0].Root)
}

func TestAX7_StatusWithMedium_Good(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write(filepath.Join(root, ".core", "manifest.yaml"), "name: demo\n"))
	core.RequireNoError(t, medium.Write(filepath.Join(root, "README.md"), "readme\n"))
	ensureProcessDefault(t)
	out, err := StatusWithMedium(context.Background(), medium, StatusInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertEqual(t, root, out.Root)
	core.AssertNotEmpty(t, out.Git.Branch)
}

func TestAX7_StatusWithMedium_Bad(t *core.T) {
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write(filepath.Join(root, ".core", "manifest.yaml"), "name: demo\n"))
	ensureProcessDefault(t)
	_, err := StatusWithMedium(context.Background(), medium, StatusInput{Root: root})
	core.AssertError(t, err)
}

func TestAX7_StatusWithMedium_Ugly(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write(filepath.Join(root, ".core", "manifest.yaml"), "name: demo\n"))
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, "dirty.txt"), []byte("dirty\n"), 0o644))
	ensureProcessDefault(t)
	out, err := StatusWithMedium(context.Background(), medium, StatusInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertFalse(t, out.Git.Clean)
}

func TestAX7_Status_Ugly(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, ".core", "notes.md"), []byte("dirty\n"), 0o644))
	ensureProcessDefault(t)
	out, err := Status(context.Background(), StatusInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertFalse(t, out.Git.Clean)
	core.AssertNotEmpty(t, out.CoreFiles)
}

func TestAX7_ConventionsWithMedium_Good(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write(filepath.Join(root, "go.mod"), "module example.com/demo\n"))
	core.RequireNoError(t, medium.Write(filepath.Join(root, ".core", "build.yaml"), "projectName: demo\n"))
	ensureProcessDefault(t)
	out, err := ConventionsWithMedium(context.Background(), medium, ConventionsInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertEqual(t, "demo", out.Build.ProjectName)
	core.AssertNotEmpty(t, out.Conventions)
}

func TestAX7_ConventionsWithMedium_Bad(t *core.T) {
	root := t.TempDir()
	ensureProcessDefault(t)
	out, err := ConventionsWithMedium(context.Background(), coreio.NewMemoryMedium(), ConventionsInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertEmpty(t, out.Conventions)
	core.AssertEqual(t, "", out.Build.ProjectName)
}

func TestAX7_ConventionsWithMedium_Ugly(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write(filepath.Join(root, ".core", "build.yaml"), "name: demo\n"))
	ensureProcessDefault(t)
	out, err := ConventionsWithMedium(context.Background(), medium, ConventionsInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertEqual(t, "demo", out.Build.ProjectName)
}

func TestAX7_Conventions_Ugly(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, "go.mod"), []byte("module example.com/demo\n"), 0o644))
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("projectName: demo\n"), 0o644))
	ensureProcessDefault(t)
	out, err := Conventions(context.Background(), ConventionsInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertEqual(t, "demo", out.Build.ProjectName)
	core.AssertContains(t, core.Join("\n", out.Notes...), "dirty")
}

func TestAX7_ImpactWithMedium_Good(t *core.T) {
	root := filepath.Join(t.TempDir(), "ide")
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write(filepath.Join(root, "repos.yaml"), "repos:\n  - name: sibling\n    depends:\n      - ide\n"))
	initGitRepo(t, root)
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, "frontend", "app.ts"), []byte("console.log('x')\n"), 0o644))
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, ".core", "manifest.yaml.depends"), []byte("depends: []\n"), 0o644))
	ensureProcessDefault(t)
	out, err := ImpactWithMedium(context.Background(), medium, ImpactInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertContains(t, core.Join(",", out.ImpactedAreas...), "frontend")
	core.AssertContains(t, core.Join(",", out.ImpactedAreas...), "downstream dependents")
}

func TestAX7_ImpactWithMedium_Bad(t *core.T) {
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	ensureProcessDefault(t)
	_, err := ImpactWithMedium(context.Background(), medium, ImpactInput{Root: root})
	core.AssertError(t, err)
}

func TestAX7_ImpactWithMedium_Ugly(t *core.T) {
	root := filepath.Join(t.TempDir(), "ide")
	initGitRepo(t, root)
	medium := coreio.NewMemoryMedium()
	ensureProcessDefault(t)
	out, err := ImpactWithMedium(context.Background(), medium, ImpactInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertEmpty(t, out.ImpactedAreas)
}

func TestAX7_Impact_Ugly(t *core.T) {
	root := filepath.Join(t.TempDir(), "ide")
	initGitRepo(t, root)
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, ".core", "manifest.yaml.depends"), []byte("depends: []\n"), 0o644))
	ensureProcessDefault(t)
	out, err := Impact(context.Background(), ImpactInput{Root: root})
	core.RequireNoError(t, err)
	core.AssertContains(t, core.Join(",", out.ImpactedAreas...), "core config")
	core.AssertContains(t, core.Join(",", out.SuggestedChecks...), "core build")
}

func TestAX7_New_Bad(t *core.T) {
	subsystem := New(config.Workspace{Root: "/workspace"}, nil, nil)
	core.AssertNotNil(t, subsystem.medium)
	core.AssertNotNil(t, subsystem.process)
	core.AssertEqual(t, "/workspace", subsystem.cfg.Root)
}

func TestAX7_New_Ugly(t *core.T) {
	medium := coreio.NewMemoryMedium()
	processService := testProcessService(t)
	subsystem := New(config.Workspace{Root: "/workspace", ScanDepth: 9}, medium, processService)
	core.AssertEqual(t, medium, subsystem.medium)
	core.AssertEqual(t, processService, subsystem.process)
}

func TestAX7_Subsystem_Name_Good(t *core.T) {
	subsystem := New(config.Workspace{}, coreio.NewMemoryMedium(), testProcessService(t))
	name := subsystem.Name()
	core.AssertEqual(t, "workspace", name)
	core.AssertNotEmpty(t, name)
}

func TestAX7_Subsystem_Name_Bad(t *core.T) {
	var subsystem *Subsystem
	name := subsystem.Name()
	core.AssertEqual(t, "workspace", name)
	core.AssertNotEmpty(t, name)
}

func TestAX7_Subsystem_Name_Ugly(t *core.T) {
	subsystem := &Subsystem{}
	name := subsystem.Name()
	core.AssertEqual(t, "workspace", name)
	core.AssertNotEmpty(t, name)
}

func TestAX7_Subsystem_RegisterTools_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t)).RegisterTools(service)
	names := ax7WorkspaceToolNames(service.Tools())
	core.AssertTrue(t, names["workspace_status"])
	core.AssertTrue(t, names["workspace_scan"])
}

func TestAX7_Subsystem_RegisterTools_Bad(t *core.T) {
	subsystem := New(config.Workspace{}, coreio.NewMemoryMedium(), testProcessService(t))
	core.AssertPanics(t, func() { subsystem.RegisterTools(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterTools_Ugly(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Workspace{}, coreio.NewMemoryMedium(), testProcessService(t)).RegisterTools(service)
	names := ax7WorkspaceToolNames(service.Tools())
	core.AssertTrue(t, names["workspace_impact"])
}

func TestAX7_Subsystem_RegisterActions_Good(t *core.T) {
	c := core.New()
	New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t)).RegisterActions(c)
	core.AssertTrue(t, c.Action("ide.workspace.status").Exists())
	core.AssertTrue(t, c.Action("ide.workspace.scan").Exists())
}

func TestAX7_Subsystem_RegisterActions_Bad(t *core.T) {
	subsystem := New(config.Workspace{}, coreio.NewMemoryMedium(), testProcessService(t))
	core.AssertPanics(t, func() { subsystem.RegisterActions(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterActions_Ugly(t *core.T) {
	c := core.New()
	New(config.Workspace{Root: t.TempDir(), ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t)).RegisterActions(c)
	result := c.Action("ide.workspace.scan").Run(context.Background(), core.NewOptions(core.Option{Key: "depth", Value: "bad"}))
	core.AssertFalse(t, result.OK)
}

func TestAX7_Subsystem_Conventions_Good(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write(filepath.Join(root, "go.mod"), "module example.com/demo\n"))
	core.RequireNoError(t, medium.Write(filepath.Join(root, ".core", "build.yaml"), "projectName: demo\n"))
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, medium, testProcessService(t))
	out, err := subsystem.Conventions(context.Background(), ConventionsInput{})
	core.RequireNoError(t, err)
	core.AssertEqual(t, "demo", out.Build.ProjectName)
}

func TestAX7_Subsystem_Conventions_Bad(t *core.T) {
	root := t.TempDir()
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	out, err := subsystem.Conventions(context.Background(), ConventionsInput{})
	core.RequireNoError(t, err)
	core.AssertEmpty(t, out.Conventions)
	core.AssertEqual(t, "", out.Build.ProjectName)
}

func TestAX7_Subsystem_Conventions_Ugly(t *core.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, "go.mod"), []byte("module example.com/demo\n"), 0o644))
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, ".core", "build.yaml"), []byte("projectName: demo\n"), 0o644))
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, coreio.Local, testProcessService(t))
	out, err := subsystem.Conventions(context.Background(), ConventionsInput{})
	core.RequireNoError(t, err)
	core.AssertContains(t, core.Join("\n", out.Notes...), "dirty")
}

func TestAX7_Subsystem_Root_Good(t *core.T) {
	medium := coreio.NewMemoryMedium()
	core.RequireNoError(t, medium.Write("/workspace/.core/manifest.yaml", "name: demo\n"))
	subsystem := New(config.Workspace{Root: "/workspace/child", ScanDepth: 2}, medium, testProcessService(t))
	root := subsystem.Root()
	core.AssertEqual(t, "/workspace", root)
}

func TestAX7_Subsystem_Root_Bad(t *core.T) {
	root := t.TempDir()
	subsystem := New(config.Workspace{Root: root, ScanDepth: 1}, coreio.NewMemoryMedium(), testProcessService(t))
	got := subsystem.Root()
	core.AssertEqual(t, root, got)
}

func TestAX7_Subsystem_Root_Ugly(t *core.T) {
	root := t.TempDir()
	child := filepath.Join(root, "child")
	core.RequireNoError(t, os.MkdirAll(filepath.Join(root, ".core"), 0o755))
	core.RequireNoError(t, os.MkdirAll(child, 0o755))
	core.RequireNoError(t, os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644))
	subsystem := New(config.Workspace{Root: child, ScanDepth: 2}, coreio.Local, testProcessService(t))
	core.AssertEqual(t, root, subsystem.Root())
}

func TestAX7_Medium_Read_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	got, err := medium.Read("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "content", got)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Read_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	_, err := medium.Read("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_Read_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	got, err := medium.Read("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "content", got)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Write_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.Write("/workspace/docs/file.txt", "body")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
	core.AssertEqual(t, "body", delegate.content)
}

func TestAX7_Medium_Write_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.Write("/tmp/secret.txt", "body")
	core.AssertError(t, err)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_Write_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	err := medium.Write("/workspace/docs/file.txt", "body")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_WriteMode_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.WriteMode("/workspace/bin/tool", "body", 0o755)
	core.RequireNoError(t, err)
	core.AssertEqual(t, "bin/tool", delegate.lastPath)
	core.AssertEqual(t, fs.FileMode(0o755), delegate.mode)
}

func TestAX7_Medium_WriteMode_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.WriteMode("/tmp/tool", "body", 0o755)
	core.AssertError(t, err)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_WriteMode_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	err := medium.WriteMode("/workspace/bin/tool", "body", 0o755)
	core.RequireNoError(t, err)
	core.AssertEqual(t, "/workspace/bin/tool", delegate.lastPath)
}

func TestAX7_Medium_EnsureDir_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.EnsureDir("/workspace/docs")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "docs", delegate.lastPath)
}

func TestAX7_Medium_EnsureDir_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.EnsureDir("/tmp/docs")
	core.AssertError(t, err)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_EnsureDir_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	err := medium.EnsureDir("/workspace/docs")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "/workspace/docs", delegate.lastPath)
}

func TestAX7_Medium_IsFile_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	ok := medium.IsFile("/workspace/docs/file.txt")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_IsFile_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	ok := medium.IsFile("/tmp/secret.txt")
	core.AssertFalse(t, ok)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_IsFile_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	ok := medium.IsFile("/workspace/docs/file.txt")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Delete_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.Delete("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Delete_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.Delete("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_Delete_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	err := medium.Delete("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_DeleteAll_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.DeleteAll("/workspace/docs")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "docs", delegate.lastPath)
}

func TestAX7_Medium_DeleteAll_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.DeleteAll("/tmp/docs")
	core.AssertError(t, err)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_DeleteAll_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	err := medium.DeleteAll("/workspace/docs")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "/workspace/docs", delegate.lastPath)
}

func TestAX7_Medium_Rename_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.Rename("/workspace/docs/old.txt", "/workspace/docs/new.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "docs/old.txt", delegate.oldPath)
	core.AssertEqual(t, "docs/new.txt", delegate.newPath)
}

func TestAX7_Medium_Rename_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	err := medium.Rename("/tmp/old.txt", "/workspace/docs/new.txt")
	core.AssertError(t, err)
	core.AssertEqual(t, "", delegate.oldPath)
}

func TestAX7_Medium_Rename_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	err := medium.Rename("/workspace/docs/old.txt", "/workspace/docs/new.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "/workspace/docs/old.txt", delegate.oldPath)
	core.AssertEqual(t, "/workspace/docs/new.txt", delegate.newPath)
}

func TestAX7_Medium_List_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	entries, err := medium.List("/workspace/docs")
	core.RequireNoError(t, err)
	core.AssertLen(t, entries, 1)
	core.AssertEqual(t, "docs", delegate.lastPath)
}

func TestAX7_Medium_List_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	entries, err := medium.List("/tmp/docs")
	core.AssertError(t, err)
	core.AssertNil(t, entries)
}

func TestAX7_Medium_List_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	entries, err := medium.List("/workspace/docs")
	core.RequireNoError(t, err)
	core.AssertLen(t, entries, 1)
	core.AssertEqual(t, "/workspace/docs", delegate.lastPath)
}

func TestAX7_Medium_Stat_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	info, err := medium.Stat("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "file.txt", info.Name())
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Stat_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	info, err := medium.Stat("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertNil(t, info)
}

func TestAX7_Medium_Stat_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	info, err := medium.Stat("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertEqual(t, "file.txt", info.Name())
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Open_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	file, err := medium.Open("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, file)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Open_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	file, err := medium.Open("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertNil(t, file)
}

func TestAX7_Medium_Open_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	file, err := medium.Open("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, file)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Create_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	writer, err := medium.Create("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, writer)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Create_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	writer, err := medium.Create("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertNil(t, writer)
}

func TestAX7_Medium_Create_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	writer, err := medium.Create("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, writer)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Append_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	writer, err := medium.Append("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, writer)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Append_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	writer, err := medium.Append("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertNil(t, writer)
}

func TestAX7_Medium_Append_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	writer, err := medium.Append("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, writer)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_ReadStream_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	reader, err := medium.ReadStream("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	body, err := goio.ReadAll(reader)
	core.RequireNoError(t, err)
	core.AssertEqual(t, "stream", string(body))
}

func TestAX7_Medium_ReadStream_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	reader, err := medium.ReadStream("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertNil(t, reader)
}

func TestAX7_Medium_ReadStream_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	reader, err := medium.ReadStream("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	body, err := goio.ReadAll(reader)
	core.RequireNoError(t, err)
	core.AssertEqual(t, "stream", string(body))
}

func TestAX7_Medium_WriteStream_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	writer, err := medium.WriteStream("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, writer)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_WriteStream_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	writer, err := medium.WriteStream("/tmp/secret.txt")
	core.AssertError(t, err)
	core.AssertNil(t, writer)
}

func TestAX7_Medium_WriteStream_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	writer, err := medium.WriteStream("/workspace/docs/file.txt")
	core.RequireNoError(t, err)
	core.AssertNotNil(t, writer)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Exists_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	ok := medium.Exists("/workspace/docs/file.txt")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_Exists_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	ok := medium.Exists("/tmp/secret.txt")
	core.AssertFalse(t, ok)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_Exists_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	ok := medium.Exists("/workspace/docs/file.txt")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "/workspace/docs/file.txt", delegate.lastPath)
}

func TestAX7_Medium_IsDir_Good(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	ok := medium.IsDir("/workspace/docs")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "docs", delegate.lastPath)
}

func TestAX7_Medium_IsDir_Bad(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Rooted(delegate)
	ok := medium.IsDir("/tmp/docs")
	core.AssertFalse(t, ok)
	core.AssertEqual(t, "", delegate.lastPath)
}

func TestAX7_Medium_IsDir_Ugly(t *core.T) {
	delegate := &ax7TrackingMedium{}
	medium := ax7Unbound(delegate)
	ok := medium.IsDir("/workspace/docs")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "/workspace/docs", delegate.lastPath)
}

func ax7WorkspaceToolNames(records []coremcp.ToolRecord) map[string]bool {
	names := map[string]bool{}
	for _, record := range records {
		names[record.Name] = true
	}
	return names
}

func ax7Rooted(delegate *ax7TrackingMedium) *rootedMedium {
	return &rootedMedium{medium: delegate, root: "/workspace", bound: true}
}

func ax7Unbound(delegate *ax7TrackingMedium) *rootedMedium {
	return &rootedMedium{medium: delegate, root: "/workspace", bound: false}
}

type ax7TrackingMedium struct {
	lastPath string
	oldPath  string
	newPath  string
	content  string
	mode     fs.FileMode
}

var _ coreio.Medium = (*ax7TrackingMedium)(nil)

func (m *ax7TrackingMedium) Read(path string) (string, error) {
	m.lastPath = path
	return "content", nil
}

func (m *ax7TrackingMedium) Write(path, content string) error {
	m.lastPath = path
	m.content = content
	return nil
}

func (m *ax7TrackingMedium) WriteMode(path, content string, mode fs.FileMode) error {
	m.lastPath = path
	m.content = content
	m.mode = mode
	return nil
}

func (m *ax7TrackingMedium) EnsureDir(path string) error {
	m.lastPath = path
	return nil
}

func (m *ax7TrackingMedium) IsFile(path string) bool {
	m.lastPath = path
	return true
}

func (m *ax7TrackingMedium) Delete(path string) error {
	m.lastPath = path
	return nil
}

func (m *ax7TrackingMedium) DeleteAll(path string) error {
	m.lastPath = path
	return nil
}

func (m *ax7TrackingMedium) Rename(oldPath, newPath string) error {
	m.oldPath = oldPath
	m.newPath = newPath
	return nil
}

func (m *ax7TrackingMedium) List(path string) ([]fs.DirEntry, error) {
	m.lastPath = path
	return []fs.DirEntry{ax7DirEntry{name: "file.txt"}}, nil
}

func (m *ax7TrackingMedium) Stat(path string) (fs.FileInfo, error) {
	m.lastPath = path
	return ax7FileInfo{name: "file.txt"}, nil
}

func (m *ax7TrackingMedium) Open(path string) (fs.File, error) {
	m.lastPath = path
	return &ax7File{reader: goio.NopCloser(strings.NewReader("open"))}, nil
}

func (m *ax7TrackingMedium) Create(path string) (goio.WriteCloser, error) {
	m.lastPath = path
	return ax7WriteCloser{}, nil
}

func (m *ax7TrackingMedium) Append(path string) (goio.WriteCloser, error) {
	m.lastPath = path
	return ax7WriteCloser{}, nil
}

func (m *ax7TrackingMedium) ReadStream(path string) (goio.ReadCloser, error) {
	m.lastPath = path
	return goio.NopCloser(strings.NewReader("stream")), nil
}

func (m *ax7TrackingMedium) WriteStream(path string) (goio.WriteCloser, error) {
	m.lastPath = path
	return ax7WriteCloser{}, nil
}

func (m *ax7TrackingMedium) Exists(path string) bool {
	m.lastPath = path
	return true
}

func (m *ax7TrackingMedium) IsDir(path string) bool {
	m.lastPath = path
	return true
}

type ax7DirEntry struct {
	name string
}

func (d ax7DirEntry) Name() string               { return d.name }
func (d ax7DirEntry) IsDir() bool                { return false }
func (d ax7DirEntry) Type() fs.FileMode          { return 0 }
func (d ax7DirEntry) Info() (fs.FileInfo, error) { return ax7FileInfo{name: d.name}, nil }

type ax7FileInfo struct {
	name string
}

func (i ax7FileInfo) Name() string       { return i.name }
func (i ax7FileInfo) Size() int64        { return 0 }
func (i ax7FileInfo) Mode() fs.FileMode  { return 0o644 }
func (i ax7FileInfo) ModTime() time.Time { return time.Unix(0, 0).UTC() }
func (i ax7FileInfo) IsDir() bool        { return false }
func (i ax7FileInfo) Sys() any           { return nil }

type ax7File struct {
	reader goio.ReadCloser
}

func (f *ax7File) Stat() (fs.FileInfo, error) { return ax7FileInfo{name: "file.txt"}, nil }
func (f *ax7File) Read(p []byte) (int, error) { return f.reader.Read(p) }
func (f *ax7File) Close() error               { return f.reader.Close() }

type ax7WriteCloser struct{}

func (ax7WriteCloser) Write(p []byte) (int, error) { return len(p), nil }
func (ax7WriteCloser) Close() error                { return nil }
