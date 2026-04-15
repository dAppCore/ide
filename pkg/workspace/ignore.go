package workspace

import core "dappco.re/go/core"

func shouldIgnorePath(root, path string, ignores []string) bool {
	if len(ignores) == 0 {
		return false
	}
	relative := relativeWorkspacePath(root, path)
	if relative == "" {
		relative = core.Trim(path)
	}
	relative = normalizeIgnorePath(relative)
	for _, pattern := range ignores {
		if matchIgnorePattern(relative, pattern) {
			return true
		}
	}
	return false
}

func relativeWorkspacePath(root, path string) string {
	root = normalizeIgnorePath(root)
	path = normalizeIgnorePath(path)
	if root == "" || path == "" {
		return path
	}
	if path == root {
		return ""
	}
	if !core.HasPrefix(path, root) {
		return path
	}
	trimmed := core.TrimPrefix(path, root)
	trimmed = core.TrimPrefix(trimmed, "/")
	return trimmed
}

func normalizeIgnorePath(value string) string {
	value = core.Trim(value)
	if value == "" {
		return ""
	}
	return core.CleanPath(value, "/")
}

func matchIgnorePattern(path, pattern string) bool {
	path = normalizeIgnorePath(path)
	pattern = normalizeIgnorePath(pattern)
	if path == "" || pattern == "" {
		return false
	}
	if pattern == "*" {
		return true
	}
	if core.HasSuffix(pattern, "/") {
		pattern = core.TrimSuffix(pattern, "/")
		if path == pattern || core.HasPrefix(path, core.Concat(pattern, "/")) {
			return true
		}
	}
	if !core.Contains(pattern, "*") {
		return path == pattern || core.HasPrefix(path, core.Concat(pattern, "/"))
	}
	return matchGlob(pattern, path)
}

func matchGlob(pattern, name string) bool {
	if pattern == "" {
		return false
	}
	if pattern == "*" {
		return true
	}
	parts := core.Split(pattern, "*")
	pos := 0
	for i, part := range parts {
		if part == "" {
			continue
		}
		remaining := name[pos:]
		idx := -1
		for j := 0; j <= len(remaining)-len(part); j++ {
			if remaining[j:j+len(part)] == part {
				idx = j
				break
			}
		}
		if idx == -1 {
			return false
		}
		if i == 0 && !core.HasPrefix(pattern, "*") && idx != 0 {
			return false
		}
		pos += idx + len(part)
	}
	if !core.HasSuffix(pattern, "*") && pos != len(name) {
		return false
	}
	return true
}
