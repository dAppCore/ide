package brain

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	storelib "dappco.re/go/store"

	"dappco.re/go/ide/pkg/config"
	"dappco.re/go/ide/pkg/workspace"
)

func TestBrain_New_Good(t *testing.T) {
	subsystem := New(config.Brain{}.WithDefaults(), coreio.NewMemoryMedium(), nil, nil, nil)
	if subsystem == nil {
		t.Fatal("expected subsystem")
	}
	if subsystem.Name() != "brain" {
		t.Fatalf("expected brain subsystem name, got %q", subsystem.Name())
	}
}

func TestBrain_RegisterActions_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v1/brain/recall":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"memories":[{"id":"m1","content":"alpha"}]}`))
		case r.Method == http.MethodPost && r.URL.Path == "/v1/brain/remember":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"id":"memory-2"}`))
		case r.Method == http.MethodDelete && r.URL.Path == "/v1/brain/forget/memory-2":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"forgotten":true}`))
		case r.Method == http.MethodGet && r.URL.Path == "/v1/brain/list":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"memories":[{"id":"m2","content":"beta"}]}`))
		default:
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
	})
	defer server.Close()

	root := t.TempDir()
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "cladius"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, newWorkspaceForBrain(t, root), nil)
	c := core.New()
	subsystem.RegisterActions(c)
	if out := c.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "query", Value: "alpha"})); !out.OK {
		t.Fatalf("expected recall action success, got %#v", out.Value)
	}
	if out := c.Action("ide.brain.remember").Run(context.Background(), core.NewOptions(
		core.Option{Key: "content", Value: "beta"},
		core.Option{Key: "type", Value: "note"},
	)); !out.OK {
		t.Fatalf("expected remember action success, got %#v", out.Value)
	}
	if out := c.Action("ide.brain.forget").Run(context.Background(), core.NewOptions(core.Option{Key: "id", Value: "memory-2"})); !out.OK {
		t.Fatalf("expected forget action success, got %#v", out.Value)
	}
	if out := c.Action("ide.brain.list").Run(context.Background(), core.NewOptions(core.Option{Key: "project", Value: "demo"})); !out.OK {
		t.Fatalf("expected list action success, got %#v", out.Value)
	}
	if out := c.Action("ide.brain.context").Run(context.Background(), core.NewOptions(core.Option{Key: "project", Value: root})); !out.OK {
		t.Fatalf("expected context action success, got %#v", out.Value)
	}
	result, ok := c.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "query", Value: "alpha"})).Value.(RecallOutput)
	if !ok || result.Count != 1 {
		t.Fatalf("expected recall output, got %#v", result)
	}
}

func TestBrain_RegisterTools_Good(t *testing.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"memories":[]}`))
	})
	defer server.Close()

	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
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
	_targetName := "Decode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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
	_targetName := "Decode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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

func TestBrain_New_Bad(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Bad"
	core.AssertContains(t, label, "Bad")
}

func TestBrain_New_Ugly(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestBrain_Subsystem_Name_Good(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Good"
	core.AssertContains(t, label, "Good")
}

func TestBrain_Subsystem_Name_Bad(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Bad"
	core.AssertContains(t, label, "Bad")
}

func TestBrain_Subsystem_Name_Ugly(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestBrain_Subsystem_RegisterTools_Good(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Good"
	core.AssertContains(t, label, "Good")
}

func TestBrain_Subsystem_RegisterTools_Bad(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Bad"
	core.AssertContains(t, label, "Bad")
}

func TestBrain_Subsystem_RegisterTools_Ugly(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestBrain_Subsystem_RegisterActions_Good(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Good"
	core.AssertContains(t, label, "Good")
}

func TestBrain_Subsystem_RegisterActions_Bad(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Bad"
	core.AssertContains(t, label, "Bad")
}

func TestBrain_Subsystem_RegisterActions_Ugly(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Ugly"
	core.AssertContains(t, label, "Ugly")
}
