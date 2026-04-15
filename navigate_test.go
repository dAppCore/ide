package main

import (
	"testing"

	"forge.lthn.ai/core/go/pkg/core"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNavigateSubsystem_CoreNavigate_Good_SettingsRoute(t *testing.T) {
	c, err := core.New()
	require.NoError(t, err)
	c.RegisterQuery(func(_ *core.Core, q core.Query) (any, bool, error) {
		if q == "config.dump" {
			return map[string]any{
				"config": map[string]any{
					"ide": map[string]any{
						"chat": "enabled",
					},
				},
			}, true, nil
		}
		return nil, false, nil
	})

	sub := NewNavigateSubsystem(c)
	_, out, err := sub.coreNavigate(nil, nil, NavigateInput{Route: "core://settings"})
	require.NoError(t, err)
	assert.True(t, out.Available)
	assert.NotNil(t, out.Data)
	assert.Contains(t, out.Sources, "config.dump")
}

func TestNavigateSubsystem_CoreNavigate_Bad_EmptyRoute(t *testing.T) {
	sub := NewNavigateSubsystem(nil)
	_, out, err := sub.coreNavigate(nil, nil, NavigateInput{})
	require.NoError(t, err)
	assert.False(t, out.Available)
	assert.Equal(t, "route is required", out.Reason)
}

func TestNavigateSubsystem_CoreNavigate_Ugly_UnknownRoute(t *testing.T) {
	sub := NewNavigateSubsystem(nil)
	_, out, err := sub.coreNavigate(nil, nil, NavigateInput{Route: "core://unknown"})
	require.NoError(t, err)
	assert.False(t, out.Available)
	assert.Contains(t, out.Reason, "unknown route")
}
