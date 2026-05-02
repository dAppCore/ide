//go:build integration

// SPDX-License-Identifier: EUPL-1.2

package brain_test

import (
	"context"
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	storelib "dappco.re/go/store"

	brainpkg "dappco.re/go/ide/pkg/brain"
	"dappco.re/go/ide/pkg/config"
	serverpkg "dappco.re/go/ide/pkg/server"
)

func TestLive_BrainRecall_Good_RealEndpoint(t *testing.T) {
	brainConfig, ok, reason := liveBrainConfigFromEnv()
	if !ok {
		t.Skip(reason)
	}
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := brainpkg.New(brainConfig, coreio.NewMemoryMedium(), storeInstance, nil, nil)
	service, err := coremcp.New(coremcp.Options{WorkspaceRoot: t.TempDir(), Subsystems: []coremcp.Subsystem{subsystem}})
	if err != nil {
		t.Fatalf("mcp service: %v", err)
	}
	var handler coremcp.RESTHandler
	for _, tool := range service.Tools() {
		if tool.Name == "brain_recall" {
			handler = tool.RESTHandler
			break
		}
	}
	if handler == nil {
		t.Fatal("brain_recall handler not registered")
	}
	raw, err := handler(context.Background(), []byte(core.JSONMarshalString(brainpkg.RecallInput{Query: "core ide live smoke", TopK: 1})))
	if err != nil {
		t.Fatalf("live recall: %v", err)
	}
	out, ok := raw.(brainpkg.RecallOutput)
	if !ok {
		t.Fatalf("expected RecallOutput, got %T", raw)
	}
	if !out.Success || out.Count < 0 {
		t.Fatalf("unexpected recall shape: %#v", out)
	}
}

func TestLive_BrainRecall_Good_ActionFlow(t *testing.T) {
	brainConfig, ok, reason := liveBrainConfigFromEnv()
	if !ok {
		t.Skip(reason)
	}
	storeInstance, openResult := storelib.New(":memory:")
	if !openResult.OK {
		t.Fatalf("store: %v", openResult)
	}
	subsystem := brainpkg.New(brainConfig, coreio.NewMemoryMedium(), storeInstance, nil, nil)
	coreInstance := core.New()
	subsystem.RegisterActions(coreInstance)

	result := coreInstance.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(
		core.Option{Key: "query", Value: "core ide live action smoke"},
		core.Option{Key: "topK", Value: 1},
	))
	if !result.OK {
		t.Fatalf("live action recall: %v", result.Value)
	}
	out, ok := result.Value.(brainpkg.RecallOutput)
	if !ok {
		t.Fatalf("expected RecallOutput, got %T", result.Value)
	}
	if !out.Success || out.Count < 0 {
		t.Fatalf("unexpected live action recall shape: %#v", out)
	}
}

func TestLive_BrainRecall_Good_ServerConclaveToolFlow(t *testing.T) {
	brainConfig, ok, reason := liveBrainConfigFromEnv()
	if !ok {
		t.Skip(reason)
	}
	t.Setenv("DIR_HOME", t.TempDir())
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Brain = brainConfig
	srv, err := serverpkg.NewServer(serverpkg.Options{Config: cfg, MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose live server: %v", err)
	}
	var handler coremcp.RESTHandler
	for _, tool := range srv.MCP().Tools() {
		if tool.Name == "brain_recall" {
			handler = tool.RESTHandler
			break
		}
	}
	if handler == nil {
		t.Fatal("brain_recall handler not registered")
	}
	raw, err := handler(context.Background(), []byte(core.JSONMarshalString(brainpkg.RecallInput{Query: "core ide live conclave smoke", TopK: 1})))
	if err != nil {
		t.Fatalf("live conclave recall: %v", err)
	}
	out, ok := raw.(brainpkg.RecallOutput)
	if !ok {
		t.Fatalf("expected RecallOutput, got %T", raw)
	}
	if !out.Success || out.Count < 0 {
		t.Fatalf("unexpected live conclave recall shape: %#v", out)
	}
}

func TestLive_BrainRecall_Bad_SkipsWithoutOptIn(t *testing.T) {
	t.Setenv("CORE_BRAIN_INTEGRATION", "0")
	t.Setenv("CORE_BRAIN_KEY", "")
	if _, ok, reason := liveBrainConfigFromEnv(); ok || reason == "" {
		t.Fatalf("expected disabled integration to report skip reason, ok=%v reason=%q", ok, reason)
	}
}

func TestLive_BrainRecall_Ugly_SkipsWithoutKey(t *testing.T) {
	t.Setenv("CORE_BRAIN_INTEGRATION", "1")
	t.Setenv("CORE_BRAIN_KEY", "")
	if _, ok, reason := liveBrainConfigFromEnv(); ok || !core.Contains(reason, "CORE_BRAIN_KEY") {
		t.Fatalf("expected missing key skip reason, ok=%v reason=%q", ok, reason)
	}
}

func liveBrainConfigFromEnv() (config.Brain, bool, string) {
	if core.Getenv("CORE_BRAIN_INTEGRATION") != "1" {
		return config.Brain{}, false, "set CORE_BRAIN_INTEGRATION=1 to run live test"
	}
	key := core.Getenv("CORE_BRAIN_KEY")
	if key == "" {
		return config.Brain{}, false, "CORE_BRAIN_KEY required for live test"
	}
	return config.Brain{
		Endpoint: "https://api.lthn.sh",
		Key:      key,
		AgentID:  "core-ide-live-smoke",
	}.WithDefaults(), true, ""
}
