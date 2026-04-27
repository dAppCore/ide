package subagent

import (
	"sync"
	"time"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	storelib "dappco.re/go/store"
	"dappco.re/go/ws"

	"dappco.re/go/ide/pkg/config"
)

type Subsystem struct {
	cfg        config.Subagent
	hub        *ws.Hub
	relayToken string
	mu         sync.RWMutex
	answers    map[string]map[string]chan string
	events     map[string][]Event
	eventSeq   map[string]int
	agentic    map[string]agenticWorkspace
	history    *historyStore
}

type agenticWorkspace struct {
	Name         string
	LastState    string
	LastQuestion string
}

type GuideInput struct {
	WorkspaceID string `json:"workspaceId"`
	Message     string `json:"message"`
}

type GuideOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type AskInput struct {
	WorkspaceID string `json:"workspaceId"`
	Question    string `json:"question"`
	WaitSeconds int    `json:"waitSeconds,omitempty"`
}

type AskOutput struct {
	Answer   string `json:"answer,omitempty"`
	TimedOut bool   `json:"timedOut"`
	Reason   string `json:"reason,omitempty"`
}

type ProgressInput struct {
	WorkspaceID string  `json:"workspaceId"`
	Progress    float64 `json:"progress"`
	Total       float64 `json:"total"`
	Message     string  `json:"message"`
}

type ProgressOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type WatchInput struct {
	WorkspaceID  string `json:"workspaceId"`
	PollInterval int    `json:"pollInterval,omitempty"`
	Timeout      int    `json:"timeout,omitempty"`
	Cursor       int    `json:"cursor,omitempty"`
	Limit        int    `json:"limit,omitempty"`
}

type Event struct {
	Type       string    `json:"type"`
	Channel    string    `json:"channel,omitempty"`
	Message    string    `json:"message,omitempty"`
	QuestionID string    `json:"questionId,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	Cursor     int       `json:"cursor,omitempty"`
}

type WatchOutput struct {
	Completed  bool    `json:"completed"`
	Failed     bool    `json:"failed"`
	Events     []Event `json:"events"`
	NextCursor int     `json:"nextCursor,omitempty"`
	HasMore    bool    `json:"hasMore,omitempty"`
	Reason     string  `json:"reason,omitempty"`
}

type AnswerInput struct {
	WorkspaceID string `json:"workspaceId"`
	QuestionID  string `json:"questionId"`
	Answer      string `json:"answer"`
}

type AnswerOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type DispatchGuidedInput struct {
	Repo        string `json:"repo"`
	Task        string `json:"task"`
	Agent       string `json:"agent,omitempty"`
	Template    string `json:"template,omitempty"`
	Persona     string `json:"persona,omitempty"`
	WorkspaceID string `json:"workspaceId,omitempty"`
	RelayURL    string `json:"relayUrl,omitempty"`
	RelayToken  string `json:"relayToken,omitempty"`
}

type DispatchGuidedOutput struct {
	Success     bool   `json:"success"`
	Delivered   bool   `json:"delivered"`
	WorkspaceID string `json:"workspaceId,omitempty"`
	Agent       string `json:"agent,omitempty"`
	Prompt      string `json:"prompt,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

type GuidedDispatchInput = DispatchGuidedInput
type GuidedDispatchOutput = DispatchGuidedOutput

func New(cfg config.Subagent, hub *ws.Hub, relayToken string) *Subsystem {
	return &Subsystem{
		cfg:        cfg,
		hub:        hub,
		relayToken: core.Trim(relayToken),
		answers:    map[string]map[string]chan string{},
		events:     map[string][]Event{},
		eventSeq:   map[string]int{},
		agentic:    map[string]agenticWorkspace{},
	}
}

// subsystem := NewWithHistory(cfg, hub, relayToken, storeInstance)
func NewWithHistory(cfg config.Subagent, hub *ws.Hub, relayToken string, storeInstance *storelib.Store) *Subsystem {
	subsystem := New(cfg, hub, relayToken)
	subsystem.history = newHistoryStore(storeInstance)
	subsystem.loadHistory()
	return subsystem
}

func (s *Subsystem) Name() string { return "subagent" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	s.registerTools(svc)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	s.registerActions(c)
}
