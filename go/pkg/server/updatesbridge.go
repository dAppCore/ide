// SPDX-License-Identifier: EUPL-1.2

package server

import (
	core "dappco.re/go"
)

// updatesBridge — typed wails wrapper over MCPBridge updates_* +
// selfupdate_* tools (tool version tracking + core-ide self-update).
type updatesBridge struct {
	core *core.Core
}

type UpdateTool struct {
	Key           string `json:"key"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Installed     bool   `json:"installed"`
	LocalVersion  string `json:"local_version,omitempty"`
	LatestVersion string `json:"latest_version,omitempty"`
	LatestURL     string `json:"latest_url,omitempty"`
	UpToDate      bool   `json:"up_to_date"`
	GithubRepo    string `json:"github_repo,omitempty"`
	Error         string `json:"error,omitempty"`
}

type UpdatesRefreshInput struct {
	Key string `json:"key,omitempty"`
}

type UpdatesRefreshOutput struct {
	OK    bool         `json:"ok"`
	Tools []UpdateTool `json:"tools,omitempty"`
	Count int          `json:"count,omitempty"`
	Error string       `json:"error,omitempty"`
}

type SelfUpdateStatusOutput struct {
	OK              bool   `json:"ok"`
	CurrentVersion  string `json:"current_version,omitempty"`
	RepoURL         string `json:"repo_url,omitempty"`
	Channel         string `json:"channel,omitempty"`
	Platform        string `json:"platform,omitempty"`
	Configured      bool   `json:"configured"`
	Checked         bool   `json:"checked"`
	Owner           string `json:"owner,omitempty"`
	Repo            string `json:"repo,omitempty"`
	LatestVersion   string `json:"latest_version,omitempty"`
	ReleaseURL      string `json:"release_url,omitempty"`
	UpdateAvailable bool   `json:"update_available,omitempty"`
	StatusError     string `json:"status_error,omitempty"`
	CacheHit        bool   `json:"cache_hit,omitempty"`
	CacheAgeS       int    `json:"cache_age_s,omitempty"`
	Error           string `json:"error,omitempty"`
}

type SelfUpdateApplyOutput struct {
	OK              bool   `json:"ok"`
	UpdatedTo       string `json:"updated_to,omitempty"`
	DownloadURL     string `json:"download_url,omitempty"`
	RestartRequired bool   `json:"restart_required,omitempty"`
	Message         string `json:"message,omitempty"`
	Error           string `json:"error,omitempty"`
}

func (b *updatesBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func decodeUpdateTools(raw any) []UpdateTool {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]UpdateTool, 0, len(list))
	for _, item := range list {
		tm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		t := UpdateTool{}
		if s, ok := tm["key"].(string); ok {
			t.Key = s
		}
		if s, ok := tm["name"].(string); ok {
			t.Name = s
		}
		if s, ok := tm["description"].(string); ok {
			t.Description = s
		}
		if v, ok := tm["installed"].(bool); ok {
			t.Installed = v
		}
		if s, ok := tm["local_version"].(string); ok {
			t.LocalVersion = s
		}
		if s, ok := tm["latest_version"].(string); ok {
			t.LatestVersion = s
		}
		if s, ok := tm["latest_url"].(string); ok {
			t.LatestURL = s
		}
		if v, ok := tm["up_to_date"].(bool); ok {
			t.UpToDate = v
		}
		if s, ok := tm["github_repo"].(string); ok {
			t.GithubRepo = s
		}
		if s, ok := tm["error"].(string); ok {
			t.Error = s
		}
		out = append(out, t)
	}
	return out
}

func (b *updatesBridge) Refresh(input UpdatesRefreshInput) (UpdatesRefreshOutput, error) {
	m := b.mcp()
	if m == nil {
		return UpdatesRefreshOutput{}, core.E("ide.server.Updates.Refresh", "mcp bridge unavailable", nil)
	}
	params := map[string]any{}
	if input.Key != "" {
		params["key"] = input.Key
	}
	raw := m.toolUpdatesRefresh(nil, params)
	out := UpdatesRefreshOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value != nil {
		if n, ok := value["count"].(float64); ok {
			out.Count = int(n)
		}
		out.Tools = decodeUpdateTools(value["tools"])
	}
	return out, nil
}

func (b *updatesBridge) SelfUpdateStatus() (SelfUpdateStatusOutput, error) {
	m := b.mcp()
	if m == nil {
		return SelfUpdateStatusOutput{}, core.E("ide.server.Updates.SelfUpdateStatus", "mcp bridge unavailable", nil)
	}
	raw := m.toolSelfUpdateStatus(nil, map[string]any{})
	out := SelfUpdateStatusOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if s, ok := value["current_version"].(string); ok {
		out.CurrentVersion = s
	}
	if s, ok := value["repo_url"].(string); ok {
		out.RepoURL = s
	}
	if s, ok := value["channel"].(string); ok {
		out.Channel = s
	}
	if s, ok := value["platform"].(string); ok {
		out.Platform = s
	}
	if v, ok := value["configured"].(bool); ok {
		out.Configured = v
	}
	if v, ok := value["checked"].(bool); ok {
		out.Checked = v
	}
	if s, ok := value["owner"].(string); ok {
		out.Owner = s
	}
	if s, ok := value["repo"].(string); ok {
		out.Repo = s
	}
	if s, ok := value["latest_version"].(string); ok {
		out.LatestVersion = s
	}
	if s, ok := value["release_url"].(string); ok {
		out.ReleaseURL = s
	}
	if v, ok := value["update_available"].(bool); ok {
		out.UpdateAvailable = v
	}
	if s, ok := value["error"].(string); ok {
		out.StatusError = s
	}
	if v, ok := value["cache_hit"].(bool); ok {
		out.CacheHit = v
	}
	if n, ok := value["cache_age_s"].(float64); ok {
		out.CacheAgeS = int(n)
	}
	return out, nil
}

func (b *updatesBridge) SelfUpdateApply() (SelfUpdateApplyOutput, error) {
	m := b.mcp()
	if m == nil {
		return SelfUpdateApplyOutput{}, core.E("ide.server.Updates.SelfUpdateApply", "mcp bridge unavailable", nil)
	}
	raw := m.toolSelfUpdateApply(nil, map[string]any{})
	out := SelfUpdateApplyOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if s, ok := value["updated_to"].(string); ok {
		out.UpdatedTo = s
	}
	if s, ok := value["download_url"].(string); ok {
		out.DownloadURL = s
	}
	if v, ok := value["restart_required"].(bool); ok {
		out.RestartRequired = v
	}
	if s, ok := value["message"].(string); ok {
		out.Message = s
	}
	return out, nil
}
