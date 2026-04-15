package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"forge.lthn.ai/core/go-ws"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// Workspace MCP subsystem.

type WorkspaceSubsystem struct {
	root string
}

func NewWorkspaceSubsystem(root string) *WorkspaceSubsystem {
	return &WorkspaceSubsystem{root: root}
}

func (s *WorkspaceSubsystem) Name() string { return "workspace" }

func (s *WorkspaceSubsystem) RegisterTools(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "workspace_status",
		Description: "Inspect the current workspace root, git status, and .core files.",
	}, s.workspaceStatus)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "workspace_conventions",
		Description: "Load workspace conventions from .core/build.yaml and local repository context.",
	}, s.workspaceConventions)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "workspace_impact",
		Description: "Estimate the impact of the current git diff on the workspace.",
	}, s.workspaceImpact)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "workspace_scan",
		Description: "Scan upward from the workspace root for projects with .core metadata.",
	}, s.workspaceScan)
}

type WorkspaceStatusInput struct {
	Root string `json:"root,omitempty"`
}

type WorkspaceConventionsInput struct {
	Root string `json:"root,omitempty"`
}

type WorkspaceImpactInput struct {
	Root string `json:"root,omitempty"`
}

type WorkspaceScanInput struct {
	Root  string `json:"root,omitempty"`
	Depth int    `json:"depth,omitempty"`
}

type WorkspaceProject struct {
	Root      string   `json:"root"`
	Manifest  string   `json:"manifest,omitempty"`
	BuildYaml string   `json:"buildYaml,omitempty"`
	Languages []string `json:"languages,omitempty"`
	GitBranch string   `json:"gitBranch,omitempty"`
}

type WorkspaceScanOutput struct {
	Projects []WorkspaceProject `json:"projects"`
}

func (s *WorkspaceSubsystem) workspaceStatus(ctx context.Context, _ *mcp.CallToolRequest, input WorkspaceStatusInput) (*mcp.CallToolResult, workspaceStatusResponse, error) {
	root := input.Root
	if root == "" {
		root = s.root
	}
	snapshot, err := collectWorkspaceSnapshot(root)
	if err != nil {
		return nil, workspaceStatusResponse{}, err
	}
	return nil, workspaceStatusResponse{
		Root:      snapshot.Root,
		Git:       snapshot.Git,
		CoreFiles: snapshot.CoreFiles,
		Counts:    snapshot.Counts,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (s *WorkspaceSubsystem) workspaceConventions(ctx context.Context, _ *mcp.CallToolRequest, input WorkspaceConventionsInput) (*mcp.CallToolResult, workspaceConventionsResponse, error) {
	root := input.Root
	if root == "" {
		root = s.root
	}
	resp, err := workspaceConventionsForRoot(root)
	if err != nil {
		return nil, workspaceConventionsResponse{}, err
	}
	return nil, resp, nil
}

func (s *WorkspaceSubsystem) workspaceImpact(ctx context.Context, _ *mcp.CallToolRequest, input WorkspaceImpactInput) (*mcp.CallToolResult, workspaceImpactResponse, error) {
	root := input.Root
	if root == "" {
		root = s.root
	}
	resp, err := workspaceImpactForRoot(root)
	if err != nil {
		return nil, workspaceImpactResponse{}, err
	}
	return nil, resp, nil
}

func (s *WorkspaceSubsystem) workspaceScan(ctx context.Context, _ *mcp.CallToolRequest, input WorkspaceScanInput) (*mcp.CallToolResult, WorkspaceScanOutput, error) {
	root := input.Root
	if root == "" {
		root = s.root
	}
	if input.Depth <= 0 {
		input.Depth = 3
	}

	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, WorkspaceScanOutput{}, err
	}

	projects := []WorkspaceProject{}
	cur := absRoot
	for depth := 0; depth <= input.Depth; depth++ {
		coreDir := filepath.Join(cur, ".core")
		manifestPath := filepath.Join(coreDir, "manifest.yaml")
		buildPath := filepath.Join(coreDir, "build.yaml")
		if fileExists(manifestPath) || fileExists(buildPath) {
			branch := ""
			if status, err := readGitStatus(cur); err == nil {
				branch = status.Branch
			}
			projects = append(projects, WorkspaceProject{
				Root:      cur,
				Manifest:  boolToString(fileExists(manifestPath), manifestPath),
				BuildYaml: boolToString(fileExists(buildPath), buildPath),
				Languages: detectWorkspaceLanguages(cur),
				GitBranch: branch,
			})
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			break
		}
		cur = parent
	}

	return nil, WorkspaceScanOutput{Projects: projects}, nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func boolToString(ok bool, value string) string {
	if ok {
		return value
	}
	return ""
}

func detectWorkspaceLanguages(root string) []string {
	languages := []string{}
	entries := []struct {
		path     string
		language string
	}{
		{filepath.Join(root, "go.mod"), "go"},
		{filepath.Join(root, "composer.json"), "php"},
		{filepath.Join(root, "package.json"), "typescript"},
		{filepath.Join(root, "requirements.txt"), "python"},
		{filepath.Join(root, "pyproject.toml"), "python"},
	}
	for _, entry := range entries {
		if fileExists(entry.path) {
			languages = append(languages, entry.language)
		}
	}
	return uniqueStrings(languages)
}

// Marketplace MCP subsystem.

type MarketplaceSubsystem struct {
	client *MarketplaceClient
}

func NewMarketplaceSubsystem(client *MarketplaceClient) *MarketplaceSubsystem {
	if client == nil {
		client = NewMarketplaceClient("")
	}
	return &MarketplaceSubsystem{client: client}
}

func (s *MarketplaceSubsystem) Name() string { return "marketplace" }

func (s *MarketplaceSubsystem) RegisterTools(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "pkg_search",
		Description: "Search the marketplace for packages by query and category.",
	}, s.pkgSearch)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "pkg_info",
		Description: "Load package details from the marketplace by code.",
	}, s.pkgInfo)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "pkg_install",
		Description: "Install a package from the marketplace.",
	}, s.pkgInstall)
}

