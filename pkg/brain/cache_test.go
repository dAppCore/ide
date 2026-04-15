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
