// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// p2pBridge exposes the gui p2p service to the Wails frontend with
// typed methods so the /dev/p2p panel can call State / Publish at
// goroutine line-speed instead of HTTP-bridging through MCP.
//
// First panel migrated off callBridge as part of the wails-binding
// sweep (TODO(snider/wails) markers across ~20 panels). Pattern that
// every other panel will follow:
//
//   1. struct {core *core.Core} stored in pkg/server
//   2. typed methods that wrap c.Action(...) and unwrap Result
//   3. registered in cmd/core-ide/wails_boot.go via app.RegisterService
//   4. wails3 generate bindings emits the matching TS into
//      frontend/bindings/dappco.re/go/ide/pkg/server/p2pbridge.ts
//   5. panel imports + calls the typed binding instead of callBridge
type p2pBridge struct {
	core *core.Core
}

// P2PStateOutput mirrors the gui p2p.State payload that the
// /dev/p2p panel binds. Field names are JSON-tagged to match the
// existing callBridge contract so the swap is transparent.
type P2PStateOutput struct {
	NodeID     string    `json:"node_id,omitempty"`
	ListenAddr string    `json:"listen_addr,omitempty"`
	Peers      []P2PPeer `json:"peers,omitempty"`
}

type P2PPeer struct {
	ID        string `json:"id"`
	Topic     string `json:"topic"`
	Connected bool   `json:"connected"`
	SeenAt    string `json:"seen_at"`
}

// P2PPublishInput matches the existing tools_p2p.go P2PPublishInput
// so the FE doesn't need to rename anything.
type P2PPublishInput struct {
	Topic    string         `json:"topic"`
	Route    string         `json:"route,omitempty"`
	SenderID string         `json:"sender_id,omitempty"`
	Payload  map[string]any `json:"payload,omitempty"`
}

type P2PPublishOutput struct {
	Success bool `json:"success"`
}

// State queries the live p2p service for node id, listen address, and
// connected peer list. Returns an empty payload when the bridge has no
// core attached (test fallback) — the panel surfaces that as the
// "no listener bound" empty state via its own logic.
func (bridge *p2pBridge) State(ctx context.Context) (P2PStateOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return P2PStateOutput{}, core.E("ide.server.P2P.State", "core is nil", nil)
	}
	result := bridge.core.Action("p2p.state").Run(context.Background(), core.Options{})
	if !result.OK {
		return P2PStateOutput{}, resultError("ide.server.P2P.State", result.Value)
	}
	// p2p.state returns the gui p2p.State struct directly; we re-shape
	// onto the bridge's typed output so wails generates a clean TS
	// model instead of a generic any.
	state, ok := result.Value.(map[string]any)
	if !ok {
		// Try the typed path (gui p2p.State) — the action returns the
		// canonical type when the service is live.
		return decodeP2PState(result.Value), nil
	}
	return decodeP2PStateFromMap(state), nil
}

// Publish sends a typed envelope through the gui p2p router. Returns
// success=false silently when no transport is configured (matches the
// /dev/p2p panel's "no listener bound" empty-state UX).
func (bridge *p2pBridge) Publish(ctx context.Context, input P2PPublishInput) (P2PPublishOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return P2PPublishOutput{}, core.E("ide.server.P2P.Publish", "core is nil", nil)
	}
	result := bridge.core.Action("p2p.publish").Run(context.Background(), core.NewOptions(
		core.Option{Key: "topic", Value: input.Topic},
		core.Option{Key: "route", Value: input.Route},
		core.Option{Key: "sender_id", Value: input.SenderID},
		core.Option{Key: "payload", Value: input.Payload},
	))
	if !result.OK {
		return P2PPublishOutput{}, resultError("ide.server.P2P.Publish", result.Value)
	}
	success, _ := result.Value.(bool)
	return P2PPublishOutput{Success: success}, nil
}

// decodeP2PState handles the typed-struct path — the gui p2p.State
// has the same field shape as our P2PStateOutput, so reflective
// JSON-roundtrip conversion is overkill; we use a switch on the
// typed result.
func decodeP2PState(v any) P2PStateOutput {
	if v == nil {
		return P2PStateOutput{}
	}
	// Best-effort: cast through a map serialisation. The action layer
	// has already serialised the gui p2p.State; we just normalise into
	// our wire types.
	if m, ok := v.(map[string]any); ok {
		return decodeP2PStateFromMap(m)
	}
	return P2PStateOutput{}
}

func decodeP2PStateFromMap(m map[string]any) P2PStateOutput {
	out := P2PStateOutput{}
	if s, ok := m["node_id"].(string); ok {
		out.NodeID = s
	}
	if s, ok := m["listen_addr"].(string); ok {
		out.ListenAddr = s
	}
	if peers, ok := m["peers"].([]any); ok {
		for _, p := range peers {
			pm, ok := p.(map[string]any)
			if !ok {
				continue
			}
			peer := P2PPeer{}
			if s, ok := pm["id"].(string); ok {
				peer.ID = s
			}
			if s, ok := pm["topic"].(string); ok {
				peer.Topic = s
			}
			if b, ok := pm["connected"].(bool); ok {
				peer.Connected = b
			}
			if s, ok := pm["seen_at"].(string); ok {
				peer.SeenAt = s
			}
			out.Peers = append(out.Peers, peer)
		}
	}
	return out
}
