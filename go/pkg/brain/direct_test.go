package brain

import (
	"context"
	"io"
	"net/http"
	"testing"
	"time"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	storelib "dappco.re/go/store"

	aipkg "dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/config"
)

func TestDirect_Recall_Good(t *testing.T) {
	_targetName := "Recall"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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
		if !core.Contains(string(body), `"top_k":10`) {
			t.Fatalf("expected default top_k in body, got %s", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"Tests named TestFilename_Function_{Good,Bad,Ugly}; all three mandatory."}]}`))
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "agent"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)

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

func TestDirect_Recall_UglyFilterCacheIsolation(t *testing.T) {
	var calls int
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodPost || r.URL.Path != "/v1/brain/recall" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		body, _ := io.ReadAll(r.Body)
		text := string(body)
		if !core.Contains(text, `"type":"decision"`) || !core.Contains(text, `"min_confidence":0.75`) {
			t.Fatalf("expected full recall filter in body, got %s", body)
		}
		memoryID := "core"
		if core.Contains(text, `"org":"other"`) {
			memoryID = "other"
		} else if !core.Contains(text, `"org":"core"`) {
			t.Fatalf("expected org filter in body, got %s", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"memories":[{"id":"`+memoryID+`","content":"`+memoryID+`"}]}`)
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "agent"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	input := RecallInput{Query: "alpha", Filter: RecallFilter{Org: "core", Type: "decision", MinConfidence: 0.75}}
	if _, err := subsystem.recall(context.Background(), input); err != nil {
		t.Fatalf("recall core: %v", err)
	}
	if _, err := subsystem.recall(context.Background(), input); err != nil {
		t.Fatalf("recall core cache hit: %v", err)
	}
	input.Filter.Org = "other"
	out, err := subsystem.recall(context.Background(), input)
	if err != nil {
		t.Fatalf("recall other: %v", err)
	}
	if calls != 2 || len(out.Memories) != 1 || out.Memories[0].ID != "other" {
		t.Fatalf("expected filter-isolated cache, got calls=%d out=%#v", calls, out)
	}
}

func TestDirect_Recall_Bad(t *testing.T) {
	_targetName := "Recall"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	_, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"})
	if err == nil || !core.Contains(err.Error(), "401") {
		t.Fatalf("expected 401 error, got %v", err)
	}
	var apiErr *OpenBrainError
	if !core.As(err, &apiErr) || apiErr.StatusCode != http.StatusUnauthorized || apiErr.Retryable {
		t.Fatalf("expected typed non-retryable 401 error, got %#v", apiErr)
	}
}

func TestDirect_Recall_Ugly(t *testing.T) {
	_targetName := "Recall"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"memories":[{"id":`))
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err == nil || !core.Contains(err.Error(), "decode response") {
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
			body, _ := io.ReadAll(r.Body)
			text := string(body)
			for _, expected := range []string{`"org":"core"`, `"supersedes":"memory-1"`, `"expires_in":3600`} {
				if !core.Contains(text, expected) {
					t.Fatalf("expected remember body to contain %s, got %s", expected, body)
				}
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"id":"memory-2"}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("prime cache: %v", err)
	}
	out, err := subsystem.remember(context.Background(), RememberInput{Content: "beta", Type: "note", Org: "core", Supersedes: "memory-1", ExpiresIn: 3600})
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
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
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

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "agent"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	out, err := subsystem.list(context.Background(), ListInput{Org: "core", Project: "demo", Type: "note", AgentID: "agent-x", Limit: 99})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if out.Count != 1 || !core.Contains(gotPath, "org=core") || !core.Contains(gotPath, "project=demo") || !core.Contains(gotPath, "limit=99") || !core.Contains(gotPath, "agent_id=agent-x") {
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
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, newWorkspaceForBrain(t, root), nil)
	out, err := subsystem.context(context.Background(), ContextInput{Project: root})
	if err != nil {
		t.Fatalf("context: %v", err)
	}
	if !core.Contains(out.Overview, "Loaded") {
		t.Fatalf("unexpected overview %q", out.Overview)
	}
	if len(out.Recent) != 1 {
		t.Fatalf("expected recent memories, got %#v", out)
	}
	if len(out.Conventions) == 0 {
		t.Fatalf("expected workspace conventions, got %#v", out)
	}
}

func TestDirect_SemanticConventions_Good(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, &aipkg.Service{})
	ranked := subsystem.semanticConventions(
		"/workspace/demo",
		[]Memory{{Content: "Tests named TestFilename_Function_{Good,Bad,Ugly}; all three mandatory."}},
		[]string{
			"Use core primitives and explicit data shapes for public APIs.",
			"Tests named TestFilename_Function_{Good,Bad,Ugly}; all three mandatory.",
			"Comments should show usage examples, not restate the signature.",
		},
	)
	if len(ranked) == 0 {
		t.Fatal("expected ranked conventions")
	}
	if ranked[0] != "Tests named TestFilename_Function_{Good,Bad,Ugly}; all three mandatory." {
		t.Fatalf("expected matching convention to rank first, got %#v", ranked)
	}
}

func TestDirect_ApiKey_Good(t *testing.T) {
	subsystem := New(config.Brain{Key: "  direct-secret  "}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
	if got := subsystem.apiKey(); got != "direct-secret" {
		t.Fatalf("expected inline key, got %q", got)
	}
	medium := coreio.NewMemoryMedium()
	home := homeDir()
	if err := medium.Write(home+"/.claude/brain.key", "  file-secret  \n"); err != nil {
		t.Fatalf("write brain key: %v", err)
	}
	subsystem = New(config.Brain{}.WithDefaults(), medium, nil, nil, nil)
	if got := subsystem.apiKey(); got != "file-secret" {
		t.Fatalf("expected brain.key fallback, got %q", got)
	}
	if got := subsystem.keyFingerprint(); len(got) != 64 {
		t.Fatalf("expected sha256 fingerprint, got %q", got)
	}
}

func TestDirect_AgentID_Good(t *testing.T) {
	subsystem := New(config.Brain{AgentID: "fallback"}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
	if got := subsystem.agentID(""); got != "fallback" {
		t.Fatalf("expected fallback agent id, got %q", got)
	}
	if got := subsystem.agentID("override"); got != "override" {
		t.Fatalf("expected explicit agent id, got %q", got)
	}
}

func TestDirect_ApiCall_Bad(t *testing.T) {
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, err := subsystem.apiCall(context.Background(), http.MethodGet, "/v1/brain/list", nil); err == nil {
		t.Fatal("expected missing api key error")
	} else if !IsOpenBrainError(err, OpenBrainErrorMissingAPIKey) {
		t.Fatalf("expected typed missing API key error, got %v", err)
	}
}

func TestDirect_KeyFingerprint_Ugly(t *testing.T) {
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if got := subsystem.keyFingerprint(); got != "" {
		t.Fatalf("expected empty fingerprint without key, got %q", got)
	}
}

func TestDirect_Context_Ugly(t *testing.T) {
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	if _, err := subsystem.context(context.Background(), ContextInput{}); err == nil {
		t.Fatal("expected missing api key error to bubble up")
	}
}

func TestDirect_Remember_Clear_Good(t *testing.T) {
	// Sanity check that remember returns a fresh timestamp and not a zero value.
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"memory-3"}`))
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	out, err := subsystem.remember(context.Background(), RememberInput{Content: "beta"})
	if err != nil {
		t.Fatalf("remember: %v", err)
	}
	if out.Timestamp.IsZero() || time.Since(out.Timestamp) > time.Minute {
		t.Fatalf("expected recent timestamp, got %#v", out)
	}
}
