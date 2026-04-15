package brain

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	goio "io"
	"net/http"
	"net/url"
	"os"
	"time"

	core "dappco.re/go/core"

	ai "dappco.re/go/core/ide/pkg/ai"
	"dappco.re/go/core/ide/pkg/workspace"
)

const (
	defaultRecallTopK = 10
	maxRecallTopK     = 50
	defaultListLimit  = 50
	maxListLimit      = 100
	maxResponseBytes  = 1 << 20
)

func (s *Subsystem) recall(ctx context.Context, input RecallInput) (RecallOutput, error) {
	if core.Trim(input.Query) == "" {
		return RecallOutput{}, core.E("ide.brain.recall", "query is required", nil)
	}
	topK := input.TopK
	switch {
	case topK <= 0:
		topK = defaultRecallTopK
	case topK > maxRecallTopK:
		topK = maxRecallTopK
	}
	project := input.Filter.Project
	filterType := core.Sprint(input.Filter.Type)
	agentID := s.agentID(input.Filter.AgentID)
	workspaceRoot := ""
	if s.workspace != nil {
		workspaceRoot = s.workspace.Root()
	}
	key := s.cache.Key(workspaceRoot, s.cfg.Endpoint, s.keyFingerprint(), input.Query, core.Sprint(topK), agentID, project, filterType)
	if out, ok := s.cache.Get(ctx, key); ok {
		return out, nil
	}
	payload := map[string]any{
		"query":    input.Query,
		"top_k":    topK,
		"agent_id": agentID,
		"project":  project,
		"type":     input.Filter.Type,
	}
	result, err := s.apiCall(ctx, http.MethodPost, "/v1/brain/recall", payload)
	if err != nil {
		return RecallOutput{}, err
	}
	rawMemories, _ := result["memories"].([]any)
	memories := make([]Memory, 0, len(rawMemories))
	for _, item := range rawMemories {
		var memory Memory
		if decodeResult := core.JSONUnmarshalString(core.JSONMarshalString(item), &memory); decodeResult.OK {
			memories = append(memories, memory)
		}
	}
	output := RecallOutput{Success: true, Count: len(memories), Memories: memories}
	_ = s.cache.Set(ctx, key, output)
	return output, nil
}

func (s *Subsystem) remember(ctx context.Context, input RememberInput) (RememberOutput, error) {
	payload := map[string]any{
		"content":    input.Content,
		"type":       input.Type,
		"tags":       input.Tags,
		"project":    input.Project,
		"agent_id":   s.agentID(""),
		"confidence": input.Confidence,
	}
	result, err := s.apiCall(ctx, http.MethodPost, "/v1/brain/remember", payload)
	if err != nil {
		return RememberOutput{}, err
	}
	_ = s.cache.Clear(ctx)
	return RememberOutput{Success: true, MemoryID: stringValue(result["id"]), Timestamp: time.Now()}, nil
}

func (s *Subsystem) forget(ctx context.Context, input ForgetInput) (ForgetOutput, error) {
	if core.Trim(input.ID) == "" {
		return ForgetOutput{}, core.E("ide.brain.forget", "id is required", nil)
	}
	_, err := s.apiCall(ctx, http.MethodDelete, core.Concat("/v1/brain/forget/", url.PathEscape(input.ID)), nil)
	if err != nil {
		return ForgetOutput{}, err
	}
	_ = s.cache.Clear(ctx)
	return ForgetOutput{Success: true, Forgotten: input.ID, Timestamp: time.Now()}, nil
}

func (s *Subsystem) list(ctx context.Context, input ListInput) (ListOutput, error) {
	limit := input.Limit
	switch {
	case limit <= 0:
		limit = defaultListLimit
	case limit > maxListLimit:
		limit = maxListLimit
	}
	query := url.Values{}
	if input.Project != "" {
		query.Set("project", input.Project)
	}
	if input.Type != "" {
		query.Set("type", input.Type)
	}
	if input.AgentID != "" {
		query.Set("agent_id", input.AgentID)
	}
	query.Set("limit", core.Sprint(limit))
	path := "/v1/brain/list"
	if len(query) > 0 {
		path = core.Concat(path, "?", query.Encode())
	}
	result, err := s.apiCall(ctx, http.MethodGet, path, nil)
	if err != nil {
		return ListOutput{}, err
	}
	rawMemories, _ := result["memories"].([]any)
	memories := make([]Memory, 0, len(rawMemories))
	for _, item := range rawMemories {
		var memory Memory
		if decodeResult := core.JSONUnmarshalString(core.JSONMarshalString(item), &memory); decodeResult.OK {
			memories = append(memories, memory)
		}
	}
	return ListOutput{Success: true, Count: len(memories), Memories: memories}, nil
}

