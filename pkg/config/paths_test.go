package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPaths_Default_Good(t *testing.T) {
	paths := DefaultPaths("/custom/ide.yaml")
	if len(paths) != 1 || paths[0] != "/custom/ide.yaml" {
		t.Fatalf("unexpected explicit paths %#v", paths)
	}
}

func TestPaths_Default_Bad(t *testing.T) {
	t.Setenv("DIR_HOME", "")
	paths := DefaultPaths("")
	if len(paths) == 0 {
		t.Fatal("expected default paths")
	}
}

func TestPaths_Default_Ugly(t *testing.T) {
	originalWD, _ := os.Getwd()
	cwd := t.TempDir()
	t.Cleanup(func() { _ = os.Chdir(originalWD) })
	if err := os.Chdir(cwd); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	homeConfig := filepath.Join(t.TempDir(), ".core", "ide.yaml")
	if err := os.MkdirAll(filepath.Dir(filepath.Join(cwd, ".core", "ide.yaml")), 0o755); err != nil {
		t.Fatalf("mkdir cwd config dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(cwd, ".core", "ide.yaml"), []byte("ide: {}"), 0o644); err != nil {
		t.Fatalf("write cwd config: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(homeConfig), 0o755); err != nil {
		t.Fatalf("mkdir home config dir: %v", err)
	}
	if err := os.WriteFile(homeConfig, []byte("ide: {}"), 0o644); err != nil {
		t.Fatalf("write home config: %v", err)
	}
	t.Setenv("DIR_HOME", filepath.Dir(filepath.Dir(homeConfig)))
	paths := DefaultPaths("")
	if len(paths) != 2 {
		t.Fatalf("expected project-local and home defaults, got %#v", paths)
	}
	if filepath.Base(filepath.Dir(paths[0])) != ".core" || filepath.Base(paths[0]) != "ide.yaml" {
		t.Fatalf("expected home config first, got %#v", paths)
	}
	if filepath.Base(filepath.Dir(paths[1])) != ".core" || filepath.Base(paths[1]) != "ide.yaml" {
		t.Fatalf("expected project-local config second, got %#v", paths)
	}
}
