package workspace

import "testing"

func TestConventions_Load_Good(t *testing.T) {
	conventions, notes := loadConventionPacks([]string{"go", "python"}, []string{"go", "python"})
	if len(conventions) == 0 || len(notes) == 0 {
		t.Fatalf("expected merged packs, got conventions=%#v notes=%#v", conventions, notes)
	}
}

func TestConventions_Load_Bad(t *testing.T) {
	conventions, notes := loadConventionPacks([]string{"unknown"}, []string{"unknown"})
	if len(conventions) != 0 || len(notes) != 0 {
		t.Fatalf("expected unknown language to produce empty pack, got %#v %#v", conventions, notes)
	}
}

func TestConventions_Load_Ugly(t *testing.T) {
	conventions, _ := loadConventionPacks([]string{"go", "go"}, []string{"go"})
	if len(conventions) == 0 {
		t.Fatal("expected conventions")
	}
}
