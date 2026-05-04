// SPDX-License-Identifier: EUPL-1.2

// Package vi exposes Vi Control Panel data to the GUI shell.
//
// Vi is the spine of the Lethean Desktop control panel — calm presence, raven
// on the tower, surfacing what matters. Per the Lethean-3 native handoff:
// "Vi is the spine of the panel, not a chat widget."
//
// The data model (Brief, Site, ActivityItem, ViStatus) matches the TypeScript
// surface the frontend already consumes from frontend/src/app/lib/vi.types.ts.
// Field json tags use camelCase so Wails-generated bindings match.
//
// First pass: this service returns fixture data with chill-chick-raven voice.
// Future: real data sources populate state — uptime monitoring → sites,
// brain memory → briefs, agent dispatch + git activity → activity feed.
//
// Character canon: plans/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md
// Convergence RFC: plans/project/lthn/desktop/RFC.md §1.3
package vi

import (
	"context"

	core "dappco.re/go"
)

// Tone categorises a brief or activity row by severity. Mirrors the TS union
// `'warning' | 'success' | 'info' | 'neutral' | 'danger'`.
type Tone string

const (
	ToneWarning Tone = "warning"
	ToneSuccess Tone = "success"
	ToneInfo    Tone = "info"
	ToneNeutral Tone = "neutral"
	ToneDanger  Tone = "danger"
)

// SiteStatus is the at-a-glance health of a watched site.
type SiteStatus string

const (
	StatusGreen SiteStatus = "green"
	StatusAmber SiteStatus = "amber"
	StatusRed   SiteStatus = "red"
)

// BriefAction is one of the buttons offered on a Brief card. Primary actions
// render with the brand-tinted button; secondary as outlined.
type BriefAction struct {
	Label   string `json:"label"`
	Primary bool   `json:"primary,omitempty"`
}

// Brief is one card in the brief feed. Vi surfaces what matters; the body
// reads in the chill-chick-raven character voice — calm, factual, with the
// "what to do next" implied rather than demanded.
type Brief struct {
	Tone     Tone          `json:"tone"`
	Time     string        `json:"time"` // ISO or human ("06:42", "Yesterday")
	Title    string        `json:"title"`
	Body     string        `json:"body"`
	Actions  []BriefAction `json:"actions"`
	Done     bool          `json:"done,omitempty"`
	Shortcut string        `json:"shortcut,omitempty"` // Darwin/iPad only ("⌘1")
}

// Site is one watched site row. Mono numbers (uptime, response, deploy time)
// per the native handoff.
type Site struct {
	Domain     string     `json:"domain"`
	Stack      string     `json:"stack"`
	Status     SiteStatus `json:"status"`
	Uptime     string     `json:"uptime"`     // e.g. "99.998"
	Response   int        `json:"response"`   // ms
	SparkData  []int      `json:"sparkData"`  // 12 points
	LastDeploy string     `json:"lastDeploy"` // human relative
	Warn       string     `json:"warn,omitempty"`
}

// ActivityItem is one row in the activity feed. Who = "vi" or "you" — the
// mono badge in the UI uses the literal strings.
type ActivityItem struct {
	Who  string `json:"who"` // "vi" | "you"
	Time string `json:"time"`
	Text string `json:"text"`
	Icon string `json:"icon"` // e.g. "wave-pulse", "shield-check"
	Tone Tone   `json:"tone"`
}

// ViStatus is the live status pinned in the sidebar + status bar — Vi
// connected indicator, latency, what she's watching, and what's pending
// the user's attention.
type ViStatus struct {
	Connected bool `json:"connected"`
	LatencyMs int  `json:"latencyMs"`
	Watching  int  `json:"watching"`
	Pending   int  `json:"pending"`
}

// Service is the Vi data surface. It implements the canonical Service
// registration pattern (Mantis #1336) so any container can register it via
// core.WithService(vi.Register).
//
//	core.WithService(vi.Register)
type Service struct {
	*core.ServiceRuntime[struct{}]
}

// Register wires the Vi service into the Core runtime. Used in compose:
//
//	core.WithService(vi.Register)
func Register(c *core.Core) core.Result {
	return core.Ok(&Service{ServiceRuntime: core.NewServiceRuntime[struct{}](c, struct{}{})})
}

// OnStartup is the canonical lifecycle hook. No work needed for the
// fixture-only first pass; a real service would seed state here.
func (s *Service) OnStartup(context.Context) core.Result {
	return core.Ok(nil)
}

// Status returns the live Vi presence indicator data. The fixture-only
// implementation always reports connected with a small latency.
//
//	status := svc.Status()
//	if status.Connected { /* show green dot */ }
func (s *Service) Status() ViStatus {
	return ViStatus{
		Connected: true,
		LatencyMs: 12,
		Watching:  len(fixtureSites),
		Pending:   countOpenBriefs(fixtureBriefs),
	}
}

