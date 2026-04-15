package brain

import (
	"context"
	"net/http"
	"testing"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	storelib "dappco.re/go/store"

	"dappco.re/go/core/ide/pkg/config"
)

func TestActions_Register_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"alpha"}]}`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	c := core.New()
	subsystem.registerActions(c)
	if !c.Action("ide.brain.recall").Exists() {
		t.Fatal("expected ide.brain.recall action")
	}
	result := c.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "query", Value: "alpha"}))
	if !result.OK {
		t.Fatalf("expected action success, got %#v", result.Value)
	}
}

func TestActions_Register_Bad(t *testing.T) {
	c := core.New()
	New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil).registerActions(c)
	result := c.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "topK", Value: "bad"}))
	if result.OK {
		t.Fatalf("expected decode failure, got %#v", result.Value)
	}
}

func TestActions_Register_Ugly(t *testing.T) {
	c := core.New()
	New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil).registerActions(c)
	if c.Action("ide.brain.context").Run(context.Background(), core.NewOptions()).OK {
		t.Fatal("expected missing API key error to bubble from action")
	}
}
