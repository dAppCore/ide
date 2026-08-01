package subagent

import (
	"sort"
	"strconv"

	core "dappco.re/go"
	storelib "dappco.re/go/store"
)

const (
	historyWorkspaceGroup  = "ide.subagent.workspaces"
	historyEventsGroupBase = "ide.subagent.events."
)

type historyStore struct {
	store *storelib.Store
}

type historyWorkspaceRecord struct {
	EventSeq int              `json:"eventSeq"`
	Agentic  agenticWorkspace `json:"agentic"`
}

func newHistoryStore(storeInstance *storelib.Store) *historyStore {
	if storeInstance == nil {
		return nil
	}
	return &historyStore{store: storeInstance}
}

func (s *Subsystem) loadHistory() {
	if s == nil || s.history == nil {
		return
	}
	events, eventSeq, agentic := s.history.load()
	s.mu.Lock()
	for workspaceID, workspaceEvents := range events {
		s.events[workspaceID] = trimEventHistory(workspaceEvents)
	}
	for workspaceID, seq := range eventSeq {
		s.eventSeq[workspaceID] = seq
	}
	for workspaceID, ref := range agentic {
		s.agentic[workspaceID] = ref
	}
	for workspaceID, workspaceEvents := range s.events {
		for _, event := range workspaceEvents {
			if event.Cursor > s.eventSeq[workspaceID] {
				s.eventSeq[workspaceID] = event.Cursor
			}
		}
	}
	pruned := s.pruneWorkspaceHistoryLocked()
	s.mu.Unlock()
	for _, workspaceID := range pruned {
		s.history.deleteWorkspace(workspaceID)
	}
}

func (h *historyStore) load() (map[string][]Event, map[string]int, map[string]agenticWorkspace) {
	events := map[string][]Event{}
	eventSeq := map[string]int{}
	agentic := map[string]agenticWorkspace{}
	if h == nil || h.store == nil {
		return events, eventSeq, agentic
	}
	workspaceEntries, result := h.store.GetAll(historyWorkspaceGroup)
	if result.OK {
		for workspaceID, raw := range workspaceEntries {
			workspaceID, err := normalizeWorkspaceID(workspaceID)
			if err != nil || workspaceID == "" {
				continue
			}
			var record historyWorkspaceRecord
			if result := core.JSONUnmarshalString(raw, &record); !result.OK {
				continue
			}
			if record.EventSeq > 0 {
				eventSeq[workspaceID] = record.EventSeq
			}
			if core.Trim(record.Agentic.Name) != "" || core.Trim(record.Agentic.LastState) != "" || core.Trim(record.Agentic.LastQuestion) != "" {
				agentic[workspaceID] = record.Agentic
			}
		}
	}
	groups, result := h.store.Groups(historyEventsGroupBase)
	if !result.OK {
		return events, eventSeq, agentic
	}
	for _, group := range groups {
		workspaceID := core.TrimPrefix(group, historyEventsGroupBase)
		workspaceID, err := normalizeWorkspaceID(workspaceID)
		if err != nil || workspaceID == "" {
			continue
		}
		entries, getResult := h.store.GetAll(group)
		if !getResult.OK {
			continue
		}
		workspaceEvents := make([]Event, 0, len(entries))
		for key, raw := range entries {
			var event Event
			if result := core.JSONUnmarshalString(raw, &event); !result.OK {
				continue
			}
			if event.Cursor <= 0 {
				cursor, err := strconv.Atoi(key)
				if err != nil {
					continue
				}
				event.Cursor = cursor
			}
			workspaceEvents = append(workspaceEvents, event)
		}
		workspaceEvents = sortEventHistory(workspaceEvents)
		if len(workspaceEvents) == 0 {
			continue
		}
		events[workspaceID] = workspaceEvents
	}
	return events, eventSeq, agentic
}

func (h *historyStore) saveEvent(workspaceID string, event Event) {
	if h == nil || h.store == nil || core.Trim(workspaceID) == "" || event.Cursor <= 0 {
		return
	}
	if result := h.store.Set(historyEventsGroup(workspaceID), historyEventKey(event.Cursor), core.JSONMarshalString(event)); !result.OK {
		core.Warn("ide.subagent.history save event", "workspace", workspaceID, "err", result)
	}
}

func (h *historyStore) deleteEvent(workspaceID string, cursor int) {
	if h == nil || h.store == nil || core.Trim(workspaceID) == "" || cursor <= 0 {
		return
	}
	if result := h.store.Delete(historyEventsGroup(workspaceID), historyEventKey(cursor)); !result.OK {
		core.Warn("ide.subagent.history delete event", "workspace", workspaceID, "cursor", cursor, "err", result)
	}
}

func (h *historyStore) saveWorkspace(workspaceID string, seq int, ref agenticWorkspace) {
	if h == nil || h.store == nil || core.Trim(workspaceID) == "" {
		return
	}
	record := historyWorkspaceRecord{EventSeq: seq, Agentic: ref}
	if result := h.store.Set(historyWorkspaceGroup, workspaceID, core.JSONMarshalString(record)); !result.OK {
		core.Warn("ide.subagent.history save workspace", "workspace", workspaceID, "err", result)
	}
}

func (h *historyStore) deleteWorkspace(workspaceID string) {
	if h == nil || h.store == nil || core.Trim(workspaceID) == "" {
		return
	}
	if result := h.store.DeleteGroup(historyEventsGroup(workspaceID)); !result.OK {
		core.Warn("ide.subagent.history delete workspace events", "workspace", workspaceID, "err", result)
	}
	if result := h.store.Delete(historyWorkspaceGroup, workspaceID); !result.OK {
		core.Warn("ide.subagent.history delete workspace", "workspace", workspaceID, "err", result)
	}
}

func historyEventsGroup(workspaceID string) string {
	return core.Concat(historyEventsGroupBase, core.Trim(workspaceID))
}

func historyEventKey(cursor int) string {
	return core.Sprintf("%020d", cursor)
}

func sortEventHistory(events []Event) []Event {
	out := append([]Event(nil), events...)
	sort.Slice(out, func(i, j int) bool {
		left := out[i]
		right := out[j]
		if left.Cursor != right.Cursor {
			return left.Cursor < right.Cursor
		}
		return left.CreatedAt.Before(right.CreatedAt)
	})
	return out
}

func trimEventHistory(events []Event) []Event {
	events = sortEventHistory(events)
	if len(events) <= maxEventsPerWorkspace {
		return events
	}
	return append([]Event(nil), events[len(events)-maxEventsPerWorkspace:]...)
}

func workspaceWasPruned(workspaceIDs []string, workspaceID string) bool {
	for _, candidate := range workspaceIDs {
		if candidate == workspaceID {
			return true
		}
	}
	return false
}
