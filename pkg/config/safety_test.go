package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSafety_SafeLocalConfigPath_Good(t *testing.T) {
	path := filepath.Join(realTempDir(t), ".core", "ide.yaml")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir config dir: %v", err)
	}
	if err := os.WriteFile(path, []byte("ide: {}\n"), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}
	safe, err := safeLocalConfigPath(path)
	if err != nil {
		t.Fatalf("safe config path: %v", err)
	}
	if !safe {
		t.Fatal("expected real config path to be safe")
	}
}

func TestSafety_SafeLocalConfigPath_Bad(t *testing.T) {
	safe, err := safeLocalConfigPath(filepath.Join(realTempDir(t), ".core", "missing.yaml"))
	if err != nil {
		t.Fatalf("missing config should not error: %v", err)
	}
	if !safe {
		t.Fatal("expected missing config path to be safe for later Exists skip")
	}
}

func TestSafety_SafeLocalConfigPath_Ugly(t *testing.T) {
	target := realTempDir(t)
	if err := os.MkdirAll(filepath.Join(target, ".core"), 0o755); err != nil {
		t.Fatalf("mkdir target core: %v", err)
	}
	if err := os.WriteFile(filepath.Join(target, ".core", "ide.yaml"), []byte("ide: {}\n"), 0o644); err != nil {
		t.Fatalf("write target config: %v", err)
	}
	parent := realTempDir(t)
	link := filepath.Join(parent, "workspace-link")
	if err := os.Symlink(target, link); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}
	safe, err := safeLocalConfigPath(filepath.Join(link, ".core", "ide.yaml"))
	if err != nil {
		t.Fatalf("symlinked config path should be ignored, not errored: %v", err)
	}
	if safe {
		t.Fatal("expected symlinked config path to be unsafe")
	}
}
