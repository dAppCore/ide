package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBrainRecallCache_Good_StoresAndExpires(t *testing.T) {
	cache, err := newBrainRecallCache(t.TempDir(), "https://example.com", "secret", 25*time.Millisecond)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, cache.Close())
	}()

	want := RecallOutput{
		Success: true,
		Count:   1,
		Memories: []Memory{
			{ID: "m-1", Content: "remember this", CreatedAt: "2026-03-31T00:00:00Z"},
		},
	}

	require.NoError(t, cache.set(context.Background(), "cache-key", want))

	got, ok, err := cache.get(context.Background(), "cache-key")
	require.NoError(t, err)
	require.True(t, ok)
	assert.Equal(t, want, got)

	time.Sleep(50 * time.Millisecond)

	got, ok, err = cache.get(context.Background(), "cache-key")
	require.NoError(t, err)
	assert.False(t, ok)
	assert.Empty(t, got)
}

func TestBrainDirectSubsystem_RecallCachesResults(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/v1/brain/recall", r.URL.Path)

		var body map[string]any
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		assert.Equal(t, "alpha", body["query"])
		assert.Equal(t, float64(5), body["top_k"])
		assert.Equal(t, "cladius", body["agent_id"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"memories": []map[string]any{
				{
					"id":         "m-1",
					"content":    "alpha memory",
					"type":       "decision",
					"project":    "ide",
					"agent_id":   "cladius",
					"created_at": "2026-03-31T00:00:00Z",
					"score":      0.91,
					"source":     "laravel",
				},
			},
		})
	}))
	defer upstream.Close()

	cache, err := newBrainRecallCache(t.TempDir(), upstream.URL, "secret", time.Hour)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, cache.Close())
	}()

	sub := &BrainDirectSubsystem{
		workspaceRoot: "/workspace",
		apiURL:        upstream.URL,
		apiKey:        "secret",
		client:        upstream.Client(),
		cache:         cache,
	}

	_, first, err := sub.brainRecall(context.Background(), nil, RecallInput{Query: "alpha", TopK: 5})
	require.NoError(t, err)
	assert.True(t, first.Success)
	require.Equal(t, int32(1), calls.Load())

	_, second, err := sub.brainRecall(context.Background(), nil, RecallInput{Query: "alpha", TopK: 5})
	require.NoError(t, err)
	assert.True(t, second.Success)
	require.Equal(t, int32(1), calls.Load())
}

func TestBrainDirectSubsystem_ForgetClearsCache(t *testing.T) {
	var recallCalls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v1/brain/recall":
			recallCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"memories": []map[string]any{
					{"id": "m-1", "content": "alpha", "type": "decision", "created_at": "2026-03-31T00:00:00Z"},
				},
			})
		case r.Method == http.MethodDelete && r.URL.Path == "/v1/brain/forget/m-1":
			w.WriteHeader(http.StatusOK)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"deleted": true})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer upstream.Close()

	cache, err := newBrainRecallCache(t.TempDir(), upstream.URL, "secret", time.Hour)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, cache.Close())
	}()

	sub := &BrainDirectSubsystem{
		workspaceRoot: "/workspace",
		apiURL:        upstream.URL,
		apiKey:        "secret",
		client:        upstream.Client(),
		cache:         cache,
	}

	_, _, err = sub.brainRecall(context.Background(), nil, RecallInput{Query: "alpha", TopK: 5})
	require.NoError(t, err)
	require.Equal(t, int32(1), recallCalls.Load())

	_, _, err = sub.brainForget(context.Background(), nil, ForgetInput{ID: "m-1"})
	require.NoError(t, err)

	_, _, err = sub.brainRecall(context.Background(), nil, RecallInput{Query: "alpha", TopK: 5})
	require.NoError(t, err)
	require.Equal(t, int32(2), recallCalls.Load())
}
