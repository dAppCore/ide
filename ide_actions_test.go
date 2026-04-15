package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"forge.lthn.ai/core/go/pkg/core"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIDEActions_Dispatch_Good_BrainRecall(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/v1/brain/recall", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"memories": []map[string]any{
				{"id": "m-1", "content": "alpha", "type": "decision", "created_at": "2026-03-31T00:00:00Z"},
			},
		})
	}))
	defer upstream.Close()

	cache, err := newBrainRecallCache(t.TempDir(), upstream.URL, "secret", time.Hour)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, cache.Close())
	}()

	brain := &BrainDirectSubsystem{
		workspaceRoot: t.TempDir(),
		apiURL:        upstream.URL,
		apiKey:        "secret",
		client:        upstream.Client(),
		cache:         cache,
	}

	workspace := NewWorkspaceSubsystem(t.TempDir())
	marketplace := NewMarketplaceSubsystem(nil)
	navigate := NewNavigateSubsystem(nil)
	subagent := NewSubagentSubsystem(nil)

	c, err := core.New()
	require.NoError(t, err)
	registerIDEActions(c, brain, workspace, marketplace, navigate, subagent)

	require.NoError(t, c.ACTION(IDEAction{
		Name:  "ide.brain.recall",
		Input: RecallInput{Query: "alpha", TopK: 5},
	}))
	assert.Equal(t, int32(1), calls.Load())
}

func TestIDEActions_Dispatch_Bad_InvalidInput(t *testing.T) {
	c, err := core.New()
	require.NoError(t, err)

	registerIDEActions(c, &BrainDirectSubsystem{}, NewWorkspaceSubsystem(t.TempDir()), NewMarketplaceSubsystem(nil), NewNavigateSubsystem(nil), NewSubagentSubsystem(nil))

	err = c.ACTION(IDEAction{
		Name:  "ide.brain.recall",
		Input: "invalid",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "json")
}

func TestIDEActions_Dispatch_Ugly_UnknownActionNoop(t *testing.T) {
	c, err := core.New()
	require.NoError(t, err)

	registerIDEActions(c, &BrainDirectSubsystem{}, NewWorkspaceSubsystem(t.TempDir()), NewMarketplaceSubsystem(nil), NewNavigateSubsystem(nil), NewSubagentSubsystem(nil))

	require.NoError(t, c.ACTION(IDEAction{
		Name:  "ide.not.real",
		Input: map[string]any{"value": true},
	}))
}

func TestIDEAction_EncodeDecode_Good(t *testing.T) {
	original := IDEAction{Name: "ide.workspace.status", Input: WorkspaceStatusInput{Root: "."}}
	raw, err := json.Marshal(original)
	require.NoError(t, err)

	var decoded IDEAction
	require.NoError(t, json.Unmarshal(raw, &decoded))
	assert.Equal(t, original.Name, decoded.Name)
}

func TestIDEAction_EncodeDecode_Bad(t *testing.T) {
	_, err := decodeIDEActionInput[WorkspaceStatusInput](map[string]any{
		"root": 123,
	})
	require.Error(t, err)
}

func TestIDEAction_EncodeDecode_Ugly(t *testing.T) {
	input, err := decodeIDEActionInput[WorkspaceStatusInput](nil)
	require.NoError(t, err)
	assert.Equal(t, WorkspaceStatusInput{}, input)

	_ = context.Background()
}
