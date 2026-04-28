package brain

import (
	"context"
	"errors"
	"net/http"
	"time"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	storelib "dappco.re/go/store"

	"dappco.re/go/ide/pkg/config"
)

func TestAX7_New_Good(t *core.T) {
	subsystem := New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil)
	core.AssertNotNil(t, subsystem)
	core.AssertEqual(t, "brain", subsystem.Name())
}

func TestAX7_New_Bad(t *core.T) {
	subsystem := New(config.Brain{Endpoint: "http://brain.local"}, nil, nil, nil, nil)
	core.AssertNotNil(t, subsystem.medium)
	core.AssertEqual(t, "http://brain.local", subsystem.cfg.Endpoint)
}

func TestAX7_New_Ugly(t *core.T) {
	disabled := false
	subsystem := New(config.Brain{Cache: config.Cache{Enabled: &disabled}}, coreio.NewMemoryMedium(), nil, nil, nil)
	core.AssertNotNil(t, subsystem.cache)
	core.AssertFalse(t, subsystem.cache.enabled)
}

func TestAX7_Subsystem_Name_Good(t *core.T) {
	subsystem := New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil)
	name := subsystem.Name()
	core.AssertEqual(t, "brain", name)
}

func TestAX7_Subsystem_Name_Bad(t *core.T) {
	var subsystem *Subsystem
	name := subsystem.Name()
	core.AssertEqual(t, "brain", name)
}

func TestAX7_Subsystem_Name_Ugly(t *core.T) {
	subsystem := &Subsystem{}
	name := subsystem.Name()
	core.AssertEqual(t, "brain", name)
}

func TestAX7_Subsystem_RegisterTools_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil).RegisterTools(service)
	names := ax7BrainToolNames(service.Tools())
	core.AssertTrue(t, names["brain_recall"])
}

func TestAX7_Subsystem_RegisterTools_Bad(t *core.T) {
	subsystem := New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil)
	core.AssertPanics(t, func() { subsystem.RegisterTools(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterTools_Ugly(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil).RegisterTools(service)
	names := ax7BrainToolNames(service.Tools())
	core.AssertTrue(t, names["brain_context"])
}

func ax7BrainToolNames(records []coremcp.ToolRecord) map[string]bool {
	names := map[string]bool{}
	for _, record := range records {
		names[record.Name] = true
	}
	return names
}

func TestAX7_Subsystem_RegisterActions_Good(t *core.T) {
	c := core.New()
	New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil).RegisterActions(c)
	core.AssertTrue(t, c.Action("ide.brain.recall").Exists())
}

func TestAX7_Subsystem_RegisterActions_Bad(t *core.T) {
	subsystem := New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil)
	core.AssertPanics(t, func() { subsystem.RegisterActions(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterActions_Ugly(t *core.T) {
	c := core.New()
	New(config.Brain{}, coreio.NewMemoryMedium(), nil, nil, nil).RegisterActions(c)
	result := c.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "topK", Value: "bad"}))
	core.AssertFalse(t, result.OK)
}

func TestAX7_NewCache_Good(t *core.T) {
	storeInstance, err := storelib.New(":memory:")
	core.RequireNoError(t, err)
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, true)
	core.AssertNotNil(t, cache)
	core.AssertTrue(t, cache.enabled)
}

func TestAX7_NewCache_Bad(t *core.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	core.AssertNotNil(t, cache)
	core.AssertNil(t, cache.store)
}

func TestAX7_NewCache_Ugly(t *core.T) {
	cache := NewCache(nil, "", 0, false)
	core.AssertNotNil(t, cache)
	core.AssertFalse(t, cache.enabled)
}

func TestAX7_Cache_Key_Good(t *core.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	first := cache.Key("workspace", "query")
	second := cache.Key("workspace", "query")
	core.AssertEqual(t, first, second)
	core.AssertLen(t, first, 64)
}

func TestAX7_Cache_Key_Bad(t *core.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	left := cache.Key("workspace", "query")
	right := cache.Key("query", "workspace")
	core.AssertNotEqual(t, left, right)
}

func TestAX7_Cache_Key_Ugly(t *core.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	key := cache.Key("", "agent\x00", "query\nvalue")
	core.AssertNotEmpty(t, key)
	core.AssertLen(t, key, 64)
}

func TestAX7_Cache_Set_Good(t *core.T) {
	storeInstance, err := storelib.New(":memory:")
	core.RequireNoError(t, err)
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, true)
	err = cache.Set(context.Background(), "key", RecallOutput{Count: 1})
	core.AssertNoError(t, err)
}

func TestAX7_Cache_Set_Bad(t *core.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	err := cache.Set(context.Background(), "key", RecallOutput{Count: 1})
	core.AssertNoError(t, err)
}