// Briefs returns the brief feed — what Vi has surfaced for the operator's
// attention right now, ordered most-recent-first.
//
//	for _, brief := range svc.Briefs() { /* render card */ }
func (s *Service) Briefs() []Brief {
	out := make([]Brief, len(fixtureBriefs))
	copy(out, fixtureBriefs)
	return out
}

// Sites returns the watched-site list. Status / uptime / response come from
// the underlying monitoring layer; the fixture pass returns canned data.
//
//	for _, site := range svc.Sites() { /* render row */ }
func (s *Service) Sites() []Site {
	out := make([]Site, len(fixtureSites))
	copy(out, fixtureSites)
	return out
}

// Activity returns the activity feed — Vi's narration + the operator's recent
// actions, interleaved by timestamp.
//
//	for _, item := range svc.Activity() { /* render row */ }
func (s *Service) Activity() []ActivityItem {
	out := make([]ActivityItem, len(fixtureActivity))
	copy(out, fixtureActivity)
	return out
}

// countOpenBriefs is a small helper used by Status() so Pending reflects
// the briefs the operator hasn't dismissed yet.
func countOpenBriefs(briefs []Brief) int {
	open := 0
	for _, brief := range briefs {
		if !brief.Done {
			open++
		}
	}
	return open
}

// fixtureBriefs / fixtureSites / fixtureActivity mirror the inline fixtures
// in frontend/src/app/lib/vi.types.ts. When real data sources land, these
// get replaced by service queries (uptime monitor → sites, brain memory →
// briefs, agent dispatch + git → activity).
var fixtureBriefs = []Brief{
	{
		Tone:     ToneWarning,
		Time:     "06:42",
		Title:    "TLS cert renews in 8 days · forge.lthn.sh",
		Body:     "ZeroSSL wildcard. The auto-renew job last ran 71 days ago; worth a manual nudge before the window narrows.",
		Actions:  []BriefAction{{Label: "Renew now", Primary: true}, {Label: "Snooze 24h"}},
		Shortcut: "⌘1",
	},
	{
		Tone:    ToneSuccess,
		Time:    "Yesterday",
		Title:   "Mattermost on de1 — quiet for 18h",
		Body:    "No PG slot exhaustion since the conn-pool cap landed. Healthcheck green.",
		Actions: []BriefAction{{Label: "View status"}},
		Done:    true,
	},
	{
		Tone:    ToneInfo,
		Time:    "2d ago",
		Title:   "Lethean-3 design drop landed in plans tree",
		Body:    "Tokens, native profiles, Vi Control Panel pattern. Worth a read before next frontend touch.",
		Actions: []BriefAction{{Label: "Open plans"}, {Label: "Mark read"}},
	},
}

var fixtureSites = []Site{
	{
		Domain:     "lthn.ai",
		Stack:      "Lethean · EaaS · Authentik",
		Status:     StatusGreen,
		Uptime:     "99.998",
		Response:   142,
		SparkData:  []int{120, 135, 128, 140, 138, 145, 142, 139, 144, 138, 141, 142},
		LastDeploy: "2d ago",
	},
	{
		Domain:     "team.lthn.ai",
		Stack:      "Mattermost · PG · Mailcow",
		Status:     StatusGreen,
		Uptime:     "99.96",
		Response:   88,
		SparkData:  []int{92, 85, 90, 88, 86, 84, 87, 88, 90, 87, 88, 88},
		LastDeploy: "today",
	},
	{
		Domain:     "forge.lthn.sh",
		Stack:      "Forgejo · PG · S3",
		Status:     StatusAmber,
		Uptime:     "99.92",
		Response:   167,
		SparkData:  []int{150, 155, 160, 165, 170, 168, 172, 169, 165, 167, 167, 167},
		LastDeploy: "11d ago",
		Warn:       "TLS cert renews in 8 days",
	},
	{
		Domain:     "tasks.lthn.sh",
		Stack:      "Mantis · PG",
		Status:     StatusGreen,
		Uptime:     "99.99",
		Response:   95,
		SparkData:  []int{90, 92, 95, 93, 94, 95, 96, 95, 94, 95, 95, 95},
		LastDeploy: "5d ago",
	},
}

var fixtureActivity = []ActivityItem{
	{Who: "vi", Time: "14:08", Text: "Healthcheck for team.lthn.ai green for 18h.", Icon: "wave-pulse", Tone: ToneSuccess},
	{Who: "you", Time: "13:42", Text: "Closed Mantis #1341 — core.Result cascade.", Icon: "shield-check", Tone: ToneInfo},
	{Who: "vi", Time: "12:05", Text: "forge.lthn.sh response time crept above 160ms.", Icon: "circle-exclamation", Tone: ToneWarning},
	{Who: "you", Time: "11:30", Text: "Pushed plans submodule pointer (lthn website plumbing).", Icon: "code-branch", Tone: ToneNeutral},
	{Who: "vi", Time: "10:14", Text: "Mailcow inbox quiet — no new tickets overnight.", Icon: "envelope-circle-check", Tone: ToneNeutral},
}
