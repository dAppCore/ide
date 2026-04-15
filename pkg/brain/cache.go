package brain

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	core "dappco.re/go/core"
	storelib "dappco.re/go/store"
)

type Cache struct {
	store     *storelib.Store
	namespace string
	ttl       time.Duration
	enabled   bool
}

type cacheEntry struct {
	ExpiresAt time.Time    `json:"expires_at"`
	Output    RecallOutput `json:"output"`
}

func NewCache(storeInstance *storelib.Store, namespace string, ttl time.Duration, enabled bool) *Cache {
	return &Cache{store: storeInstance, namespace: namespace, ttl: ttl, enabled: enabled}
}

func (c *Cache) Key(parts ...string) string {
	hash := sha256.Sum256([]byte(core.Join("|", parts...)))
	return hex.EncodeToString(hash[:])
}

func (c *Cache) Get(ctx context.Context, key string) (RecallOutput, bool) {
	_ = ctx
	if c == nil || c.store == nil || !c.enabled {
		return RecallOutput{}, false
	}
	raw, err := c.store.Get(c.namespace, key)
	if err != nil {
		return RecallOutput{}, false
	}
	var entry cacheEntry
	if result := core.JSONUnmarshalString(raw, &entry); !result.OK {
		return RecallOutput{}, false
	}
	if !entry.ExpiresAt.IsZero() && time.Now().After(entry.ExpiresAt) {
		_ = c.store.Delete(c.namespace, key)
		return RecallOutput{}, false
	}
	return entry.Output, true
}

func (c *Cache) Set(ctx context.Context, key string, output RecallOutput) error {
	_ = ctx
	if c == nil || c.store == nil || !c.enabled {
		return nil
	}
	entry := cacheEntry{Output: output}
	if c.ttl > 0 {
		entry.ExpiresAt = time.Now().Add(c.ttl)
	}
	return c.store.Set(c.namespace, key, core.JSONMarshalString(entry))
}

func (c *Cache) Clear(ctx context.Context) error {
	_ = ctx
	if c == nil || c.store == nil || !c.enabled {
		return nil
	}
	return c.store.DeleteGroup(c.namespace)
}
