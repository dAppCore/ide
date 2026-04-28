package workspace

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
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

func TestScan_Scan_Ugly_SymlinkEscape(t *testing.T) {
	target := "/etc/passwd"
	if _, err := os.Stat(target); err != nil {
		t.Skipf("%s unavailable: %v", target, err)
	}
	root := t.TempDir()
	coreDir := filepath.Join(root, ".core")
	if err := os.MkdirAll(coreDir, 0o755); err != nil {
		t.Fatalf("mkdir core: %v", err)
	}
	if err := os.Symlink(target, filepath.Join(coreDir, "evil")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	var log bytes.Buffer
	originalLog := core.Default()
	core.SetDefault(core.NewLog(core.LogOptions{Level: core.LevelWarn, Output: &log}))
	defer core.SetDefault(originalLog)

	files, counts, sources, err := readCoreFiles(coreio.Local, root)
	if err != nil {
		t.Fatalf("readCoreFiles: %v", err)
	}
	if len(files) != 0 || counts.Total != 0 || len(sources) != 0 {
		t.Fatalf("expected symlink escape to be skipped, got files=%#v counts=%#v sources=%#v", files, counts, sources)
	}
	if got := log.String(); !strings.Contains(got, "workspace scan skipped path outside workspace root") {
		t.Fatalf("expected warning log for symlink escape, got %q", got)
	}
}

func TestScan_AppendWorkspaceTree_Good(t *testing.T) {
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
	content := strings.Repeat("a", maxPreviewBytes+10)
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
