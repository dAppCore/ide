package subagent

import (
	"context"
	cryptoRand "crypto/rand"
	"encoding/hex"
	"os"
	"sync"
	"time"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	mcpagentic "dappco.re/go/mcp/pkg/mcp/agentic"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/ide/pkg/config"
)

var relayEnvMu sync.Mutex

func (s *Subsystem) handleDispatchGuided(ctx context.Context, _ *mcp.CallToolRequest, input DispatchGuidedInput) (*mcp.CallToolResult, DispatchGuidedOutput, error) {
	out, err := s.DispatchGuided(ctx, input)
	return nil, out, err
}

// out, err := s.DispatchGuided(ctx, DispatchGuidedInput{Repo: "core/ide", Task: "Implement the missing feature"})
func (s *Subsystem) DispatchGuided(ctx context.Context, input DispatchGuidedInput) (DispatchGuidedOutput, error) {
	_ = ctx
	if !config.BoolValue(s.cfg.Enabled, true) {
		return DispatchGuidedOutput{Success: false, Reason: "subagent is disabled"}, nil
	}
	if core.Trim(input.Repo) == "" {
		return DispatchGuidedOutput{Success: false, Reason: "repo is required"}, core.E("ide.subagent.dispatch_guided", "repo is required", nil)
	}
	if core.Trim(input.Task) == "" {
		return DispatchGuidedOutput{Success: false, Reason: "task is required"}, core.E("ide.subagent.dispatch_guided", "task is required", nil)
	}
	agent := core.Trim(input.Agent)
	if agent == "" {
		agent = s.cfg.Dispatch.DefaultAgent
	}
	template := core.Trim(input.Template)
	if template == "" {
		template = s.cfg.Dispatch.DefaultTemplate
	}
	workspaceID, err := normalizeWorkspaceID(input.WorkspaceID)
	if err != nil {
		return DispatchGuidedOutput{Success: false, Reason: err.Error()}, err
	}
	if workspaceID == "" {
		workspaceID, err = newWorkspaceID()
		if err != nil {
			return DispatchGuidedOutput{Success: false, Reason: "workspace id generation failed"}, err
		}
	}
	relayURL := core.Trim(input.RelayURL)
	if relayURL == "" {
		relayURL = s.cfg.Relay.URL()
	}
	relayURL, err = canonicalRelayURL(relayURL)
	if err != nil {
		return DispatchGuidedOutput{Success: false, Reason: err.Error()}, err
	}
	relayToken := core.Trim(input.RelayToken)
	if relayToken == "" {
		relayToken = s.relayToken
	}
	prompt := core.Sprintf("Relay URL: %s\nWorkspace ID: %s\nDefault Template: %s\nDefault Agent: %s\n\nBefore each prompt cycle, read channel %s.\nWhen stuck, call subagent_ask and wait for an answer (up to %d seconds).\nEmit progress updates when non-trivial milestones complete.\n\nTask: %s", relayURL, workspaceID, template, agent, guideChannel(workspaceID), int(s.cfg.Timeouts.QuestionWaitDefault.Seconds()), core.Trim(input.Task))
	if s.hub == nil || core.Trim(relayURL) == "" || core.Trim(relayToken) == "" {
		return DispatchGuidedOutput{Success: true, Delivered: false, WorkspaceID: workspaceID, Agent: agent, Prompt: prompt, Reason: "no relay"}, nil
	}
	status := StatusMessage{Type: "status", State: "running", CreatedAt: time.Now().UTC()}
	runningChannel := statusChannel(workspaceID)
	s.appendEvent(workspaceID, Event{Type: status.Type, Channel: runningChannel, Message: status.State, CreatedAt: status.CreatedAt})
	s.publish(runningChannel, status)
	s.publish(guideChannel(workspaceID), GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: prompt, CreatedAt: time.Now().UTC()})
	dispatchResult, err := dispatchViaAgentic(ctx, input, agent, template, workspaceID, relayURL, relayToken, prompt)
	if err != nil {
		failed := StatusMessage{Type: "status", State: "failed", Detail: err.Error(), CreatedAt: time.Now().UTC()}
		s.appendEvent(workspaceID, Event{Type: failed.Type, Channel: runningChannel, Message: failed.State, CreatedAt: failed.CreatedAt})
		s.publish(runningChannel, failed)
		return DispatchGuidedOutput{Success: false, Delivered: false, WorkspaceID: workspaceID, Agent: agent, Prompt: prompt, Reason: err.Error()}, err
	}
	s.bindAgenticWorkspace(workspaceID, core.PathBase(dispatchResult.WorkspaceDir))
	return DispatchGuidedOutput{Success: dispatchResult.Success, Delivered: true, WorkspaceID: workspaceID, Agent: dispatchResult.Agent, Prompt: prompt}, nil
}

func newRandomID(prefix string) (string, error) {
	var raw [8]byte
	if _, err := cryptoRand.Read(raw[:]); err != nil {
		return "", core.E("ide.subagent.id", "generate id", err)
	}
	return core.Concat(prefix, "-", hex.EncodeToString(raw[:])), nil
}

func dispatchViaAgentic(ctx context.Context, input DispatchGuidedInput, agent, template, workspaceID, relayURL, relayToken, prompt string) (mcpagentic.DispatchOutput, error) {
	service, err := coremcp.New(coremcp.Options{Unrestricted: true})
	if err != nil {
		return mcpagentic.DispatchOutput{}, core.E("ide.subagent.dispatch_guided", "create agentic mcp service", err)
	}
	prep := mcpagentic.NewPrep()
	prep.RegisterTools(service)
	var handler coremcp.RESTHandler
	for _, tool := range service.Tools() {
		if tool.Name != "agentic_dispatch" {
			continue
		}
		handler = tool.RESTHandler
		break
	}
	if handler == nil {
		return mcpagentic.DispatchOutput{}, core.E("ide.subagent.dispatch_guided", "agentic dispatch handler unavailable", nil)
	}
	dispatchInput := mcpagentic.DispatchInput{
		Repo:     input.Repo,
		Task:     core.Sprintf("%s\n\nGuided relay context:\n%s", core.Trim(input.Task), prompt),
		Agent:    agent,
		Template: template,
		Persona:  input.Persona,
	}
	relayEnvMu.Lock()
	restoreEnv := withDispatchEnv(map[string]string{
		"CORE_IDE_RELAY_URL":   relayURL,
		"CORE_IDE_RELAY_TOKEN": relayToken,
		"WORKSPACE_ID":         workspaceID,
	})
	defer func() {
		restoreEnv()
		relayEnvMu.Unlock()
	}()
	result, err := handler(ctx, []byte(core.JSONMarshalString(dispatchInput)))
	if err != nil {
		return mcpagentic.DispatchOutput{}, core.E("ide.subagent.dispatch_guided", "dispatch agentic subagent", err)
	}
	output, ok := result.(mcpagentic.DispatchOutput)
	if !ok {
		return mcpagentic.DispatchOutput{}, core.E("ide.subagent.dispatch_guided", "unexpected agentic dispatch output", nil)
	}
	return output, nil
}

func withDispatchEnv(values map[string]string) func() {
	previous := make(map[string]*string, len(values))
	for key, value := range values {
		current, ok := os.LookupEnv(key)
		if ok {
			currentValue := current
			previous[key] = &currentValue
		} else {
			previous[key] = nil
		}
		_ = os.Setenv(key, value)
	}
	return func() {
		for key, value := range previous {
			if value == nil {
				_ = os.Unsetenv(key)
				continue
			}
			_ = os.Setenv(key, *value)
		}
	}
}
