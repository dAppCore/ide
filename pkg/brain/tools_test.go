package brain

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	coreio "dappco.re/go/core/io"
	storelib "dappco.re/go/store"

	"dappco.re/go/core/ide/pkg/config"
)

func TestTools_BrainRecall_Good(t *testing.T) {
	var calls int
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		_, _ = io.WriteString(w, `{"memories":[{"id":"m1","content":"alpha"}]}`)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	_, out, err := subsystem.handleRecall(context.Background(), nil, RecallInput{Query: "alpha"})
	if err != nil {
		t.Fatalf("recall handler: %v", err)
	}
	if out.Count != 1 || calls != 1 {
		t.Fatalf("expected handler to populate cache, got %#v calls=%d", out, calls)
	}
	_, out, err = subsystem.handleRecall(context.Background(), nil, RecallInput{Query: "alpha"})
	if err != nil {
		t.Fatalf("recall handler cache hit: %v", err)
	}
	if out.Count != 1 || calls != 1 {
		t.Fatalf("expected cache hit, got %#v calls=%d", out, calls)
	}
}

func TestTools_BrainRecall_Bad(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil)
	if _, _, err := subsystem.handleRecall(context.Background(), nil, RecallInput{Query: "alpha"}); err == nil || !strings.Contains(err.Error(), "API key") {
		t.Fatalf("expected missing API key error, got %v", err)
	}
}

func TestTools_BrainRecall_Ugly(t *testing.T) {
	var calls int
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		_, _ = io.WriteString(w, `{"memories":[{"id":"m1","content":"alpha"}]}`)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	cfg := config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults()
	cfg.Cache.Enabled = config.BoolPtr(false)
	subsystem := New(cfg, coreio.NewMemoryMedium(), storeInstance, nil)
	_, _, err = subsystem.handleRecall(context.Background(), nil, RecallInput{Query: "alpha"})
	if err != nil {
		t.Fatalf("first recall: %v", err)
	}
	_, _, err = subsystem.handleRecall(context.Background(), nil, RecallInput{Query: "alpha"})
	if err != nil {
		t.Fatalf("second recall: %v", err)
	}
	if calls != 2 {
		t.Fatalf("expected stale-cache bypass behaviour with disabled cache, got %d upstream calls", calls)
	}
}
