package subagent

import (
	"testing"
	"time"
)

func TestProtocol_Encode_Good(t *testing.T) {
	original := GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: "focus", CreatedAt: time.Unix(123, 0).UTC()}
	raw, err := EncodeMessage(original)
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	decodedRaw, err := DecodeMessage(raw)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	decoded := decodedRaw.(GuidanceMessage)
	if decoded.Message != original.Message || !decoded.CreatedAt.Equal(original.CreatedAt) {
		t.Fatalf("expected roundtrip, got %#v", decoded)
	}
}

func TestProtocol_Encode_Bad(t *testing.T) {
	if _, err := DecodeMessage([]byte(`{"type":"mystery"}`)); err == nil {
		t.Fatal("expected unknown type error")
	}
}

func TestProtocol_Encode_Ugly(t *testing.T) {
	decodedRaw, err := DecodeMessage([]byte(`{"type":"status","state":"running"}`))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	decoded := decodedRaw.(StatusMessage)
	if decoded.CreatedAt.IsZero() {
		t.Fatalf("expected created_at default, got %#v", decoded.CreatedAt)
	}
}
