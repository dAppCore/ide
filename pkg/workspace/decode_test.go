package workspace

import (
	"testing"

	core "dappco.re/go"
)

func TestDecode_Workspace_Good(t *testing.T) {
	input, err := decode[ScanInput](core.NewOptions(core.Option{Key: "root", Value: "/workspace"}))
	if err != nil || input.Root != "/workspace" {
		t.Fatalf("unexpected decode result %#v err=%v", input, err)
	}
}

func TestDecode_Workspace_Bad(t *testing.T) {
	if _, err := decode[struct {
		Depth int `json:"depth"`
	}](core.NewOptions(core.Option{Key: "depth", Value: "bad"})); err == nil {
		t.Fatal("expected decode error")
	}
}

func TestDecode_Workspace_Ugly(t *testing.T) {
	values := unique([]string{"go", "go", "", "python"})
	if len(values) != 2 {
		t.Fatalf("expected deduped values, got %#v", values)
	}
}
