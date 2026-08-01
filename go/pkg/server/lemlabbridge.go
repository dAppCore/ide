// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"time"

	core "dappco.re/go"
)

// lemlabBridge — Wails wrapper for the LEM.Lab training studio plugin.
// Mirrors the service contracts from LEM/cmd/lem-desktop/{dashboard,docker,
// agent_runner}.go so the bridge body can be swapped to real go-mlx /
// InfluxDB / docker backends without changing the FE wire shape.
//
// v1: returns fixture data so the page renders end-to-end. The contract
// is the load-bearing artifact, not the values.
type lemlabBridge struct {
	core *core.Core
}

// LemTrainingRow — single model's training progress.
// Mirrors LEM/cmd/lem-desktop/dashboard.go:TrainingRow.
type LemTrainingRow struct {
	Model      string  `json:"model"`
	RunID      string  `json:"runId"`
	Status     string  `json:"status"`
	Iteration  int     `json:"iteration"`
	TotalIters int     `json:"totalIters"`
	Pct        float64 `json:"pct"`
	Loss       float64 `json:"loss"`
}

// LemGenerationStats — golden set + expansion progress.
// Mirrors LEM/cmd/lem-desktop/dashboard.go:GenerationStats.
type LemGenerationStats struct {
	GoldenCompleted    int     `json:"goldenCompleted"`
	GoldenTarget       int     `json:"goldenTarget"`
	GoldenPct          float64 `json:"goldenPct"`
	ExpansionCompleted int     `json:"expansionCompleted"`
	ExpansionTarget    int     `json:"expansionTarget"`
	ExpansionPct       float64 `json:"expansionPct"`
}

// LemModelInfo — scoreboard entry.
// Mirrors LEM/cmd/lem-desktop/dashboard.go:ModelInfo.
type LemModelInfo struct {
	Name       string  `json:"name"`
	Tag        string  `json:"tag"`
	Accuracy   float64 `json:"accuracy"`
	Iterations int     `json:"iterations"`
	Status     string  `json:"status"`
}

// LemAgentStatus — scoring agent state.
// Mirrors LEM/cmd/lem-desktop/dashboard.go:AgentStatus.
type LemAgentStatus struct {
	Running     bool   `json:"running"`
	CurrentTask string `json:"currentTask"`
	Scored      int    `json:"scored"`
	Remaining   int    `json:"remaining"`
	LastScore   string `json:"lastScore"`
}

// LemContainerStatus — single docker compose service state.
// Mirrors LEM/cmd/lem-desktop/docker.go:ContainerStatus.
type LemContainerStatus struct {
	Name    string `json:"name"`
	Image   string `json:"image"`
	Status  string `json:"status"`
	Health  string `json:"health"`
	Ports   string `json:"ports"`
	Running bool   `json:"running"`
}

// LemStackStatus — docker stack roll-up.
// Mirrors LEM/cmd/lem-desktop/docker.go:StackStatus.
type LemStackStatus struct {
	Running    bool                          `json:"running"`
	Services   map[string]LemContainerStatus `json:"services"`
	ComposeDir string                        `json:"composeDir"`
}

// LemSnapshot — full dashboard state for the frontend.
// Mirrors LEM/cmd/lem-desktop/dashboard.go:DashboardSnapshot, with the
// agent + stack fields lifted in (the original split them across services
// for tray reasons; the IDE plugin presents them together).
type LemSnapshot struct {
	Training   []LemTrainingRow   `json:"training"`
	Generation LemGenerationStats `json:"generation"`
	Models     []LemModelInfo     `json:"models"`
	Agent      LemAgentStatus     `json:"agent"`
	Stack      LemStackStatus     `json:"stack"`
	DBPath     string             `json:"dbPath"`
	UpdatedAt  string             `json:"updatedAt"`
}

// LemQueryRow — single result row from RunQuery (DuckDB ad-hoc).
type LemQueryRow map[string]any

// LemQueryResult — RunQuery output envelope.
type LemQueryResult struct {
	Rows  []LemQueryRow `json:"rows,omitempty"`
	Error string        `json:"error,omitempty"`
}

