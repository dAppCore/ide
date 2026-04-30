package workspace

import (
	"io"
	"io/fs"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
)

type configmedium struct {
	medium coreio.Medium
}

func workspaceConfigMedium(medium coreio.Medium) configmedium {
	return configmedium{medium: medium}
}

func (m configmedium) Exists(path string) bool {
	return m.medium != nil && m.medium.Exists(path)
}

func (m configmedium) Read(path string) (string, error) {
	if m.medium == nil {
		return "", core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Read(path)
}

func (m configmedium) WriteMode(path, content string, mode fs.FileMode) error {
	if m.medium == nil {
		return core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.WriteMode(path, content, mode)
}

func (m configmedium) Write(path, content string) error {
	if m.medium == nil {
		return core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Write(path, content)
}

func (m configmedium) Append(path string) (io.WriteCloser, error) {
	if m.medium == nil {
		return nil, core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Append(path)
}

func (m configmedium) EnsureDir(path string) error {
	if m.medium == nil {
		return core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.EnsureDir(path)
}

func (m configmedium) IsFile(path string) bool {
	return m.medium != nil && m.medium.IsFile(path)
}

func (m configmedium) Delete(path string) error {
	if m.medium == nil {
		return core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Delete(path)
}

func (m configmedium) DeleteAll(path string) error {
	if m.medium == nil {
		return core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.DeleteAll(path)
}

func (m configmedium) Rename(oldPath, newPath string) error {
	if m.medium == nil {
		return core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Rename(oldPath, newPath)
}

func (m configmedium) List(path string) ([]fs.DirEntry, error) {
	if m.medium == nil {
		return nil, core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.List(path)
}

func (m configmedium) Stat(path string) (fs.FileInfo, error) {
	if m.medium == nil {
		return nil, core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Stat(path)
}

func (m configmedium) Open(path string) (fs.File, error) {
	if m.medium == nil {
		return nil, core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Open(path)
}

func (m configmedium) Create(path string) (io.WriteCloser, error) {
	if m.medium == nil {
		return nil, core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.Create(path)
}

func (m configmedium) ReadStream(path string) (io.ReadCloser, error) {
	if m.medium == nil {
		return nil, core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.ReadStream(path)
}

func (m configmedium) WriteStream(path string) (io.WriteCloser, error) {
	if m.medium == nil {
		return nil, core.E("ide.workspace.config_medium", "storage medium is nil", nil)
	}
	return m.medium.WriteStream(path)
}

func (m configmedium) IsDir(path string) bool {
	return m.medium != nil && m.medium.IsDir(path)
}
