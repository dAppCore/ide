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
	"forge.lthn.ai/core/go/pkg/core"
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

type NavigateSubsystem struct {
	core *core.Core
}

// Navigate MCP subsystem.

func NewNavigateSubsystem(c *core.Core) *NavigateSubsystem { return &NavigateSubsystem{core: c} }

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

	resolver := s.routeResolver(route)
	if resolver == nil {
		return nil, NavigateOutput{
			Available: false,
			Reason:    fmt.Sprintf("unknown route %s", route),
		}, nil
	}

	data, schema, sources, err := resolver(ctx, input.Filter)
	if err != nil {
		return nil, NavigateOutput{Available: false, Reason: err.Error()}, nil
	}
	if status, ok := data.(map[string]any); ok {
		if available, exists := status["available"].(bool); exists && !available {
			reason, _ := status["reason"].(string)
			return nil, NavigateOutput{
				Available: false,
				Reason:    reason,
				Data:      data,
				Schema:    schema,
				Sources:   sources,
			}, nil
		}
	}

	return nil, NavigateOutput{
		Available: true,
		Data:      data,
		Schema:    schema,
		Sources:   sources,
	}, nil
}

type navigateRouteResolver func(context.Context, map[string]any) (any, any, []string, error)

func (s *NavigateSubsystem) routeResolver(route string) navigateRouteResolver {
	switch {
	case route == "core://store":
		return s.resolveStoreRoot
	case strings.HasPrefix(route, "core://store/"):
		namespace := strings.TrimPrefix(route, "core://store/")
		return func(ctx context.Context, _ map[string]any) (any, any, []string, error) {
			return s.resolveStoreNamespace(ctx, namespace)
		}
	case route == "core://models":
		return s.resolveModels
	case route == "core://agent":
		return s.resolveAgentWorkspaces
	case route == "core://network":
		return s.resolveNetwork
	case route == "core://settings":
		return s.resolveSettings
	case route == "core://identity":
		return s.resolveIdentity
	case route == "core://wallet":
		return s.resolveWallet
	default:
		return nil
	}
}

func (s *NavigateSubsystem) resolveStoreRoot(ctx context.Context, _ map[string]any) (any, any, []string, error) {
	if s.core == nil {
		return map[string]any{"available": false, "reason": "core runtime not attached"}, nil, nil, nil
	}
	if data, ok, err := s.core.QUERY("store.get_all"); err == nil && ok {
		return data, map[string]any{"type": "object"}, []string{"store.get_all"}, nil
	}
	return map[string]any{
		"available": false,
		"reason":    "action store.get_all not registered",
	}, map[string]any{"type": "object"}, []string{"store.get_all"}, nil
}

func (s *NavigateSubsystem) resolveStoreNamespace(ctx context.Context, namespace string) (any, any, []string, error) {
	if namespace == "" {
		return nil, nil, nil, fmt.Errorf("store namespace is required")
	}
	if s.core == nil {
		return map[string]any{"available": false, "reason": "core runtime not attached"}, nil, nil, nil
	}
	queryName := "store.get_namespace:" + namespace
	if data, ok, err := s.core.QUERY(queryName); err == nil && ok {
		return data, map[string]any{"type": "object"}, []string{queryName}, nil
	}
	return map[string]any{
		"available": false,
		"reason":    "action " + queryName + " not registered",
	}, map[string]any{"type": "object"}, []string{queryName}, nil
}

func (s *NavigateSubsystem) resolveModels(ctx context.Context, _ map[string]any) (any, any, []string, error) {
	return s.resolveQueryRoute(ctx, "ai.models.list")
}

func (s *NavigateSubsystem) resolveAgentWorkspaces(ctx context.Context, _ map[string]any) (any, any, []string, error) {
	return s.resolveQueryRoute(ctx, "agent.workspaces.status")
}

func (s *NavigateSubsystem) resolveNetwork(ctx context.Context, _ map[string]any) (any, any, []string, error) {
	return s.resolveQueryRoute(ctx, "network.status")
}

func (s *NavigateSubsystem) resolveSettings(ctx context.Context, _ map[string]any) (any, any, []string, error) {
	return s.resolveQueryRoute(ctx, "config.dump")
}

func (s *NavigateSubsystem) resolveIdentity(ctx context.Context, _ map[string]any) (any, any, []string, error) {
	return s.resolveQueryRoute(ctx, "identity.status")
}

func (s *NavigateSubsystem) resolveWallet(ctx context.Context, _ map[string]any) (any, any, []string, error) {
	return s.resolveQueryRoute(ctx, "wallet.status")
}

