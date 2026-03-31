package main

import (
	"os"
	"runtime"

	"forge.lthn.ai/core/config"
)

// guiEnabled checks whether the GUI should start.
// Returns false if config says gui.enabled: false, or if no display is available.
func guiEnabled(cfg *config.Config) bool {
	if cfg != nil {
		var guiCfg struct {
			Enabled *bool `mapstructure:"enabled"`
		}
		if err := cfg.Get("gui", &guiCfg); err == nil && guiCfg.Enabled != nil {
			return *guiCfg.Enabled
		}
	}
	// Fall back to display detection.
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		return true
	}
	return os.Getenv("DISPLAY") != "" || os.Getenv("WAYLAND_DISPLAY") != ""
}
