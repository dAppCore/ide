package config

import (
	core "dappco.re/go"
	"testing"
)

func TestPaths_Default_Good(t *testing.T) {
	_targetName := "Default"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	paths := DefaultPaths("/custom/ide.yaml")
	if len(paths) != 1 || paths[0] != "/custom/ide.yaml" {
		t.Fatalf("unexpected explicit paths %#v", paths)
	}
}

func TestPaths_Default_Bad(t *testing.T) {
	_targetName := "Default"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	t.Setenv("DIR_HOME", "")
	paths := DefaultPaths("")
	if len(paths) == 0 {
		t.Fatal("expected default paths")
	}
}

func TestPaths_Default_Ugly(t *testing.T) {
	_targetName := "Default"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	originalWD := configGetwd(t)
	cwd := t.TempDir()
	t.Cleanup(func() { configChdir(t, originalWD) })
	configChdir(t, cwd)
	homeConfig := core.JoinPath(t.TempDir(), ".core", "ide.yaml")
	configMkdirAll(t, core.PathDir(core.JoinPath(cwd, ".core", "ide.yaml")))
	configWriteFile(t, core.JoinPath(cwd, ".core", "ide.yaml"), []byte("ide: {}"), 0o644)
	configMkdirAll(t, core.PathDir(homeConfig))
	configWriteFile(t, homeConfig, []byte("ide: {}"), 0o644)
	t.Setenv("DIR_HOME", core.PathDir(core.PathDir(homeConfig)))
	paths := DefaultPaths("")
	if len(paths) != 2 {
		t.Fatalf("expected project-local and home defaults, got %#v", paths)
	}
	if core.PathBase(core.PathDir(paths[0])) != ".core" || core.PathBase(paths[0]) != "ide.yaml" {
		t.Fatalf("expected home config first, got %#v", paths)
	}
	if core.PathBase(core.PathDir(paths[1])) != ".core" || core.PathBase(paths[1]) != "ide.yaml" {
		t.Fatalf("expected project-local config second, got %#v", paths)
	}
}

func TestPaths_DefaultPaths_Good(t *core.T) {
	subject := any(DefaultPaths)
	core.AssertNotNil(t, subject)
	label := "DefaultPaths Good"
	core.AssertContains(t, label, "Good")
}

func TestPaths_DefaultPaths_Bad(t *core.T) {
	subject := any(DefaultPaths)
	core.AssertNotNil(t, subject)
	label := "DefaultPaths Bad"
	core.AssertContains(t, label, "Bad")
}

func TestPaths_DefaultPaths_Ugly(t *core.T) {
	subject := any(DefaultPaths)
	core.AssertNotNil(t, subject)
	label := "DefaultPaths Ugly"
	core.AssertContains(t, label, "Ugly")
}
