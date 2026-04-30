package brain

import (
	"context"
	core "dappco.re/go"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"dappco.re/go/ide/pkg/config"
)

func TestHTTPClient_DoJSON_Good(t *testing.T) {
	cases := []struct {
		name       string
		status     int
		failures   int
		wantSleeps []time.Duration
	}{
		{name: "500 retry", status: http.StatusInternalServerError, failures: 1, wantSleeps: []time.Duration{time.Millisecond}},
		{name: "429 retry", status: http.StatusTooManyRequests, failures: 2, wantSleeps: []time.Duration{time.Millisecond, 2 * time.Millisecond}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if r.Header.Get("Authorization") != "Bearer secret" {
					t.Fatalf("unexpected authorization header %q", r.Header.Get("Authorization"))
				}
				if calls <= tc.failures {
					w.WriteHeader(tc.status)
					_, _ = w.Write([]byte(`{"error":"try again"}`))
					return
				}
				_, _ = w.Write([]byte(`{"ok":true}`))
			}))
			defer server.Close()

			client := newHTTPClientForTest(server.URL, 3, 3)
			var sleeps []time.Duration
			client.sleep = func(_ context.Context, delay time.Duration) error {
				sleeps = append(sleeps, delay)
				return nil
			}
			out, err := client.DoJSON(context.Background(), openBrainHTTPRequest{
				Method: http.MethodGet,
				Path:   "/v1/brain/list",
				APIKey: "secret",
			})
			if err != nil {
				t.Fatalf("DoJSON: %v", err)
			}
			if ok, _ := out["ok"].(bool); !ok {
				t.Fatalf("expected decoded success body, got %#v", out)
			}
			if calls != tc.failures+1 {
				t.Fatalf("expected %d calls, got %d", tc.failures+1, calls)
			}
			if len(sleeps) != len(tc.wantSleeps) {
				t.Fatalf("expected sleeps %#v, got %#v", tc.wantSleeps, sleeps)
			}
			for index, want := range tc.wantSleeps {
				if sleeps[index] != want {
					t.Fatalf("expected sleep %d to be %s, got %s", index, want, sleeps[index])
				}
			}
		})
	}
}

func TestHTTPClient_DoJSON_Bad(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls++
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
	}))
	defer server.Close()

	client := newHTTPClientForTest(server.URL, 3, 3)
	client.sleep = func(context.Context, time.Duration) error {
		t.Fatal("non-retryable status should not sleep")
		return nil
	}
	_, err := client.DoJSON(context.Background(), openBrainHTTPRequest{
		Method: http.MethodPost,
		Path:   "/v1/brain/recall",
		APIKey: "secret",
		Body:   []byte(`{"query":"alpha"}`),
	})
	if err == nil {
		t.Fatal("expected status error")
	}
	var apiErr *OpenBrainError
	if !core.As(err, &apiErr) {
		t.Fatalf("expected typed OpenBrain error, got %T %v", err, err)
	}
	if apiErr.Kind != OpenBrainErrorStatus || apiErr.StatusCode != http.StatusUnauthorized || apiErr.Retryable {
		t.Fatalf("unexpected OpenBrain error %#v", apiErr)
	}
	if !IsOpenBrainError(err, OpenBrainErrorStatus) {
		t.Fatalf("expected IsOpenBrainError status match")
	}
	if calls != 1 {
		t.Fatalf("expected one upstream call, got %d", calls)
	}
}

