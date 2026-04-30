package chat

import core "dappco.re/go"

func coreResultError(result core.Result, fallback string) error {
	if result.OK {
		return nil
	}
	if err, ok := result.Value.(error); ok {
		return err
	}
	if text := core.Trim(result.Error()); text != "" {
		return core.NewError(text)
	}
	return core.NewError(fallback)
}

func coreReadFile(path string) ([]byte, error) {
	result := core.ReadFile(path)
	if !result.OK {
		return nil, coreResultError(result, "failed to read file")
	}
	return result.Value.([]byte), nil
}

func coreWriteFile(path string, data []byte, mode core.FileMode) error {
	return coreResultError(core.WriteFile(path, data, mode), "failed to write file")
}

func coreWriteMode(path, content string, mode core.FileMode) error {
	return coreWriteFile(path, []byte(content), mode)
}

func coreEnsureDir(path string) error {
	return coreResultError(core.MkdirAll(path, 0o755), "failed to create directory")
}

func coreMkdirTemp(dir, pattern string) (string, error) {
	result := core.MkdirTemp(dir, pattern)
	if !result.OK {
		return "", coreResultError(result, "failed to create temporary directory")
	}
	return result.Value.(string), nil
}

func coreRemoveAll(path string) error {
	return coreResultError(core.RemoveAll(path), "failed to remove path")
}

func equalFold(left, right string) bool {
	return core.Lower(left) == core.Lower(right)
}

func trimRight(value, cutset string) string {
	for value != "" {
		trimmed := false
		for _, char := range cutset {
			part := string(char)
			if core.HasSuffix(value, part) {
				value = core.TrimSuffix(value, part)
				trimmed = true
			}
		}
		if !trimmed {
			return value
		}
	}
	return value
}
