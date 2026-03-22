package main

import (
	"testing"

	"forge.lthn.ai/core/config"
	"github.com/stretchr/testify/assert"
)

func TestGuiEnabled_Good_NilConfig(t *testing.T) {
	// nil config should fall through to display detection.
	result := guiEnabled(nil)
	// On macOS/Windows this returns true; on Linux it depends on DISPLAY.
	// Just verify it doesn't panic.
	_ = result
}

func TestGuiEnabled_Good_WithConfig(t *testing.T) {
	cfg, _ := config.New()
	// Fresh config has no gui.enabled key — should fall through to OS detection.
	result := guiEnabled(cfg)
	_ = result
}

func TestStaticAssetGroup_Good(t *testing.T) {
	s := &staticAssetGroup{
		name:     "test-assets",
		basePath: "/assets/test",
		dir:      "/tmp",
	}
	assert.Equal(t, "test-assets", s.Name())
	assert.Equal(t, "/assets/test", s.BasePath())
}
