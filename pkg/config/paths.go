package config

import core "dappco.re/go"

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
	if cwd := core.Getwd(); cwd.OK && core.Trim(cwd.Value.(string)) != "" {
		paths = append(paths, core.JoinPath(cwd.Value.(string), ".core", "ide.yaml"))
	}
	return paths
}