func TestAX7_Cache_Set_Ugly(t *core.T) {
	storeInstance, err := storelib.New(":memory:")
	core.RequireNoError(t, err)
	cache := NewCache(storeInstance, "ide.brain.cache", 0, true)
	err = cache.Set(context.Background(), "key", RecallOutput{Count: 1})
	core.AssertNoError(t, err)
}

func TestAX7_Cache_Get_Good(t *core.T) {
	storeInstance, err := storelib.New(":memory:")
	core.RequireNoError(t, err)
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, true)
	core.RequireNoError(t, cache.Set(context.Background(), "key", RecallOutput{Count: 1}))
	output, ok := cache.Get(context.Background(), "key")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, 1, output.Count)
}

func TestAX7_Cache_Get_Bad(t *core.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	output, ok := cache.Get(context.Background(), "missing")
	core.AssertFalse(t, ok)
	core.AssertEqual(t, RecallOutput{}, output)
}

func TestAX7_Cache_Get_Ugly(t *core.T) {
	storeInstance, err := storelib.New(":memory:")
	core.RequireNoError(t, err)
	cache := NewCache(storeInstance, "ide.brain.cache", time.Millisecond, true)
	core.RequireNoError(t, cache.Set(context.Background(), "key", RecallOutput{Count: 1}))
	time.Sleep(5 * time.Millisecond)
	_, ok := cache.Get(context.Background(), "key")
	core.AssertFalse(t, ok)
}

func TestAX7_Cache_Clear_Good(t *core.T) {
	storeInstance, err := storelib.New(":memory:")
	core.RequireNoError(t, err)
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, true)
	core.RequireNoError(t, cache.Set(context.Background(), "key", RecallOutput{Count: 1}))
	core.AssertNoError(t, cache.Clear(context.Background()))
	_, ok := cache.Get(context.Background(), "key")
	core.AssertFalse(t, ok)
}

func TestAX7_Cache_Clear_Bad(t *core.T) {
	cache := NewCache(nil, "ide.brain.cache", time.Minute, true)
	err := cache.Clear(context.Background())
	core.AssertNoError(t, err)
	core.AssertNil(t, cache.store)
}

func TestAX7_Cache_Clear_Ugly(t *core.T) {
	storeInstance, err := storelib.New(":memory:")
	core.RequireNoError(t, err)
	cache := NewCache(storeInstance, "ide.brain.cache", time.Minute, false)
	err = cache.Clear(context.Background())
	core.AssertNoError(t, err)
}

func TestAX7_BrainHTTPClient_DoJSON_Good(t *core.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	defer server.Close()
	client := newHTTPClientForTest(server.URL, 1, 3)
	output, err := client.DoJSON(context.Background(), openBrainHTTPRequest{Method: http.MethodGet, Path: "/v1/brain/list", APIKey: "secret"})
	core.AssertNoError(t, err)
	core.AssertEqual(t, true, output["ok"])
}

func TestAX7_BrainHTTPClient_DoJSON_Bad(t *core.T) {
	var client *openBrainHTTPClient
	output, err := client.DoJSON(context.Background(), openBrainHTTPRequest{Method: http.MethodGet, Path: "/v1/brain/list"})
	core.AssertError(t, err)
	core.AssertNil(t, output)
}

func TestAX7_BrainHTTPClient_DoJSON_Ugly(t *core.T) {
	server := newBrainServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":"slow down"}`))
	})
	defer server.Close()
	client := newHTTPClientForTest(server.URL, 1, 1)
	_, err := client.DoJSON(context.Background(), openBrainHTTPRequest{Method: http.MethodGet, Path: "/v1/brain/list", APIKey: "secret"})
	core.AssertTrue(t, IsOpenBrainError(err, OpenBrainErrorStatus))
}

func TestAX7_BrainCircuitBreaker_Allow_Good(t *core.T) {
	breaker := newOpenBrainCircuitBreaker(config.BrainCircuitBreaker{})
	err := breaker.Allow(http.MethodGet, "/v1/brain/list")
	core.AssertNoError(t, err)
	core.AssertEqual(t, 0, breaker.failures)
}

func TestAX7_BrainCircuitBreaker_Allow_Bad(t *core.T) {
	breaker := newOpenBrainCircuitBreaker(config.BrainCircuitBreaker{FailureThreshold: 1})
	breaker.RecordFailure()
	err := breaker.Allow(http.MethodGet, "/v1/brain/list")
	core.AssertTrue(t, IsOpenBrainError(err, OpenBrainErrorCircuitOpen))
}

func TestAX7_BrainCircuitBreaker_Allow_Ugly(t *core.T) {
	disabled := false
	breaker := newOpenBrainCircuitBreaker(config.BrainCircuitBreaker{Enabled: &disabled})
	breaker.RecordFailure()
	err := breaker.Allow(http.MethodGet, "/v1/brain/list")
	core.AssertNoError(t, err)
}

