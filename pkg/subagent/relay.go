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

func questionKey(workspaceID, questionID string) string {
	return core.Concat(core.Trim(workspaceID), "::", core.Trim(questionID))
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
