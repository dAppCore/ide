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
	_ = os.Chdir(cwd)
	paths := DefaultPaths("")
	if len(paths) != 1 || filepath.Base(filepath.Dir(paths[0])) != ".core" || filepath.Base(paths[0]) != "ide.yaml" {
		t.Fatalf("unexpected derived paths %#v", paths)
	}
}
