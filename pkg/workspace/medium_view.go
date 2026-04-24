package workspace

import (
	goio "io"
	"io/fs"

	core "dappco.re/go/core"
	coreio "dappco.re/go/io"
)

type rootedMedium struct {
	medium coreio.Medium
	root   string
	bound  bool
}

var _ coreio.Medium = (*rootedMedium)(nil)

func (m *rootedMedium) translate(path string) (string, error) {
	if m == nil || m.medium == nil || !m.bound {
		return path, nil
	}
	path = core.CleanPath(core.Trim(path), core.Env("DS"))
	root := core.CleanPath(core.Trim(m.root), core.Env("DS"))
	if root == "" {
		return path, nil
	}
	if path == root {
		return "", nil
	}
	sep := core.Env("DS")
	prefix := root
	if !core.HasSuffix(prefix, sep) {
		prefix += sep
	}
	if core.HasPrefix(path, prefix) {
		return core.TrimPrefix(path, prefix), nil
	}
	if !core.PathIsAbs(path) {
		return path, nil
	}
	return "", core.E("workspace.medium", core.Concat("path ", path, " is outside allowed workspace root ", root), nil)
}

func (m *rootedMedium) Read(path string) (string, error) {
	translated, err := m.translate(path)
	if err != nil {
		return "", err
	}
	return m.medium.Read(translated)
}

func (m *rootedMedium) Write(path, content string) error {
	translated, err := m.translate(path)
	if err != nil {
		return err
	}
	return m.medium.Write(translated, content)
}

func (m *rootedMedium) WriteMode(path, content string, mode fs.FileMode) error {
	translated, err := m.translate(path)
	if err != nil {
		return err
	}
	return m.medium.WriteMode(translated, content, mode)
}

func (m *rootedMedium) EnsureDir(path string) error {
	translated, err := m.translate(path)
	if err != nil {
		return err
	}
	return m.medium.EnsureDir(translated)
}

func (m *rootedMedium) IsFile(path string) bool {
	translated, err := m.translate(path)
	if err != nil {
		return false
	}
	return m.medium.IsFile(translated)
}

func (m *rootedMedium) Delete(path string) error {
	translated, err := m.translate(path)
	if err != nil {
		return err
	}
	return m.medium.Delete(translated)
}

func (m *rootedMedium) DeleteAll(path string) error {
	translated, err := m.translate(path)
	if err != nil {
		return err
	}
	return m.medium.DeleteAll(translated)
}

func (m *rootedMedium) Rename(oldPath, newPath string) error {
	translatedOld, err := m.translate(oldPath)
	if err != nil {
		return err
	}
	translatedNew, err := m.translate(newPath)
	if err != nil {
		return err
	}
	return m.medium.Rename(translatedOld, translatedNew)
}

func (m *rootedMedium) List(path string) ([]fs.DirEntry, error) {
	translated, err := m.translate(path)
	if err != nil {
		return nil, err
	}
	return m.medium.List(translated)
}

func (m *rootedMedium) Stat(path string) (fs.FileInfo, error) {
	translated, err := m.translate(path)
	if err != nil {
		return nil, err
	}
	return m.medium.Stat(translated)
}

func (m *rootedMedium) Open(path string) (fs.File, error) {
	translated, err := m.translate(path)
	if err != nil {
		return nil, err
	}
	return m.medium.Open(translated)
}

func (m *rootedMedium) Create(path string) (goio.WriteCloser, error) {
	translated, err := m.translate(path)
	if err != nil {
		return nil, err
	}
	return m.medium.Create(translated)
}

func (m *rootedMedium) Append(path string) (goio.WriteCloser, error) {
	translated, err := m.translate(path)
	if err != nil {
		return nil, err
	}
	return m.medium.Append(translated)
}

func (m *rootedMedium) ReadStream(path string) (goio.ReadCloser, error) {
	translated, err := m.translate(path)
	if err != nil {
		return nil, err
	}
	return m.medium.ReadStream(translated)
}

func (m *rootedMedium) WriteStream(path string) (goio.WriteCloser, error) {
	translated, err := m.translate(path)
	if err != nil {
		return nil, err
	}
	return m.medium.WriteStream(translated)
}

func (m *rootedMedium) Exists(path string) bool {
	translated, err := m.translate(path)
	if err != nil {
		return false
	}
	return m.medium.Exists(translated)
}

func (m *rootedMedium) IsDir(path string) bool {
	translated, err := m.translate(path)
	if err != nil {
		return false
	}
	return m.medium.IsDir(translated)
}
