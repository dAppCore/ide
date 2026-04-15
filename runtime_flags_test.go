package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseRuntimeFlags_Good(t *testing.T) {
	flags, err := parseRuntimeFlags([]string{"--mcp", "--no-gui", "--http", "127.0.0.1:9999", "--token", "secret"})
	require.NoError(t, err)
	assert.True(t, flags.MCPOnly)
	assert.True(t, flags.NoGUI)
	assert.Equal(t, "127.0.0.1:9999", flags.HTTPAddr)
	assert.Equal(t, "secret", flags.Token)
}

func TestParseRuntimeFlags_Bad_UnknownFlag(t *testing.T) {
	_, err := parseRuntimeFlags([]string{"--not-real"})
	require.Error(t, err)
}

func TestLoadIDEConfig_Ugly_HTTPOverridesMCP(t *testing.T) {
	dir := t.TempDir()
	coreDir := filepath.Join(dir, ".core")
	require.NoError(t, os.MkdirAll(coreDir, 0o755))
	path := filepath.Join(coreDir, "ide.yaml")
	require.NoError(t, os.WriteFile(path, []byte(`
ide:
  transport:
    mode: tcp
    tcp_addr: 127.0.0.1:9000
`), 0o644))

	oldWD, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(dir))
	t.Cleanup(func() {
		_ = os.Chdir(oldWD)
	})
	t.Setenv("HOME", dir)

	cfg, flags, err := loadIDEConfig([]string{"--mcp", "--http", "127.0.0.1:9999"})
	require.NoError(t, err)
	assert.True(t, flags.MCPOnly)
	assert.Equal(t, "http", cfg.Ide.Transport.Mode)
	assert.Equal(t, "127.0.0.1:9999", cfg.Ide.Transport.HTTPAddr)
}

func TestLoadIDEConfig_Good_DisablesChatWhenNoGUI(t *testing.T) {
	dir := t.TempDir()
	coreDir := filepath.Join(dir, ".core")
	require.NoError(t, os.MkdirAll(coreDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(coreDir, "ide.yaml"), []byte("ide: {}\n"), 0o644))

	oldWD, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(dir))
	t.Cleanup(func() {
		_ = os.Chdir(oldWD)
	})
	t.Setenv("HOME", dir)

	cfg, flags, err := loadIDEConfig([]string{"--no-gui"})
	require.NoError(t, err)
	assert.True(t, flags.NoGUI)
	assert.False(t, cfg.Ide.Chat.Enabled)
}
