package marketplace

import (
	"testing"

	core "dappco.re/go"
)

func TestDecode_Marketplace_Good(t *testing.T) {
	_targetName := "Marketplace"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	input, err := decode[SearchInput](core.NewOptions(core.Option{Key: "query", Value: "go"}))
	if err != nil || input.Query != "go" {
		t.Fatalf("unexpected decode result %#v err=%v", input, err)
	}
}

func TestDecode_Marketplace_Bad(t *testing.T) {
	_targetName := "Marketplace"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if _, err := decode[struct {
		Codes []string `json:"codes"`
	}](core.NewOptions(core.Option{Key: "codes", Value: "bad"})); err == nil {
		t.Fatal("expected decode error")
	}
}

func TestDecode_Marketplace_Ugly(t *testing.T) {
	_targetName := "Marketplace"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	input, err := decode[InfoInput](core.NewOptions())
	if err != nil || input.Code != "" {
		t.Fatalf("expected zero value decode, got %#v err=%v", input, err)
	}
}