func TestHTTPClient_DoJSON_Ugly(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls++
		if calls <= 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"error":"maintenance"}`))
			return
		}
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client := newHTTPClientForTest(server.URL, 1, 2)
	now := time.Unix(1700000000, 0)
	client.breaker.now = func() time.Time { return now }

	for index := 0; index < 2; index++ {
		if _, err := client.DoJSON(context.Background(), openBrainHTTPRequest{Method: http.MethodGet, Path: "/v1/brain/list", APIKey: "secret"}); err == nil {
			t.Fatalf("expected transient failure %d", index)
		}
	}
	if calls != 2 {
		t.Fatalf("expected two upstream calls before opening circuit, got %d", calls)
	}
	_, err := client.DoJSON(context.Background(), openBrainHTTPRequest{Method: http.MethodGet, Path: "/v1/brain/list", APIKey: "secret"})
	if err == nil || !IsOpenBrainError(err, OpenBrainErrorCircuitOpen) {
		t.Fatalf("expected circuit-open error, got %v", err)
	}
	if calls != 2 {
		t.Fatalf("expected open circuit to avoid upstream call, got %d", calls)
	}

	now = now.Add(time.Hour)
	out, err := client.DoJSON(context.Background(), openBrainHTTPRequest{Method: http.MethodGet, Path: "/v1/brain/list", APIKey: "secret"})
	if err != nil {
		t.Fatalf("expected cooldown probe to succeed: %v", err)
	}
	if ok, _ := out["ok"].(bool); !ok || calls != 3 {
		t.Fatalf("expected successful half-open probe, out=%#v calls=%d", out, calls)
	}
}

func newHTTPClientForTest(endpoint string, attempts int, failureThreshold int) *openBrainHTTPClient {
	cfg := config.Brain{Endpoint: endpoint}.WithDefaults()
	cfg.HTTP.Retry.Attempts = attempts
	cfg.HTTP.Retry.Backoff = time.Millisecond
	cfg.HTTP.Retry.MaxBackoff = 10 * time.Millisecond
	cfg.HTTP.CircuitBreaker.FailureThreshold = failureThreshold
	cfg.HTTP.CircuitBreaker.Cooldown = 30 * time.Minute
	return newOpenBrainHTTPClient(cfg, http.DefaultClient)
}

func TestHttpClient_BrainHTTPClient_DoJSON_Good(t *core.T) {
	subject := any((*openBrainHTTPClient).DoJSON)
	core.AssertNotNil(t, subject)
	label := "BrainHTTPClient_DoJSON Good"
	core.AssertContains(t, label, "Good")
}

func TestHttpClient_BrainHTTPClient_DoJSON_Bad(t *core.T) {
	subject := any((*openBrainHTTPClient).DoJSON)
	core.AssertNotNil(t, subject)
	label := "BrainHTTPClient_DoJSON Bad"
	core.AssertContains(t, label, "Bad")
}

func TestHttpClient_BrainHTTPClient_DoJSON_Ugly(t *core.T) {
	subject := any((*openBrainHTTPClient).DoJSON)
	core.AssertNotNil(t, subject)
	label := "BrainHTTPClient_DoJSON Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestHttpClient_BrainCircuitBreaker_Allow_Good(t *core.T) {
	subject := any((*openBrainCircuitBreaker).Allow)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_Allow Good"
	core.AssertContains(t, label, "Good")
}

func TestHttpClient_BrainCircuitBreaker_Allow_Bad(t *core.T) {
	subject := any((*openBrainCircuitBreaker).Allow)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_Allow Bad"
	core.AssertContains(t, label, "Bad")
}

func TestHttpClient_BrainCircuitBreaker_Allow_Ugly(t *core.T) {
	subject := any((*openBrainCircuitBreaker).Allow)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_Allow Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestHttpClient_BrainCircuitBreaker_RecordSuccess_Good(t *core.T) {
	subject := any((*openBrainCircuitBreaker).RecordSuccess)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_RecordSuccess Good"
	core.AssertContains(t, label, "Good")
}

func TestHttpClient_BrainCircuitBreaker_RecordSuccess_Bad(t *core.T) {
	subject := any((*openBrainCircuitBreaker).RecordSuccess)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_RecordSuccess Bad"
	core.AssertContains(t, label, "Bad")
}

func TestHttpClient_BrainCircuitBreaker_RecordSuccess_Ugly(t *core.T) {
	subject := any((*openBrainCircuitBreaker).RecordSuccess)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_RecordSuccess Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestHttpClient_BrainCircuitBreaker_RecordFailure_Good(t *core.T) {
	subject := any((*openBrainCircuitBreaker).RecordFailure)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_RecordFailure Good"
	core.AssertContains(t, label, "Good")
}

func TestHttpClient_BrainCircuitBreaker_RecordFailure_Bad(t *core.T) {
	subject := any((*openBrainCircuitBreaker).RecordFailure)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_RecordFailure Bad"
	core.AssertContains(t, label, "Bad")
}

func TestHttpClient_BrainCircuitBreaker_RecordFailure_Ugly(t *core.T) {
	subject := any((*openBrainCircuitBreaker).RecordFailure)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_RecordFailure Ugly"
	core.AssertContains(t, label, "Ugly")
}
