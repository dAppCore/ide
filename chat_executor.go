package main

import (
	"context"
	"fmt"
	"sync"

	guimcp "forge.lthn.ai/core/gui/pkg/mcp"
)

// sharedChatToolExecutor forwards chat tool calls to the shared GUI MCP subsystem.
//
//	executor := newSharedChatToolExecutor()
//	executor.Attach(guiMCP.New(c))
//	manifest := executor.Manifest()
type sharedChatToolExecutor struct {
	mu       sync.RWMutex
	executor ToolExecutor
}

type ToolExecutor interface {
	Manifest() []guimcp.ToolDescriptor
	ManifestText() string
	CallTool(ctx context.Context, name string, arguments map[string]any) (string, error)
}

func newSharedChatToolExecutor() *sharedChatToolExecutor {
	return &sharedChatToolExecutor{}
}

func (e *sharedChatToolExecutor) Attach(executor ToolExecutor) {
	if e == nil {
		return
	}

	e.mu.Lock()
	e.executor = executor
	e.mu.Unlock()
}

func (e *sharedChatToolExecutor) Manifest() []guimcp.ToolDescriptor {
	executor := e.current()
	if executor == nil {
		return nil
	}
	return executor.Manifest()
}

func (e *sharedChatToolExecutor) ManifestText() string {
	executor := e.current()
	if executor == nil {
		return ""
	}
	return executor.ManifestText()
}

func (e *sharedChatToolExecutor) CallTool(ctx context.Context, name string, arguments map[string]any) (string, error) {
	executor := e.current()
	if executor == nil {
		return "", fmt.Errorf("chat tool executor is not attached")
	}
	return executor.CallTool(ctx, name, arguments)
}

func (e *sharedChatToolExecutor) current() ToolExecutor {
	if e == nil {
		return nil
	}

	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.executor
}
