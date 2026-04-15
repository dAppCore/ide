package ai

import (
	"context"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
)

type Event struct {
	Type      string         `json:"type"`
	Timestamp time.Time      `json:"timestamp"`
	AgentID   string         `json:"agent_id,omitempty"`
	Repo      string         `json:"repo,omitempty"`
	Duration  time.Duration  `json:"duration,omitempty"`
	Data      map[string]any `json:"data,omitempty"`
}

type Service struct {
	*core.ServiceRuntime[struct{}]
}

func Register(c *core.Core) core.Result {
	return core.Result{Value: &Service{ServiceRuntime: core.NewServiceRuntime[struct{}](c, struct{}{})}, OK: true}
}

func (s *Service) OnStartup(context.Context) core.Result {
	return core.Result{OK: true}
}

func Record(event Event) error {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	path := core.JoinPath(core.Env("DIR_HOME"), ".core", "ai", "metrics", event.Timestamp.Format("2006-01-02")+".jsonl")
	if err := coreio.Local.EnsureDir(core.PathDir(path)); err != nil {
		return core.E("ide.ai.Record", "ensure metrics dir", err)
	}
	file, err := coreio.Local.Append(path)
	if err != nil {
		return core.E("ide.ai.Record", "open metrics file", err)
	}
	defer file.Close()
	if _, err := file.Write([]byte(core.Concat(core.JSONMarshalString(event), "\n"))); err != nil {
		return core.E("ide.ai.Record", "write metrics file", err)
	}
	return nil
}
