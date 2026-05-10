// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// terminalBridge — Wails bridge for the in-IDE terminal pane's control plane.
//
// Bytes (keystroke firehose + PTY output) flow through the WebSocket endpoint
// /terminal/ws/:sid on the MCPBridge — kept off the Wails JSON channel because
// every keypress would spend a full JSON round-trip otherwise. The bridge
// methods here are the small, infrequent control operations:
//
//   - OpenSession  — allocate a PTY, return the session ID
//   - CloseSession — kill a session by ID
//   - Resize       — push window cols/rows to the PTY (called on layout changes)
//   - ListSessions — enumerate live sessions for a future tab strip
//
// WriteInput is exposed too as a fallback for when the WebSocket isn't an
// option (e.g. a synthetic keypress from a script). Production xterm.js uses
// the WS path.
type terminalBridge struct {
	core *core.Core
}

// TerminalOpenInput configures a new session. Empty fields fall back to
// session defaults: $SHELL or /bin/zsh, $HOME or workspace root, xterm-256color.
type TerminalOpenInput struct {
	Shell string `json:"shell,omitempty"`
	Cwd   string `json:"cwd,omitempty"`
	Term  string `json:"term,omitempty"`
	Cols  int    `json:"cols,omitempty"`
	Rows  int    `json:"rows,omitempty"`
}

// TerminalOpenResult carries the new session's metadata back to the FE.
type TerminalOpenResult struct {
	OK    bool   `json:"ok"`
	ID    string `json:"id,omitempty"`
	Host  string `json:"host,omitempty"`
	Shell string `json:"shell,omitempty"`
	Cwd   string `json:"cwd,omitempty"`
	WSURL string `json:"wsUrl,omitempty"`
	Error string `json:"error,omitempty"`
}

// TerminalActionResult is the uniform success/error envelope for control ops.
type TerminalActionResult struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

// TerminalSessionsResult lists current sessions.
type TerminalSessionsResult struct {
	Sessions []SessionInfo `json:"sessions"`
}

// OpenSession allocates a new PTY-backed session. Returns the session ID and
// a relative WebSocket URL the FE should dial for the byte stream.
func (b *terminalBridge) OpenSession(ctx context.Context, input TerminalOpenInput) (TerminalOpenResult, error) {
	pool := terminalPoolSingleton()
	sess, err := pool.Open(SessionOptions{
		Shell: input.Shell,
		Cwd:   input.Cwd,
		Term:  input.Term,
		Cols:  input.Cols,
		Rows:  input.Rows,
	})
	if err != nil {
		return TerminalOpenResult{OK: false, Error: err.Error()}, nil
	}
	return TerminalOpenResult{
		OK:    true,
		ID:    sess.ID,
		Host:  sess.Host,
		Shell: sess.Shell,
		Cwd:   sess.Cwd,
		WSURL: "/terminal/ws/" + sess.ID,
	}, nil
}

// CloseSession kills the session by ID. No-op if the ID is unknown.
func (b *terminalBridge) CloseSession(ctx context.Context, id string) (TerminalActionResult, error) {
	if id == "" {
		return TerminalActionResult{OK: false, Error: "id required"}, nil
	}
	terminalPoolSingleton().Close(id)
	return TerminalActionResult{OK: true}, nil
}

// Resize pushes new cols/rows to the PTY. Called on container resize (xterm
// fit-addon) or explicit user actions.
func (b *terminalBridge) Resize(ctx context.Context, id string, cols, rows int) (TerminalActionResult, error) {
	sess := terminalPoolSingleton().Get(id)
	if sess == nil {
		return TerminalActionResult{OK: false, Error: "session not found: " + id}, nil
	}
	sess.Resize(cols, rows)
	return TerminalActionResult{OK: true}, nil
}

// WriteInput is a fallback control-plane input path (the production keystroke
// stream goes through the WS). Useful for synthetic input from scripts /
// tests / Cladius "type this command for me" flows.
func (b *terminalBridge) WriteInput(ctx context.Context, id, data string) (TerminalActionResult, error) {
	sess := terminalPoolSingleton().Get(id)
	if sess == nil {
		return TerminalActionResult{OK: false, Error: "session not found: " + id}, nil
	}
	if _, err := sess.Write([]byte(data)); err != nil {
		return TerminalActionResult{OK: false, Error: err.Error()}, nil
	}
	return TerminalActionResult{OK: true}, nil
}

// ListSessions returns metadata for all live sessions (used by future tab
// strip / multi-session UI).
func (b *terminalBridge) ListSessions(ctx context.Context) (TerminalSessionsResult, error) {
	return TerminalSessionsResult{Sessions: terminalPoolSingleton().Snapshot()}, nil
}
