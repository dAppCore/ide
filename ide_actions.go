package main

import (
	"context"
	"encoding/json"
	"fmt"

	"forge.lthn.ai/core/go/pkg/core"
)

// IDEAction is the named Core IPC envelope for IDE tool invocations.
//
//	c.ACTION(IDEAction{Name: "ide.brain.recall", Input: RecallInput{Query: "alpha"}})
type IDEAction struct {
	Name  string `json:"name"`
	Input any    `json:"input,omitempty"`
}

func registerIDEActions(c *core.Core, brain *BrainDirectSubsystem, workspace *WorkspaceSubsystem, marketplace *MarketplaceSubsystem, navigate *NavigateSubsystem, subagent *SubagentSubsystem) {
	if c == nil {
		return
	}

	c.RegisterAction(func(_ *core.Core, msg core.Message) error {
		action, ok := asIDEAction(msg)
		if !ok {
			return nil
		}

		switch action.Name {
		case "ide.brain.recall":
			if brain == nil {
				return fmt.Errorf("ide.brain.recall unavailable")
			}
			input, err := decodeIDEActionInput[RecallInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = brain.brainRecall(context.Background(), nil, input)
			return err
		case "ide.brain.remember":
			if brain == nil {
				return fmt.Errorf("ide.brain.remember unavailable")
			}
			input, err := decodeIDEActionInput[RememberInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = brain.brainRemember(context.Background(), nil, input)
			return err
		case "ide.brain.forget":
			if brain == nil {
				return fmt.Errorf("ide.brain.forget unavailable")
			}
			input, err := decodeIDEActionInput[ForgetInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = brain.brainForget(context.Background(), nil, input)
			return err
		case "ide.brain.list":
			if brain == nil {
				return fmt.Errorf("ide.brain.list unavailable")
			}
			input, err := decodeIDEActionInput[BrainListInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = brain.brainList(context.Background(), nil, input)
			return err
		case "ide.brain.context":
			if brain == nil {
				return fmt.Errorf("ide.brain.context unavailable")
			}
			input, err := decodeIDEActionInput[BrainContextInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = brain.brainContext(context.Background(), nil, input)
			return err
		case "ide.workspace.status":
			if workspace == nil {
				return fmt.Errorf("ide.workspace.status unavailable")
			}
			input, err := decodeIDEActionInput[WorkspaceStatusInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = workspace.workspaceStatus(context.Background(), nil, input)
			return err
		case "ide.workspace.conventions":
			if workspace == nil {
				return fmt.Errorf("ide.workspace.conventions unavailable")
			}
			input, err := decodeIDEActionInput[WorkspaceConventionsInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = workspace.workspaceConventions(context.Background(), nil, input)
			return err
		case "ide.workspace.impact":
			if workspace == nil {
				return fmt.Errorf("ide.workspace.impact unavailable")
			}
			input, err := decodeIDEActionInput[WorkspaceImpactInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = workspace.workspaceImpact(context.Background(), nil, input)
			return err
		case "ide.workspace.scan":
			if workspace == nil {
				return fmt.Errorf("ide.workspace.scan unavailable")
			}
			input, err := decodeIDEActionInput[WorkspaceScanInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = workspace.workspaceScan(context.Background(), nil, input)
			return err
		case "ide.navigate":
			if navigate == nil {
				return fmt.Errorf("ide.navigate unavailable")
			}
			input, err := decodeIDEActionInput[NavigateInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = navigate.coreNavigate(context.Background(), nil, input)
			return err
		case "ide.pkg.search":
			if marketplace == nil {
				return fmt.Errorf("ide.pkg.search unavailable")
			}
			input, err := decodeIDEActionInput[PackageSearchInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = marketplace.pkgSearch(context.Background(), nil, input)
			return err
		case "ide.pkg.info":
			if marketplace == nil {
				return fmt.Errorf("ide.pkg.info unavailable")
			}
			input, err := decodeIDEActionInput[PackageInfoInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = marketplace.pkgInfo(context.Background(), nil, input)
			return err
		case "ide.pkg.install":
			if marketplace == nil {
				return fmt.Errorf("ide.pkg.install unavailable")
			}
			input, err := decodeIDEActionInput[PackageInstallInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = marketplace.pkgInstall(context.Background(), nil, input)
			return err
		case "ide.subagent.guide":
			if subagent == nil {
				return fmt.Errorf("ide.subagent.guide unavailable")
			}
			input, err := decodeIDEActionInput[SubagentGuideInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = subagent.subagentGuide(context.Background(), nil, input)
			return err
		case "ide.subagent.ask":
			if subagent == nil {
				return fmt.Errorf("ide.subagent.ask unavailable")
			}
			input, err := decodeIDEActionInput[SubagentAskInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = subagent.subagentAsk(context.Background(), nil, input)
			return err
		case "ide.subagent.answer":
			if subagent == nil {
				return fmt.Errorf("ide.subagent.answer unavailable")
			}
			input, err := decodeIDEActionInput[SubagentAnswerInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = subagent.subagentAnswer(context.Background(), nil, input)
			return err
		case "ide.subagent.progress":
			if subagent == nil {
				return fmt.Errorf("ide.subagent.progress unavailable")
			}
			input, err := decodeIDEActionInput[SubagentProgressInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = subagent.subagentProgress(context.Background(), nil, input)
			return err
		case "ide.subagent.watch":
			if subagent == nil {
				return fmt.Errorf("ide.subagent.watch unavailable")
			}
			input, err := decodeIDEActionInput[SubagentWatchInput](action.Input)
			if err != nil {
				return err
			}
			_, _, err = subagent.subagentWatch(context.Background(), nil, input)
			return err
		default:
			return nil
		}
	})
}

func asIDEAction(msg core.Message) (IDEAction, bool) {
	switch action := msg.(type) {
	case IDEAction:
		return action, true
	case *IDEAction:
		if action == nil {
			return IDEAction{}, false
		}
		return *action, true
	default:
		return IDEAction{}, false
	}
}

func decodeIDEActionInput[T any](value any) (T, error) {
	var input T
	if typed, ok := value.(T); ok {
		return typed, nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return input, err
	}
	if err := json.Unmarshal(raw, &input); err != nil {
		return input, err
	}
	return input, nil
}
