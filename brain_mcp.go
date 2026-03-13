package main

import (
	"context"
	"os"

	"forge.lthn.ai/core/agent/pkg/lifecycle"
)

// BrainService wraps the lifecycle.Client for OpenBrain vector knowledge store access.
// Used by both headless and GUI MCP servers.
type BrainService struct {
	client *lifecycle.Client
}

// NewBrainService creates a BrainService from environment variables.
// CORE_API_URL defaults to http://localhost:8000
// CORE_API_TOKEN must be set for authentication.
func NewBrainService() *BrainService {
	baseURL := os.Getenv("CORE_API_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8000"
	}
	token := os.Getenv("CORE_API_TOKEN")
	return &BrainService{
		client: lifecycle.NewClient(baseURL, token),
	}
}

// Remember stores a memory in OpenBrain.
func (b *BrainService) Remember(ctx context.Context, content, memType, project, agentID string, tags []string) (*lifecycle.RememberResponse, error) {
	return b.client.Remember(ctx, lifecycle.RememberRequest{
		Content: content,
		Type:    memType,
		Project: project,
		AgentID: agentID,
		Tags:    tags,
	})
}

// Recall performs semantic search in OpenBrain.
func (b *BrainService) Recall(ctx context.Context, query string, topK int, project, memType, agentID string) (*lifecycle.RecallResponse, error) {
	return b.client.Recall(ctx, lifecycle.RecallRequest{
		Query:   query,
		TopK:    topK,
		Project: project,
		Type:    memType,
		AgentID: agentID,
	})
}

// Forget removes a memory by ID.
func (b *BrainService) Forget(ctx context.Context, id string) error {
	return b.client.Forget(ctx, id)
}

// EnsureCollection ensures the Qdrant collection exists.
func (b *BrainService) EnsureCollection(ctx context.Context) error {
	return b.client.EnsureCollection(ctx)
}

// executeBrainTool handles brain MCP tool calls. Shared by headless and GUI servers.
func executeBrainTool(brain *BrainService, tool string, params map[string]any) map[string]any {
	if brain == nil {
		return map[string]any{"error": "brain service not configured"}
	}

	ctx := context.Background()

	switch tool {
	case "brain_remember":
		content := getStringParam(params, "content")
		memType := getStringParam(params, "type")
		if memType == "" {
			memType = "fact"
		}
		project := getStringParam(params, "project")
		agentID := getStringParam(params, "agent_id")
		var tags []string
		if rawTags, ok := params["tags"].([]any); ok {
			for _, t := range rawTags {
				if s, ok := t.(string); ok {
					tags = append(tags, s)
				}
			}
		}
		resp, err := brain.Remember(ctx, content, memType, project, agentID, tags)
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		return map[string]any{"id": resp.ID, "type": resp.Type, "project": resp.Project, "created_at": resp.CreatedAt}

	case "brain_recall":
		query := getStringParam(params, "query")
		topK := getIntParam(params, "top_k")
		if topK == 0 {
			topK = 5
		}
		project := getStringParam(params, "project")
		memType := getStringParam(params, "type")
		agentID := getStringParam(params, "agent_id")
		resp, err := brain.Recall(ctx, query, topK, project, memType, agentID)
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		return map[string]any{"memories": resp.Memories, "scores": resp.Scores}

	case "brain_forget":
		id := getStringParam(params, "id")
		err := brain.Forget(ctx, id)
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		return map[string]any{"success": true}

	case "brain_ensure_collection":
		err := brain.EnsureCollection(ctx)
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		return map[string]any{"success": true}

	default:
		return map[string]any{"error": "unknown brain tool", "tool": tool}
	}
}

// brainToolsList returns the tool definitions for brain MCP tools.
func brainToolsList() []map[string]string {
	return []map[string]string{
		{"name": "brain_remember", "description": "Store a memory in OpenBrain (content, type, project, agent_id, tags)"},
		{"name": "brain_recall", "description": "Semantic search in OpenBrain (query, top_k, project, type, agent_id)"},
		{"name": "brain_forget", "description": "Remove a memory by ID"},
		{"name": "brain_ensure_collection", "description": "Ensure the Qdrant vector collection exists"},
	}
}
