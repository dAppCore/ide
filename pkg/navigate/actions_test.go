package navigate

import (
	"context"
	"testing"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

func TestActions_Navigate_Good(t *testing.T) {
	c := core.New()
	New(config.Navigate{}, nil).registerActions(c)
	if !c.Action("ide.navigate").Exists() {
		t.Fatal("expected navigate action")
	}
}

func TestActions_Navigate_Bad(t *testing.T) {
	c := core.New()
	New(config.Navigate{}, nil).registerActions(c)
	result := c.Action("ide.navigate").Run(context.Background(), core.NewOptions(core.Option{Key: "filter", Value: "bad"}))
	if result.OK {
		t.Fatalf("expected decode error, got %#v", result.Value)
	}
}

func TestActions_Navigate_Ugly(t *testing.T) {
	c := core.New()
	New(config.Navigate{}, nil).registerActions(c)
	result := c.Action("ide.navigate").Run(context.Background(), core.NewOptions(core.Option{Key: "route", Value: "core://unknown"}))
	if !result.OK {
		t.Fatalf("expected graceful unknown route payload, got %#v", result.Value)
	}
}
