package config

import (
	"os"
	"path/filepath" // AX-6-exception: Abs/Clean/EvalSymlinks/Dir are canonical filesystem-safety primitives without Core equivalents.

	core "dappco.re/go/core"
)

func BoolPtr(value bool) *bool {
	return &value
}

func BoolValue(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func homeDir() string {
	home := core.Env("DIR_HOME")
	if home != "" {
		return home
	}
	if home = core.Env("HOME"); home != "" {
		return home
	}
	return "."
}

func safeLocalConfigPath(path string) (bool, error) {
	absPath, err := filepath.Abs(filepath.Clean(core.Trim(path)))
	if err != nil {
		return false, core.E("ide.config.Load", core.Concat("refuse config path: ", path), err)
	}
	if _, err := os.Lstat(absPath); err != nil {
		if core.Is(err, os.ErrNotExist) {
			return true, nil
		}
		return false, core.E("ide.config.Load", core.Concat("refuse config path: ", absPath), err)
	}
	resolvedPath, err := filepath.EvalSymlinks(absPath)
	if err != nil {
		return false, nil
	}
	resolvedPath = filepath.Clean(resolvedPath)
	if resolvedPath != absPath {
		return false, nil
	}
	for parent := filepath.Dir(absPath); parent != "." && parent != ""; parent = filepath.Dir(parent) {
		resolvedParent, err := filepath.EvalSymlinks(parent)
		if err != nil {
			return false, nil
		}
		resolvedParent = filepath.Clean(resolvedParent)
		if resolvedParent != parent {
			return false, nil
		}
		next := filepath.Dir(parent)
		if next == parent {
			break
		}
	}
	return true, nil
}
