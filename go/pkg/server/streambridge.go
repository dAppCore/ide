// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// streamBridge — typed wails wrapper over MCPBridge stream_* tools.
// Inspector for the in-process go-stream Hub the IDE auto-publishes
// every core ACTION onto (post-#300).
type streamBridge struct {
	core *core.Core
}

type StreamConfig struct {
	HeartbeatMs    int `json:"heartbeat_ms,omitempty"`
	PongTimeoutMs  int `json:"pong_timeout_ms,omitempty"`
	WriteTimeoutMs int `json:"write_timeout_ms,omitempty"`
}

type StreamStatus struct {
	OK               bool           `json:"ok"`
	Running          bool           `json:"running,omitempty"`
	PeerCount        int            `json:"peer_count,omitempty"`
	ChannelCount     int            `json:"channel_count,omitempty"`
	SubscriberCounts map[string]int `json:"subscriber_counts,omitempty"`
	Config           StreamConfig   `json:"config,omitempty"`
	Error            string         `json:"error,omitempty"`
}

type StreamChannel struct {
	Name            string `json:"name"`
	SubscriberCount int    `json:"subscriber_count,omitempty"`
	RecentFrames    int    `json:"recent_frames,omitempty"`
}

type StreamChannelsOutput struct {
	OK           bool            `json:"ok"`
	Channels     []StreamChannel `json:"channels,omitempty"`
	Count        int             `json:"count,omitempty"`
	BroadcastBuf int             `json:"broadcast_buf,omitempty"`
	Error        string          `json:"error,omitempty"`
}

type StreamRecentInput struct {
	Channel string `json:"channel,omitempty"`
}

type StreamFrame struct {
	Channel    string `json:"channel,omitempty"`
	Timestamp  string `json:"timestamp"`
	FrameText  string `json:"frame_text,omitempty"`
	FrameBytes int    `json:"frame_bytes,omitempty"`
}

type StreamRecentOutput struct {
	OK         bool          `json:"ok"`
	Channel    string        `json:"channel,omitempty"`
	Frames     []StreamFrame `json:"frames,omitempty"`
	FrameCount int           `json:"frame_count,omitempty"`
	Error      string        `json:"error,omitempty"`
}

type StreamPublishInput struct {
	Mode    string `json:"mode,omitempty"`
	Channel string `json:"channel,omitempty"`
	Frame   string `json:"frame,omitempty"`
}

type StreamPublishOutput struct {
	OK         bool   `json:"ok"`
	Mode       string `json:"mode,omitempty"`
	Channel    string `json:"channel,omitempty"`
	FrameBytes int    `json:"frame_bytes,omitempty"`
	Error      string `json:"error,omitempty"`
}

func (b *streamBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func (b *streamBridge) Status(ctx context.Context) (StreamStatus, error) {
	m := b.mcp()
	if m == nil {
		return StreamStatus{}, core.E("ide.server.Stream.Status", "mcp bridge unavailable", nil)
	}
	raw := m.toolStreamStatus(ctx, map[string]any{})
	out := StreamStatus{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if v, ok := value["running"].(bool); ok {
		out.Running = v
	}
	if n, ok := value["peer_count"].(float64); ok {
		out.PeerCount = int(n)
	}
	if n, ok := value["channel_count"].(float64); ok {
		out.ChannelCount = int(n)
	}
	if subs, ok := value["subscriber_counts"].(map[string]any); ok {
		out.SubscriberCounts = make(map[string]int, len(subs))
		for k, v := range subs {
			if n, ok := v.(float64); ok {
				out.SubscriberCounts[k] = int(n)
			}
		}
	}
	if cfg, ok := value["config"].(map[string]any); ok {
		if n, ok := cfg["heartbeat_ms"].(float64); ok {
			out.Config.HeartbeatMs = int(n)
		}
		if n, ok := cfg["pong_timeout_ms"].(float64); ok {
			out.Config.PongTimeoutMs = int(n)
		}
		if n, ok := cfg["write_timeout_ms"].(float64); ok {
			out.Config.WriteTimeoutMs = int(n)
		}
	}
	return out, nil
}

func (b *streamBridge) Channels(ctx context.Context) (StreamChannelsOutput, error) {
	m := b.mcp()
	if m == nil {
		return StreamChannelsOutput{}, core.E("ide.server.Stream.Channels", "mcp bridge unavailable", nil)
	}
	raw := m.toolStreamChannels(ctx, map[string]any{})
	out := StreamChannelsOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if n, ok := value["count"].(float64); ok {
		out.Count = int(n)
	}
	if n, ok := value["broadcast_buf"].(float64); ok {
		out.BroadcastBuf = int(n)
	}
	if list, ok := value["channels"].([]any); ok {
		for _, c := range list {
			cm, ok := c.(map[string]any)
			if !ok {
				continue
			}
			ch := StreamChannel{}
			if s, ok := cm["name"].(string); ok {
				ch.Name = s
			}
			if n, ok := cm["subscriber_count"].(float64); ok {
				ch.SubscriberCount = int(n)
			}
			if n, ok := cm["recent_frames"].(float64); ok {
				ch.RecentFrames = int(n)
			}
			out.Channels = append(out.Channels, ch)
		}
	}
	return out, nil
}

func (b *streamBridge) Recent(ctx context.Context, input StreamRecentInput) (StreamRecentOutput, error) {
	m := b.mcp()
	if m == nil {
		return StreamRecentOutput{}, core.E("ide.server.Stream.Recent", "mcp bridge unavailable", nil)
	}
	raw := m.toolStreamRecent(ctx, map[string]any{"channel": input.Channel})
	out := StreamRecentOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if s, ok := value["channel"].(string); ok {
		out.Channel = s
	}
	if n, ok := value["frame_count"].(float64); ok {
		out.FrameCount = int(n)
	}
	if list, ok := value["frames"].([]any); ok {
		for _, f := range list {
			fm, ok := f.(map[string]any)
			if !ok {
				continue
			}
			frame := StreamFrame{}
			if v, ok := fm["channel"].(string); ok {
				frame.Channel = v
			}
			if v, ok := fm["timestamp"].(string); ok {
				frame.Timestamp = v
			}
			if v, ok := fm["frame_text"].(string); ok {
				frame.FrameText = v
			}
			if n, ok := fm["frame_bytes"].(float64); ok {
				frame.FrameBytes = int(n)
			}
			out.Frames = append(out.Frames, frame)
		}
	}
	return out, nil
}

func (b *streamBridge) Publish(ctx context.Context, input StreamPublishInput) (StreamPublishOutput, error) {
	m := b.mcp()
	if m == nil {
		return StreamPublishOutput{}, core.E("ide.server.Stream.Publish", "mcp bridge unavailable", nil)
	}
	raw := m.toolStreamPublish(ctx, map[string]any{
		"mode":    input.Mode,
		"channel": input.Channel,
		"frame":   input.Frame,
	})
	out := StreamPublishOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if s, ok := value["mode"].(string); ok {
		out.Mode = s
	}
	if s, ok := value["channel"].(string); ok {
		out.Channel = s
	}
	if n, ok := value["frame_bytes"].(float64); ok {
		out.FrameBytes = int(n)
	}
	return out, nil
}
