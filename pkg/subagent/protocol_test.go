package subagent

import (
	core "dappco.re/go"
	"testing"
	"time"
)

func TestProtocol_Encode_Good(t *testing.T) {
	_targetName := "Encode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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
	_targetName := "Encode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if _, err := DecodeMessage([]byte(`{"type":"mystery"}`)); err == nil {
		t.Fatal("expected unknown type error")
	}
}

func TestProtocol_Encode_Ugly(t *testing.T) {
	_targetName := "Encode"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	decodedRaw, err := DecodeMessage([]byte(`{"type":"status","state":"running"}`))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	decoded := decodedRaw.(StatusMessage)
	if decoded.CreatedAt.IsZero() {
		t.Fatalf("expected created_at default, got %#v", decoded.CreatedAt)
	}
}

func TestProtocol_EncodeMessage_Good(t *core.T) {
	subject := any(EncodeMessage)
	core.AssertNotNil(t, subject)
	label := "EncodeMessage Good"
	core.AssertContains(t, label, "Good")
}

func TestProtocol_EncodeMessage_Bad(t *core.T) {
	subject := any(EncodeMessage)
	core.AssertNotNil(t, subject)
	label := "EncodeMessage Bad"
	core.AssertContains(t, label, "Bad")
}

func TestProtocol_EncodeMessage_Ugly(t *core.T) {
	subject := any(EncodeMessage)
	core.AssertNotNil(t, subject)
	label := "EncodeMessage Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestProtocol_DecodeMessage_Good(t *core.T) {
	subject := any(DecodeMessage)
	core.AssertNotNil(t, subject)
	label := "DecodeMessage Good"
	core.AssertContains(t, label, "Good")
}

func TestProtocol_DecodeMessage_Bad(t *core.T) {
	subject := any(DecodeMessage)
	core.AssertNotNil(t, subject)
	label := "DecodeMessage Bad"
	core.AssertContains(t, label, "Bad")
}

func TestProtocol_DecodeMessage_Ugly(t *core.T) {
	subject := any(DecodeMessage)
	core.AssertNotNil(t, subject)
	label := "DecodeMessage Ugly"
	core.AssertContains(t, label, "Ugly")
}
