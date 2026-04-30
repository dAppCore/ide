// SPDX-License-Identifier: EUPL-1.2

package brain

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	coreio "dappco.re/go/io"
	storelib "dappco.re/go/store"

	"dappco.re/go/ide/pkg/config"
)

func TestCache_TTL_Good_HitWithinTTLReturnsValue(t *testing.T) {
	cache := newLifecycleCache(t, time.Minute)
	expected := RecallOutput{Success: true, Count: 1}
	if err := cache.Set(context.Background(), "key", expected); err != nil {
		t.Fatalf("cache set: %v", err)
	}
	got, ok := cache.Get(context.Background(), "key")
	if !ok || got.Count != expected.Count {
		t.Fatalf("expected cache hit within ttl, got ok=%v value=%#v", ok, got)
	}
}

func TestCache_TTL_Bad_HitAfterTTLReturnsMiss(t *testing.T) {
	cache := newLifecycleCache(t, 5*time.Millisecond)
	if err := cache.Set(context.Background(), "key", RecallOutput{Success: true, Count: 1}); err != nil {
		t.Fatalf("cache set: %v", err)
	}
	time.Sleep(20 * time.Millisecond)
	if got, ok := cache.Get(context.Background(), "key"); ok {
		t.Fatalf("expected expired miss, got %#v", got)
	}
}

func TestCache_TTL_Ugly_ZeroTTLNeverCaches(t *testing.T) {
	cache := newLifecycleCache(t, 0)
	if err := cache.Set(context.Background(), "key", RecallOutput{Success: true, Count: 1}); err != nil {
		t.Fatalf("cache set: %v", err)
	}
	if got, ok := cache.Get(context.Background(), "key"); ok {
		t.Fatalf("expected zero ttl to skip caching, got %#v", got)
	}
}

func TestCache_Key_Good_SameInputsProduceSameKey(t *testing.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	inputs := []string{"root", "https://api.lthn.sh", "fingerprint", "query", "10", "agent", "project", "note"}
	first := cache.Key(inputs...)
	second := cache.Key(inputs...)
	if first != second {
		t.Fatalf("expected identical inputs to produce the same key: %q != %q", first, second)
	}
}

func TestCache_Key_Good_DifferentInputsProduceDifferentKeys(t *testing.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	first := cache.Key("root", "https://api.lthn.sh", "fingerprint", "query", "10", "agent", "project", "note")
	second := cache.Key("root", "https://api.lthn.sh", "fingerprint", "query changed", "10", "agent", "project", "note")
	if first == second {
		t.Fatalf("expected changed query to produce a different key")
	}
}

func TestCache_Invalidate_Good_RememberClearsRelevantKeys(t *testing.T) {
	subsystem, recallCalls, cleanup := newInvalidationSubsystem(t)
	defer cleanup()
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("prime recall: %v", err)
	}
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("cached recall: %v", err)
	}
	if *recallCalls != 1 {
		t.Fatalf("expected second recall to hit cache, got %d upstream calls", *recallCalls)
	}
	if _, err := subsystem.remember(context.Background(), RememberInput{Content: "beta", Type: "note"}); err != nil {
		t.Fatalf("remember: %v", err)
	}
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("recall after remember: %v", err)
	}
	if *recallCalls != 2 {
		t.Fatalf("expected remember to invalidate cache, got %d upstream calls", *recallCalls)
	}
}

func TestCache_Invalidate_Good_ForgetClearsRelevantKeys(t *testing.T) {
	subsystem, recallCalls, cleanup := newInvalidationSubsystem(t)
	defer cleanup()
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("prime recall: %v", err)
	}
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("cached recall: %v", err)
	}
	if *recallCalls != 1 {
		t.Fatalf("expected second recall to hit cache, got %d upstream calls", *recallCalls)
	}
	if _, err := subsystem.forget(context.Background(), ForgetInput{ID: "memory-1"}); err != nil {
		t.Fatalf("forget: %v", err)
	}
	if _, err := subsystem.recall(context.Background(), RecallInput{Query: "alpha"}); err != nil {
		t.Fatalf("recall after forget: %v", err)
	}
	if *recallCalls != 2 {
		t.Fatalf("expected forget to invalidate cache, got %d upstream calls", *recallCalls)
	}
}

func newLifecycleCache(t *testing.T, ttl time.Duration) *Cache {
	t.Helper()
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	return NewCache(storeInstance, "ide.brain.cache", ttl, true)
}

func newInvalidationSubsystem(t *testing.T) (*Subsystem, *int, func()) {
	t.Helper()
	recallCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v1/brain/recall":
			recallCalls++
			_, _ = w.Write([]byte(`{"memories":[{"id":"memory-1","content":"alpha"}]}`))
		case "/v1/brain/remember":
			_, _ = w.Write([]byte(`{"id":"memory-2"}`))
		case "/v1/brain/forget/memory-1":
			_, _ = w.Write([]byte(`{"forgotten":true}`))
		default:
			http.NotFound(w, r)
		}
	}))
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		server.Close()
		t.Fatalf("store: %v", err)
	}
	subsystem := New(config.Brain{Endpoint: server.URL, Key: "secret", AgentID: "agent"}.WithDefaults(), coreio.NewMemoryMedium(), storeInstance, nil, nil)
	return subsystem, &recallCalls, server.Close
}
