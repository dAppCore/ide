package server

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"

	core "dappco.re/go/core"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/ide/pkg/config"
)

type conclaveIdentity struct {
	ID int32 `json:"id"`
}

type conclaveLedger struct {
	mu     sync.Mutex
	labels []string
}

func (l *conclaveLedger) Add(label string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.labels = append(l.labels, label)
}

func (l *conclaveLedger) Snapshot() []string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]string(nil), l.labels...)
}

type conclaveProbeInput struct {
	Label string `json:"label"`
}

type conclaveProbeOutput struct {
	Identity int32    `json:"identity"`
	Labels   []string `json:"labels"`
	Locked   bool     `json:"locked"`
}

type conclaveProbeSubsystem struct {
	core *core.Core
}

func (s *conclaveProbeSubsystem) Name() string { return "conclave_test" }

func (s *conclaveProbeSubsystem) RegisterTools(svc *coremcp.Service) {
	coremcp.AddToolRecorded(svc, svc.Server(), "conclave_test", &mcp.Tool{
		Name:        "conclave_probe",
		Description: "Probe conclave isolation from the IDE bootstrap.",
	}, s.handleProbe)
}

func (s *conclaveProbeSubsystem) handleProbe(_ context.Context, _ *mcp.CallToolRequest, input conclaveProbeInput) (*mcp.CallToolResult, conclaveProbeOutput, error) {
	identity, ok := core.ServiceFor[*conclaveIdentity](s.core, "conclave_identity")
	if !ok || identity == nil {
		return nil, conclaveProbeOutput{}, core.E("ide.server.test", "conclave identity missing", nil)
	}
	ledger, ok := core.ServiceFor[*conclaveLedger](s.core, "conclave_ledger")
	if !ok || ledger == nil {
		return nil, conclaveProbeOutput{}, core.E("ide.server.test", "conclave ledger missing", nil)
	}
	ledger.Add(input.Label)
	register := s.core.RegisterService(core.Concat("late_", input.Label), &conclaveIdentity{ID: -1})
	return nil, conclaveProbeOutput{
		Identity: identity.ID,
		Labels:   ledger.Snapshot(),
		Locked:   !register.OK,
	}, nil
}

func newConclaveTestOptions(counter *int32) Options {
	return Options{
		Config: config.IDEConfig{}.WithDefaults(),
		Medium: coreio.NewMemoryMedium(),
		MCP:    true,
		extraCoreOptions: []core.CoreOption{
			core.WithName("conclave_identity", func(_ *core.Core) core.Result {
				return core.Result{Value: &conclaveIdentity{ID: atomic.AddInt32(counter, 1)}, OK: true}
			}),
			core.WithName("conclave_ledger", func(_ *core.Core) core.Result {
				return core.Result{Value: &conclaveLedger{}, OK: true}
			}),
			core.WithName("conclave_test", func(c *core.Core) core.Result {
				return core.Result{Value: &conclaveProbeSubsystem{core: c}, OK: true}
			}),
		},
	}
}

func conclaveProbeTool(t *testing.T, c *core.Core) coremcp.ToolRecord {
	t.Helper()
	mcpService, ok := core.ServiceFor[*coremcp.Service](c, "mcp")
	if !ok || mcpService == nil {
		t.Fatal("expected mcp service")
	}
	record, ok := toolRecordFor(mcpService, "conclave_probe")
	if !ok {
		t.Fatal("expected conclave_probe tool")
	}
	return record
}

