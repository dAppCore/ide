package brain

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	coreio "dappco.re/go/core/io"
	storelib "dappco.re/go/store"

	"dappco.re/go/core/ide/pkg/config"
)

func TestDirect_Recall_Good(t *testing.T) {
	var calls int
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodPost || r.URL.Path != "/v1/brain/recall" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer secret" {
			t.Fatalf("unexpected auth header %q", got)
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), `"top_k":10`) {
			t.Fatalf("expected default top_k in body, got %s", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"alpha"}]}`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "agent"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)

	out, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"})
	if err != nil {
		t.Fatalf("recall: %v", err)
	}
	if out.Count != 1 {
		t.Fatalf("expected one memory, got %#v", out)
	}
	if calls != 1 {
		t.Fatalf("expected one upstream call, got %d", calls)
	}

	out, err = subsystem.recall(context.Background(), RecallInput{Query: "alpha"})
	if err != nil {
		t.Fatalf("recall cache hit: %v", err)
	}
	if out.Count != 1 || calls != 1 {
		t.Fatalf("expected cached recall, got %#v calls=%d", out, calls)
	}
}

func TestDirect_Recall_Bad(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err == nil || !strings.Contains(err.Error(), "401") {
		t.Fatalf("expected 401 error, got %v", err)
	}
}

func TestDirect_Recall_Ugly(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"memories":[{"id":`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err == nil || !strings.Contains(err.Error(), "decode response") {
		t.Fatalf("expected decode error, got %v", err)
	}
}

func TestDirect_Remember_Good(t *testing.T) {
	var calls int
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		switch r.URL.Path {
		case "/v1/brain/recall":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"memories":[{"id":"cached","content":"alpha"}]}`))
		case "/v1/brain/remember":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"id":"memory-2"}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("prime cache: %v", err)
	}
	out, err := subsystem.remember(context.Background(), RememberInput{Content: "beta", Type: "note"})
	if err != nil {
		t.Fatalf("remember: %v", err)
	}
	if !out.Success || out.MemoryID != "memory-2" {
		t.Fatalf("unexpected remember output %#v", out)
	}
	_, err = subsystem.recall(context.Background(), RecallInput{Query: "alpha"})
	if err != nil {
		t.Fatalf("recall after clear: %v", err)
	}
	if calls < 3 {
		t.Fatalf("expected cache invalidation to force another recall, got %d calls", calls)
	}
}

func TestDirect_Forget_Bad(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	if _, err := subsystem.forget(context.Background(), ForgetInput{}); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestDirect_List_Good(t *testing.T) {
	var gotPath string
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.RequestURI()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"alpha"}]}`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "agent"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	out, err := subsystem.list(context.Background(), ListInput{Project: "demo", Type: "note", AgentID: "agent-x", Limit: 99})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if out.Count != 1 || !strings.Contains(gotPath, "project=demo") || !strings.Contains(gotPath, "limit=99") || !strings.Contains(gotPath, "agent_id=agent-x") {
		t.Fatalf("unexpected list response %#v path=%s", out, gotPath)
	}
}

func TestDirect_Context_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"alpha"}]}`))
	})
	defer server.Close()

	root := t.TempDir()
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, newWorkspaceForBrain(t, root))
	out, err := subsystem.context(context.Background(), ContextInput{Project: root})
	if err != nil {
		t.Fatalf("context: %v", err)
	}
	if !strings.Contains(out.Overview, "recent memories") && !strings.Contains(out.Overview, "Loaded") {
		t.Fatalf("unexpected overview %q", out.Overview)
	}
	if len(out.Recent) != 1 {
		t.Fatalf("expected recent memories, got %#v", out)
	}
	if len(out.Conventions) == 0 {
		t.Fatalf("expected workspace conventions, got %#v", out)
	}
}

func TestDirect_ApiKey_Good(t *testing.T) {
	subsystem := New(config.Brain{Key: "  direct-secret  "}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil)
	if got := subsystem.apiKey(); got != "direct-secret" {
		t.Fatalf("expected inline key, got %q", got)
	}
	if got := subsystem.keyFingerprint(); len(got) != 64 {
		t.Fatalf("expected sha256 fingerprint, got %q", got)
	}
}

func TestDirect_AgentID_Good(t *testing.T) {
	subsystem := New(config.Brain{AgentID: "fallback"}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil)
	if got := subsystem.agentID(""); got != "fallback" {
		t.Fatalf("expected fallback agent id, got %q", got)
	}
	if got := subsystem.agentID("override"); got != "override" {
		t.Fatalf("expected explicit agent id, got %q", got)
	}
}

func TestDirect_ApiCall_Bad(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	if _, err := subsystem.apiCall(context.Background(), http.MethodGet, "/v1/brain/list", nil); err == nil {
		t.Fatal("expected missing api key error")
	}
}

func TestDirect_KeyFingerprint_Ugly(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	if got := subsystem.keyFingerprint(); got != "" {
		t.Fatalf("expected empty fingerprint without key, got %q", got)
	}
}

func TestDirect_Context_Ugly(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	if _, err := subsystem.context(context.Background(), ContextInput{}); err == nil {
		t.Fatal("expected missing api key error to bubble up")
	}
}

func TestDirect_Remember_Clear_UsesTime(t *testing.T) {
	// Sanity check that remember returns a fresh timestamp and not a zero value.
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"memory-3"}`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	out, err := subsystem.remember(context.Background(), RememberInput{Content: "beta"})
	if err != nil {
		t.Fatalf("remember: %v", err)
	}
	if out.Timestamp.IsZero() || time.Since(out.Timestamp) > time.Minute {
		t.Fatalf("expected recent timestamp, got %#v", out)
	}
}
