package navigate

import (
	"testing"

	core "dappco.re/go"
)

func TestDecode_Navigate_Good(t *testing.T) {
	_targetName := "Navigate"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	input, err := decode[Input](core.NewOptions(core.Option{Key: "route", Value: "core://store"}))
	if err != nil || input.Route != "core://store" {
		t.Fatalf("unexpected decode result %#v err=%v", input, err)
	}
}

func TestDecode_Navigate_Bad(t *testing.T) {
	_targetName := "Navigate"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if _, err := decode[struct {
		Filter []string `json:"filter"`
	}](core.NewOptions(core.Option{Key: "filter", Value: "bad"})); err == nil {
		t.Fatal("expected decode error")
	}
}

func TestDecode_Navigate_Ugly(t *testing.T) {
	_targetName := "Navigate"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	input, err := decode[Input](core.NewOptions())
	if err != nil || input.Route != "" {
		t.Fatalf("expected zero value decode, got %#v err=%v", input, err)
	}
}
