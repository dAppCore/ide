package subagent

import (
	"context"
	"time"

	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	storelib "dappco.re/go/store"

	"dappco.re/go/ide/pkg/config"
)

func TestAX7_New_Good(t *core.T) {
	subsystem := New(config.Subagent{}, nil, " token ")
	core.AssertEqual(t, "token", subsystem.relayToken)
	core.AssertNotNil(t, subsystem.events)
}

func TestAX7_New_Bad(t *core.T) {
	disabled := false
	subsystem := New(config.Subagent{Enabled: &disabled}, nil, "")
	core.AssertFalse(t, config.BoolValue(subsystem.cfg.Enabled, true))
	core.AssertEqual(t, "", subsystem.relayToken)
}

func TestAX7_New_Ugly(t *core.T) {
	subsystem := New(config.Subagent{Relay: config.SubagentRelay{Path: "relay"}}, nil, "\nsecret\n")
	core.AssertEqual(t, "secret", subsystem.relayToken)
	core.AssertEqual(t, "relay", subsystem.cfg.Relay.Path)
}

func TestAX7_NewWithHistory_Good(t *core.T) {
	storeInstance, err := storelib.New(core.JoinPath(t.TempDir(), "history.db"))
	core.RequireNoError(t, err)
	subsystem := NewWithHistory(config.Subagent{}, nil, "", storeInstance)
	core.AssertNotNil(t, subsystem.history)
	core.AssertNotNil(t, subsystem.events)
}

func TestAX7_NewWithHistory_Bad(t *core.T) {
	subsystem := NewWithHistory(config.Subagent{}, nil, "", nil)
	core.AssertNotNil(t, subsystem)
	core.AssertNil(t, subsystem.history)
}

func TestAX7_NewWithHistory_Ugly(t *core.T) {
	storeInstance, err := storelib.New(core.JoinPath(t.TempDir(), "history.db"))
	core.RequireNoError(t, err)
	subsystem := NewWithHistory(config.Subagent{Dispatch: config.SubagentDispatch{DefaultAgent: "cladius"}}, nil, "token", storeInstance)
	core.AssertEqual(t, "cladius", subsystem.cfg.Dispatch.DefaultAgent)
	core.AssertEqual(t, "token", subsystem.relayToken)
}

func TestAX7_Subsystem_Name_Good(t *core.T) {
	subsystem := New(config.Subagent{}, nil, "")
	name := subsystem.Name()
	core.AssertEqual(t, "subagent", name)
}

func TestAX7_Subsystem_Name_Bad(t *core.T) {
	var subsystem *Subsystem
	name := subsystem.Name()
	core.AssertEqual(t, "subagent", name)
}

func TestAX7_Subsystem_Name_Ugly(t *core.T) {
	subsystem := &Subsystem{}
	name := subsystem.Name()
	core.AssertEqual(t, "subagent", name)
}

func TestAX7_Subsystem_RegisterTools_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Subagent{}, nil, "").RegisterTools(service)
	names := ax7SubagentToolNames(service.Tools())
	core.AssertTrue(t, names["subagent_guide"])
}

func TestAX7_Subsystem_RegisterTools_Bad(t *core.T) {
	subsystem := New(config.Subagent{}, nil, "")
	core.AssertPanics(t, func() { subsystem.RegisterTools(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterTools_Ugly(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Subagent{}, nil, "").RegisterTools(service)
	names := ax7SubagentToolNames(service.Tools())
	core.AssertTrue(t, names["subagent_dispatch_guided"])
}

func ax7SubagentToolNames(records []coremcp.ToolRecord) map[string]bool {
	names := map[string]bool{}
	for _, record := range records {
		names[record.Name] = true
	}
	return names
}

func TestAX7_Subsystem_RegisterActions_Good(t *core.T) {
	c := core.New()
	New(config.Subagent{}, nil, "").RegisterActions(c)
	core.AssertTrue(t, c.Action("ide.subagent.guide").Exists())
}

func TestAX7_Subsystem_RegisterActions_Bad(t *core.T) {
	subsystem := New(config.Subagent{}, nil, "")
	core.AssertPanics(t, func() { subsystem.RegisterActions(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterActions_Ugly(t *core.T) {
	c := core.New()
	New(config.Subagent{}, nil, "").RegisterActions(c)
	result := c.Action("ide.subagent.dispatch_guided").Run(context.Background(), core.NewOptions())
	core.AssertFalse(t, result.OK)
}

func TestAX7_EncodeMessage_Good(t *core.T) {
	raw, err := EncodeMessage(GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: "focus", CreatedAt: time.Unix(1, 0).UTC()})
	core.AssertNoError(t, err)
	core.AssertContains(t, string(raw), "guidance")
}

func TestAX7_EncodeMessage_Bad(t *core.T) {
	raw, err := EncodeMessage(map[string]any{"type": "mystery"})
	core.AssertError(t, err)
	core.AssertNil(t, raw)
}

func TestAX7_EncodeMessage_Ugly(t *core.T) {
	raw, err := EncodeMessage(StatusMessage{Type: "status", State: "running"})
	core.AssertNoError(t, err)
	core.AssertContains(t, string(raw), "created_at")
}

func TestAX7_DecodeMessage_Good(t *core.T) {
	message, err := DecodeMessage([]byte(`{"type":"question","role":"agent","question_id":"q1","message":"continue?"}`))
	core.AssertNoError(t, err)
	core.AssertEqual(t, "q1", message.(QuestionMessage).QuestionID)
}

func TestAX7_DecodeMessage_Bad(t *core.T) {
	message, err := DecodeMessage([]byte(`{"type":"mystery"}`))
	core.AssertError(t, err)
	core.AssertNil(t, message)
}

func TestAX7_DecodeMessage_Ugly(t *core.T) {
	message, err := DecodeMessage([]byte(`{"type":"status","state":"running"}`))
	core.AssertNoError(t, err)
	core.AssertFalse(t, message.(StatusMessage).CreatedAt.IsZero())
}

func TestAX7_Subsystem_DispatchGuided_Good(t *core.T) {
	subsystem := New(config.Subagent{}, nil, "")
	output, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate"})
	core.AssertNoError(t, err)
	core.AssertTrue(t, output.Success)
}

func TestAX7_Subsystem_DispatchGuided_Bad(t *core.T) {
	subsystem := New(config.Subagent{}, nil, "")
	output, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{})
	core.AssertError(t, err)
	core.AssertFalse(t, output.Success)
}

func TestAX7_Subsystem_DispatchGuided_Ugly(t *core.T) {
	subsystem := New(config.Subagent{}, nil, "")
	output, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", WorkspaceID: "fixed"})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "fixed", output.WorkspaceID)
}
