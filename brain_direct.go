// SPDX-License-Identifier: EUPL-1.2

package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"time"

	coreerr "dappco.re/go/core/log"
	coremcp "forge.lthn.ai/core/mcp/pkg/mcp"
	brainpkg "forge.lthn.ai/core/mcp/pkg/mcp/brain"
	_ "github.com/marcboeker/go-duckdb"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	defaultBrainAPIURL      = "https://api.lthn.sh"
	defaultBrainCacheTTL    = 5 * time.Minute
	defaultBrainCacheDriver = "duckdb"
)

type (
	RememberInput  = brainpkg.RememberInput
	RememberOutput = brainpkg.RememberOutput
	RecallInput    = brainpkg.RecallInput
	RecallFilter   = brainpkg.RecallFilter
	RecallOutput   = brainpkg.RecallOutput
	Memory         = brainpkg.Memory
	ForgetInput    = brainpkg.ForgetInput
	ForgetOutput   = brainpkg.ForgetOutput
)

// BrainDirectSubsystem implements the OpenBrain MCP tools over the direct HTTP API.
// brain_recall is cached locally in DuckDB to avoid repeated semantic searches.
type BrainDirectSubsystem struct {
	workspaceRoot string
	apiURL        string
	apiKey        string
	agentID       string
	client        *http.Client

	cache *brainRecallCache
}

var _ coremcp.Subsystem = (*BrainDirectSubsystem)(nil)
var _ coremcp.SubsystemWithShutdown = (*BrainDirectSubsystem)(nil)

// NewCachedBrainDirect creates the direct OpenBrain subsystem with a DuckDB-backed
// cache for brain_recall responses.
func NewCachedBrainDirect(workspaceRoot string) (*BrainDirectSubsystem, error) {
	apiURL := strings.TrimSpace(os.Getenv("CORE_BRAIN_URL"))
	if apiURL == "" {
		apiURL = defaultBrainAPIURL
	}

	apiKey := strings.TrimSpace(os.Getenv("CORE_BRAIN_KEY"))
	if apiKey == "" {
		if home, err := os.UserHomeDir(); err == nil {
			keyPath := filepath.Join(home, ".claude", "brain.key")
			if data, readErr := os.ReadFile(keyPath); readErr == nil {
				apiKey = strings.TrimSpace(string(data))
			}
		}
	}

	cacheTTL := defaultBrainCacheTTL
	if raw := strings.TrimSpace(os.Getenv("CORE_BRAIN_RECALL_CACHE_TTL")); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
			cacheTTL = parsed
		}
	}

	cache, err := newBrainRecallCache(workspaceRoot, apiURL, apiKey, cacheTTL)
	if err != nil {
		return nil, err
	}

	return &BrainDirectSubsystem{
		workspaceRoot: workspaceRoot,
		apiURL:        apiURL,
		apiKey:        apiKey,
		agentID:       strings.TrimSpace(os.Getenv("CORE_BRAIN_AGENT_ID")),
		client:        &http.Client{Timeout: 30 * time.Second},
		cache:         cache,
	}, nil
}

// Name implements mcp.Subsystem.
func (s *BrainDirectSubsystem) Name() string { return "brain" }

// RegisterTools implements mcp.Subsystem.
func (s *BrainDirectSubsystem) RegisterTools(server *mcp.Server) {
	mcp.AddTool(server, &mcp.Tool{
		Name:        "brain_remember",
		Description: "Store a memory in OpenBrain. Types: fact, decision, observation, plan, convention, architecture, research, documentation, service, bug, pattern, context, procedure.",
	}, s.brainRemember)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "brain_recall",
		Description: "Semantic search across OpenBrain memories. Returns memories ranked by similarity. Uses the configured agent identity when none is supplied.",
	}, s.brainRecall)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "brain_forget",
		Description: "Remove a memory from OpenBrain by ID.",
	}, s.brainForget)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "brain_list",
		Description: "List memories in OpenBrain with optional filtering by project, type, and agent.",
	}, s.brainList)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "brain_context",
		Description: "Combine recent OpenBrain memories with workspace conventions for a project.",
	}, s.brainContext)
}

// Shutdown implements mcp.SubsystemWithShutdown.
func (s *BrainDirectSubsystem) Shutdown(ctx context.Context) error {
	if s.cache != nil {
		return s.cache.Close()
	}
	return nil
}

