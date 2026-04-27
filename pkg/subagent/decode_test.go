package subagent

import (
	"testing"

	core "dappco.re/go/core"
)

func TestDecode_Subagent_Good(t *testing.T) {
	input, err := decode[GuideInput](core.NewOptions(core.Option{Key: "workspaceId", Value: "ws-1"}))
	if err != nil || input.WorkspaceID != "ws-1" {
		t.Fatalf("unexpected decode result %#v err=%v", input, err)
	}
}

func TestDecode_Subagent_Bad(t *testing.T) {
	if _, err := decode[AskInput](core.NewOptions(core.Option{Key: "waitSeconds", Value: "bad"})); err == nil {
		t.Fatal("expected decode error")
	}
}

func TestDecode_Subagent_Ugly(t *testing.T) {
	input, err := decode[ProgressInput](core.NewOptions())
	if err != nil || input.Progress != 0 {
		t.Fatalf("expected zero value decode, got %#v err=%v", input, err)
	}
}
