package subagent

import (
	"time"

	core "dappco.re/go/core"
	"dappco.re/go/core/ws"
)

const maxEventsPerWorkspace = 1000

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

func (s *Subsystem) appendEvent(workspaceID string, event Event) {
	s.mu.Lock()
	defer s.mu.Unlock()
	events := append(s.events[workspaceID], event)
	if len(events) > maxEventsPerWorkspace {
		events = append([]Event(nil), events[len(events)-maxEventsPerWorkspace:]...)
	}
	s.events[workspaceID] = events
}

func (s *Subsystem) appendQuestionChannel(questionID string, channel chan string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.answers[questionID] = channel
}

func (s *Subsystem) deleteQuestionChannel(questionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.answers, questionID)
}

func (s *Subsystem) takeQuestionChannel(questionID string) chan string {
	s.mu.Lock()
	defer s.mu.Unlock()
	channel := s.answers[questionID]
	delete(s.answers, questionID)
	return channel
}

func (s *Subsystem) collectEvents(workspaceID string, from int) []Event {
	s.mu.RLock()
	defer s.mu.RUnlock()
	events := s.events[workspaceID]
	if from >= len(events) {
		return nil
	}
	out := make([]Event, len(events[from:]))
	copy(out, events[from:])
	return out
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