type PackageSearchInput struct {
	Query    string `json:"query,omitempty"`
	Category string `json:"category,omitempty"`
}

type PackageInfoInput struct {
	Code string `json:"code"`
}

type PackageInstallInput struct {
	Code string `json:"code"`
}

func (s *MarketplaceSubsystem) pkgSearch(ctx context.Context, _ *mcp.CallToolRequest, input PackageSearchInput) (*mcp.CallToolResult, PackageSearchResponse, error) {
	pkgs, err := s.client.Search(ctx, input.Query, input.Category)
	if err != nil {
		return nil, PackageSearchResponse{}, err
	}
	return nil, PackageSearchResponse{Query: input.Query, Category: input.Category, Packages: pkgs}, nil
}

func (s *MarketplaceSubsystem) pkgInfo(ctx context.Context, _ *mcp.CallToolRequest, input PackageInfoInput) (*mcp.CallToolResult, PackageInfoResponse, error) {
	pkg, err := s.client.Info(ctx, input.Code)
	if err != nil {
		return nil, PackageInfoResponse{}, err
	}
	return nil, PackageInfoResponse{Package: pkg}, nil
}

func (s *MarketplaceSubsystem) pkgInstall(ctx context.Context, _ *mcp.CallToolRequest, input PackageInstallInput) (*mcp.CallToolResult, PackageInstallResult, error) {
	result, err := s.client.Install(ctx, input.Code)
	if err != nil {
		return nil, PackageInstallResult{}, err
	}
	return nil, result, nil
}

// Navigate MCP subsystem.

type NavigateSubsystem struct{}

func NewNavigateSubsystem() *NavigateSubsystem { return &NavigateSubsystem{} }

func (s *NavigateSubsystem) Name() string { return "navigate" }

func (s *NavigateSubsystem) RegisterTools(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "core_navigate",
		Description: "Inspect a core:// route and return structured JSON instead of rendered HTML.",
	}, s.coreNavigate)
}

type NavigateInput struct {
	Route  string         `json:"route"`
	Filter map[string]any `json:"filter,omitempty"`
}

type NavigateOutput struct {
	Available bool     `json:"available"`
	Reason    string   `json:"reason,omitempty"`
	Data      any      `json:"data,omitempty"`
	Schema    any      `json:"schema,omitempty"`
	Sources   []string `json:"sources,omitempty"`
}

func (s *NavigateSubsystem) coreNavigate(ctx context.Context, _ *mcp.CallToolRequest, input NavigateInput) (*mcp.CallToolResult, NavigateOutput, error) {
	route := strings.TrimSpace(input.Route)
	if route == "" {
		return nil, NavigateOutput{Available: false, Reason: "route is required"}, nil
	}

	switch route {
	case "core://store", "core://models", "core://agent", "core://network", "core://settings", "core://identity", "core://wallet":
		return nil, NavigateOutput{
			Available: false,
			Reason:    fmt.Sprintf("action %s not registered", route),
		}, nil
	default:
		return nil, NavigateOutput{
			Available: false,
			Reason:    fmt.Sprintf("unknown route %s", route),
		}, nil
	}
}

// Subagent MCP subsystem.

