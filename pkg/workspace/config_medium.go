package workspace

import (
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

func (m configmedium) Read(path string) core.Result {
	if m.medium == nil {
		return core.Fail(core.E("ide.workspace.config_medium", "storage medium is nil", nil))
	}
	content, err := m.medium.Read(path)
	return core.ResultOf(content, err)
}

func (m configmedium) Write(path, content string) core.Result {
	if m.medium == nil {
		return core.Fail(core.E("ide.workspace.config_medium", "storage medium is nil", nil))
	}
	return core.ResultOf(nil, m.medium.Write(path, content))
}

func (m configmedium) EnsureDir(path string) core.Result {
	if m.medium == nil {
		return core.Fail(core.E("ide.workspace.config_medium", "storage medium is nil", nil))
	}
	return core.ResultOf(nil, m.medium.EnsureDir(path))
}