func (s *BrainDirectSubsystem) apiCall(ctx context.Context, method, path string, body any) (map[string]any, error) {
	if s.apiKey == "" {
		return nil, coreerr.E("brain.apiCall", "no API key (set CORE_BRAIN_KEY or create ~/.claude/brain.key)", nil)
	}

	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, coreerr.E("brain.apiCall", "marshal request", err)
		}
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, s.apiURL+path, reqBody)
	if err != nil {
		return nil, coreerr.E("brain.apiCall", "create request", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, coreerr.E("brain.apiCall", "API call failed", err)
	}
	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, coreerr.E("brain.apiCall", "read response", err)
	}

	if resp.StatusCode >= 400 {
		return nil, coreerr.E("brain.apiCall", "API returned "+string(respData), nil)
	}

	var result map[string]any
	if err := json.Unmarshal(respData, &result); err != nil {
		return nil, coreerr.E("brain.apiCall", "parse response", err)
	}

	return result, nil
}

func (s *BrainDirectSubsystem) brainRemember(ctx context.Context, _ *mcp.CallToolRequest, input RememberInput) (*mcp.CallToolResult, RememberOutput, error) {
	agentID := s.resolvedAgentID()
	body := map[string]any{
		"content":  input.Content,
		"type":     input.Type,
		"tags":     input.Tags,
		"project":  input.Project,
		"agent_id": agentID,
	}
	if confidence := inputConfidence(input); confidence != nil {
		body["confidence"] = confidence
	}

	result, err := s.apiCall(ctx, "POST", "/v1/brain/remember", body)
	if err != nil {
		return nil, RememberOutput{}, err
	}

	if s.cache != nil {
		_ = s.cache.clear(ctx)
	}

	id, _ := result["id"].(string)
	return nil, RememberOutput{
		Success:   true,
		MemoryID:  id,
		Timestamp: time.Now(),
	}, nil
}

func (s *BrainDirectSubsystem) brainRecall(ctx context.Context, _ *mcp.CallToolRequest, input RecallInput) (*mcp.CallToolResult, RecallOutput, error) {
	request := s.normalisedRecallRequest(input)
	cacheKey, err := s.cacheKey(request)
	if err != nil {
		return nil, RecallOutput{}, err
	}

	if s.cache != nil {
		if cached, ok, err := s.cache.get(ctx, cacheKey); err != nil {
			return nil, RecallOutput{}, err
		} else if ok {
			return nil, cached, nil
		}
	}

	body := map[string]any{
		"query":    request.Query,
		"top_k":    request.TopK,
		"agent_id": request.AgentID,
	}
	if request.Project != "" {
		body["project"] = request.Project
	}
	if request.Type != nil {
		body["type"] = request.Type
	}

	result, err := s.apiCall(ctx, "POST", "/v1/brain/recall", body)
	if err != nil {
		return nil, RecallOutput{}, err
	}

	output := brainRecallResult(result)
	if s.cache != nil {
		_ = s.cache.set(ctx, cacheKey, output)
	}

	return nil, output, nil
}

func (s *BrainDirectSubsystem) brainForget(ctx context.Context, _ *mcp.CallToolRequest, input ForgetInput) (*mcp.CallToolResult, ForgetOutput, error) {
	_, err := s.apiCall(ctx, "DELETE", "/v1/brain/forget/"+input.ID, nil)
	if err != nil {
		return nil, ForgetOutput{}, err
	}

	if s.cache != nil {
		_ = s.cache.clear(ctx)
	}

	return nil, ForgetOutput{
		Success:   true,
		Forgotten: input.ID,
		Timestamp: time.Now(),
	}, nil
}

type brainRecallRequest struct {
	WorkspaceRoot string `json:"workspace_root"`
	APIURL        string `json:"api_url"`
	APIKeyHash    string `json:"api_key_hash"`
	Query         string `json:"query"`
	TopK          int    `json:"top_k"`
	AgentID       string `json:"agent_id"`
	Project       string `json:"project,omitempty"`
	Type          any    `json:"type,omitempty"`
}

type BrainListInput struct {
	Project string `json:"project,omitempty"`
	Type    string `json:"type,omitempty"`
	AgentID string `json:"agentId,omitempty"`
	Limit   int    `json:"limit,omitempty"`
}

type BrainListOutput struct {
	Success  bool     `json:"success"`
	Count    int      `json:"count"`
	Memories []Memory `json:"memories"`
}

type BrainContextInput struct {
	Project string `json:"project,omitempty"`
}

type BrainContextOutput struct {
	Overview    string   `json:"overview"`
	Recent      []Memory `json:"recent"`
	Conventions []string `json:"conventions"`
}

