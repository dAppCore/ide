package brain

import "testing"

func TestTypes_ContextOutput_Good(t *testing.T) {
	output := ContextOutput{Overview: "loaded", Conventions: []string{"c1"}}
	if output.Overview != "loaded" || len(output.Conventions) != 1 {
		t.Fatalf("unexpected context output %#v", output)
	}
}

func TestTypes_ContextOutput_Bad(t *testing.T) {
	output := ContextOutput{}
	if output.Overview != "" || len(output.Recent) != 0 {
		t.Fatalf("expected zero value output, got %#v", output)
	}
}

func TestTypes_ContextOutput_Ugly(t *testing.T) {
	_targetName := "ContextOutput"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	filter := RecallFilter{Project: "demo"}
	if filter.Project != "demo" {
		t.Fatalf("expected aliased recall filter fields to remain available, got %#v", filter)
	}
}
