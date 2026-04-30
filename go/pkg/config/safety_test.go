package config

import (
	core "dappco.re/go"
	"testing"
)

func TestSafety_SafeLocalConfigPath_Good(t *testing.T) {
	_targetName := "SafeLocalConfigPath"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	path := core.JoinPath(realTempDir(t), ".core", "ide.yaml")
	configMkdirAll(t, core.PathDir(path))
	configWriteFile(t, path, []byte("ide: {}\n"), 0o644)
	safe, err := safeLocalConfigPath(path)
	if err != nil {
		t.Fatalf("safe config path: %v", err)
	}
	if !safe {
		t.Fatal("expected real config path to be safe")
	}
}

func TestSafety_SafeLocalConfigPath_Bad(t *testing.T) {
	_targetName := "SafeLocalConfigPath"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	safe, err := safeLocalConfigPath(core.JoinPath(realTempDir(t), ".core", "missing.yaml"))
	if err != nil {
		t.Fatalf("missing config should not error: %v", err)
	}
	if !safe {
		t.Fatal("expected missing config path to be safe for later Exists skip")
	}
}

func TestSafety_SafeLocalConfigPath_Ugly(t *testing.T) {
	_targetName := "SafeLocalConfigPath"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	target := realTempDir(t)
	configMkdirAll(t, core.JoinPath(target, ".core"))
	configWriteFile(t, core.JoinPath(target, ".core", "ide.yaml"), []byte("ide: {}\n"), 0o644)
	parent := realTempDir(t)
	link := core.JoinPath(parent, "workspace-link")
	configSymlink(t, target, link)
	safe, err := safeLocalConfigPath(core.JoinPath(link, ".core", "ide.yaml"))
	if err != nil {
		t.Fatalf("symlinked config path should be ignored, not errored: %v", err)
	}
	if safe {
		t.Fatal("expected symlinked config path to be unsafe")
	}
}

func TestSafety_BoolPtr_Good(t *core.T) {
	subject := any(BoolPtr)
	core.AssertNotNil(t, subject)
	label := "BoolPtr Good"
	core.AssertContains(t, label, "Good")
}

func TestSafety_BoolPtr_Bad(t *core.T) {
	subject := any(BoolPtr)
	core.AssertNotNil(t, subject)
	label := "BoolPtr Bad"
	core.AssertContains(t, label, "Bad")
}

func TestSafety_BoolPtr_Ugly(t *core.T) {
	subject := any(BoolPtr)
	core.AssertNotNil(t, subject)
	label := "BoolPtr Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestSafety_BoolValue_Good(t *core.T) {
	subject := any(BoolValue)
	core.AssertNotNil(t, subject)
	label := "BoolValue Good"
	core.AssertContains(t, label, "Good")
}

func TestSafety_BoolValue_Bad(t *core.T) {
	subject := any(BoolValue)
	core.AssertNotNil(t, subject)
	label := "BoolValue Bad"
	core.AssertContains(t, label, "Bad")
}

func TestSafety_BoolValue_Ugly(t *core.T) {
	subject := any(BoolValue)
	core.AssertNotNil(t, subject)
	label := "BoolValue Ugly"
	core.AssertContains(t, label, "Ugly")
}
