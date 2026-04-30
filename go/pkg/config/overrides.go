package config

import core "dappco.re/go"

func (cfg IDEConfig) Merge(override IDEConfig) IDEConfig {
	if override.Ide.Transport.Mode != "" || override.Ide.Transport.HTTPAddr != "" || override.Ide.Transport.TCPAddr != "" || override.Ide.Transport.UnixSocket != "" || override.Ide.Transport.Token != "" {
		if override.Ide.Transport.Mode != "" {
			cfg.Ide.Transport.Mode = override.Ide.Transport.Mode
		}
		if override.Ide.Transport.HTTPAddr != "" {
			cfg.Ide.Transport.HTTPAddr = override.Ide.Transport.HTTPAddr
		}
		if override.Ide.Transport.TCPAddr != "" {
			cfg.Ide.Transport.TCPAddr = override.Ide.Transport.TCPAddr
		}
		if override.Ide.Transport.UnixSocket != "" {
			cfg.Ide.Transport.UnixSocket = override.Ide.Transport.UnixSocket
		}
		if override.Ide.Transport.Token != "" {
			cfg.Ide.Transport.Token = override.Ide.Transport.Token
		}
	}
	if override.Ide.Brain.Endpoint != "" {
		cfg.Ide.Brain.Endpoint = override.Ide.Brain.Endpoint
	}
	if override.Ide.Brain.Key != "" {
		cfg.Ide.Brain.Key = override.Ide.Brain.Key
	}
	if override.Ide.Brain.AgentID != "" {
		cfg.Ide.Brain.AgentID = override.Ide.Brain.AgentID
	}
	if override.Ide.Brain.Cache.Enabled != nil {
		cfg.Ide.Brain.Cache.Enabled = override.Ide.Brain.Cache.Enabled
	}
	if override.Ide.Brain.Cache.TTL != 0 {
		cfg.Ide.Brain.Cache.TTL = override.Ide.Brain.Cache.TTL
	}
	if override.Ide.Brain.Cache.Namespace != "" {
		cfg.Ide.Brain.Cache.Namespace = override.Ide.Brain.Cache.Namespace
	}
	if override.Ide.Brain.HTTP.Timeout != 0 {
		cfg.Ide.Brain.HTTP.Timeout = override.Ide.Brain.HTTP.Timeout
	}
	if override.Ide.Brain.HTTP.Retry.Attempts != 0 {
		cfg.Ide.Brain.HTTP.Retry.Attempts = override.Ide.Brain.HTTP.Retry.Attempts
	}
	if override.Ide.Brain.HTTP.Retry.Backoff != 0 {
		cfg.Ide.Brain.HTTP.Retry.Backoff = override.Ide.Brain.HTTP.Retry.Backoff
	}
	if override.Ide.Brain.HTTP.Retry.MaxBackoff != 0 {
		cfg.Ide.Brain.HTTP.Retry.MaxBackoff = override.Ide.Brain.HTTP.Retry.MaxBackoff
	}
	if override.Ide.Brain.HTTP.CircuitBreaker.Enabled != nil {
		cfg.Ide.Brain.HTTP.CircuitBreaker.Enabled = override.Ide.Brain.HTTP.CircuitBreaker.Enabled
	}
	if override.Ide.Brain.HTTP.CircuitBreaker.FailureThreshold != 0 {
		cfg.Ide.Brain.HTTP.CircuitBreaker.FailureThreshold = override.Ide.Brain.HTTP.CircuitBreaker.FailureThreshold
	}
	if override.Ide.Brain.HTTP.CircuitBreaker.Cooldown != 0 {
		cfg.Ide.Brain.HTTP.CircuitBreaker.Cooldown = override.Ide.Brain.HTTP.CircuitBreaker.Cooldown
	}
	if override.Ide.Workspace.Root != "" {
		cfg.Ide.Workspace.Root = override.Ide.Workspace.Root
	}
	if override.Ide.Workspace.ScanDepth != 0 {
		cfg.Ide.Workspace.ScanDepth = override.Ide.Workspace.ScanDepth
	}
	if len(override.Ide.Workspace.Ignore) != 0 {
		cfg.Ide.Workspace.Ignore = append([]string{}, override.Ide.Workspace.Ignore...)
	}
	if len(override.Ide.Workspace.ConventionPacks) != 0 {
		cfg.Ide.Workspace.ConventionPacks = append([]string{}, override.Ide.Workspace.ConventionPacks...)
	}
	if override.Ide.Subagent.Enabled != nil {
		cfg.Ide.Subagent.Enabled = override.Ide.Subagent.Enabled
	}
	if override.Ide.Subagent.Relay.Addr != "" {
		cfg.Ide.Subagent.Relay.Addr = override.Ide.Subagent.Relay.Addr
	}
	if override.Ide.Subagent.Relay.Path != "" {
		cfg.Ide.Subagent.Relay.Path = override.Ide.Subagent.Relay.Path
	}
	if override.Ide.Subagent.Dispatch.DefaultAgent != "" {
		cfg.Ide.Subagent.Dispatch.DefaultAgent = override.Ide.Subagent.Dispatch.DefaultAgent
	}
	if override.Ide.Subagent.Dispatch.DefaultTemplate != "" {
		cfg.Ide.Subagent.Dispatch.DefaultTemplate = override.Ide.Subagent.Dispatch.DefaultTemplate
	}
	if override.Ide.Subagent.Timeouts.GuideAck != 0 {
		cfg.Ide.Subagent.Timeouts.GuideAck = override.Ide.Subagent.Timeouts.GuideAck
	}
	if override.Ide.Subagent.Timeouts.QuestionWaitDefault != 0 {
		cfg.Ide.Subagent.Timeouts.QuestionWaitDefault = override.Ide.Subagent.Timeouts.QuestionWaitDefault
	}
	if len(override.Ide.Navigate.Routes) != 0 {
		cfg.Ide.Navigate.Routes = append([]string{}, override.Ide.Navigate.Routes...)
	}
	if override.Ide.Marketplace.Endpoint != "" {
		cfg.Ide.Marketplace.Endpoint = override.Ide.Marketplace.Endpoint
	}
	if override.Ide.Marketplace.APIPath != "" {
		cfg.Ide.Marketplace.APIPath = override.Ide.Marketplace.APIPath
	}
	if override.Ide.Marketplace.InstallVia != "" {
		cfg.Ide.Marketplace.InstallVia = override.Ide.Marketplace.InstallVia
	}
	if override.Ide.Chat.Enabled != nil {
		cfg.Ide.Chat.Enabled = override.Ide.Chat.Enabled
	}
	if override.Ide.Chat.APIURL != "" {
		cfg.Ide.Chat.APIURL = override.Ide.Chat.APIURL
	}
	if override.Ide.Chat.StorePath != "" {
		cfg.Ide.Chat.StorePath = override.Ide.Chat.StorePath
	}
	if override.Ide.Chat.ToolExecutor != "" {
		cfg.Ide.Chat.ToolExecutor = override.Ide.Chat.ToolExecutor
	}
	return cfg
}

