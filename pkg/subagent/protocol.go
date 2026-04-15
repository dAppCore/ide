package subagent

import (
	"time"

	core "dappco.re/go/core"
)

type GuidanceMessage struct {
	Type      string    `json:"type"`
	Role      string    `json:"role"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type QuestionMessage struct {
	Type       string    `json:"type"`
	Role       string    `json:"role"`
	QuestionID string    `json:"question_id"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"created_at"`
}

type AnswerMessage struct {
	Type       string    `json:"type"`
	Role       string    `json:"role"`
	QuestionID string    `json:"question_id"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"created_at"`
}

type ProgressMessage struct {
	Type      string    `json:"type"`
	Role      string    `json:"role"`
	Progress  float64   `json:"progress"`
	Total     float64   `json:"total"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type StatusMessage struct {
	Type      string    `json:"type"`
	State     string    `json:"state"`
	Detail    string    `json:"detail,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func EncodeMessage(message any) ([]byte, error) {
	raw := []byte(core.JSONMarshalString(message))
	decoded, err := DecodeMessage(raw)
	if err != nil {
		return nil, err
	}
	return []byte(core.JSONMarshalString(decoded)), nil
}

func DecodeMessage(raw []byte) (any, error) {
	envelope := struct {
		Type string `json:"type"`
	}{}
	if result := core.JSONUnmarshal(raw, &envelope); !result.OK {
		if err, ok := result.Value.(error); ok {
			return nil, err
		}
		return nil, core.E("ide.subagent.protocol", "decode envelope", nil)
	}
	now := time.Now().UTC()
	switch core.Trim(envelope.Type) {
	case "guidance":
		var message GuidanceMessage
		if err := decodeProtocol(raw, &message); err != nil {
			return nil, err
		}
		if message.CreatedAt.IsZero() {
			message.CreatedAt = now
		}
		return message, nil
	case "question":
		var message QuestionMessage
		if err := decodeProtocol(raw, &message); err != nil {
			return nil, err
		}
		if message.CreatedAt.IsZero() {
			message.CreatedAt = now
		}
		return message, nil
	case "answer":
		var message AnswerMessage
		if err := decodeProtocol(raw, &message); err != nil {
			return nil, err
		}
		if message.CreatedAt.IsZero() {
			message.CreatedAt = now
		}
		return message, nil
	case "progress":
		var message ProgressMessage
		if err := decodeProtocol(raw, &message); err != nil {
			return nil, err
		}
		if message.CreatedAt.IsZero() {
			message.CreatedAt = now
		}
		return message, nil
	case "status":
		var message StatusMessage
		if err := decodeProtocol(raw, &message); err != nil {
			return nil, err
		}
		if message.CreatedAt.IsZero() {
			message.CreatedAt = now
		}
		return message, nil
	default:
		return nil, core.E("ide.subagent.protocol", core.Concat("unknown message type ", envelope.Type), nil)
	}
}

func decodeProtocol(raw []byte, target any) error {
	if result := core.JSONUnmarshal(raw, target); !result.OK {
		if err, ok := result.Value.(error); ok {
			return err
		}
		return core.E("ide.subagent.protocol", "decode message", nil)
	}
	return nil
}
