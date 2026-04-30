package navigate

import (
	"context"
	"testing"

	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
)

func TestTools_Navigate_Good(t *testing.T) {
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	subsystem := New(config.Navigate{}, nil)
	subsystem.registerTools(svc)
	if len(svc.Tools()) == 0 {
		t.Fatal("expected navigate tool")
	}
}

func TestTools_Navigate_Bad(t *testing.T) {
	_, out, err := New(config.Navigate{}, nil).handle(context.Background(), nil, Input{})
	if err != nil || out.Available {
		t.Fatalf("expected unavailable payload, got %#v err=%v", out, err)
	}
}

func TestTools_Navigate_Ugly(t *testing.T) {
	_, out, err := New(config.Navigate{}, core.New()).handle(context.Background(), nil, Input{Route: "core://unknown"})
	if err != nil || out.Available {
		t.Fatalf("expected unknown route payload, got %#v err=%v", out, err)
	}
}
