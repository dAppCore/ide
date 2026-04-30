package workspace

import (
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
)

func TestConventions_Load_Good(t *testing.T) {
	_targetName := "Load"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	conventions, notes := loadConventionPacks([]string{"go", "python"}, []string{"go", "python"})
	if len(conventions) == 0 || len(notes) == 0 {
		t.Fatalf("expected merged packs, got conventions=%#v notes=%#v", conventions, notes)
	}
}

func TestConventions_Load_Bad(t *testing.T) {
	_targetName := "Load"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	conventions, notes := loadConventionPacks([]string{"unknown"}, []string{"unknown"})
	if len(conventions) != 0 || len(notes) != 0 {
		t.Fatalf("expected unknown language to produce empty pack, got %#v %#v", conventions, notes)
	}
}

func TestConventions_Load_Ugly(t *testing.T) {
	_targetName := "Load"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	conventions, _ := loadConventionPacks([]string{"go", "go"}, []string{"go"})
	if len(conventions) == 0 {
		t.Fatal("expected conventions")
	}
}

func TestConventions_ReadBuildProjectName_Good(t *testing.T) {
	_targetName := "ReadBuildProjectName"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	if err := medium.Write(core.JoinPath(root, ".core", "build.yaml"), "projectName: demo\n"); err != nil {
		t.Fatalf("write build: %v", err)
	}
	if got := readBuildProjectName(medium, root); got != "demo" {
		t.Fatalf("expected project name, got %q", got)
	}
}

func TestConventions_ReadBuildProjectName_Ugly(t *testing.T) {
	_targetName := "ReadBuildProjectName"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	root := t.TempDir()
	medium := coreio.NewMemoryMedium()
	if err := medium.Write(core.JoinPath(root, ".core", "build.yaml"), "name: demo\n"); err != nil {
		t.Fatalf("write build: %v", err)
	}
	if got := readBuildProjectName(medium, root); got != "demo" {
		t.Fatalf("expected fallback name, got %q", got)
	}
}
