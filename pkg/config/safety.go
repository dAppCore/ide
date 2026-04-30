package config

import core "dappco.re/go"

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

func safeLocalConfigPath(
	path string,
) (bool, error) {
	cleanPath := core.CleanPath(core.Trim(path), string(core.PathSeparator))
	absResult := core.PathAbs(cleanPath)
	if !absResult.OK {
		err, _ := absResult.Value.(error)
		return false, core.E("ide.config.Load", core.Concat("refuse config path: ", path), err)
	}
	absPath := absResult.Value.(string)
	lstat := core.Lstat(absPath)
	if !lstat.OK {
		err, _ := lstat.Value.(error)
		if core.IsNotExist(err) {
			return true, nil
		}
		return false, core.E("ide.config.Load", core.Concat("refuse config path: ", absPath), err)
	}
	resolved := core.PathEvalSymlinks(absPath)
	if !resolved.OK {
		return false, nil
	}
	resolvedPath := core.CleanPath(resolved.Value.(string), string(core.PathSeparator))
	if resolvedPath != absPath {
		return false, nil
	}
	for parent := core.PathDir(absPath); parent != "." && parent != ""; parent = core.PathDir(parent) {
		resolvedParentResult := core.PathEvalSymlinks(parent)
		if !resolvedParentResult.OK {
			return false, nil
		}
		resolvedParent := core.CleanPath(resolvedParentResult.Value.(string), string(core.PathSeparator))
		if resolvedParent != parent {
			return false, nil
		}
		next := core.PathDir(parent)
		if next == parent {
			break
		}
	}
	return true, nil
}
