package brain

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	core "dappco.re/go"
	storelib "dappco.re/go/store"
)

type Cache struct {
	store     *storelib.Store
	namespace string
	ttl       time.Duration
	enabled   bool
}

func NewCache(storeInstance *storelib.Store, namespace string, ttl time.Duration, enabled bool) *Cache {
	return &Cache{store: storeInstance, namespace: namespace, ttl: ttl, enabled: enabled}
}

func (c *Cache) Key(parts ...string) string {
	hash := sha256.Sum256([]byte(core.Join("\x00", parts...)))
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
	var output RecallOutput
	if result := core.JSONUnmarshalString(raw, &output); !result.OK {
		return RecallOutput{}, false
	}
	return output, true
}

func (c *Cache) Set(
	ctx context.Context,
	key string,
	output RecallOutput,
) error {
	_ = ctx
	if c == nil || c.store == nil || !c.enabled {
		return nil
	}
	if c.ttl <= 0 {
		return nil
	}
	return c.store.SetWithTTL(c.namespace, key, core.JSONMarshalString(output), c.ttl)
}

func (c *Cache) Clear(
	ctx context.Context,
) error {
	_ = ctx
	if c == nil || c.store == nil || !c.enabled {
		return nil
	}
	return c.store.DeleteGroup(c.namespace)
}
