// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"reflect"
	"strings"
	"sync"
	"time"

	core "dappco.re/go"
	stream "dappco.re/go/stream"
)

// stream_* bridge tools — surfaces dappco.re/go/stream Hub for the
// /stream panel under Developer. The IDE keeps a single in-process Hub
// running; no transport adapters are wired (no peers will appear unless
// a future lane plugs in WebSocket / TCP). The Hub is still useful as a
// pub/sub bus for in-process subsystems and for poking at channels from
// the panel itself.

var (
	streamHubOnce      sync.Once
	streamHub          *stream.Hub
	streamHubCancel    context.CancelFunc
	streamRecent       = make(map[string][]streamRecentEntry)
	streamRecentMu     sync.Mutex
	streamRecentLimit  = 50
	streamBroadcastBuf []streamRecentEntry
)

type streamRecentEntry struct {
	Channel    string `json:"channel,omitempty"`
	Timestamp  string `json:"timestamp"`
	FrameText  string `json:"frame_text"`
	FrameBytes int    `json:"frame_bytes"`
}

func ensureStreamHub() *stream.Hub {
	streamHubOnce.Do(func() {
		streamHub = stream.NewHubWithConfig(stream.DefaultHubConfig())
		ctx, cancel := context.WithCancel(context.Background())
		streamHubCancel = cancel
		go streamHub.Run(ctx)

		// Capture every Publish via SubscribePublished into a per-channel
		// ring buffer. Lets the panel surface "what's been pushed lately"
		// without forcing the user to subscribe ahead of time.
		streamHub.SubscribePublished(func(channel string, frame []byte) {
			streamRecentMu.Lock()
			defer streamRecentMu.Unlock()
			entry := streamRecentEntry{
				Channel:    channel,
				Timestamp:  time.Now().UTC().Format(time.RFC3339),
				FrameText:  truncateForUI(string(frame), 240),
				FrameBytes: len(frame),
			}
			buf := streamRecent[channel]
			buf = append(buf, entry)
			if len(buf) > streamRecentLimit {
				buf = buf[len(buf)-streamRecentLimit:]
			}
			streamRecent[channel] = buf
		})

		// Same for broadcasts — they don't have a channel; keep a single
		// rolling buffer that the panel surfaces under a "(broadcast)" row.
		streamHub.SubscribeBroadcast(func(frame []byte) {
			streamRecentMu.Lock()
			defer streamRecentMu.Unlock()
			entry := streamRecentEntry{
				Timestamp:  time.Now().UTC().Format(time.RFC3339),
				FrameText:  truncateForUI(string(frame), 240),
				FrameBytes: len(frame),
			}
			streamBroadcastBuf = append(streamBroadcastBuf, entry)
			if len(streamBroadcastBuf) > streamRecentLimit {
				streamBroadcastBuf = streamBroadcastBuf[len(streamBroadcastBuf)-streamRecentLimit:]
			}
		})
	})
	return streamHub
}

// AutoPublishCoreActions wires the IDE's core ACTION broadcaster into
// the Stream Hub so every dispatched action lands as a Hub frame on
// the canonical channel "actions". Each frame is JSON shaped:
//
//	{"channel":"actions","type":"<go.type.name>","ts":"<rfc3339>","data":<msg>}
//
// This is the bridge that lets frontend SSE consumers subscribe once
// to /internal/events and observe lifecycle / contextmenu / p2p / chat
// dispatches without polling each tool. Side-effects: every ACTION
// becomes JSON-encoded once and published once; cheap per dispatch.
//
//	c.RegisterAction(...)  ──┐
//	                          ├──► Hub.Publish("actions", frame)
//	any other broadcast    ──┘                │
//	                                          ▼
//	                          /internal/events SSE subscriber
//	                          (handleInternalEvents in mcp_bridge.go)
func AutoPublishCoreActions(c *core.Core) {
	if c == nil {
		return
	}
	hub := ensureStreamHub()
	c.RegisterAction(func(_ *core.Core, msg core.Message) core.Result {
		// Derive a stable type name for the frame envelope. Anonymous
		// or pointer-to-struct types come out as e.g.
		// "*lifecycle.ActionDidBecomeActive" — strip the leading * for
		// readability without losing fidelity.
		typeName := ""
		if msg != nil {
			t := reflect.TypeOf(msg)
			for t.Kind() == reflect.Ptr {
				t = t.Elem()
			}
			typeName = t.PkgPath()
			if typeName != "" {
				typeName += "."
			}
			typeName += t.Name()
		}
		envelope := map[string]any{
			"channel": "actions",
			"type":    typeName,
			"ts":      time.Now().UTC().Format(time.RFC3339Nano),
			"data":    msg,
		}
		frame, err := json.Marshal(envelope)
		if err != nil {
			return core.Result{OK: true}
		}
		hub.Publish("actions", frame)
		return core.Result{OK: true}
	})
}

