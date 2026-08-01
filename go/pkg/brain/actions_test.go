package brain

import (
	"context"
	"net/http"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	storelib "dappco.re/go/store"

	"dappco.re/go/ide/pkg/config"
)

func TestActions_Register_Good(t *testing.T) {
	_targetName := "Register"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"alpha"}]}`))
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
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
	_targetName := "Register"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	c := core.New()
	New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil).registerActions(c)
	result := c.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "topK", Value: "bad"}))
	if result.OK {
		t.Fatalf("expected decode failure, got %#v", result.Value)
	}
}

func TestActions_Register_Ugly(t *testing.T) {
	_targetName := "Register"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	c := core.New()
	New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil).registerActions(c)
	if c.Action("ide.brain.context").Run(context.Background(), core.NewOptions()).OK {
		t.Fatal("expected missing API key error to bubble from action")
	}
}