func (s *BrainDirectSubsystem) normalisedRecallRequest(input RecallInput) brainRecallRequest {
	topK := input.TopK
	if topK <= 0 {
		topK = 10
	}

	return brainRecallRequest{
		WorkspaceRoot: strings.TrimSpace(s.workspaceRoot),
		APIURL:        strings.TrimSpace(s.apiURL),
		APIKeyHash:    hashString(s.apiKey),
		Query:         strings.TrimSpace(input.Query),
		TopK:          topK,
		AgentID:       s.resolvedAgentID(),
		Project:       strings.TrimSpace(input.Filter.Project),
		Type:          input.Filter.Type,
	}
}

func (s *BrainDirectSubsystem) cacheKey(request brainRecallRequest) (string, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return "", coreerr.E("brain.cacheKey", "marshal recall request", err)
	}

	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}

func brainRecallResult(result map[string]any) RecallOutput {
	var memories []Memory
	if mems, ok := result["memories"].([]any); ok {
		for _, m := range mems {
			mm, ok := m.(map[string]any)
			if !ok {
				continue
			}
			mem := Memory{
				Content:   fmt.Sprintf("%v", mm["content"]),
				Type:      fmt.Sprintf("%v", mm["type"]),
				Project:   fmt.Sprintf("%v", mm["project"]),
				AgentID:   fmt.Sprintf("%v", mm["agent_id"]),
				CreatedAt: fmt.Sprintf("%v", mm["created_at"]),
			}
			if id, ok := mm["id"].(string); ok {
				mem.ID = id
			}
			if score, ok := mm["score"].(float64); ok {
				mem.Confidence = score
			}
			if source, ok := mm["source"].(string); ok {
				mem.Tags = append(mem.Tags, "source:"+source)
			}
			memories = append(memories, mem)
		}
	}

	return RecallOutput{
		Success:  true,
		Count:    len(memories),
		Memories: memories,
	}
}

func (s *BrainDirectSubsystem) brainList(ctx context.Context, _ *mcp.CallToolRequest, input BrainListInput) (*mcp.CallToolResult, BrainListOutput, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = 50
	}
	agentID := strings.TrimSpace(input.AgentID)
	if agentID == "" {
		agentID = s.resolvedAgentID()
	}

	query := "/v1/brain/list?limit=" + fmt.Sprintf("%d", limit)
	if input.Project != "" {
		query += "&project=" + url.QueryEscape(input.Project)
	}
	if input.Type != "" {
		query += "&type=" + url.QueryEscape(input.Type)
	}
	if agentID != "" {
		query += "&agent_id=" + url.QueryEscape(agentID)
	}

	result, err := s.apiCall(ctx, http.MethodGet, query, nil)
	if err != nil {
		return nil, BrainListOutput{}, err
	}

	memories := brainListResult(result)
	return nil, BrainListOutput{
		Success:  true,
		Count:    len(memories),
		Memories: memories,
	}, nil
}

func (s *BrainDirectSubsystem) brainContext(ctx context.Context, _ *mcp.CallToolRequest, input BrainContextInput) (*mcp.CallToolResult, BrainContextOutput, error) {
	recall, _, err := s.brainRecall(ctx, nil, RecallInput{
		Query:  input.Project,
		TopK:   5,
		Filter: RecallFilter{Project: input.Project},
	})
	if err != nil {
		return nil, BrainContextOutput{}, err
	}
	conventions, err := workspaceConventionsForRoot(s.workspaceRoot)
	if err != nil {
		return nil, BrainContextOutput{}, err
	}

	overview := "Workspace context for " + strings.TrimSpace(input.Project)
	if input.Project == "" {
		overview = "Workspace context"
	}

	return nil, BrainContextOutput{
		Overview:    overview,
		Recent:      recall.Memories,
		Conventions: conventions.Conventions,
	}, nil
}

func brainListResult(result map[string]any) []Memory {
	output := brainRecallResult(result)
	return output.Memories
}

