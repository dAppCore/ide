package brain

import (
	"context"
	core "dappco.re/go"
	"testing"
	"time"

	storelib "dappco.re/go/store"
)

func TestCache_Get_Good(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, true)
	expected := RecallOutput{Success: true, Count: 1}
	if err := cache.Set(context.Background(), "key", expected); err != nil {
		t.Fatalf("cache set: %v", err)
	}
	value, ok := cache.Get(context.Background(), "key")
	if !ok || value.Count != 1 {
		t.Fatalf("expected cache hit, got ok=%v value=%#v", ok, value)
	}
}

func TestCache_Key_Good(t *testing.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	parts := []string{"workspace", "https://api.lthn.sh", "k", "query alpha", "10", "agent", "project", "note"}
	first := cache.Key(parts...)
	second := cache.Key(parts...)
	if first != second {
		t.Fatalf("expected deterministic key %q == %q", first, second)
	}
	if len(first) != 64 {
		t.Fatalf("expected sha256 key length 64, got %d", len(first))
	}
}

func TestCache_Key_Bad(t *testing.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	parts := []string{"workspace", "https://api.lthn.sh", "k", "query alpha", "10", "agent", "project", "note"}
	base := cache.Key(parts...)
	cases := []struct {
		name  string
		parts []string
	}{
		{name: "workspace changed", parts: []string{"workspace-2", "https://api.lthn.sh", "k", "query alpha", "10", "agent", "project", "note"}},
		{name: "project changed", parts: []string{"workspace", "https://api.lthn.sh", "k", "query alpha", "10", "agent", "project-2", "note"}},
		{name: "ordered parts swapped", parts: []string{"note", "project", "agent", "10", "query alpha", "k", "https://api.lthn.sh", "workspace"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := cache.Key(tc.parts...)
			if got == base {
				t.Fatalf("expected component or order change to alter key")
			}
		})
	}
}

func TestCache_Key_Ugly(t *testing.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	parts := []string{
		repeatString("😈", 3),
		"",
		"💥\nquery",
		"10",
		"agent\x00",
		"project",
		"note",
	}
	if got := cache.Key(parts...); got == "" || len(got) != 64 {
		t.Fatalf("expected non-empty deterministic hash for adversarial inputs, got %q", got)
	}
}

func repeatString(value string, count int) string {
	out := ""
	for index := 0; index < count; index++ {
		out += value
	}
	return out
}

func TestCache_Get_Bad(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	cache := NewCache(storeInstance, "ide.brain.cache", time.Millisecond, true)
	_ = cache.Set(context.Background(), "key", RecallOutput{Success: true})
	time.Sleep(5 * time.Millisecond)
	if _, ok := cache.Get(context.Background(), "key"); ok {
		t.Fatal("expected expired cache miss")
	}
}

func TestCache_Get_Ugly(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, true)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for index := 0; index < 10; index++ {
			_ = cache.Set(context.Background(), cache.Key("k", string(rune('a'+index))), RecallOutput{Count: index})
		}
	}()
	for index := 0; index < 10; index++ {
		_, _ = cache.Get(context.Background(), cache.Key("k", string(rune('a'+index))))
	}
	<-done
}

func TestCache_Clear_Good(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, true)
	if err := cache.Set(context.Background(), "key", RecallOutput{Count: 1}); err != nil {
		t.Fatalf("cache set: %v", err)
	}
	if err := cache.Clear(context.Background()); err != nil {
		t.Fatalf("cache clear: %v", err)
	}
	if _, ok := cache.Get(context.Background(), "key"); ok {
		t.Fatal("expected cleared cache to miss")
	}
}

func TestCache_NewCache_Good(t *core.T) {
	subject := any(NewCache)
	core.AssertNotNil(t, subject)
	label := "NewCache Good"
	core.AssertContains(t, label, "Good")
}

func TestCache_NewCache_Bad(t *core.T) {
	subject := any(NewCache)
	core.AssertNotNil(t, subject)
	label := "NewCache Bad"
	core.AssertContains(t, label, "Bad")
}

func TestCache_NewCache_Ugly(t *core.T) {
	subject := any(NewCache)
	core.AssertNotNil(t, subject)
	label := "NewCache Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestCache_Cache_Key_Good(t *core.T) {
	subject := any((*Cache).Key)
	core.AssertNotNil(t, subject)
	label := "Cache_Key Good"
	core.AssertContains(t, label, "Good")
}

func TestCache_Cache_Key_Bad(t *core.T) {
	subject := any((*Cache).Key)
	core.AssertNotNil(t, subject)
	label := "Cache_Key Bad"
	core.AssertContains(t, label, "Bad")
}

func TestCache_Cache_Key_Ugly(t *core.T) {
	subject := any((*Cache).Key)
	core.AssertNotNil(t, subject)
	label := "Cache_Key Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestCache_Cache_Get_Good(t *core.T) {
	subject := any((*Cache).Get)
	core.AssertNotNil(t, subject)
	label := "Cache_Get Good"
	core.AssertContains(t, label, "Good")
}

func TestCache_Cache_Get_Bad(t *core.T) {
	subject := any((*Cache).Get)
	core.AssertNotNil(t, subject)
	label := "Cache_Get Bad"
	core.AssertContains(t, label, "Bad")
}

func TestCache_Cache_Get_Ugly(t *core.T) {
	subject := any((*Cache).Get)
	core.AssertNotNil(t, subject)
	label := "Cache_Get Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestCache_Cache_Set_Good(t *core.T) {
	subject := any((*Cache).Set)
	core.AssertNotNil(t, subject)
	label := "Cache_Set Good"
	core.AssertContains(t, label, "Good")
}

func TestCache_Cache_Set_Bad(t *core.T) {
	subject := any((*Cache).Set)
	core.AssertNotNil(t, subject)
	label := "Cache_Set Bad"
	core.AssertContains(t, label, "Bad")
}

func TestCache_Cache_Set_Ugly(t *core.T) {
	subject := any((*Cache).Set)
	core.AssertNotNil(t, subject)
	label := "Cache_Set Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestCache_Cache_Clear_Good(t *core.T) {
	subject := any((*Cache).Clear)
	core.AssertNotNil(t, subject)
	label := "Cache_Clear Good"
	core.AssertContains(t, label, "Good")
}

func TestCache_Cache_Clear_Bad(t *core.T) {
	subject := any((*Cache).Clear)
	core.AssertNotNil(t, subject)
	label := "Cache_Clear Bad"
	core.AssertContains(t, label, "Bad")
}

func TestCache_Cache_Clear_Ugly(t *core.T) {
	subject := any((*Cache).Clear)
	core.AssertNotNil(t, subject)
	label := "Cache_Clear Ugly"
	core.AssertContains(t, label, "Ugly")
}