func TestAX7_BrainCircuitBreaker_RecordSuccess_Good(t *core.T) {
	breaker := newOpenBrainCircuitBreaker(config.BrainCircuitBreaker{FailureThreshold: 1})
	breaker.RecordFailure()
	breaker.RecordSuccess()
	core.AssertEqual(t, 0, breaker.failures)
	core.AssertTrue(t, breaker.openedAt.IsZero())
}

func TestAX7_BrainCircuitBreaker_RecordSuccess_Bad(t *core.T) {
	var breaker *openBrainCircuitBreaker
	breaker.RecordSuccess()
	core.AssertNil(t, breaker)
}

func TestAX7_BrainCircuitBreaker_RecordSuccess_Ugly(t *core.T) {
	disabled := false
	breaker := newOpenBrainCircuitBreaker(config.BrainCircuitBreaker{Enabled: &disabled})
	breaker.failures = 5
	breaker.RecordSuccess()
	core.AssertEqual(t, 5, breaker.failures)
}

func TestAX7_BrainCircuitBreaker_RecordFailure_Good(t *core.T) {
	breaker := newOpenBrainCircuitBreaker(config.BrainCircuitBreaker{FailureThreshold: 2})
	breaker.RecordFailure()
	core.AssertEqual(t, 1, breaker.failures)
	core.AssertTrue(t, breaker.openedAt.IsZero())
}

func TestAX7_BrainCircuitBreaker_RecordFailure_Bad(t *core.T) {
	breaker := newOpenBrainCircuitBreaker(config.BrainCircuitBreaker{FailureThreshold: 1})
	breaker.RecordFailure()
	core.AssertFalse(t, breaker.openedAt.IsZero())
}

func TestAX7_BrainCircuitBreaker_RecordFailure_Ugly(t *core.T) {
	var breaker *openBrainCircuitBreaker
	breaker.RecordFailure()
	core.AssertNil(t, breaker)
}

func TestAX7_OpenBrainError_Error_Good(t *core.T) {
	err := &OpenBrainError{Kind: OpenBrainErrorStatus, Method: http.MethodGet, Path: "/x", Status: "500 Internal Server Error", Body: "boom"}
	message := err.Error()
	core.AssertContains(t, message, "500")
	core.AssertContains(t, message, "boom")
}

func TestAX7_OpenBrainError_Error_Bad(t *core.T) {
	var err *OpenBrainError
	message := err.Error()
	core.AssertEqual(t, "", message)
}

func TestAX7_OpenBrainError_Error_Ugly(t *core.T) {
	err := &OpenBrainError{Kind: OpenBrainErrorTransport, Method: http.MethodPost, Path: "/x", Cause: errors.New("refused")}
	message := err.Error()
	core.AssertContains(t, message, "refused")
}

func TestAX7_OpenBrainError_Unwrap_Good(t *core.T) {
	cause := errors.New("root")
	err := &OpenBrainError{Kind: OpenBrainErrorTransport, Cause: cause}
	core.AssertEqual(t, cause, err.Unwrap())
}

func TestAX7_OpenBrainError_Unwrap_Bad(t *core.T) {
	var err *OpenBrainError
	cause := err.Unwrap()
	core.AssertNil(t, cause)
}

func TestAX7_OpenBrainError_Unwrap_Ugly(t *core.T) {
	err := &OpenBrainError{Kind: OpenBrainErrorStatus}
	cause := err.Unwrap()
	core.AssertNil(t, cause)
}

func TestAX7_IsOpenBrainError_Good(t *core.T) {
	err := wrapOpenBrainError("ide.brain.http", "status", &OpenBrainError{Kind: OpenBrainErrorStatus})
	core.AssertTrue(t, IsOpenBrainError(err, OpenBrainErrorStatus))
	core.AssertFalse(t, IsOpenBrainError(err, OpenBrainErrorDecode))
}

func TestAX7_IsOpenBrainError_Bad(t *core.T) {
	err := errors.New("plain")
	core.AssertFalse(t, IsOpenBrainError(err, OpenBrainErrorStatus))
	core.AssertFalse(t, IsOpenBrainError(err, OpenBrainErrorTransport))
}

func TestAX7_IsOpenBrainError_Ugly(t *core.T) {
	core.AssertFalse(t, IsOpenBrainError(nil, OpenBrainErrorStatus))
	core.AssertFalse(t, IsOpenBrainError(&OpenBrainError{Kind: OpenBrainErrorDecode}, OpenBrainErrorStatus))
	core.AssertTrue(t, IsOpenBrainError(&OpenBrainError{Kind: OpenBrainErrorDecode}, OpenBrainErrorDecode))
}