// LemActionResult — uniform success/error envelope for orchestration ops
// (StartStack, StopStack, StartAgent, StopAgent).
type LemActionResult struct {
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// GetSnapshot returns the complete dashboard state.
// v1: fixture data; future: query InfluxDB + docker compose ps + agent
// runner state in parallel and roll up.
func (b *lemlabBridge) GetSnapshot(ctx context.Context) (LemSnapshot, error) {
	return fixtureSnapshot(), nil
}

// Refresh forces an immediate data refresh.
// v1: no-op (fixtures don't refresh); future: trigger underlying poller.
func (b *lemlabBridge) Refresh(ctx context.Context) (LemActionResult, error) {
	return LemActionResult{OK: true, Message: "refreshed (fixtures)"}, nil
}

// RunQuery executes an ad-hoc SQL query against the LEM DuckDB.
// v1: returns empty result with placeholder error; future: open db at
// snapshot.DBPath and run the query.
func (b *lemlabBridge) RunQuery(ctx context.Context, sql string) (LemQueryResult, error) {
	return LemQueryResult{Error: "RunQuery not wired (v1 fixtures)"}, nil
}

// GetServices returns the docker compose stack status.
// v1: fixtures; future: docker compose ps --format json against the
// configured compose file.
func (b *lemlabBridge) GetServices(ctx context.Context) (LemStackStatus, error) {
	return fixtureStack(), nil
}

// StartStack brings up the docker compose stack.
// v1: no-op; future: docker compose up -d.
func (b *lemlabBridge) StartStack(ctx context.Context) (LemActionResult, error) {
	return LemActionResult{OK: true, Message: "stack start requested (fixtures)"}, nil
}

// StopStack tears down the docker compose stack.
// v1: no-op; future: docker compose down.
func (b *lemlabBridge) StopStack(ctx context.Context) (LemActionResult, error) {
	return LemActionResult{OK: true, Message: "stack stop requested (fixtures)"}, nil
}

// StartAgent begins the scoring agent in a background goroutine.
// v1: no-op; future: spawn pkg/lem.RunAgent with configured args.
func (b *lemlabBridge) StartAgent(ctx context.Context) (LemActionResult, error) {
	return LemActionResult{OK: true, Message: "agent start requested (fixtures)"}, nil
}

// StopAgent stops the scoring agent.
// v1: no-op; future: cancel agent context.
func (b *lemlabBridge) StopAgent(ctx context.Context) (LemActionResult, error) {
	return LemActionResult{OK: true, Message: "agent stop requested (fixtures)"}, nil
}

// AgentStatus returns the current scoring agent state.
// v1: fixtures; future: read from AgentRunner.
func (b *lemlabBridge) AgentStatus(ctx context.Context) (LemAgentStatus, error) {
	return fixtureAgent(), nil
}

func fixtureSnapshot() LemSnapshot {
	return LemSnapshot{
		Training: []LemTrainingRow{
			{Model: "gemma4-e2b-vi-sft", RunID: "run-2026-05-10-a", Status: "training", Iteration: 1842, TotalIters: 4000, Pct: 46.05, Loss: 1.234},
			{Model: "lemma-26b-grpo", RunID: "run-2026-05-10-b", Status: "training", Iteration: 312, TotalIters: 1000, Pct: 31.2, Loss: 2.891},
		},
		Generation: LemGenerationStats{
			GoldenCompleted: 3120, GoldenTarget: 5000, GoldenPct: 62.4,
			ExpansionCompleted: 18420, ExpansionTarget: 50000, ExpansionPct: 36.84,
		},
		Models: []LemModelInfo{
			{Name: "gemma4-e2b", Tag: "base", Accuracy: 0.812, Iterations: 0, Status: "scored"},
			{Name: "gemma4-e2b-vi-sft", Tag: "iter-1500", Accuracy: 0.847, Iterations: 1500, Status: "scored"},
			{Name: "lemma-26b", Tag: "base", Accuracy: 0.763, Iterations: 0, Status: "scored"},
			{Name: "lemer-lek", Tag: "v1", Accuracy: 0.798, Iterations: 4000, Status: "scored"},
		},
		Agent:     fixtureAgent(),
		Stack:     fixtureStack(),
		DBPath:    "~/.lem/data/lem.duckdb",
		UpdatedAt: time.Now().Format(time.RFC3339),
	}
}

func fixtureStack() LemStackStatus {
	services := map[string]LemContainerStatus{
		"forgejo":  {Name: "lem-forgejo", Image: "codeberg.org/forgejo/forgejo:9", Status: "Up 4h", Health: "healthy", Ports: "3001:3000", Running: true},
		"influxdb": {Name: "lem-influxdb", Image: "influxdb:3.0-core", Status: "Up 4h", Health: "healthy", Ports: "8086:8086", Running: true},
		"vllm":     {Name: "lem-vllm", Image: "vllm/vllm-openai:v0.7.0", Status: "Exited (0) 12m", Health: "", Ports: "", Running: false},
	}
	return LemStackStatus{
		Running:    true,
		Services:   services,
		ComposeDir: "~/.lem/deploy",
	}
}

func fixtureAgent() LemAgentStatus {
	return LemAgentStatus{
		Running:     false,
		CurrentTask: "",
		Scored:      342,
		Remaining:   158,
		LastScore:   "gemma4-e2b-vi-sft @ iter-1500: 0.847",
	}
}