type SubagentSubsystem struct {
	hub *ws.Hub

	mu       sync.Mutex
	answers  map[string]chan string
	events   map[string][]SubagentEvent
	question int64
}

func NewSubagentSubsystem(hub *ws.Hub) *SubagentSubsystem {
	return &SubagentSubsystem{
		hub:     hub,
		answers: make(map[string]chan string),
		events:  make(map[string][]SubagentEvent),
	}
}

func (s *SubagentSubsystem) Name() string { return "subagent" }

func (s *SubagentSubsystem) RegisterTools(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "subagent_guide",
		Description: "Send guidance to a subagent workspace.",
	}, s.subagentGuide)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "subagent_ask",
		Description: "Ask a question of the orchestrator and wait for an answer.",
	}, s.subagentAsk)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "subagent_progress",
		Description: "Record progress for a subagent workspace.",
	}, s.subagentProgress)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "subagent_watch",
		Description: "Watch recent subagent events for a workspace.",
	}, s.subagentWatch)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "subagent_answer",
		Description: "Answer a pending subagent question.",
	}, s.subagentAnswer)
}

type SubagentGuideInput struct {
	WorkspaceID string `json:"workspaceId"`
	Message     string `json:"message"`
}

type SubagentGuideOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type SubagentAskInput struct {
	WorkspaceID string `json:"workspaceId"`
	Question    string `json:"question"`
	WaitSeconds int    `json:"waitSeconds,omitempty"`
}

type SubagentAskOutput struct {
	Answer   string `json:"answer,omitempty"`
	TimedOut bool   `json:"timedOut"`
	Reason   string `json:"reason,omitempty"`
}

type SubagentProgressInput struct {
	WorkspaceID string  `json:"workspaceId"`
	Progress    float64 `json:"progress"`
	Total       float64 `json:"total"`
	Message     string  `json:"message"`
}

type SubagentProgressOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type SubagentWatchInput struct {
	WorkspaceID  string `json:"workspaceId"`
	PollInterval int    `json:"pollInterval,omitempty"`
	Timeout      int    `json:"timeout,omitempty"`
}

