package ai

import (
	"os"
	"path/filepath"
	"time"

	core "dappco.re/go"
)

func TestAX7_Register_Good(t *core.T) {
	result := Register(core.New())
	core.AssertTrue(t, result.OK)
	core.AssertNotNil(t, result.Value.(*Service))
}

func TestAX7_Register_Bad(t *core.T) {
	result := Register(nil)
	service := result.Value.(*Service)
	core.AssertTrue(t, result.OK)
	core.AssertNotNil(t, service)
}

func TestAX7_Register_Ugly(t *core.T) {
	c := core.New(core.WithService(Register))
	service, ok := core.ServiceFor[*Service](c, "ai")
	core.AssertTrue(t, ok)
	core.AssertNotNil(t, service)
}

func TestAX7_Service_OnStartup_Good(t *core.T) {
	service := &Service{}
	result := service.OnStartup(core.Background())
	core.AssertTrue(t, result.OK)
	core.AssertNil(t, result.Value)
}

func TestAX7_Service_OnStartup_Bad(t *core.T) {
	var service *Service
	result := service.OnStartup(core.Background())
	core.AssertTrue(t, result.OK)
	core.AssertNil(t, result.Value)
}

func TestAX7_Service_OnStartup_Ugly(t *core.T) {
	ctx, cancel := core.WithCancel(core.Background())
	cancel()
	result := (&Service{}).OnStartup(ctx)
	core.AssertTrue(t, result.OK)
}

func TestAX7_Service_Record_Good(t *core.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	service := &Service{}
	err := service.Record(Event{Type: "ax7", Timestamp: time.Date(2026, 4, 28, 12, 0, 0, 0, time.UTC)})
	core.AssertNoError(t, err)
}

func TestAX7_Service_Record_Bad(t *core.T) {
	homeFile := filepath.Join(t.TempDir(), "home-file")
	core.RequireNoError(t, os.WriteFile(homeFile, []byte("not a dir"), 0o644))
	t.Setenv("DIR_HOME", homeFile)
	err := (&Service{}).Record(Event{Type: "ax7"})
	core.AssertError(t, err)
}

func TestAX7_Service_Record_Ugly(t *core.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	service := &Service{}
	err := service.Record(Event{Type: "", Data: map[string]any{"empty": true}})
	core.AssertNoError(t, err)
}

func TestAX7_Service_Search_Good(t *core.T) {
	service := &Service{}
	results := service.Search(SearchInput{Query: "agent", Documents: []Document{{Title: "Agent", Text: "agent dispatch ready"}}})
	core.AssertLen(t, results, 1)
	core.AssertEqual(t, "Agent", results[0].Document.Title)
}

func TestAX7_Service_Search_Bad(t *core.T) {
	service := &Service{}
	results := service.Search(SearchInput{Query: "", Documents: []Document{{Text: "agent"}}})
	core.AssertNil(t, results)
}

func TestAX7_Service_Search_Ugly(t *core.T) {
	service := &Service{}
	results := service.Search(SearchInput{Query: "dispatch", Limit: 1, Documents: []Document{{Title: "B", Text: "dispatch"}, {Title: "A", Text: "dispatch"}}})
	core.AssertLen(t, results, 1)
	core.AssertEqual(t, "A", results[0].Document.Title)
}

func TestAX7_Record_Good(t *core.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	err := Record(Event{Type: "ax7", Timestamp: time.Date(2026, 4, 28, 12, 0, 0, 0, time.UTC)})
	core.AssertNoError(t, err)
}

func TestAX7_Record_Bad(t *core.T) {
	homeFile := filepath.Join(t.TempDir(), "home-file")
	core.RequireNoError(t, os.WriteFile(homeFile, []byte("not a dir"), 0o644))
	t.Setenv("DIR_HOME", homeFile)
	err := Record(Event{Type: "ax7"})
	core.AssertError(t, err)
}

func TestAX7_Record_Ugly(t *core.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	err := Record(Event{Type: "ax7", Data: map[string]any{"nested": map[string]any{"ok": true}}})
	core.AssertNoError(t, err)
}
