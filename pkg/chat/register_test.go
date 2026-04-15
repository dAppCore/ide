package chat

import "testing"

func TestRegister_ExecutorManifest_Good(t *testing.T) {
	executor := NewExecutor(nil, nil)
	if len(executor.Manifest()) != 0 {
		t.Fatalf("expected empty manifest, got %#v", executor.Manifest())
	}
}

func TestRegister_ExecutorManifest_Bad(t *testing.T) {
	executor := NewExecutor(nil, nil)
	if _, err := executor.CallTool(nil, "missing", nil); err == nil {
		t.Fatal("expected missing tool error")
	}
}

func TestRegister_ExecutorManifest_Ugly(t *testing.T) {
	executor := NewExecutor(nil, nil)
	executor.Attach(nil, nil)
	if executor.ManifestText() != "" {
		t.Fatalf("expected empty manifest text, got %q", executor.ManifestText())
	}
}
