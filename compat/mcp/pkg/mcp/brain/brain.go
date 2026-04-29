package brain

import "time"

type RememberInput struct {
	Content    string   `json:"content,omitempty"`
	Type       string   `json:"type,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	Org        string   `json:"org,omitempty"`
	Project    string   `json:"project,omitempty"`
	Confidence float64  `json:"confidence,omitempty"`
	Supersedes string   `json:"supersedes,omitempty"`
	ExpiresIn  int      `json:"expiresIn,omitempty"`
}

type RememberOutput struct {
	Success   bool      `json:"success"`
	MemoryID  string    `json:"memoryId,omitempty"`
	Timestamp time.Time `json:"timestamp,omitempty"`
}

type RecallInput struct {
	Query  string       `json:"query,omitempty"`
	TopK   int          `json:"topK,omitempty"`
	Filter RecallFilter `json:"filter,omitempty"`
}

type RecallOutput struct {
	Success  bool     `json:"success"`
	Count    int      `json:"count"`
	Memories []Memory `json:"memories,omitempty"`
}

type RecallFilter struct {
	Org           string  `json:"org,omitempty"`
	Project       string  `json:"project,omitempty"`
	Type          string  `json:"type,omitempty"`
	MinConfidence float64 `json:"minConfidence,omitempty"`
	AgentID       string  `json:"agentId,omitempty"`
}

type Memory struct {
	ID         string    `json:"id,omitempty"`
	Content    string    `json:"content,omitempty"`
	Type       string    `json:"type,omitempty"`
	Tags       []string  `json:"tags,omitempty"`
	Org        string    `json:"org,omitempty"`
	Project    string    `json:"project,omitempty"`
	AgentID    string    `json:"agentId,omitempty"`
	Confidence float64   `json:"confidence,omitempty"`
	CreatedAt  time.Time `json:"createdAt,omitempty"`
}

type ForgetInput struct {
	ID string `json:"id,omitempty"`
}

type ForgetOutput struct {
	Success   bool      `json:"success"`
	Forgotten string    `json:"forgotten,omitempty"`
	Timestamp time.Time `json:"timestamp,omitempty"`
}

type ListInput struct {
	Org     string `json:"org,omitempty"`
	Project string `json:"project,omitempty"`
	Type    string `json:"type,omitempty"`
	AgentID string `json:"agentId,omitempty"`
	Limit   int    `json:"limit,omitempty"`
}

type ListOutput struct {
	Success  bool     `json:"success"`
	Count    int      `json:"count"`
	Memories []Memory `json:"memories,omitempty"`
}
