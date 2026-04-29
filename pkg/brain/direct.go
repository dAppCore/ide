package brain

import (
	"context"  // Note: AX-6 - action and MCP call paths propagate cancellation with context.Context; no core context primitive exists.
	"net/http" // Note: AX-6 - OpenBrain direct mode owns a specific HTTP client boundary; RFC permits specific clients.
	"time"     // Note: AX-6 - brain output contracts expose time.Time timestamps; no core clock primitive exists.

	core "dappco.re/go"

	ai "dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/workspace"
)

const (
	defaultRecallTopK = 10
	maxRecallTopK     = 50
	defaultListLimit  = 50
	maxListLimit      = 100
	maxResponseBytes  = 1 << 20
)

func (s *Subsystem) recall(
	ctx context.Context,
	input RecallInput,
) (RecallOutput, error) {
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
	org := input.Filter.Org
	filterType := core.Sprint(input.Filter.Type)
	minConfidence := core.Sprint(input.Filter.MinConfidence)
	agentID := s.agentID(input.Filter.AgentID)
	workspaceRoot := ""
	if s.workspace != nil {
		workspaceRoot = s.workspace.Root()
	}
	key := s.cache.Key(workspaceRoot, s.cfg.Endpoint, s.keyFingerprint(), input.Query, core.Sprint(topK), agentID, org, project, filterType, minConfidence)
	if out, ok := s.cache.Get(ctx, key); ok {
		return out, nil
	}
	payload := map[string]any{
		"query":          input.Query,
		"top_k":          topK,
		"agent_id":       agentID,
		"org":            org,
		"project":        project,
		"type":           input.Filter.Type,
		"min_confidence": input.Filter.MinConfidence,
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
	if err := s.cache.Set(ctx, key, output); err != nil {
		core.Warn("ide.brain.recall cache set", "err", err)
	}
	return output, nil
}

func (s *Subsystem) remember(
	ctx context.Context,
	input RememberInput,
) (RememberOutput, error) {
	payload := map[string]any{
		"content":    input.Content,
		"type":       input.Type,
		"tags":       input.Tags,
		"org":        input.Org,
		"project":    input.Project,
		"agent_id":   s.agentID(""),
		"confidence": input.Confidence,
		"supersedes": input.Supersedes,
		"expires_in": input.ExpiresIn,
	}
	result, err := s.apiCall(ctx, http.MethodPost, "/v1/brain/remember", payload)
	if err != nil {
		return RememberOutput{}, err
	}
	if err := s.cache.Clear(ctx); err != nil {
		core.Warn("ide.brain.remember cache clear", "err", err)
	}
	return RememberOutput{Success: true, MemoryID: stringValue(result["id"]), Timestamp: time.Now()}, nil
}

func (s *Subsystem) forget(
	ctx context.Context,
	input ForgetInput,
) (ForgetOutput, error) {
	if core.Trim(input.ID) == "" {
		return ForgetOutput{}, core.E("ide.brain.forget", "id is required", nil)
	}
	_, err := s.apiCall(ctx, http.MethodDelete, core.Concat("/v1/brain/forget/", core.URLPathEscape(input.ID)), nil)
	if err != nil {
		return ForgetOutput{}, err
	}
	if err := s.cache.Clear(ctx); err != nil {
		core.Warn("ide.brain.forget cache clear", "err", err)
	}
	return ForgetOutput{Success: true, Forgotten: input.ID, Timestamp: time.Now()}, nil
}

func (s *Subsystem) list(
	ctx context.Context,
	input ListInput,
) (ListOutput, error) {
	limit := input.Limit
	switch {
	case limit <= 0:
		limit = defaultListLimit
	case limit > maxListLimit:
		limit = maxListLimit
	}
	query := []string{}
	if input.Org != "" {
		query = append(query, core.Concat("org=", core.URLEncode(input.Org)))
	}
	if input.Project != "" {
		query = append(query, core.Concat("project=", core.URLEncode(input.Project)))
	}
	if input.Type != "" {
		query = append(query, core.Concat("type=", core.URLEncode(input.Type)))
	}
	if input.AgentID != "" {
		query = append(query, core.Concat("agent_id=", core.URLEncode(input.AgentID)))
	}
	query = append(query, core.Concat("limit=", core.Sprint(limit)))
	path := core.Concat("/v1/brain/list?", core.Join("&", query...))
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

func (s *Subsystem) context(
	ctx context.Context,
	input ContextInput,
) (ContextOutput, error) {
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

func (s *Subsystem) apiCall(
	ctx context.Context,
	method,
	path string,
	body any,
) (map[string]any, error) {
	apiKey := s.apiKey()
	if apiKey == "" {
		return nil, wrapOpenBrainError("ide.brain.apiCall", "no API key configured", &OpenBrainError{
			Kind:   OpenBrainErrorMissingAPIKey,
			Method: method,
			Path:   path,
		})
	}
	var rawBody []byte
	if body != nil {
		result := core.JSONMarshal(body)
		if !result.OK {
			if err, ok := result.Value.(error); ok {
				return nil, core.E("ide.brain.apiCall", "encode request", err)
			}
			return nil, core.E("ide.brain.apiCall", "encode request", nil)
		}
		rawBody, _ = result.Value.([]byte)
	}
	out, err := s.httpClient.DoJSON(ctx, openBrainHTTPRequest{
		Method: method,
		Path:   path,
		APIKey: apiKey,
		Body:   rawBody,
	})
	if err != nil {
		return nil, core.E("ide.brain.apiCall", "OpenBrain request failed", err)
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
	return core.SHA256HexString(key)
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
	if home = core.Env("HOME"); home != "" {
		return home
	}
	return "."
}