func (s *NavigateSubsystem) resolveQueryRoute(ctx context.Context, queryName string) (any, any, []string, error) {
	if s.core == nil {
		return map[string]any{"available": false, "reason": "core runtime not attached"}, nil, nil, nil
	}
	if data, ok, err := s.core.QUERY(queryName); err == nil && ok {
		return data, map[string]any{"type": "object"}, []string{queryName}, nil
	}
	return map[string]any{
		"available": false,
		"reason":    "action " + queryName + " not registered",
	}, map[string]any{"type": "object"}, []string{queryName}, nil
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
	if ctx == nil {
		ctx = context.Background()
	}
	if strings.TrimSpace(input.WorkspaceID) == "" {
		return nil, SubagentWatchOutput{Completed: false, Failed: false, Reason: "workspaceId is required"}, nil
	}
	if s.hub == nil {
		return nil, SubagentWatchOutput{Completed: false, Failed: false, Reason: "no relay"}, nil
	}

	poll := time.Duration(input.PollInterval)
	if poll <= 0 {
		poll = 2
	}
	timeout := time.Duration(input.Timeout)
	if timeout <= 0 {
		timeout = 60
	}

	ticker := time.NewTicker(poll * time.Second)
	defer ticker.Stop()

	timer := time.NewTimer(timeout * time.Second)
	defer timer.Stop()

	seen := 0
	events := make([]SubagentEvent, 0, 8)
	for {
		current := s.eventsFor(input.WorkspaceID)
		if len(current) > seen {
			events = append(events, current[seen:]...)
			seen = len(current)
		}

		if completed, failed := subagentWatchState(events); completed || failed {
			return nil, SubagentWatchOutput{
				Completed: completed,
				Failed:    failed,
				Events:    events,
			}, nil
		}

		select {
		case <-ctx.Done():
			return nil, SubagentWatchOutput{
				Completed: false,
				Failed:    true,
				Events:    events,
				Reason:    ctx.Err().Error(),
			}, ctx.Err()
		case <-ticker.C:
		case <-timer.C:
			return nil, SubagentWatchOutput{
				Completed: false,
				Failed:    false,
				Events:    events,
				Reason:    "timed out waiting for subagent events",
			}, nil
		}
	}
}

func subagentWatchState(events []SubagentEvent) (completed bool, failed bool) {
	for i := len(events) - 1; i >= 0; i-- {
		if events[i].Type != "status" {
			continue
		}
		switch strings.ToLower(strings.TrimSpace(events[i].Message)) {
		case "completed":
			return true, false
		case "failed":
			return false, true
		case "running", "blocked":
			return false, false
		}
	}
	return false, false
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

type GuidedDispatchInput struct {
	Repo        string `json:"repo"`
	Task        string `json:"task"`
	Agent       string `json:"agent,omitempty"`
	Template    string `json:"template,omitempty"`
	Persona     string `json:"persona,omitempty"`
	WorkspaceID string `json:"workspaceId,omitempty"`
	RelayURL    string `json:"relayUrl,omitempty"`
	RelayToken  string `json:"relayToken,omitempty"`
}

type GuidedDispatchOutput struct {
	Success     bool   `json:"success"`
	Delivered   bool   `json:"delivered"`
	WorkspaceID string `json:"workspaceId,omitempty"`
	Agent       string `json:"agent,omitempty"`
	Prompt      string `json:"prompt,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

func (s *SubagentSubsystem) DispatchGuided(ctx context.Context, input GuidedDispatchInput) (GuidedDispatchOutput, error) {
	if strings.TrimSpace(input.Repo) == "" {
		return GuidedDispatchOutput{Success: false, Reason: "repo is required"}, fmt.Errorf("repo is required")
	}
	if strings.TrimSpace(input.Task) == "" {
		return GuidedDispatchOutput{Success: false, Reason: "task is required"}, fmt.Errorf("task is required")
	}

	workspaceID := strings.TrimSpace(input.WorkspaceID)
	if workspaceID == "" {
		workspaceID = fmt.Sprintf("%s-%d", strings.ReplaceAll(strings.ToLower(input.Repo), "/", "-"), time.Now().UTC().UnixNano())
	}

	prompt := fmt.Sprintf(
		"Relay URL: %s\nRelay Token: %s\nWorkspace ID: %s\n\nBefore each prompt cycle, read channel subagent:%s:guide.\nWhen stuck, call subagent_ask and wait for an answer (up to 60s).\nEmit progress updates when non-trivial milestones complete.\n\nTask: %s",
		strings.TrimSpace(input.RelayURL),
		strings.TrimSpace(input.RelayToken),
		workspaceID,
		workspaceID,
		strings.TrimSpace(input.Task),
	)

	if s.hub == nil {
		return GuidedDispatchOutput{
			Success:     true,
			Delivered:   false,
			WorkspaceID: workspaceID,
			Agent:       input.Agent,
			Prompt:      prompt,
			Reason:      "no relay",
		}, nil
	}

	s.appendEvent(workspaceID, SubagentEvent{
		Type:      "status",
		Channel:   "subagent:" + workspaceID + ":status",
		Message:   "running",
		CreatedAt: time.Now().UTC(),
	})
	_ = s.hub.SendToChannel("subagent:"+workspaceID+":status", ws.Message{
		Type: ws.TypeEvent,
		Data: map[string]any{
			"state":       "running",
			"workspace":   workspaceID,
			"repo":        input.Repo,
			"agent":       input.Agent,
			"template":    input.Template,
			"persona":     input.Persona,
			"relay_url":   strings.TrimSpace(input.RelayURL),
			"relay_token": strings.TrimSpace(input.RelayToken),
		},
	})
	_ = s.hub.SendToChannel("subagent:"+workspaceID+":guide", ws.Message{
		Type: ws.TypeEvent,
		Data: map[string]any{
			"message": prompt,
		},
	})

	return GuidedDispatchOutput{
		Success:     true,
		Delivered:   true,
		WorkspaceID: workspaceID,
		Agent:       input.Agent,
		Prompt:      prompt,
	}, nil
}
