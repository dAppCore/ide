package brain

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	storelib "dappco.re/go/store"

	"dappco.re/go/core/ide/pkg/config"
	"dappco.re/go/core/ide/pkg/workspace"
)

func TestBrain_New_Good(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil)
	if subsystem == nil {
		t.Fatal("expected subsystem")
	}
	if subsystem.Name() != "brain" {
		t.Fatalf("expected brain subsystem name, got %q", subsystem.Name())
	}
}

func TestBrain_RegisterActions_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/v1/brain/recall" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"alpha"}]}`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "cladius"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	c := core.New()
	subsystem.RegisterActions(c)
	out := c.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "query", Value: "alpha"}))
	if !out.OK {
		t.Fatalf("expected action success, got %#v", out.Value)
	}
	result, ok := out.Value.(RecallOutput)
	if !ok || result.Count != 1 {
		t.Fatalf("expected recall output, got %#v", out.Value)
	}
}

func TestBrain_RegisterTools_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"memories":[]}`))
	})
	defer server.Close()

	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil)
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	subsystem.RegisterTools(svc)
	names := map[string]bool{}
	for _, tool := range svc.Tools() {
		names[tool.Name] = true
	}
	for _, name := range []string{"brain_recall", "brain_remember", "brain_forget", "brain_list", "brain_context"} {
		if !names[name] {
			t.Fatalf("expected tool %s to be registered", name)
		}
	}
}

func TestBrain_Decode_Good(t *testing.T) {
	input, err := decode[RecallInput](core.NewOptions(
		core.Option{Key: "query", Value: "alpha"},
		core.Option{Key: "topK", Value: 3},
	))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if input.Query != "alpha" {
		t.Fatalf("unexpected decoded input %#v", input)
	}
}

func TestBrain_Decode_Bad(t *testing.T) {
	if _, err := decode[struct {
		TopK int `json:"topK"`
	}](core.NewOptions(core.Option{Key: "topK", Value: "bad"})); err == nil {
		t.Fatal("expected type mismatch error")
	}
}

func newBrainServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	return httptest.NewServer(handler)
}

func newWorkspaceForBrain(t *testing.T, root string) *workspace.Subsystem {
	t.Helper()
	medium := coreio.NewMemoryMedium()
	_ = medium.Write(core.JoinPath(root, "go.mod"), "module example.com/demo\n")
	_ = medium.Write(core.JoinPath(root, ".core", "build.yaml"), "projectName: demo\n")
	return workspace.New(config.Workspace{Root: root, ScanDepth: 1}, medium, nil)
}
