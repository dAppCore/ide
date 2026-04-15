package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_Good_MergesFiles(t *testing.T) {
	dir := t.TempDir()
	userPath := filepath.Join(dir, "user.yaml")
	projectPath := filepath.Join(dir, "project.yaml")

	require.NoError(t, os.WriteFile(userPath, []byte(`
ide:
  brain:
    endpoint: https://user.example
  workspace:
    scan_depth: 1
`), 0o644))
	require.NoError(t, os.WriteFile(projectPath, []byte(`
ide:
  brain:
    agent_id: project-agent
  workspace:
    scan_depth: 7
`), 0o644))

	cfg, err := Load(userPath, projectPath)
	require.NoError(t, err)
	assert.Equal(t, "https://user.example", cfg.Ide.Brain.Endpoint)
	assert.Equal(t, "project-agent", cfg.Ide.Brain.AgentID)
	assert.Equal(t, 7, cfg.Ide.Workspace.ScanDepth)
}

func TestLoad_Bad_MalformedYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.yaml")
	require.NoError(t, os.WriteFile(path, []byte("ide:\n  brain: ["), 0o644))

	_, err := Load(path)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "parse config")
}

func TestLoad_Ugly_EnvOverridesFiles(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	require.NoError(t, os.WriteFile(path, []byte(`
ide:
  transport:
    mode: stdio
  brain:
    endpoint: https://file.example
`), 0o644))

	t.Setenv("CORE_BRAIN_URL", "https://env.example")
	t.Setenv("MCP_ADDR", "127.0.0.1:8888")
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9999")
	t.Setenv("CORE_IDE_TOKEN", "secret")

	cfg, err := Load(path)
	require.NoError(t, err)
	assert.Equal(t, "https://env.example", cfg.Ide.Brain.Endpoint)
	assert.Equal(t, "http", cfg.Ide.Transport.Mode)
	assert.Equal(t, "127.0.0.1:9999", cfg.Ide.Transport.HTTPAddr)
	assert.Equal(t, "127.0.0.1:8888", cfg.Ide.Transport.TCPAddr)
	assert.Equal(t, "secret", cfg.Ide.Transport.Token)
}
