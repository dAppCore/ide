// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// Chat-panel-side methods on chatBridge — the existing Tools /
// ToolManifest / CallTool serve the right-rail Vi chat shell; these
// new methods serve the /dev/chat panel (conversations, models,
// send, history).
//
// Third panel migrated as part of the wails-binding sweep. Pattern:
// extend the existing bridge struct with the additional surface
// rather than spinning a parallel one — keeps wails-generated TS
// for "everything chat" in chatbridge.ts.

// ChatModelOutput mirrors the gui chat package's ModelEntry shape
// JSON-tagged so the wails generator emits a binding the existing
// /dev/chat panel can bind without renames.
type ChatModelOutput struct {
	Name         string `json:"name"`
	Size         int64  `json:"size,omitempty"`
	Status       string `json:"status,omitempty"`
	Architecture string `json:"architecture,omitempty"`
	QuantBits    int    `json:"quant_bits,omitempty"`
	SizeBytes    int64  `json:"size_bytes,omitempty"`
	Loaded       bool   `json:"loaded,omitempty"`
	Backend      string `json:"backend,omitempty"`
}

type ChatModelsOutput struct {
	Models []ChatModelOutput `json:"models"`
}

// ChatMessageOutput mirrors the gui chat Message shape.
type ChatMessageOutput struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
	Model     string `json:"model,omitempty"`
}

type ChatHistoryOutput struct {
	Messages []ChatMessageOutput `json:"messages"`
}

