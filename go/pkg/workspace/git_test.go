package workspace

import (
	"context"
	"testing"

	core "dappco.re/go"
)

func TestGit_GitStatus_Good(t *testing.T) {
	_targetName := "GitStatus"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	root := t.TempDir()
	initGitRepo(t, root)
	workspaceWriteFile(t, core.JoinPath(root, "dirty.txt"), []byte("dirty\n"), 0o644)
	status, err := gitStatus(context.Background(), testProcessService(t), root)
	if err != nil || status.Branch == "" || status.Clean || len(status.Changes) == 0 {
		t.Fatalf("unexpected git status %#v err=%v", status, err)
	}
}

func TestGit_GitStatus_Bad(t *testing.T) {
	_targetName := "GitStatus"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if _, err := gitStatus(context.Background(), testProcessService(t), t.TempDir()); err == nil {
		t.Fatal("expected not-a-repo error")
	}
}

func TestGit_GitStatus_Ugly(t *testing.T) {
	_targetName := "GitStatus"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if got := parseBranch("## HEAD detached at abc123"); got != "abc123" {
		t.Fatalf("expected detached head parse, got %q", got)
	}
}