type SubagentEvent struct {
	Type       string    `json:"type"`
	Channel    string    `json:"channel,omitempty"`
	Message    string    `json:"message,omitempty"`
	QuestionID string    `json:"questionId,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type SubagentWatchOutput struct {
	Completed bool            `json:"completed"`
	Failed    bool            `json:"failed"`
	Events    []SubagentEvent `json:"events"`
	Reason    string          `json:"reason,omitempty"`
}

type SubagentAnswerInput struct {
	WorkspaceID string `json:"workspaceId"`
	QuestionID  string `json:"questionId"`
	Answer      string `json:"answer"`
}

type SubagentAnswerOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

func (s *SubagentSubsystem) subagentGuide(ctx context.Context, _ *mcp.CallToolRequest, input SubagentGuideInput) (*mcp.CallToolResult, SubagentGuideOutput, error) {
	if strings.TrimSpace(input.WorkspaceID) == "" {
		return nil, SubagentGuideOutput{Delivered: false, Reason: "workspaceId is required"}, nil
	}
	s.appendEvent(input.WorkspaceID, SubagentEvent{
		Type:      "guidance",
		Channel:   "subagent:" + input.WorkspaceID + ":guide",
		Message:   input.Message,
		CreatedAt: time.Now().UTC(),
	})
	if s.hub != nil {
		_ = s.hub.SendToChannel("subagent:"+input.WorkspaceID+":guide", ws.Message{
			Type: ws.TypeEvent,
			Data: map[string]any{
				"message": input.Message,
			},
		})
		return nil, SubagentGuideOutput{Delivered: true}, nil
	}
	return nil, SubagentGuideOutput{Delivered: false, Reason: "no relay"}, nil
}

func (s *SubagentSubsystem) subagentAsk(ctx context.Context, _ *mcp.CallToolRequest, input SubagentAskInput) (*mcp.CallToolResult, SubagentAskOutput, error) {
	if strings.TrimSpace(input.WorkspaceID) == "" {
		return nil, SubagentAskOutput{TimedOut: false}, fmt.Errorf("workspaceId is required")
	}
	if s.hub == nil {
		return nil, SubagentAskOutput{TimedOut: false, Reason: "no relay"}, nil
	}
	waitSeconds := input.WaitSeconds
	if waitSeconds <= 0 {
		waitSeconds = 60
	}
	questionID := fmt.Sprintf("q-%d", time.Now().UTC().UnixNano())
	answerCh := make(chan string, 1)
	s.mu.Lock()
	s.answers[questionID] = answerCh
	s.mu.Unlock()

	s.appendEvent(input.WorkspaceID, SubagentEvent{
		Type:       "question",
		Channel:    "subagent:" + input.WorkspaceID + ":question",
		Message:    input.Question,
		QuestionID: questionID,
		CreatedAt:  time.Now().UTC(),
	})
	if s.hub != nil {
		_ = s.hub.SendToChannel("subagent:"+input.WorkspaceID+":question", ws.Message{
			Type: ws.TypeEvent,
			Data: map[string]any{
				"question_id": questionID,
				"message":     input.Question,
			},
		})
	}

	timer := time.NewTimer(time.Duration(waitSeconds) * time.Second)
	defer timer.Stop()

	select {
	case answer := <-answerCh:
		s.removeAnswer(questionID)
		return nil, SubagentAskOutput{Answer: answer, TimedOut: false}, nil
	case <-timer.C:
		s.removeAnswer(questionID)
		return nil, SubagentAskOutput{TimedOut: true}, nil
	case <-ctx.Done():
		s.removeAnswer(questionID)
		return nil, SubagentAskOutput{TimedOut: true}, ctx.Err()
	}
}

func (s *SubagentSubsystem) subagentProgress(ctx context.Context, _ *mcp.CallToolRequest, input SubagentProgressInput) (*mcp.CallToolResult, SubagentProgressOutput, error) {
	if strings.TrimSpace(input.WorkspaceID) == "" {
		return nil, SubagentProgressOutput{}, fmt.Errorf("workspaceId is required")
	}
	s.appendEvent(input.WorkspaceID, SubagentEvent{
		Type:      "progress",
		Channel:   "subagent:" + input.WorkspaceID + ":progress",
		Message:   input.Message,
		CreatedAt: time.Now().UTC(),
	})
	if s.hub != nil {
		_ = s.hub.SendToChannel("subagent:"+input.WorkspaceID+":progress", ws.Message{
			Type: ws.TypeEvent,
			Data: map[string]any{
				"progress": input.Progress,
				"total":    input.Total,
				"message":  input.Message,
			},
		})
	}
	if s.hub == nil {
		return nil, SubagentProgressOutput{Delivered: false, Reason: "no relay"}, nil
	}
	return nil, SubagentProgressOutput{Delivered: true}, nil
}

func (s *SubagentSubsystem) subagentWatch(ctx context.Context, _ *mcp.CallToolRequest, input SubagentWatchInput) (*mcp.CallToolResult, SubagentWatchOutput, error) {
	_ = input.PollInterval
	_ = input.Timeout
	if s.hub == nil {
		return nil, SubagentWatchOutput{Completed: false, Failed: false, Reason: "no relay"}, nil
	}
	events := s.eventsFor(input.WorkspaceID)
	return nil, SubagentWatchOutput{
		Completed: false,
		Failed:    false,
		Events:    events,
	}, nil
}

func (s *SubagentSubsystem) subagentAnswer(ctx context.Context, _ *mcp.CallToolRequest, input SubagentAnswerInput) (*mcp.CallToolResult, SubagentAnswerOutput, error) {
	if strings.TrimSpace(input.WorkspaceID) == "" {
		return nil, SubagentAnswerOutput{Delivered: false}, fmt.Errorf("workspaceId is required")
	}
	if s.hub == nil {
		return nil, SubagentAnswerOutput{Delivered: false, Reason: "no relay"}, nil
	}
	s.appendEvent(input.WorkspaceID, SubagentEvent{
		Type:       "answer",
		Channel:    "subagent:" + input.WorkspaceID + ":answer",
		Message:    input.Answer,
		QuestionID: input.QuestionID,
		CreatedAt:  time.Now().UTC(),
	})
	s.mu.Lock()
	answerCh, ok := s.answers[input.QuestionID]
	s.mu.Unlock()
	if ok {
		select {
		case answerCh <- input.Answer:
		default:
		}
	}
	if s.hub != nil {
		_ = s.hub.SendToChannel("subagent:"+input.WorkspaceID+":answer", ws.Message{
			Type: ws.TypeEvent,
			Data: map[string]any{
				"question_id": input.QuestionID,
				"message":     input.Answer,
			},
		})
	}
	return nil, SubagentAnswerOutput{Delivered: true}, nil
}

func (s *SubagentSubsystem) appendEvent(workspaceID string, event SubagentEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.events == nil {
		s.events = make(map[string][]SubagentEvent)
	}
	s.events[workspaceID] = append(s.events[workspaceID], event)
}

func (s *SubagentSubsystem) eventsFor(workspaceID string) []SubagentEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	events := s.events[workspaceID]
	out := make([]SubagentEvent, len(events))
	copy(out, events)
	return out
}

func (s *SubagentSubsystem) removeAnswer(questionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.answers, questionID)
}
