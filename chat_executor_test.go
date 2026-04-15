package main

import (
	"context"
	"testing"

	guimcp "forge.lthn.ai/core/gui/pkg/mcp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeChatToolExecutor struct {
	manifest []guimcp.ToolDescriptor
	text     string
	result   string
	err      error
	calls    int
}

func (f *fakeChatToolExecutor) Manifest() []guimcp.ToolDescriptor { return f.manifest }

func (f *fakeChatToolExecutor) ManifestText() string { return f.text }

func (f *fakeChatToolExecutor) CallTool(_ context.Context, _ string, _ map[string]any) (string, error) {
	f.calls++
	return f.result, f.err
}

func TestChatExecutor_Attach_Good(t *testing.T) {
	executor := newSharedChatToolExecutor()
	fake := &fakeChatToolExecutor{
		manifest: []guimcp.ToolDescriptor{{Name: "brain_recall"}},
		text:     "Available MCP tools:\n- brain_recall",
		result:   `{"ok":true}`,
	}

	executor.Attach(fake)

	require.Len(t, executor.Manifest(), 1)
	assert.Equal(t, "brain_recall", executor.Manifest()[0].Name)
	assert.Equal(t, fake.text, executor.ManifestText())

	result, err := executor.CallTool(context.Background(), "brain_recall", map[string]any{"query": "alpha"})
	require.NoError(t, err)
	assert.Equal(t, fake.result, result)
	assert.Equal(t, 1, fake.calls)
}

func TestChatExecutor_Attach_Bad_NoDelegate(t *testing.T) {
	executor := newSharedChatToolExecutor()

	assert.Nil(t, executor.Manifest())
	assert.Empty(t, executor.ManifestText())

	_, err := executor.CallTool(context.Background(), "brain_recall", nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not attached")
}

func TestChatExecutor_Attach_Ugly_ReplacementWins(t *testing.T) {
	executor := newSharedChatToolExecutor()
	first := &fakeChatToolExecutor{text: "first"}
	second := &fakeChatToolExecutor{
		manifest: []guimcp.ToolDescriptor{{Name: "pkg_search"}},
		text:     "second",
		result:   "done",
	}

	executor.Attach(first)
	executor.Attach(second)

	assert.Equal(t, "second", executor.ManifestText())
	require.Len(t, executor.Manifest(), 1)
	assert.Equal(t, "pkg_search", executor.Manifest()[0].Name)

	_, err := executor.CallTool(context.Background(), "pkg_search", nil)
	require.NoError(t, err)
	assert.Equal(t, 1, second.calls)
	assert.Equal(t, 0, first.calls)
}
