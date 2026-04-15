package config

import (
	"os"

	core "dappco.re/go/core"
)

// paths := resolveIDEConfigPaths("")
// core.Println(paths) // [~/.core/ide.yaml ./ .core/ide.yaml]
func DefaultPaths(configPath string) []string {
	return resolveIDEConfigPaths(configPath)
}

func resolveIDEConfigPaths(configPath string) []string {
	if core.Trim(configPath) != "" {
		return []string{configPath}
	}
	paths := make([]string, 0, 2)
	if home := homeDir(); home != "" {
		paths = append(paths, core.JoinPath(home, ".core", "ide.yaml"))
	}
	if cwd, err := os.Getwd(); err == nil && core.Trim(cwd) != "" {
		paths = append(paths, core.JoinPath(cwd, ".core", "ide.yaml"))
	}
	return paths
}