func (cfg IDEConfig) ApplyFlags(overrides CLIOverrides) IDEConfig {
	ApplyCLIOverrides(&cfg, overrides)
	return cfg
}

func ApplyCLIOverrides(cfg *IDEConfig, overrides CLIOverrides) {
	if cfg == nil {
		return
	}
	if core.Trim(overrides.TransportMode) != "" {
		cfg.Ide.Transport.Mode = core.Trim(overrides.TransportMode)
	}
	if core.Trim(overrides.HTTPAddr) != "" {
		cfg.Ide.Transport.HTTPAddr = core.Trim(overrides.HTTPAddr)
	}
	if core.Trim(overrides.TCPAddr) != "" {
		cfg.Ide.Transport.TCPAddr = core.Trim(overrides.TCPAddr)
	}
	if core.Trim(overrides.UnixSocket) != "" {
		cfg.Ide.Transport.UnixSocket = core.Trim(overrides.UnixSocket)
	}
	if core.Trim(overrides.Token) != "" {
		cfg.Ide.Transport.Token = core.Trim(overrides.Token)
	}
	if core.Trim(overrides.BrainEndpoint) != "" {
		cfg.Ide.Brain.Endpoint = core.Trim(overrides.BrainEndpoint)
	}
	if core.Trim(overrides.BrainKey) != "" {
		cfg.Ide.Brain.Key = core.Trim(overrides.BrainKey)
	}
	if core.Trim(overrides.BrainAgentID) != "" {
		cfg.Ide.Brain.AgentID = core.Trim(overrides.BrainAgentID)
	}
}

func ApplyEnv(cfg *IDEConfig) {
	if cfg == nil {
		return
	}
	if value := core.Trim(core.Env("CORE_BRAIN_URL")); value != "" {
		cfg.Ide.Brain.Endpoint = value
	}
	if value := core.Trim(core.Env("CORE_BRAIN_KEY")); value != "" {
		cfg.Ide.Brain.Key = value
	}
	if value := core.Trim(core.Env("CORE_BRAIN_AGENT_ID")); value != "" {
		cfg.Ide.Brain.AgentID = value
	}
	switch {
	case core.Trim(core.Env("MCP_HTTP_ADDR")) != "":
		cfg.Ide.Transport.Mode = "http"
		cfg.Ide.Transport.HTTPAddr = core.Trim(core.Env("MCP_HTTP_ADDR"))
	case core.Trim(core.Env("MCP_ADDR")) != "":
		cfg.Ide.Transport.Mode = "tcp"
		cfg.Ide.Transport.TCPAddr = core.Trim(core.Env("MCP_ADDR"))
	case core.Trim(core.Env("MCP_UNIX_SOCKET")) != "":
		cfg.Ide.Transport.Mode = "unix"
		cfg.Ide.Transport.UnixSocket = core.Trim(core.Env("MCP_UNIX_SOCKET"))
	}
	if value := core.Trim(core.Env("CORE_IDE_TOKEN")); value != "" {
		cfg.Ide.Transport.Token = value
	}
}
