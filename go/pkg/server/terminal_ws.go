// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
)

// handleTerminalWS upgrades the connection and bridges it to the Session
// identified by the trailing path segment. The protocol is intentionally
// minimal:
//
//   - Server → Client: every message is a binary frame containing the raw PTY
//     output bytes (UTF-8, ANSI sequences and all). xterm.js writes these
//     straight into its parser via term.write().
//
//   - Client → Server: text frames carry small JSON control envelopes; binary
//     frames carry raw stdin bytes (keystrokes). This lets the FE send resize
//     events on the same socket without inventing a separate channel:
//
//       {"type":"resize","cols":120,"rows":40}
//       {"type":"input","data":"echo hi\n"}     // alternative to binary
//
//     Production xterm.js uses binary frames for input; the JSON control
//     envelope is only for resize today.
//
// The first message a new subscriber receives is the ring-buffer snapshot,
// so a page reload (or fresh tab connect) gets the recent scrollback before
// the live stream starts.
func (b *MCPBridge) handleTerminalWS(w http.ResponseWriter, r *http.Request) {
	sid := strings.TrimPrefix(r.URL.Path, "/terminal/ws/")
	if sid == "" || strings.Contains(sid, "/") {
		http.Error(w, "session id required in path", http.StatusBadRequest)
		return
	}

	pool := terminalPoolSingleton()
	sess := pool.Get(sid)
	if sess == nil {
		http.Error(w, "session not found: "+sid, http.StatusNotFound)
		return
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		// Upgrader writes the HTTP error itself.
		return
	}
	defer conn.Close()

	// Single write mutex so concurrent fan-out (subscriber callback fired from
	// the PTY goroutine) and control responses don't interleave on the
	// websocket frame stream.
	var writeMu sync.Mutex
	writeBinary := func(p []byte) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return conn.WriteMessage(2, p) // 2 == BinaryMessage
	}

	// Subscribe BEFORE forwarding scrollback so we don't miss any bytes the
	// PTY produces between snapshot and live stream attach.
	snapshot, unsub := sess.Subscribe(func(chunk []byte) {
		_ = writeBinary(chunk)
	})
	defer unsub()
	if len(snapshot) > 0 {
		if err := writeBinary(snapshot); err != nil {
			return
		}
	}

	// Reader loop — client → PTY. Closes the WS (and ends fan-out) on disconnect.
	clientGone := make(chan struct{})
	go func() {
		defer close(clientGone)
		for {
			messageType, payload, err := conn.ReadMessage()
			if err != nil {
				return
			}
			switch messageType {
			case 1: // TextMessage — JSON control envelope
				var env struct {
					Type string `json:"type"`
					Data string `json:"data,omitempty"`
					Cols int    `json:"cols,omitempty"`
					Rows int    `json:"rows,omitempty"`
				}
				if err := json.Unmarshal(payload, &env); err != nil {
					continue
				}
				switch env.Type {
				case "resize":
					sess.Resize(env.Cols, env.Rows)
				case "input":
					_, _ = sess.Write([]byte(env.Data))
				}
			case 2: // BinaryMessage — raw stdin bytes
				_, _ = sess.Write(payload)
			}
		}
	}()

	// Block until either the client disconnects or the session ends. Either
	// way, defer chain (unsub + conn.Close) handles cleanup.
	select {
	case <-clientGone:
	case <-sess.Done():
	}
}