func (b *MCPBridge) toolStreamStatus(_ context.Context, _ map[string]any) map[string]any {
	hub := ensureStreamHub()
	stats := hub.Stats()
	cfg := hub.Config()
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"running":           hub.Running(),
			"peer_count":        hub.PeerCount(),
			"channel_count":     hub.ChannelCount(),
			"subscriber_counts": stats.SubscriberCount,
			"config": map[string]any{
				"heartbeat_ms":     cfg.HeartbeatInterval.Milliseconds(),
				"pong_timeout_ms":  cfg.PongTimeout.Milliseconds(),
				"write_timeout_ms": cfg.WriteTimeout.Milliseconds(),
			},
		},
	}
}

type streamChannelEntry struct {
	Name            string `json:"name"`
	SubscriberCount int    `json:"subscriber_count"`
	RecentFrames    int    `json:"recent_frames"`
}

func (b *MCPBridge) toolStreamChannels(_ context.Context, _ map[string]any) map[string]any {
	hub := ensureStreamHub()
	streamRecentMu.Lock()
	defer streamRecentMu.Unlock()

	channels := make(map[string]struct{})
	for ch := range hub.AllChannels() {
		channels[ch] = struct{}{}
	}
	for ch := range streamRecent {
		channels[ch] = struct{}{}
	}

	out := make([]streamChannelEntry, 0, len(channels))
	for ch := range channels {
		out = append(out, streamChannelEntry{
			Name:            ch,
			SubscriberCount: hub.ChannelSubscriberCount(ch),
			RecentFrames:    len(streamRecent[ch]),
		})
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"channels":      out,
			"count":         len(out),
			"broadcast_buf": len(streamBroadcastBuf),
		},
	}
}

func (b *MCPBridge) toolStreamRecent(_ context.Context, params map[string]any) map[string]any {
	ensureStreamHub()
	channel := strings.TrimSpace(paramString(params, "channel", ""))
	streamRecentMu.Lock()
	defer streamRecentMu.Unlock()
	if channel == "" {
		return map[string]any{
			"ok": true,
			"value": map[string]any{
				"channel":     "(broadcast)",
				"frames":      append([]streamRecentEntry{}, streamBroadcastBuf...),
				"frame_count": len(streamBroadcastBuf),
			},
		}
	}
	buf := streamRecent[channel]
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"channel":     channel,
			"frames":      append([]streamRecentEntry{}, buf...),
			"frame_count": len(buf),
		},
	}
}

func (b *MCPBridge) toolStreamPublish(_ context.Context, params map[string]any) map[string]any {
	hub := ensureStreamHub()
	channel := strings.TrimSpace(paramString(params, "channel", ""))
	frame := paramString(params, "frame", "")
	mode := strings.ToLower(strings.TrimSpace(paramString(params, "mode", "publish")))

	if mode == "broadcast" {
		r := hub.Broadcast([]byte(frame))
		if !r.OK {
			return map[string]any{"ok": false, "error": r.Error()}
		}
		return map[string]any{"ok": true, "value": map[string]any{"mode": "broadcast", "frame_bytes": len(frame)}}
	}
	if channel == "" {
		return map[string]any{"ok": false, "error": "channel required for publish (use mode=broadcast for channel-less)"}
	}
	r := hub.Publish(channel, []byte(frame))
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"mode":        "publish",
			"channel":     channel,
			"frame_bytes": len(frame),
		},
	}
}