func hashString(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (s *BrainDirectSubsystem) resolvedAgentID() string {
	if s == nil {
		return "cladius"
	}
	if value := strings.TrimSpace(s.agentID); value != "" {
		return value
	}
	return "cladius"
}

func inputConfidence(input any) any {
	value := reflect.ValueOf(input)
	if !value.IsValid() {
		return nil
	}
	if value.Kind() == reflect.Pointer {
		if value.IsNil() {
			return nil
		}
		value = value.Elem()
	}
	if value.Kind() != reflect.Struct {
		return nil
	}

	field := value.FieldByName("Confidence")
	if !field.IsValid() {
		return nil
	}
	switch field.Kind() {
	case reflect.Float32, reflect.Float64:
		return field.Float()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(field.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return float64(field.Uint())
	default:
		return nil
	}
}

type brainRecallCache struct {
	db   *sql.DB
	ttl  time.Duration
	path string
}

func newBrainRecallCache(workspaceRoot, apiURL, apiKey string, ttl time.Duration) (*brainRecallCache, error) {
	cachePath, err := brainRecallCachePath(workspaceRoot, apiURL, apiKey)
	if err != nil {
		return nil, err
	}

	db, err := sql.Open(defaultBrainCacheDriver, cachePath)
	if err != nil {
		return nil, coreerr.E("brain.cache.open", "open duckdb cache", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	schema := `
CREATE TABLE IF NOT EXISTS brain_recall_cache (
	cache_key TEXT PRIMARY KEY,
	payload TEXT NOT NULL,
	created_at_unix_ms BIGINT NOT NULL,
	expires_at_unix_ms BIGINT NOT NULL
);
`
	if _, err := db.Exec(schema); err != nil {
		_ = db.Close()
		return nil, coreerr.E("brain.cache.schema", "initialise duckdb cache", err)
	}

	return &brainRecallCache{
		db:   db,
		ttl:  ttl,
		path: cachePath,
	}, nil
}

func brainRecallCachePath(workspaceRoot, apiURL, apiKey string) (string, error) {
	baseDir, err := os.UserCacheDir()
	if err != nil || baseDir == "" {
		baseDir = os.TempDir()
	}

	identity := strings.Join([]string{
		strings.TrimSpace(workspaceRoot),
		strings.TrimSpace(apiURL),
		hashString(apiKey),
	}, "\x00")

	sum := sha256.Sum256([]byte(identity))
	fileName := "brain-recall-" + hex.EncodeToString(sum[:]) + ".duckdb"
	cacheDir := filepath.Join(baseDir, "core-ide", "brain")
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return "", coreerr.E("brain.cache.path", "create cache directory", err)
	}

	return filepath.Join(cacheDir, fileName), nil
}

func (c *brainRecallCache) Close() error {
	if c == nil || c.db == nil {
		return nil
	}
	return c.db.Close()
}

func (c *brainRecallCache) get(ctx context.Context, key string) (RecallOutput, bool, error) {
	if c == nil || c.db == nil {
		return RecallOutput{}, false, nil
	}

	var payload string
	var expires int64
	err := c.db.QueryRowContext(ctx, `SELECT payload, expires_at_unix_ms FROM brain_recall_cache WHERE cache_key = ?`, key).Scan(&payload, &expires)
	if err == sql.ErrNoRows {
		return RecallOutput{}, false, nil
	}
	if err != nil {
		return RecallOutput{}, false, coreerr.E("brain.cache.get", "read recall cache", err)
	}

	if time.Now().UTC().UnixMilli() >= expires {
		_, _ = c.db.ExecContext(ctx, `DELETE FROM brain_recall_cache WHERE cache_key = ?`, key)
		return RecallOutput{}, false, nil
	}

	var out RecallOutput
	if err := json.Unmarshal([]byte(payload), &out); err != nil {
		return RecallOutput{}, false, coreerr.E("brain.cache.get", "decode cached recall output", err)
	}

	return out, true, nil
}

func (c *brainRecallCache) set(ctx context.Context, key string, value RecallOutput) error {
	if c == nil || c.db == nil {
		return nil
	}

	payload, err := json.Marshal(value)
	if err != nil {
		return coreerr.E("brain.cache.set", "encode recall output", err)
	}

	now := time.Now().UTC().UnixMilli()
	expires := now + int64(c.ttl/time.Millisecond)
	if expires <= now {
		expires = now + 1
	}

	_, err = c.db.ExecContext(ctx, `
INSERT INTO brain_recall_cache (cache_key, payload, created_at_unix_ms, expires_at_unix_ms)
VALUES (?, ?, ?, ?)
ON CONFLICT(cache_key) DO UPDATE SET
	payload = excluded.payload,
	created_at_unix_ms = excluded.created_at_unix_ms,
	expires_at_unix_ms = excluded.expires_at_unix_ms
`, key, string(payload), now, expires)
	if err != nil {
		return coreerr.E("brain.cache.set", "store recall cache", err)
	}

	return nil
}

func (c *brainRecallCache) clear(ctx context.Context) error {
	if c == nil || c.db == nil {
		return nil
	}

	if _, err := c.db.ExecContext(ctx, `DELETE FROM brain_recall_cache`); err != nil {
		return coreerr.E("brain.cache.clear", "clear recall cache", err)
	}
	return nil
}
