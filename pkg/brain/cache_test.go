package brain

import (
	"context"
	"testing"
	"time"

	storelib "dappco.re/go/store"
)

func TestCache_Get_Good(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute)
	expected := RecallOutput{Success: true, Count: 1}
	if err := cache.Set(context.Background(), "key", expected); err != nil {
		t.Fatalf("cache set: %v", err)
	}
	value, ok := cache.Get(context.Background(), "key")
	if !ok || value.Count != 1 {
		t.Fatalf("expected cache hit, got ok=%v value=%#v", ok, value)
	}
}

func TestCache_Get_Bad(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	cache := NewCache(storeInstance, "ide.brain.cache", time.Millisecond)
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
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute)
	for index := 0; index < 10; index++ {
		if err := cache.Set(context.Background(), cache.Key("k", string(rune('a'+index))), RecallOutput{Count: index}); err != nil {
			t.Fatalf("cache set %d: %v", index, err)
		}
	}
}
