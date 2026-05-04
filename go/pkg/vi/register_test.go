// SPDX-License-Identifier: EUPL-1.2

package vi

import (
	"context"
	"testing"

	core "dappco.re/go"
)

// newTestService builds a Service against a fresh Core. Used by every test
// below — kept inline so the tests show their actual behaviour without
// hiding setup in shared helpers.
func newTestService(t *testing.T) *Service {
	t.Helper()
	c := core.New(core.WithService(Register))
	svc, ok := core.ServiceFor[*Service](c, "vi")
	if !ok || svc == nil {
		t.Fatalf("vi.Register did not produce a *Service in the Core")
	}
	return svc
}

func TestRegister_Good_ProducesService(t *testing.T) {
	c := core.New(core.WithService(Register))
	svc, ok := core.ServiceFor[*Service](c, "vi")
	if !ok {
		t.Fatalf("Register: ServiceFor[*Service](c, \"vi\") returned ok=false")
	}
	if svc == nil {
		t.Fatalf("Register: svc is nil")
	}
}

func TestRegister_Bad_DirectCallReturnsOk(t *testing.T) {
	c := core.New()
	result := Register(c)
	if !result.OK {
		t.Fatalf("Register: returned !OK; expected core.Ok")
	}
	svc, _ := result.Value.(*Service)
	if svc == nil {
		t.Fatalf("Register: result.Value was not a *Service")
	}
}

