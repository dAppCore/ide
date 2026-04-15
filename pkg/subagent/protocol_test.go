package subagent

import (
	"encoding/json"
	"testing"
	"time"
)

func TestProtocol_Encode_Good(t *testing.T) {
	original := GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: "focus", CreatedAt: time.Unix(123, 0).UTC()}
	raw, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded GuidanceMessage
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.Message != original.Message || !decoded.CreatedAt.Equal(original.CreatedAt) {
		t.Fatalf("expected roundtrip, got %#v", decoded)
	}
}

func TestProtocol_Encode_Bad(t *testing.T) {
	var decoded GuidanceMessage
	if err := json.Unmarshal([]byte(`{"type":`), &decoded); err == nil {
		t.Fatal("expected malformed JSON error")
	}
}

func TestProtocol_Encode_Ugly(t *testing.T) {
	var decoded StatusMessage
	if err := json.Unmarshal([]byte(`{"type":"status","state":"running"}`), &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !decoded.CreatedAt.IsZero() {
		t.Fatalf("expected zero created_at when field is missing, got %#v", decoded.CreatedAt)
	}
}
