package subagent

import (
	"context"
	cryptoRand "crypto/rand"
	"encoding/hex"
	"time"

	core "dappco.re/go/core"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

func (s *Subsystem) handleDispatchGuided(ctx context.Context, _ *mcp.CallToolRequest, input DispatchGuidedInput) (*mcp.CallToolResult, DispatchGuidedOutput, error) {
	out, err := s.DispatchGuided(ctx, input)
	return nil, out, err
}

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
	} else if err := validateRelayURL(relayURL); err != nil {
		return DispatchGuidedOutput{Success: false, Reason: err.Error()}, err
	}
	prompt := core.Sprintf("CORE_IDE_RELAY_URL=%s\nCORE_IDE_RELAY_TOKEN is injected by the launcher and must not be echoed.\nWORKSPACE_ID=%s\nDEFAULT_TEMPLATE=%s\nDEFAULT_AGENT=%s\n\nBefore each prompt cycle, read channel %s.\nWhen stuck, call subagent_ask and wait for an answer (up to %d seconds).\nEmit progress updates when non-trivial milestones complete.\n\nTask: %s", relayURL, workspaceID, template, agent, guideChannel(workspaceID), int(s.cfg.Timeouts.QuestionWaitDefault.Seconds()), core.Trim(input.Task))
	if s.hub == nil {
		return DispatchGuidedOutput{Success: true, Delivered: false, WorkspaceID: workspaceID, Agent: agent, Prompt: prompt, Reason: "no relay"}, nil
	}
	status := StatusMessage{Type: "status", State: "running", CreatedAt: time.Now().UTC()}
	statusChannel := statusChannel(workspaceID)
	s.appendEvent(workspaceID, Event{Type: status.Type, Channel: statusChannel, Message: status.State, CreatedAt: status.CreatedAt})
	s.publish(statusChannel, status)
	s.publish(guideChannel(workspaceID), GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: prompt, CreatedAt: time.Now().UTC()})
	return DispatchGuidedOutput{Success: true, Delivered: true, WorkspaceID: workspaceID, Agent: agent, Prompt: prompt}, nil
}

func newRandomID(prefix string) (string, error) {
	var raw [8]byte
	if _, err := cryptoRand.Read(raw[:]); err != nil {
		return "", core.E("ide.subagent.id", "generate id", err)
	}
	return core.Concat(prefix, "-", hex.EncodeToString(raw[:])), nil
}