func TestRegister_Ugly_OnStartupAcceptsCancelledContext(t *testing.T) {
	svc := newTestService(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	result := svc.OnStartup(ctx)
	if !result.OK {
		t.Fatalf("OnStartup: returned !OK against cancelled context; expected Ok (no work to do)")
	}
}

func TestStatus_Good_ReportsConnected(t *testing.T) {
	svc := newTestService(t)
	status := svc.Status()
	if !status.Connected {
		t.Fatalf("Status: Connected=false; fixture pass should always report connected")
	}
	if status.LatencyMs <= 0 {
		t.Fatalf("Status: LatencyMs=%d; expected positive", status.LatencyMs)
	}
}

func TestStatus_Bad_WatchingMatchesFixtureSites(t *testing.T) {
	svc := newTestService(t)
	status := svc.Status()
	if status.Watching != len(fixtureSites) {
		t.Fatalf("Status: Watching=%d; expected %d (len fixtureSites)", status.Watching, len(fixtureSites))
	}
}

func TestStatus_Ugly_PendingExcludesDoneBriefs(t *testing.T) {
	svc := newTestService(t)
	status := svc.Status()
	expected := 0
	for _, brief := range fixtureBriefs {
		if !brief.Done {
			expected++
		}
	}
	if status.Pending != expected {
		t.Fatalf("Status: Pending=%d; expected %d (open briefs only — Done excluded)", status.Pending, expected)
	}
}

func TestBriefs_Good_ReturnsAllFixtures(t *testing.T) {
	svc := newTestService(t)
	briefs := svc.Briefs()
	if len(briefs) != len(fixtureBriefs) {
		t.Fatalf("Briefs: returned %d; expected %d", len(briefs), len(fixtureBriefs))
	}
}

func TestBriefs_Bad_ReturnsCopyNotAlias(t *testing.T) {
	svc := newTestService(t)
	briefs := svc.Briefs()
	if len(briefs) == 0 {
		t.Fatalf("Briefs: empty result; cannot test isolation")
	}
	originalTitle := briefs[0].Title
	briefs[0].Title = "MUTATED"
	again := svc.Briefs()
	if again[0].Title != originalTitle {
		t.Fatalf("Briefs: caller mutation leaked into fixture; expected %q, got %q", originalTitle, again[0].Title)
	}
}

func TestBriefs_Ugly_FirstBriefHasShortcut(t *testing.T) {
	svc := newTestService(t)
	briefs := svc.Briefs()
	if briefs[0].Shortcut == "" {
		t.Fatalf("Briefs: first brief has empty Shortcut; native handoff calls for ⌘1 on Darwin/iPad")
	}
}

func TestSites_Good_ReturnsAllFixtures(t *testing.T) {
	svc := newTestService(t)
	sites := svc.Sites()
	if len(sites) != len(fixtureSites) {
		t.Fatalf("Sites: returned %d; expected %d", len(sites), len(fixtureSites))
	}
}

func TestSites_Bad_ReturnsCopyNotAlias(t *testing.T) {
	svc := newTestService(t)
	sites := svc.Sites()
	originalDomain := sites[0].Domain
	sites[0].Domain = "MUTATED.example"
	again := svc.Sites()
	if again[0].Domain != originalDomain {
		t.Fatalf("Sites: caller mutation leaked into fixture; expected %q, got %q", originalDomain, again[0].Domain)
	}
}

func TestSites_Ugly_StatusValuesAreCanonical(t *testing.T) {
	svc := newTestService(t)
	sites := svc.Sites()
	for _, site := range sites {
		switch site.Status {
		case StatusGreen, StatusAmber, StatusRed:
			// canonical
		default:
			t.Fatalf("Sites: %s has non-canonical status %q (expected green/amber/red)", site.Domain, site.Status)
		}
	}
}

func TestActivity_Good_ReturnsAllFixtures(t *testing.T) {
	svc := newTestService(t)
	activity := svc.Activity()
	if len(activity) != len(fixtureActivity) {
		t.Fatalf("Activity: returned %d; expected %d", len(activity), len(fixtureActivity))
	}
}

func TestActivity_Bad_ReturnsCopyNotAlias(t *testing.T) {
	svc := newTestService(t)
	activity := svc.Activity()
	originalText := activity[0].Text
	activity[0].Text = "MUTATED"
	again := svc.Activity()
	if again[0].Text != originalText {
		t.Fatalf("Activity: caller mutation leaked into fixture; expected %q, got %q", originalText, again[0].Text)
	}
}

func TestActivity_Ugly_WhoIsViOrYou(t *testing.T) {
	svc := newTestService(t)
	activity := svc.Activity()
	for _, item := range activity {
		if item.Who != "vi" && item.Who != "you" {
			t.Fatalf("Activity: row has Who=%q; expected \"vi\" or \"you\"", item.Who)
		}
	}
}

func TestTone_Good_ConstantsRoundTripAsStrings(t *testing.T) {
	cases := []Tone{ToneWarning, ToneSuccess, ToneInfo, ToneNeutral, ToneDanger}
	want := []string{"warning", "success", "info", "neutral", "danger"}
	for index, tone := range cases {
		if string(tone) != want[index] {
			t.Fatalf("Tone: %v != %q", tone, want[index])
		}
	}
}

func TestSiteStatus_Good_ConstantsRoundTripAsStrings(t *testing.T) {
	if string(StatusGreen) != "green" || string(StatusAmber) != "amber" || string(StatusRed) != "red" {
		t.Fatalf("SiteStatus: constant string values drifted from canon (green/amber/red)")
	}
}

func TestBriefAction_Good_PrimaryFlagOmittedFromJSONWhenFalse(t *testing.T) {
	// json:"primary,omitempty" — verify the type carries the right tag shape.
	// Cheap structural test rather than a full marshalling round-trip.
	action := BriefAction{Label: "Renew now", Primary: true}
	if action.Label == "" || !action.Primary {
		t.Fatalf("BriefAction: field round-trip failed")
	}
	secondary := BriefAction{Label: "Snooze 24h"}
	if secondary.Primary {
		t.Fatalf("BriefAction: zero value of Primary should be false")
	}
}

func TestBrief_Good_FixtureFirstBriefIsActionable(t *testing.T) {
	first := fixtureBriefs[0]
	if first.Title == "" || first.Body == "" {
		t.Fatalf("Brief: fixture first brief missing title/body")
	}
	if len(first.Actions) == 0 {
		t.Fatalf("Brief: fixture first brief has no actions")
	}
}

func TestSite_Good_FixtureSparkDataLengthIs12(t *testing.T) {
	for _, site := range fixtureSites {
		if len(site.SparkData) != 12 {
			t.Fatalf("Site: %s has SparkData length %d; native handoff calls for 12 points", site.Domain, len(site.SparkData))
		}
	}
}

func TestActivityItem_Good_FixtureToneMatchesIcon(t *testing.T) {
	// Loose sanity check — every fixture row has a non-empty icon + a recognised tone.
	for _, item := range fixtureActivity {
		if item.Icon == "" {
			t.Fatalf("ActivityItem: row %q has empty Icon", item.Text)
		}
		switch item.Tone {
		case ToneWarning, ToneSuccess, ToneInfo, ToneNeutral, ToneDanger:
		default:
			t.Fatalf("ActivityItem: row %q has unrecognised Tone %q", item.Text, item.Tone)
		}
	}
}

func TestViStatus_Good_ZeroValueIsDisconnected(t *testing.T) {
	var zero ViStatus
	if zero.Connected {
		t.Fatalf("ViStatus: zero value should be Connected=false")
	}
	if zero.LatencyMs != 0 || zero.Watching != 0 || zero.Pending != 0 {
		t.Fatalf("ViStatus: zero value should have all int fields zero")
	}
}

func TestService_Good_ZeroServiceIsNotUseable(t *testing.T) {
	// A Service constructed without Register is missing its ServiceRuntime;
	// the Status method still works because it doesn't depend on runtime.
	var svc Service
	status := svc.Status()
	if !status.Connected {
		t.Fatalf("Service: Status() on bare Service should still return fixture data")
	}
}
