package config

import (
	"os"

	core "dappco.re/go/core"
)

func DefaultPaths(configPath string) []string {
	paths := make([]string, 0, 2)
	if core.Trim(configPath) != "" {
		return []string{configPath}
	}
	home := homeDir()
	if home != "" {
		paths = append(paths, core.JoinPath(home, ".core", "ide.yaml"))
	}
	cwd, err := os.Getwd()
	if err == nil && cwd != "" {
		paths = append(paths, core.JoinPath(cwd, ".core", "ide.yaml"))
	}
	return paths
}
