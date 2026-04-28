package ai

import (
	"context"
	"os"
	"slices"
	"time"
	"unicode"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
)

type Event struct {
	Type      string         `json:"type"`
	Timestamp time.Time      `json:"timestamp"`
	AgentID   string         `json:"agent_id,omitempty"`
	Repo      string         `json:"repo,omitempty"`
	Duration  time.Duration  `json:"duration,omitempty"`
	Data      map[string]any `json:"data,omitempty"`
}

type Document struct {
	ID    string `json:"id,omitempty"`
	Title string `json:"title,omitempty"`
	Text  string `json:"text"`
}

type SearchInput struct {
	Query     string     `json:"query"`
	Documents []Document `json:"documents"`
	Limit     int        `json:"limit,omitempty"`
}

type SearchResult struct {
	Document Document `json:"document"`
	Score    float32  `json:"score"`
}

type Service struct {
	*core.ServiceRuntime[struct{}]
}

func Register(c *core.Core) core.Result {
	return core.Ok(&Service{ServiceRuntime: core.NewServiceRuntime[struct{}](c, struct{}{})})
}

func (s *Service) OnStartup(context.Context) core.Result {
	return core.Ok(nil)
}

func (s *Service) Record(event Event) error {
	return Record(event)
}

func (s *Service) Search(input SearchInput) []SearchResult {
	query := core.Trim(input.Query)
	if query == "" || len(input.Documents) == 0 {
		return nil
	}
	limit := input.Limit
	if limit <= 0 || limit > len(input.Documents) {
		limit = len(input.Documents)
	}
	queryTerms := tokenSet(query)
	if len(queryTerms) == 0 {
		return nil
	}
	results := make([]SearchResult, 0, len(input.Documents))
	for _, document := range input.Documents {
		text := core.Trim(document.Text)
		if text == "" {
			continue
		}
		score := scoreDocument(queryTerms, document)
		if score <= 0 {
			continue
		}
		results = append(results, SearchResult{
			Document: document,
			Score:    score,
		})
	}
	slices.SortFunc(results, func(left, right SearchResult) int {
		switch {
		case left.Score > right.Score:
			return -1
		case left.Score < right.Score:
			return 1
		case left.Document.Title < right.Document.Title:
			return -1
		case left.Document.Title > right.Document.Title:
			return 1
		default:
			return 0
		}
	})
	if len(results) > limit {
		results = results[:limit]
	}
	return results
}

func scoreDocument(queryTerms map[string]struct{}, document Document) float32 {
	documentTerms := tokenSet(core.Concat(document.Title, "\n", document.Text))
	if len(documentTerms) == 0 {
		return 0
	}
	var matches float32
	for term := range queryTerms {
		if _, ok := documentTerms[term]; ok {
			matches++
		}
	}
	if matches == 0 {
		return 0
	}
	return matches / float32(len(documentTerms))
}

func tokenSet(value string) map[string]struct{} {
	terms := map[string]struct{}{}
	current := core.NewBuilder()
	flush := func() {
		if current.Len() == 0 {
			return
		}
		token := core.Lower(current.String())
		current.Reset()
		if len([]rune(token)) < 3 {
			return
		}
		terms[token] = struct{}{}
	}
	for _, character := range value {
		if unicode.IsLetter(character) || unicode.IsNumber(character) {
			current.WriteRune(character)
			continue
		}
		flush()
	}
	flush()
	return terms
}

func Record(event Event) error {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	path := core.JoinPath(aiHomeDir(), ".core", "ai", "metrics", event.Timestamp.Format("2006-01-02")+".jsonl")
	if err := coreio.Local.EnsureDir(core.PathDir(path)); err != nil {
		return core.E("ide.ai.Record", "ensure metrics dir", err)
	}
	file, err := coreio.Local.Append(path)
	if err != nil {
		return core.E("ide.ai.Record", "open metrics file", err)
	}
	defer file.Close()
	if _, err := file.Write([]byte(core.Concat(core.JSONMarshalString(event), "\n"))); err != nil {
		return core.E("ide.ai.Record", "write metrics file", err)
	}
	return nil
}

func aiHomeDir() string {
	if home := core.Trim(os.Getenv("DIR_HOME")); home != "" {
		return home
	}
	if home := core.Trim(core.Env("DIR_HOME")); home != "" {
		return home
	}
	if home := core.Trim(os.Getenv("HOME")); home != "" {
		return home
	}
	return core.Trim(core.Env("HOME"))
}