func TestServer_Conclave_Good_IsolatesParentServices(t *testing.T) {
	var counter int32
	coreInstance, err := Compose(newConclaveTestOptions(&counter))
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	parentIdentity, ok := core.ServiceFor[*conclaveIdentity](coreInstance, "conclave_identity")
	if !ok || parentIdentity == nil {
		t.Fatal("expected parent conclave identity service")
	}
	parentLedger, ok := core.ServiceFor[*conclaveLedger](coreInstance, "conclave_ledger")
	if !ok || parentLedger == nil {
		t.Fatal("expected parent conclave ledger service")
	}

	record := conclaveProbeTool(t, coreInstance)
	raw, callErr := record.RESTHandler(context.Background(), []byte(core.JSONMarshalString(conclaveProbeInput{Label: "alpha"})))
	if callErr != nil {
		t.Fatalf("call conclave probe: %v", callErr)
	}
	out, ok := raw.(conclaveProbeOutput)
	if !ok {
		t.Fatalf("unexpected conclave output %#v", raw)
	}
	if !out.Locked {
		t.Fatal("expected conclave service lock to block late registration")
	}
	if out.Identity == parentIdentity.ID {
		t.Fatalf("expected isolated conclave identity, got parent id %d", out.Identity)
	}
	if len(out.Labels) != 1 || out.Labels[0] != "alpha" {
		t.Fatalf("expected isolated conclave ledger, got %#v", out.Labels)
	}
	if coreInstance.Service("late_alpha").OK {
		t.Fatal("expected parent core to reject conclave late service")
	}
	if labels := parentLedger.Snapshot(); len(labels) != 0 {
		t.Fatalf("expected parent ledger to stay untouched, got %#v", labels)
	}
}

func TestServer_Conclave_Bad_MissingToolReturnsError(t *testing.T) {
	handler := newConclaveToolHandler("missing_tool", func() (*runtimeParts, error) {
		return composeRuntimeMode(Options{
			Config: config.IDEConfig{}.WithDefaults(),
			Medium: coreio.NewMemoryMedium(),
			MCP:    true,
		}, runtimeMode{conclave: true})
	})
	if _, err := handler(context.Background(), nil); err == nil {
		t.Fatal("expected missing conclave tool error")
	}
}

func TestServer_Conclave_Ugly_ConcurrentCallsStayIsolated(t *testing.T) {
	var counter int32
	coreInstance, err := Compose(newConclaveTestOptions(&counter))
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	parentIdentity, ok := core.ServiceFor[*conclaveIdentity](coreInstance, "conclave_identity")
	if !ok || parentIdentity == nil {
		t.Fatal("expected parent conclave identity service")
	}
	parentLedger, ok := core.ServiceFor[*conclaveLedger](coreInstance, "conclave_ledger")
	if !ok || parentLedger == nil {
		t.Fatal("expected parent conclave ledger service")
	}

	record := conclaveProbeTool(t, coreInstance)
	type response struct {
		label string
		out   conclaveProbeOutput
		err   error
	}
	results := make(chan response, 2)
	for _, label := range []string{"alpha", "beta"} {
		go func(label string) {
			raw, callErr := record.RESTHandler(context.Background(), []byte(core.JSONMarshalString(conclaveProbeInput{Label: label})))
			if callErr != nil {
				results <- response{label: label, err: callErr}
				return
			}
			out, ok := raw.(conclaveProbeOutput)
			if !ok {
				results <- response{label: label, err: core.E("ide.server.test", "unexpected conclave output type", nil)}
				return
			}
			results <- response{label: label, out: out}
		}(label)
	}

	collected := map[string]conclaveProbeOutput{}
	for range 2 {
		result := <-results
		if result.err != nil {
			t.Fatalf("call conclave probe (%s): %v", result.label, result.err)
		}
		collected[result.label] = result.out
	}

	alpha := collected["alpha"]
	beta := collected["beta"]
	if !alpha.Locked || !beta.Locked {
		t.Fatalf("expected both conclaves to stay locked, got alpha=%#v beta=%#v", alpha, beta)
	}
	if alpha.Identity == parentIdentity.ID || beta.Identity == parentIdentity.ID || alpha.Identity == beta.Identity {
		t.Fatalf("expected unique conclave identities, got parent=%d alpha=%d beta=%d", parentIdentity.ID, alpha.Identity, beta.Identity)
	}
	if len(alpha.Labels) != 1 || alpha.Labels[0] != "alpha" {
		t.Fatalf("expected alpha conclave isolation, got %#v", alpha.Labels)
	}
	if len(beta.Labels) != 1 || beta.Labels[0] != "beta" {
		t.Fatalf("expected beta conclave isolation, got %#v", beta.Labels)
	}
	if labels := parentLedger.Snapshot(); len(labels) != 0 {
		t.Fatalf("expected parent ledger to stay empty, got %#v", labels)
	}
	if coreInstance.Service("late_alpha").OK || coreInstance.Service("late_beta").OK {
		t.Fatal("expected no conclave late services to leak into parent")
	}
}
