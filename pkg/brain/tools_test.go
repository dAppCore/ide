package brain

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	coreio "dappco.re/go/io"
	storelib "dappco.re/go/store"

	"dappco.re/go/ide/pkg/config"
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
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
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

func TestTools_BrainRemember_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/v1/brain/remember" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		_, _ = io.WriteString(w, `{"id":"memory-2"}`)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	_, out, err := subsystem.handleRemember(context.Background(), nil, RememberInput{Content: "beta", Type: "note"})
	if err != nil {
		t.Fatalf("handleRemember: %v", err)
	}
	if !out.Success || out.MemoryID != "memory-2" {
		t.Fatalf("unexpected remember output %#v", out)
	}
}

func TestTools_BrainRemember_Bad(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
	if _, _, err := subsystem.handleRemember(context.Background(), nil, RememberInput{Content: "beta"}); err == nil {
		t.Fatal("expected missing API key error")
	}
}

func TestTools_BrainRemember_Ugly(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"id":`)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, _, err := subsystem.handleRemember(context.Background(), nil, RememberInput{Content: "beta"}); err == nil {
		t.Fatal("expected decode error")
	}
}

func TestTools_BrainForget_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete || r.URL.Path != "/v1/brain/forget/memory-2" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		_, _ = io.WriteString(w, `{"forgotten":true}`)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	_, out, err := subsystem.handleForget(context.Background(), nil, ForgetInput{ID: "memory-2"})
	if err != nil {
		t.Fatalf("handleForget: %v", err)
	}
	if !out.Success || out.Forgotten != "memory-2" {
		t.Fatalf("unexpected forget output %#v", out)
	}
}

func TestTools_BrainForget_Bad(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
	if _, _, err := subsystem.handleForget(context.Background(), nil, ForgetInput{}); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestTools_BrainForget_Ugly(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, _, err := subsystem.handleForget(context.Background(), nil, ForgetInput{ID: "memory-2"}); err == nil {
		t.Fatal("expected decode error for empty response body")
	}
}

func TestTools_BrainList_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/brain/list" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		_, _ = io.WriteString(w, `{"memories":[{"id":"m1","content":"alpha"}]}`)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "agent"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	_, out, err := subsystem.handleList(context.Background(), nil, ListInput{Project: "demo", Type: "note", AgentID: "agent-x", Limit: 99})
	if err != nil {
		t.Fatalf("handleList: %v", err)
	}
	if out.Count != 1 {
		t.Fatalf("unexpected list output %#v", out)
	}
}

func TestTools_BrainList_Bad(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
	if _, _, err := subsystem.handleList(context.Background(), nil, ListInput{Project: "alpha"}); err == nil {
		t.Fatal("expected missing API key error")
	}
}

func TestTools_BrainList_Ugly(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, _, err := subsystem.handleList(context.Background(), nil, ListInput{}); err == nil {
		t.Fatal("expected decode error for empty response body")
	}
}

func TestTools_BrainContext_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"memories":[{"id":"m1","content":"alpha"}]}`)
	})
	defer server.Close()

	root := t.TempDir()
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, newWorkspaceForBrain(t, root), nil)
	_, out, err := subsystem.handleContext(context.Background(), nil, ContextInput{Project: root})
	if err != nil {
		t.Fatalf("handleContext: %v", err)
	}
	if len(out.Recent) != 1 || len(out.Conventions) == 0 {
		t.Fatalf("unexpected context output %#v", out)
	}
}

func TestTools_BrainContext_Bad(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
	if _, _, err := subsystem.handleContext(context.Background(), nil, ContextInput{Project: "demo"}); err == nil {
		t.Fatal("expected missing API key error")
	}
}

func TestTools_BrainContext_Ugly(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"memories":[{"id":`)
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, _, err := subsystem.handleContext(context.Background(), nil, ContextInput{Project: "demo"}); err == nil {
		t.Fatal("expected decode error")
	}
}

func TestTools_BrainRecall_Bad(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
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
	subsystem := New(cfg, coreio.NewMemoryMedium(), storeInstance, nil, nil)
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
