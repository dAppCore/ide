package workspace

import (
	"testing"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
)

func TestImpact_Classify_Good(t *testing.T) {
	_targetName := "Classify"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	root := core.JoinPath(t.TempDir(), "ide")
	medium := coreio.NewMemoryMedium()
	_ = medium.Write(core.JoinPath(root, "repos.yaml"), "repos:\n  - name: sibling\n    depends:\n      - ide\n")
	areas, checks, notes := classifyImpact(medium, root, []GitChange{{Path: "frontend/app.ts"}, {Path: ".core/manifest.yaml.depends"}})
	if len(areas) == 0 || len(checks) == 0 || len(notes) == 0 {
		t.Fatalf("unexpected impact result areas=%#v checks=%#v notes=%#v", areas, checks, notes)
	}
}

func TestImpact_Classify_Bad(t *testing.T) {
	_targetName := "Classify"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	areas, _, _ := classifyImpact(coreio.NewMemoryMedium(), t.TempDir(), nil)
	if len(areas) != 0 {
		t.Fatalf("expected no impacted areas, got %#v", areas)
	}
}

func TestImpact_Classify_Ugly(t *testing.T) {
	_targetName := "Classify"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	if !hasDependencyManifestChange([]GitChange{{Path: ".core/manifest.yaml"}}) {
		t.Fatal("expected dependency manifest change detection")
	}
}
