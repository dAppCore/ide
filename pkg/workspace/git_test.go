package workspace

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestGit_GitStatus_Good(t *testing.T) {
	root := t.TempDir()
	initGitRepo(t, root)
	_ = os.WriteFile(filepath.Join(root, "dirty.txt"), []byte("dirty\n"), 0o644)
	status, err := gitStatus(context.Background(), testProcessService(t), root)
	if err != nil || status.Branch == "" || status.Clean || len(status.Changes) == 0 {
		t.Fatalf("unexpected git status %#v err=%v", status, err)
	}
}

func TestGit_GitStatus_Bad(t *testing.T) {
	if _, err := gitStatus(context.Background(), testProcessService(t), t.TempDir()); err == nil {
		t.Fatal("expected not-a-repo error")
	}
}

func TestGit_GitStatus_Ugly(t *testing.T) {
	if got := parseBranch("## HEAD detached at abc123"); got != "abc123" {
		t.Fatalf("expected detached head parse, got %q", got)
	}
}