// ChatConversationOutput mirrors gui chat Conversation (without the
// nested Messages — those load via History or LoadConversation).
type ChatConversationOutput struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Model     string `json:"model"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type ChatConversationsListOutput struct {
	Conversations []ChatConversationOutput `json:"conversations"`
}

// ChatConversationDetail is the LoadConversation result — the
// conversation metadata plus its full message list.
type ChatConversationDetail struct {
	ID        string              `json:"id"`
	Title     string              `json:"title"`
	Model     string              `json:"model"`
	CreatedAt string              `json:"created_at"`
	UpdatedAt string              `json:"updated_at"`
	Messages  []ChatMessageOutput `json:"messages"`
}

type ChatConversationLoadOutput struct {
	Conversation ChatConversationDetail `json:"conversation"`
}

// ChatSendInput is the panel's Send button payload.
type ChatSendInput struct {
	ConversationID string `json:"conversation_id,omitempty"`
	Content        string `json:"content"`
	Model          string `json:"model,omitempty"`
}

type ChatSendOutput struct {
	MessageID string `json:"message_id"`
}

type ChatSelectModelInput struct {
	ConversationID string `json:"conversation_id,omitempty"`
	Model          string `json:"model"`
}

type ChatSelectModelOutput struct {
	OK bool `json:"ok"`
}

// Models lists every model the configured chat backend exposes.
// Empty list = the backend is unreachable or has no models loaded;
// the panel surfaces that as the "no models — backend not reachable"
// option in its model picker.
func (bridge *chatBridge) Models(ctx context.Context) (ChatModelsOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return ChatModelsOutput{}, core.E("ide.server.Chat.Models", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.models").Run(context.Background(), core.Options{})
	if !result.OK {
		return ChatModelsOutput{}, resultError("ide.server.Chat.Models", result.Value)
	}
	return ChatModelsOutput{Models: decodeChatModels(result.Value)}, nil
}

// ConversationsList returns every saved conversation in the gui chat
// store, newest first. The panel binds the list into its sidebar.
func (bridge *chatBridge) ConversationsList(ctx context.Context) (ChatConversationsListOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return ChatConversationsListOutput{}, core.E("ide.server.Chat.ConversationsList", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.conversations.list").Run(context.Background(), core.Options{})
	if !result.OK {
		return ChatConversationsListOutput{}, resultError("ide.server.Chat.ConversationsList", result.Value)
	}
	return ChatConversationsListOutput{Conversations: decodeConversations(result.Value)}, nil
}

// ConversationsLoad fetches a single conversation by id, including
// its full message history. The panel binds messages into its main
// pane on selection.
func (bridge *chatBridge) ConversationsLoad(ctx context.Context, id string) (ChatConversationLoadOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return ChatConversationLoadOutput{}, core.E("ide.server.Chat.ConversationsLoad", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.conversations.load").Run(context.Background(), core.NewOptions(
		core.Option{Key: "id", Value: id},
	))
	if !result.OK {
		return ChatConversationLoadOutput{}, resultError("ide.server.Chat.ConversationsLoad", result.Value)
	}
	return ChatConversationLoadOutput{Conversation: decodeConversation(result.Value)}, nil
}

// Send dispatches a user message to the LLM. Returns the new message
// id; the panel re-loads the conversation for the full reply because
// streaming isn't wired (yet — future SSE lane).
func (bridge *chatBridge) Send(ctx context.Context, input ChatSendInput) (ChatSendOutput, error) {
	if bridge == nil || bridge.core == nil {
		return ChatSendOutput{}, core.E("ide.server.Chat.Send", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.send").Run(ctx, core.NewOptions(
		core.Option{Key: "conversation_id", Value: input.ConversationID},
		core.Option{Key: "content", Value: input.Content},
		core.Option{Key: "model", Value: input.Model},
	))
	if !result.OK {
		return ChatSendOutput{}, resultError("ide.server.Chat.Send", result.Value)
	}
	id, _ := result.Value.(string)
	return ChatSendOutput{MessageID: id}, nil
}

// SelectModel binds a model to a conversation so future Sends in
// that conversation use it without the panel passing model on every
// call.
func (bridge *chatBridge) SelectModel(ctx context.Context, input ChatSelectModelInput) (ChatSelectModelOutput, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return ChatSelectModelOutput{}, core.E("ide.server.Chat.SelectModel", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.select_model").Run(context.Background(), core.NewOptions(
		core.Option{Key: "conversation_id", Value: input.ConversationID},
		core.Option{Key: "model", Value: input.Model},
	))
	if !result.OK {
		return ChatSelectModelOutput{}, resultError("ide.server.Chat.SelectModel", result.Value)
	}
	return ChatSelectModelOutput{OK: true}, nil
}

// --- decoders ---
//
// All of these accept the raw `result.Value` from the action layer,
// which is either the typed gui chat struct (Conversation / Message /
// ModelEntry) or a map[string]any depending on whether the action
// went through serialisation. Both paths converge on our wire types
// via best-effort field plucking — same shape as p2pBridge /
// timBridge use.

func decodeChatModels(v any) []ChatModelOutput {
	if v == nil {
		return nil
	}
	models, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]ChatModelOutput, 0, len(models))
	for _, m := range models {
		mm, ok := m.(map[string]any)
		if !ok {
			continue
		}
		entry := ChatModelOutput{}
		if s, ok := mm["name"].(string); ok {
			entry.Name = s
		}
		if n, ok := mm["size"].(int64); ok {
			entry.Size = n
		}
		if s, ok := mm["status"].(string); ok {
			entry.Status = s
		}
		if s, ok := mm["architecture"].(string); ok {
			entry.Architecture = s
		}
		if b, ok := mm["loaded"].(bool); ok {
			entry.Loaded = b
		}
		if s, ok := mm["backend"].(string); ok {
			entry.Backend = s
		}
		out = append(out, entry)
	}
	return out
}

func decodeConversations(v any) []ChatConversationOutput {
	if v == nil {
		return nil
	}
	convs, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]ChatConversationOutput, 0, len(convs))
	for _, c := range convs {
		cm, ok := c.(map[string]any)
		if !ok {
			continue
		}
		entry := ChatConversationOutput{}
		if s, ok := cm["id"].(string); ok {
			entry.ID = s
		}
		if s, ok := cm["title"].(string); ok {
			entry.Title = s
		}
		if s, ok := cm["model"].(string); ok {
			entry.Model = s
		}
		if s, ok := cm["created_at"].(string); ok {
			entry.CreatedAt = s
		}
		if s, ok := cm["updated_at"].(string); ok {
			entry.UpdatedAt = s
		}
		out = append(out, entry)
	}
	return out
}

func decodeConversation(v any) ChatConversationDetail {
	if v == nil {
		return ChatConversationDetail{}
	}
	cm, ok := v.(map[string]any)
	if !ok {
		return ChatConversationDetail{}
	}
	out := ChatConversationDetail{}
	if s, ok := cm["id"].(string); ok {
		out.ID = s
	}
	if s, ok := cm["title"].(string); ok {
		out.Title = s
	}
	if s, ok := cm["model"].(string); ok {
		out.Model = s
	}
	if s, ok := cm["created_at"].(string); ok {
		out.CreatedAt = s
	}
	if s, ok := cm["updated_at"].(string); ok {
		out.UpdatedAt = s
	}
	if msgs, ok := cm["messages"].([]any); ok {
		for _, m := range msgs {
			mm, ok := m.(map[string]any)
			if !ok {
				continue
			}
			msg := ChatMessageOutput{}
			if s, ok := mm["id"].(string); ok {
				msg.ID = s
			}
			if s, ok := mm["role"].(string); ok {
				msg.Role = s
			}
			if s, ok := mm["content"].(string); ok {
				msg.Content = s
			}
			if s, ok := mm["created_at"].(string); ok {
				msg.CreatedAt = s
			}
			if s, ok := mm["model"].(string); ok {
				msg.Model = s
			}
			out.Messages = append(out.Messages, msg)
		}
	}
	return out
}
