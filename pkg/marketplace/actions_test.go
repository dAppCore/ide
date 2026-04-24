package marketplace

import (
	"context"
	"testing"

	core "dappco.re/go/core"

	"dappco.re/go/ide/pkg/config"
)

func TestActions_Marketplace_Good(t *testing.T) {
	c := core.New()
	New(config.Marketplace{}.WithDefaults()).registerActions(c)
	if !c.Action("ide.pkg.search").Exists() {
		t.Fatal("expected pkg search action")
	}
}

func TestActions_Marketplace_Bad(t *testing.T) {
	c := core.New()
	New(config.Marketplace{}.WithDefaults()).registerActions(c)
	result := c.Action("ide.pkg.search").Run(context.Background(), core.NewOptions(core.Option{Key: "query", Value: []int{1}}))
	if result.OK {
		t.Fatalf("expected decode failure, got %#v", result.Value)
	}
}

func TestActions_Marketplace_Ugly(t *testing.T) {
	c := core.New()
	New(config.Marketplace{}.WithDefaults()).registerActions(c)
	result := c.Action("ide.pkg.info").Run(context.Background(), core.NewOptions())
	if result.OK {
		t.Fatal("expected missing code error")
	}
}
