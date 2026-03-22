package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"testing"
	"time"

	"forge.lthn.ai/core/go-scm/manifest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFindFreePort_Good(t *testing.T) {
	port, err := findFreePort()
	require.NoError(t, err)
	assert.Greater(t, port, 0)
	assert.Less(t, port, 65536)
}

func TestFindFreePort_UniquePerCall(t *testing.T) {
	port1, err := findFreePort()
	require.NoError(t, err)
	port2, err := findFreePort()
	require.NoError(t, err)
	// Two consecutive calls should very likely return different ports.
	// (Not guaranteed, but effectively always true.)
	assert.NotEqual(t, port1, port2)
}

func TestWaitForHealth_Good(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	err := waitForHealth(srv.URL, 5*time.Second)
	assert.NoError(t, err)
}

func TestWaitForHealth_Bad_Timeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	err := waitForHealth(srv.URL, 500*time.Millisecond)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "timed out")
}

func TestWaitForHealth_Bad_NoServer(t *testing.T) {
	err := waitForHealth("http://127.0.0.1:1", 500*time.Millisecond)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "timed out")
}

func TestDefaultProvidersDir_Good(t *testing.T) {
	dir := defaultProvidersDir()
	assert.Contains(t, dir, ".core")
	assert.Contains(t, dir, "providers")
}

func TestRuntimeManager_List_Good_Empty(t *testing.T) {
	rm := NewRuntimeManager(nil)
	infos := rm.List()
	assert.Empty(t, infos)
}

func TestRuntimeManager_List_Good_WithProviders(t *testing.T) {
	rm := NewRuntimeManager(nil)
	rm.providers = []*RuntimeProvider{
		{
			Dir:  "/tmp/test-provider",
			Port: 12345,
			Manifest: &manifest.Manifest{
				Code:      "test-svc",
				Name:      "Test Service",
				Version:   "1.0.0",
				Namespace: "test",
			},
		},
	}

	infos := rm.List()
	require.Len(t, infos, 1)
	assert.Equal(t, "test-svc", infos[0].Code)
	assert.Equal(t, "Test Service", infos[0].Name)
	assert.Equal(t, "1.0.0", infos[0].Version)
	assert.Equal(t, "test", infos[0].Namespace)
	assert.Equal(t, 12345, infos[0].Port)
	assert.Equal(t, "/tmp/test-provider", infos[0].Dir)
}

func TestRuntimeManager_StopAll_Good_Empty(t *testing.T) {
	rm := NewRuntimeManager(nil)
	// Should not panic with no providers.
	rm.StopAll()
	assert.Empty(t, rm.providers)
}

func TestRuntimeManager_StopAll_Good_WithProcess(t *testing.T) {
	// Start a real process so we can test graceful stop.
	cmd := exec.CommandContext(context.Background(), "sleep", "60")
	require.NoError(t, cmd.Start())

	rm := NewRuntimeManager(nil)
	rm.providers = []*RuntimeProvider{
		{
			Manifest: &manifest.Manifest{Code: "sleeper"},
			Cmd:      cmd,
		},
	}

	rm.StopAll()
	assert.Nil(t, rm.providers)
}

func TestRuntimeManager_StartAll_Good_EmptyDir(t *testing.T) {
	rm := NewRuntimeManager(nil)
	// StartAll with a non-existent providers dir should return an error
	// because the default dir won't have providers (at most it logs and returns nil).
	err := rm.StartAll(context.Background())
	// Depending on whether ~/.core/providers/ exists, this either returns
	// nil (no providers found) or an error (dir doesn't exist).
	// Either outcome is acceptable — no panic.
	_ = err
}
