package subagent

import (
	"time"

	core "dappco.re/go/core"
	"dappco.re/go/ws"
)

const maxEventsPerWorkspace = 1000
const maxTrackedWorkspaces = 128

func guideChannel(workspaceID string) string {
	return core.Concat("subagent:", core.Trim(workspaceID), ":guide")
}

func questionChannel(workspaceID string) string {
	return core.Concat("subagent:", core.Trim(workspaceID), ":question")
}

func answerChannel(workspaceID string) string {
	return core.Concat("subagent:", core.Trim(workspaceID), ":answer")
}

func progressChannel(workspaceID string) string {
	return core.Concat("subagent:", core.Trim(workspaceID), ":progress")
}

func statusChannel(workspaceID string) string {
	return core.Concat("subagent:", core.Trim(workspaceID), ":status")
}

func questionKey(workspaceID, questionID string) string {
	return core.Concat(core.Trim(workspaceID), "::", core.Trim(questionID))
}

func (s *Subsystem) appendEvent(workspaceID string, event Event) Event {
	if s == nil {
		return event
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.eventSeq == nil {
		s.eventSeq = map[string]int{}
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	if event.Cursor <= 0 {
		s.eventSeq[workspaceID]++
		event.Cursor = s.eventSeq[workspaceID]
	} else if event.Cursor > s.eventSeq[workspaceID] {
		s.eventSeq[workspaceID] = event.Cursor
	}
	events := append(s.events[workspaceID], event)
	if len(events) > maxEventsPerWorkspace {
		events = append([]Event(nil), events[len(events)-maxEventsPerWorkspace:]...)
	}
	s.events[workspaceID] = events
	s.pruneWorkspaceHistoryLocked()
	return event
}

func (s *Subsystem) appendQuestionChannel(workspaceID, questionID string, channel chan string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := questionKey(workspaceID, questionID)
	if s.answers[workspaceID] == nil {
		s.answers[workspaceID] = map[string]chan string{}
	}
	s.answers[workspaceID][key] = channel
}

func (s *Subsystem) deleteQuestionChannel(workspaceID, questionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := questionKey(workspaceID, questionID)
	if workspaceAnswers := s.answers[workspaceID]; workspaceAnswers != nil {
		delete(workspaceAnswers, key)
		if len(workspaceAnswers) == 0 {
			delete(s.answers, workspaceID)
		}
	}
}

func (s *Subsystem) takeQuestionChannel(workspaceID, questionID string) chan string {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := questionKey(workspaceID, questionID)
	workspaceAnswers := s.answers[workspaceID]
	if workspaceAnswers == nil {
		return nil
	}
	channel := workspaceAnswers[key]
	delete(workspaceAnswers, key)
	if len(workspaceAnswers) == 0 {
		delete(s.answers, workspaceID)
	}
	return channel
}

func (s *Subsystem) collectEvents(workspaceID string, from int) []Event {
	events, _, _ := s.collectEventPage(workspaceID, from, 0)
	return events
}

func (s *Subsystem) collectEventPage(workspaceID string, cursor int, limit int) ([]Event, int, bool) {
	if s == nil {
		return nil, normalizeCursor(cursor), false
	}
	cursor = normalizeCursor(cursor)
	threshold := cursor
	if threshold <= 0 {
		threshold = 1
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	events := s.events[workspaceID]
	out := []Event{}
	nextCursor := threshold
	hasMore := false
	for _, event := range events {
		eventCursor := event.Cursor
		if eventCursor <= 0 {
			continue
		}
		if eventCursor < threshold {
			continue
		}
		if limit > 0 && len(out) >= limit {
			hasMore = true
			break
		}
		out = append(out, event)
		if eventCursor >= nextCursor {
			nextCursor = eventCursor + 1
		}
	}
	return out, nextCursor, hasMore
}

func (s *Subsystem) watchSnapshot(workspaceID string, cursor int, limit int, reason string) WatchOutput {
	events, nextCursor, hasMore := s.collectEventPage(workspaceID, cursor, limit)
	completed, failed := s.workspaceState(workspaceID)
	return WatchOutput{
		Completed:  completed,
		Failed:     failed,
		Events:     events,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Reason:     reason,
	}
}

func (s *Subsystem) workspaceState(workspaceID string) (bool, bool) {
	if s == nil {
		return false, false
	}
	s.mu.RLock()
	events := append([]Event(nil), s.events[workspaceID]...)
	s.mu.RUnlock()
	return state(events)
}

func (s *Subsystem) bindAgenticWorkspace(workspaceID, name string) {
	if s == nil || core.Trim(workspaceID) == "" || core.Trim(name) == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	ref := s.agentic[workspaceID]
	ref.Name = core.Trim(name)
	s.agentic[workspaceID] = ref
}

func (s *Subsystem) agenticWorkspace(workspaceID string) agenticWorkspace {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.agentic[workspaceID]
}

func (s *Subsystem) syncAgenticState(workspaceID, state, question string) bool {
	if s == nil || core.Trim(workspaceID) == "" {
		return false
	}
	state = core.Trim(state)
	question = core.Trim(question)
	if state == "" {
		return false
	}
	s.mu.Lock()
	ref := s.agentic[workspaceID]
	changed := false
	if ref.LastState != state {
		ref.LastState = state
		changed = true
	}
	questionChanged := question != "" && ref.LastQuestion != question
	if questionChanged {
		ref.LastQuestion = question
	}
	s.agentic[workspaceID] = ref
	s.mu.Unlock()
	if changed {
		s.appendEvent(workspaceID, Event{
			Type:      "status",
			Channel:   statusChannel(workspaceID),
			Message:   state,
			CreatedAt: time.Now().UTC(),
		})
	}
	if questionChanged {
		s.appendEvent(workspaceID, Event{
			Type:       "question",
			Channel:    questionChannel(workspaceID),
			Message:    question,
			QuestionID: "blocked",
			CreatedAt:  time.Now().UTC(),
		})
	}
	return changed || questionChanged
}

func (s *Subsystem) publish(channel string, message any) {
	if s == nil || s.hub == nil {
		return
	}
	_ = s.hub.SendToChannel(channel, ws.Message{
		Type:      ws.TypeEvent,
		Data:      message,
		Timestamp: time.Now().UTC(),
	})
}

func (s *Subsystem) pruneWorkspaceHistoryLocked() {
	for len(s.events) > maxTrackedWorkspaces {
		workspaceID := s.oldestPrunableWorkspaceLocked(true)
		if workspaceID == "" {
			workspaceID = s.oldestPrunableWorkspaceLocked(false)
		}
		if workspaceID == "" {
			return
		}
		s.deleteWorkspaceHistoryLocked(workspaceID)
	}
}

func (s *Subsystem) oldestPrunableWorkspaceLocked(terminalOnly bool) string {
	oldestWorkspaceID := ""
	oldestCreatedAt := time.Time{}
	for workspaceID, events := range s.events {
		if s.hasPendingAnswersLocked(workspaceID) {
			continue
		}
		completed, failed := state(events)
		if terminalOnly && !completed && !failed {
			continue
		}
		createdAt := lastEventCreatedAt(events)
		if oldestWorkspaceID == "" || createdAt.Before(oldestCreatedAt) {
			oldestWorkspaceID = workspaceID
			oldestCreatedAt = createdAt
		}
	}
	return oldestWorkspaceID
}

func (s *Subsystem) hasPendingAnswersLocked(workspaceID string) bool {
	return len(s.answers[workspaceID]) > 0
}

func (s *Subsystem) deleteWorkspaceHistoryLocked(workspaceID string) {
	delete(s.events, workspaceID)
	delete(s.eventSeq, workspaceID)
	delete(s.agentic, workspaceID)
}

func lastEventCreatedAt(events []Event) time.Time {
	createdAt := time.Time{}
	for _, event := range events {
		if event.CreatedAt.After(createdAt) {
			createdAt = event.CreatedAt
		}
	}
	return createdAt
}