func (s *Subsystem) context(ctx context.Context, input ContextInput) (ContextOutput, error) {
	project := core.Trim(input.Project)
	if project == "" && s.workspace != nil {
		project = s.workspace.Root()
	}

	recall, err := s.recall(ctx, RecallInput{Query: project, TopK: 5, Filter: RecallFilter{Project: project}})
	if err != nil {
		return ContextOutput{}, err
	}
	conventions := []string{}
	if s.workspace != nil && project != "" {
		workspaceConventions, conventionsErr := s.workspace.Conventions(ctx, workspace.ConventionsInput{Root: project})
		if conventionsErr == nil {
			conventions = workspaceConventions.Conventions
		}
	}
	semanticConventions := s.semanticConventions(project, recall.Memories, conventions)
	if len(semanticConventions) > 0 {
		conventions = semanticConventions
	}
	overview := core.Sprintf("Loaded %d recent memories.", len(recall.Memories))
	if len(semanticConventions) > 0 {
		overview = core.Sprintf("Loaded %d recent memories and ranked %d conventions via RAG.", len(recall.Memories), len(semanticConventions))
	}
	return ContextOutput{
		Overview:    overview,
		Recent:      recall.Memories,
		Conventions: conventions,
	}, nil
}

func (s *Subsystem) semanticConventions(project string, memories []Memory, conventions []string) []string {
	if s.ai == nil || len(conventions) == 0 {
		return nil
	}
	queryParts := []string{core.PathBase(project)}
	for _, memory := range memories {
		content := core.Trim(memory.Content)
		if content == "" {
			continue
		}
		queryParts = append(queryParts, content)
	}
	query := core.Trim(core.Concat(queryParts...))
	if query == "" {
		return nil
	}
	documents := make([]ai.Document, 0, len(conventions))
	for index, convention := range conventions {
		documents = append(documents, ai.Document{
			ID:    core.Sprintf("convention-%d", index),
			Title: core.Sprintf("Convention %d", index+1),
			Text:  convention,
		})
	}
	results := s.ai.Search(ai.SearchInput{
		Query:     query,
		Documents: documents,
		Limit:     len(documents),
	})
	if len(results) == 0 {
		return nil
	}
	ranked := make([]string, 0, len(results))
	seen := map[string]struct{}{}
	for _, result := range results {
		text := core.Trim(result.Document.Text)
		if text == "" {
			continue
		}
		if _, ok := seen[text]; ok {
			continue
		}
		seen[text] = struct{}{}
		ranked = append(ranked, text)
	}
	for _, convention := range conventions {
		if _, ok := seen[convention]; ok {
			continue
		}
		ranked = append(ranked, convention)
	}
	return ranked
}

func (s *Subsystem) apiCall(ctx context.Context, method, path string, body any) (map[string]any, error) {
	apiKey := s.apiKey()
	if apiKey == "" {
		return nil, core.E("ide.brain.apiCall", "no API key configured", nil)
	}
	var reader goio.Reader
	if body != nil {
		reader = bytes.NewReader([]byte(core.JSONMarshalString(body)))
	}
	request, err := http.NewRequestWithContext(ctx, method, core.Concat(s.cfg.Endpoint, path), reader)
	if err != nil {
		return nil, core.E("ide.brain.apiCall", "build request", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Authorization", core.Concat("Bearer ", apiKey))
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := s.client.Do(request)
	if err != nil {
		return nil, core.E("ide.brain.apiCall", "request failed", err)
	}
	defer response.Body.Close()
	raw, err := goio.ReadAll(goio.LimitReader(response.Body, maxResponseBytes+1))
	if err != nil {
		return nil, core.E("ide.brain.apiCall", "read response", err)
	}
	if len(raw) > maxResponseBytes {
		return nil, core.E("ide.brain.apiCall", "response too large", nil)
	}
	if response.StatusCode >= http.StatusBadRequest {
		return nil, core.E("ide.brain.apiCall", core.Concat("upstream returned ", response.Status), nil)
	}
	out := map[string]any{}
	if result := core.JSONUnmarshal(raw, &out); !result.OK {
		if decodeErr, ok := result.Value.(error); ok {
			return nil, core.E("ide.brain.apiCall", "decode response", decodeErr)
		}
		return nil, core.E("ide.brain.apiCall", "decode response", nil)
	}
	return out, nil
}

func (s *Subsystem) apiKey() string {
	if core.Trim(s.cfg.Key) != "" {
		return core.Trim(s.cfg.Key)
	}
	keyPath := core.JoinPath(homeDir(), ".claude", "brain.key")
	if s.medium != nil && s.medium.Exists(keyPath) {
		raw, err := s.medium.Read(keyPath)
		if err == nil {
			return core.Trim(raw)
		}
	}
	return ""
}

func (s *Subsystem) keyFingerprint() string {
	key := s.apiKey()
	if key == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

func (s *Subsystem) agentID(value string) string {
	if core.Trim(value) != "" {
		return core.Trim(value)
	}
	return core.Trim(s.cfg.AgentID)
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}

func homeDir() string {
	home := core.Env("DIR_HOME")
	if home != "" {
		return home
	}
	if resolved, err := os.UserHomeDir(); err == nil {
		return resolved
	}
	return "."
}
