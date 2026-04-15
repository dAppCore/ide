package subagent

import "time"

type GuidanceMessage struct {
	Type      string    `json:"type"`
	Role      string    `json:"role"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type QuestionMessage struct {
	Type       string    `json:"type"`
	Role       string    `json:"role"`
	QuestionID string    `json:"question_id"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"created_at"`
}

type AnswerMessage struct {
	Type       string    `json:"type"`
	Role       string    `json:"role"`
	QuestionID string    `json:"question_id"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"created_at"`
}

type ProgressMessage struct {
	Type      string    `json:"type"`
	Role      string    `json:"role"`
	Progress  float64   `json:"progress"`
	Total     float64   `json:"total"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type StatusMessage struct {
	Type      string    `json:"type"`
	State     string    `json:"state"`
	Detail    string    `json:"detail,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
