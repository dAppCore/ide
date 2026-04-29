package workspace

import (
	"context"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
)

func TestScan_Scan_Good(t *testing.T) {
	_targetName := "Scan"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: demo\n")
	projects, err := scanProjects(context.Background(), ScanInput{Root: "/workspace", Depth: 2}, medium, nil, "/workspace")
	if err != nil || len(projects) != 1 {
		t.Fatalf("unexpected scan result %#v err=%v", projects, err)
	}
}

func TestScan_Scan_Bad(t *testing.T) {
	_targetName := "Scan"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	projects, err := scanProjects(context.Background(), ScanInput{Root: "/workspace", Depth: 2}, coreio.NewMemoryMedium(), nil, "/workspace")
	if err != nil || len(projects) != 0 {
		t.Fatalf("expected empty project list, got %#v err=%v", projects, err)
	}
}

func TestScan_Scan_Ugly(t *testing.T) {
	_targetName := "Scan"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/.core/manifest.yaml", "name: root\n")
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: child\n")
	projects, err := scanProjects(context.Background(), ScanInput{Root: "/workspace", Depth: 2}, medium, nil, "/workspace")
	if err != nil || len(projects) == 0 || projects[0].Root != "/workspace" {
		t.Fatalf("expected nearest workspace first, got %#v err=%v", projects, err)
	}
}

func TestScan_Scan_Ugly_SymlinkEscape(t *testing.T) {
	target := "/etc/passwd"
	if result := core.Stat(target); !result.OK {
		t.Skipf("%s unavailable: %v", target, result.Value)
	}
	root := t.TempDir()
	coreDir := core.JoinPath(root, ".core")
	workspaceMkdirAll(t, coreDir)
	workspaceSymlink(t, target, core.JoinPath(coreDir, "evil"))

	log := core.NewBuffer()
	originalLog := core.Default()
	core.SetDefault(core.NewLog(core.LogOptions{Level: core.LevelWarn, Output: log}))
	defer core.SetDefault(originalLog)

	files, counts, sources, err := readCoreFiles(coreio.Local, root)
	if err != nil {
		t.Fatalf("readCoreFiles: %v", err)
	}
	if len(files) != 0 || counts.Total != 0 || len(sources) != 0 {
		t.Fatalf("expected symlink escape to be skipped, got files=%#v counts=%#v sources=%#v", files, counts, sources)
	}
	if got := log.String(); !core.Contains(got, "workspace scan skipped path outside workspace root") {
		t.Fatalf("expected warning log for symlink escape, got %q", got)
	}
}

func TestScan_AppendWorkspaceTree_Good(t *testing.T) {
	_targetName := "AppendWorkspaceTree"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	medium := coreio.NewMemoryMedium()
	root := "/workspace"
	_ = medium.Write(core.JoinPath(root, ".core", "nested", "file.md"), "hello world")
	files := []File{}
	counts := FileCount{}
	sources := []string{}
	appendWorkspaceTree(medium, core.JoinPath(root, ".core"), &files, &counts, &sources)
	if len(files) != 1 || counts.Total != 1 || len(sources) != 1 {
		t.Fatalf("expected tree walk to include one file, got files=%#v counts=%#v sources=%#v", files, counts, sources)
	}
}

func TestScan_ReadLimitedContent_Ugly(t *testing.T) {
	_targetName := "ReadLimitedContent"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	content := repeatString("a", maxPreviewBytes+10)
	medium := coreio.NewMemoryMedium()
	path := "/workspace/.core/large.txt"
	_ = medium.Write(path, content)
	got, err := readLimitedContent(medium, path, maxPreviewBytes)
	if err != nil {
		t.Fatalf("readLimitedContent: %v", err)
	}
	if len(got) != maxPreviewBytes {
		t.Fatalf("expected truncated content, got %d bytes", len(got))
	}
}
