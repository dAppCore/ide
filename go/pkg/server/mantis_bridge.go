// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// mantis_* bridge tools — surfaces tasks.lthn.sh as a read-only panel.
// Reads token from ~/.claude/secrets/mantis_token (TOKEN). API base
// configurable via CORE_IDE_MANTIS_BASE env (default https://tasks.lthn.sh/api/rest).

const defaultMantisBase = "https://tasks.lthn.sh/api/rest"

func mantisBase() string {
	if v := strings.TrimSpace(os.Getenv("CORE_IDE_MANTIS_BASE")); v != "" {
		return v
	}
	return defaultMantisBase
}

func mantisToken() string {
	if v := strings.TrimSpace(os.Getenv("MANTIS_TOKEN")); v != "" {
		return v
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	for _, candidate := range []string{
		filepath.Join(home, ".claude", "secrets", "mantis_token"),
		filepath.Join(home, ".core", "secrets", "mantis_token"),
	} {
		if data, err := os.ReadFile(candidate); err == nil {
			return strings.Map(func(r rune) rune {
				if r == ' ' || r == '\t' || r == '\n' || r == '\r' || r == 0 {
					return -1
				}
				return r
			}, string(data))
		}
	}
	return ""
}

var mantisHTTPClient = &http.Client{Timeout: 15 * time.Second}

// In-memory cache for project list / status enums (rarely changes; keeps the
// list endpoint snappy without hammering Mantis on every panel refresh).
var (
	mantisMetaOnce sync.Once
	mantisMetaErr  error
	mantisMeta     map[string]any
)

func mantisGET(path string) ([]byte, int, error) {
	tok := mantisToken()
	if tok == "" {
		return nil, 0, &mantisError{msg: "mantis token not configured"}
	}
	req, err := http.NewRequest(http.MethodGet, mantisBase()+path, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", tok)
	req.Header.Set("Accept", "application/json")
	resp, err := mantisHTTPClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(resp.Body)
	return body, resp.StatusCode, nil
}

type mantisError struct{ msg string }

func (e *mantisError) Error() string { return e.msg }

type mantisIssueLite struct {
	ID         int    `json:"id"`
	Summary    string `json:"summary"`
	Status     string `json:"status"`
	Project    string `json:"project"`
	Reporter   string `json:"reporter"`
	Handler    string `json:"handler,omitempty"`
	Created    string `json:"created,omitempty"`
	Updated    string `json:"updated,omitempty"`
	Severity   string `json:"severity,omitempty"`
	Resolution string `json:"resolution,omitempty"`
}

func (b *MCPBridge) toolMantisList(_ context.Context, params map[string]any) map[string]any {
	pageSize := paramInt(params, "page_size", 30)
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 30
	}
	page := paramInt(params, "page", 1)
	if page <= 0 {
		page = 1
	}
	statusFilter := strings.TrimSpace(paramString(params, "status", ""))

	q := "?page_size=" + strconv.Itoa(pageSize) + "&page=" + strconv.Itoa(page)
	body, status, err := mantisGET("/issues" + q)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	if status >= 400 {
		return map[string]any{"ok": false, "error": "mantis HTTP " + strconv.Itoa(status), "body": string(body[:min(len(body), 200)])}
	}

	var raw struct {
		Issues []map[string]any `json:"issues"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}

	out := make([]mantisIssueLite, 0, len(raw.Issues))
	for _, issue := range raw.Issues {
		lite := mantisIssueLite{
			ID:      asInt(issue["id"]),
			Summary: asString(issue["summary"]),
		}
		lite.Status = nameField(issue, "status")
		lite.Project = nameField(issue, "project")
		lite.Reporter = nameField(issue, "reporter")
		lite.Handler = nameField(issue, "handler")
		lite.Severity = nameField(issue, "severity")
		lite.Resolution = nameField(issue, "resolution")
		lite.Created = asString(issue["created_at"])
		lite.Updated = asString(issue["updated_at"])
		if statusFilter != "" && !strings.EqualFold(lite.Status, statusFilter) {
			continue
		}
		out = append(out, lite)
	}

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"issues": out,
			"count":  len(out),
			"page":   page,
		},
	}
}

func (b *MCPBridge) toolMantisView(_ context.Context, params map[string]any) map[string]any {
	id := paramInt(params, "id", 0)
	if id <= 0 {
		return map[string]any{"ok": false, "error": "id required"}
	}
	body, status, err := mantisGET("/issues/" + strconv.Itoa(id))
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	if status >= 400 {
		return map[string]any{"ok": false, "error": "mantis HTTP " + strconv.Itoa(status), "body": string(body[:min(len(body), 200)])}
	}

	var raw struct {
		Issues []map[string]any `json:"issues"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	if len(raw.Issues) == 0 {
		return map[string]any{"ok": false, "error": "issue not found"}
	}
	issue := raw.Issues[0]

	notesBody, notesStatus, _ := mantisGET("/issues/" + strconv.Itoa(id) + "/notes")
	notesOut := []map[string]any{}
	if notesStatus < 400 {
		var notesRaw struct {
			Notes []map[string]any `json:"notes"`
		}
		if err := json.Unmarshal(notesBody, &notesRaw); err == nil {
			for _, n := range notesRaw.Notes {
				notesOut = append(notesOut, map[string]any{
					"id":         asInt(n["id"]),
					"reporter":   nameField(n, "reporter"),
					"text":       asString(n["text"]),
					"created_at": asString(n["created_at"]),
				})
			}
		}
	}

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"id":          asInt(issue["id"]),
			"summary":     asString(issue["summary"]),
			"description": asString(issue["description"]),
			"status":      nameField(issue, "status"),
			"project":     nameField(issue, "project"),
			"reporter":    nameField(issue, "reporter"),
			"handler":     nameField(issue, "handler"),
			"severity":    nameField(issue, "severity"),
			"resolution":  nameField(issue, "resolution"),
			"created":     asString(issue["created_at"]),
			"updated":     asString(issue["updated_at"]),
			"notes":       notesOut,
			"web_url":     "https://tasks.lthn.sh/view.php?id=" + strconv.Itoa(id),
		},
	}
}

func nameField(m map[string]any, key string) string {
	v, ok := m[key]
	if !ok {
		return ""
	}
	if obj, ok := v.(map[string]any); ok {
		return asString(obj["name"])
	}
	return asString(v)
}

func asString(v any) string {
	if v == nil {
		return ""
	}
	switch s := v.(type) {
	case string:
		return s
	case float64:
		return strconv.FormatFloat(s, 'f', -1, 64)
	case bool:
		if s {
			return "true"
		}
		return "false"
	}
	return ""
}

func asInt(v any) int {
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case string:
		i, _ := strconv.Atoi(n)
		return i
	}
	return 0
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
