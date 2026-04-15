package brain

import (
	"testing"

	core "dappco.re/go/core"
)

func TestDecode_Options_Good(t *testing.T) {
	input, err := decode[RecallInput](core.NewOptions(core.Option{Key: "query", Value: "alpha"}))
	if err != nil || input.Query != "alpha" {
		t.Fatalf("unexpected decode result %#v err=%v", input, err)
	}
}

func TestDecode_Options_Bad(t *testing.T) {
	if _, err := decode[struct {
		TopK int `json:"topK"`
	}](core.NewOptions(core.Option{Key: "topK", Value: "bad"})); err == nil {
		t.Fatal("expected decode error")
	}
}

func TestDecode_Options_Ugly(t *testing.T) {
	input, err := decode[RecallInput](core.NewOptions())
	if err != nil || input.Query != "" {
		t.Fatalf("expected zero value decode, got %#v err=%v", input, err)
	}
}
