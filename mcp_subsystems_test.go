package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSubagentSubsystem_DispatchGuided_Good_NoRelay(t *testing.T) {
	sub := NewSubagentSubsystem(nil)

	out, err := sub.DispatchGuided(context.Background(), GuidedDispatchInput{
		Repo: "go-ide",
		Task: "Read RFC and identify missing features",
	})
	require.NoError(t, err)
	assert.True(t, out.Success)
	assert.False(t, out.Delivered)
	assert.NotEmpty(t, out.WorkspaceID)
	assert.Equal(t, "no relay", out.Reason)
	assert.Contains(t, out.Prompt, "Workspace ID:")
	assert.Contains(t, out.Prompt, "subagent:"+out.WorkspaceID+":guide")
}

func TestWorkspaceSubsystem_WorkspaceScan_Good(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, ".core"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(root, ".core", "manifest.yaml"), []byte("name: demo\n"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(root, "go.mod"), []byte("module demo\n"), 0o644))

	sub := NewWorkspaceSubsystem(root)
	_, out, err := sub.workspaceScan(context.Background(), nil, WorkspaceScanInput{Root: root, Depth: 0})
	require.NoError(t, err)
	require.Len(t, out.Projects, 1)
	assert.Equal(t, root, out.Projects[0].Root)
	assert.Contains(t, out.Projects[0].Languages, "go")
}

func TestBrainDirectSubsystem_BrainList_Good(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/v1/brain/list", r.URL.Path)
		assert.Equal(t, "alpha", r.URL.Query().Get("project"))
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"memories": []map[string]any{
				{"id": "m-1", "content": "alpha", "type": "decision", "created_at": "2026-03-31T00:00:00Z"},
			},
		})
	}))
	defer upstream.Close()

	sub := &BrainDirectSubsystem{
		workspaceRoot: t.TempDir(),
		apiURL:        upstream.URL,
		apiKey:        "secret",
		client:        upstream.Client(),
	}

	_, out, err := sub.brainList(context.Background(), nil, BrainListInput{Project: "alpha", Limit: 1})
	require.NoError(t, err)
	assert.True(t, out.Success)
	require.Len(t, out.Memories, 1)
	assert.Equal(t, "m-1", out.Memories[0].ID)
}
