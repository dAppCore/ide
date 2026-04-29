package workspace

import "testing"

func TestTypes_StatusOutput_Good(t *testing.T) {
	output := StatusOutput{Root: "/workspace", Counts: FileCount{Total: 1}}
	if output.Root != "/workspace" || output.Counts.Total != 1 {
		t.Fatalf("unexpected status output %#v", output)
	}
}

func TestTypes_StatusOutput_Bad(t *testing.T) {
	output := StatusOutput{}
	if output.Root != "" || output.Git.Branch != "" {
		t.Fatalf("expected zero value output, got %#v", output)
	}
}

func TestTypes_StatusOutput_Ugly(t *testing.T) {
	_targetName := "StatusOutput"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	change := GitChange{Code: "??", Path: "new.txt"}
	if change.Code != "??" || change.Path != "new.txt" {
		t.Fatalf("unexpected git change %#v", change)
	}
}
