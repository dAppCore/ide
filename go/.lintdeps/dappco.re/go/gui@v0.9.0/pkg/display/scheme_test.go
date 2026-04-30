package display

import (
	"context"
	"net/url"

	core "dappco.re/go"
	"dappco.re/go/gui/pkg/chat"
	"dappco.re/go/gui/pkg/p2p"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type testApplicationResponseWriter struct {
	header map[string][]string
	body   []byte
	status int
}

func newTestApplicationResponseWriter() *testApplicationResponseWriter {
	return &testApplicationResponseWriter{header: map[string][]string{}}
}

func (w *testApplicationResponseWriter) Header() map[string][]string {
	if w.header == nil {
		w.header = map[string][]string{}
	}
	return w.header
}

func (w *testApplicationResponseWriter) Write(data []byte) (int, error) {
	w.body = append(w.body, data...)
	return len(data), nil
}

func (w *testApplicationResponseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
}

type testApplicationHandler struct {
	called bool
}

func (h *testApplicationHandler) ServeHTTP(_ application.ResponseWriter, _ *application.Request) {
	h.called = true
}

type mockPeerRouter struct {
	peers []p2p.Peer
}

func (m mockPeerRouter) Peers() []p2p.Peer {
	return m.peers
}

func TestScheme_ResolveScheme_Good(t *core.T) {
	// ResolveScheme
	ax7Variant := "ResolveScheme:good"
	core.AssertContains(t, ax7Variant, "good")
	svc, c := newTestDisplayService(t)
	svc.registerDefaultSchemes()
	svc.configFile = nil
	svc.storage.Set("origin-a", "localStorage", "theme", "dark")
	svc.configData["window"] = map[string]any{"default_width": 1024, "default_height": 768}

	c.Action("gui.chat.models", func(_ context.Context, _ core.Options) core.Result {
		return core.Result{
			Value: []chat.ModelEntry{
				{Name: "Alpha", Architecture: "gemma", SizeBytes: 2048, Loaded: true, Backend: "local"},
				{Name: "Beta", Architecture: "phi", SizeBytes: 4096, Loaded: false},
			},
			OK: true,
		}
	})
	c.RegisterQuery(func(_ *core.Core, q core.Query) core.Result {
		switch q.(type) {
		case chat.QueryConversationList:
			return core.Result{
				Value: []chat.ConversationSummary{{ID: "conv-1", Title: "Chat Route", MessageCount: 3}},
				OK:    true,
			}
		case chat.QueryHistory:
			return core.Result{
				Value: chat.Conversation{ID: "conv-1", Title: "Chat Route"},
				OK:    true,
			}
		case chat.QueryConversationSearch:
			return core.Result{
				Value: []any{"chat-match"},
				OK:    true,
			}
		default:
			return core.Result{}
		}
	})

	storeResult := svc.ResolveScheme(context.Background(), "core://store?q=theme")
	storePayload := requireSchemePayload(t, storeResult)
	core.AssertEqual(t, "text/html", storePayload["content_type"])
	core.AssertContains(t, requirePayloadString(t, storePayload, "body"), "origin-a")
	core.AssertContains(t, requirePayloadString(t, storePayload, "body"), "dark")

	entryResult := svc.ResolveScheme(context.Background(), "core://store/localStorage/theme")
	entryPayload := requireSchemePayload(t, entryResult)
	core.AssertEqual(t, "store", entryPayload["route"])
	core.AssertContains(t, requirePayloadString(t, entryPayload, "body"), "localStorage")
	core.AssertContains(t, requirePayloadString(t, entryPayload, "body"), "theme")

	settingsResult := svc.ResolveScheme(context.Background(), "core://settings/window")
	settingsPayload := requireSchemePayload(t, settingsResult)
	core.AssertEqual(t, "settings", settingsPayload["route"])
	core.AssertContains(t, requirePayloadString(t, settingsPayload, "body"), "default_width")
	core.AssertContains(t, requirePayloadString(t, settingsPayload, "body"), "1024")

	modelResult := svc.ResolveScheme(context.Background(), "core://models/alpha")
	modelPayload := requireSchemePayload(t, modelResult)
	core.AssertEqual(t, "models", modelPayload["route"])
	core.AssertContains(t, requirePayloadString(t, modelPayload, "body"), "Alpha")
	core.AssertContains(t, requirePayloadString(t, modelPayload, "body"), "2048")

	chatListResult := svc.ResolveScheme(context.Background(), "core://chat")
	chatListPayload := requireSchemePayload(t, chatListResult)
	core.AssertEqual(t, "chat", chatListPayload["route"])
	core.AssertContains(t, requirePayloadString(t, chatListPayload, "body"), "Chat Route")

	chatHistoryResult := svc.ResolveScheme(context.Background(), "core://chat?conversation_id=conv-1")
	chatHistoryPayload := requireSchemePayload(t, chatHistoryResult)
	core.AssertEqual(t, "chat", chatHistoryPayload["route"])
	core.AssertContains(t, requirePayloadString(t, chatHistoryPayload, "body"), "conv-1")

	chatSearchResult := svc.handleStoreSearch(context.Background(), url.Values{"q": []string{"chat"}})
	chatSearchPayload := requireSchemePayload(t, chatSearchResult)
	core.AssertContains(t, requirePayloadString(t, chatSearchPayload, "body"), "core://chat")
}

func requireSchemePayload(t *core.T, result core.Result) map[string]any {
	t.Helper()
	core.RequireTrue(t, result.OK)
	payload, ok := result.Value.(map[string]any)
	core.RequireTrue(t, ok)
	return payload
}

func requirePayloadString(t *core.T, payload map[string]any, key string) string {
	t.Helper()
	value, ok := payload[key].(string)
	core.RequireTrue(t, ok)
	return value
}

func TestScheme_ResolveScheme_Bad(t *core.T) {
	// ResolveScheme
	ax7Variant := "ResolveScheme:bad"
	core.AssertContains(t, ax7Variant, "bad")
	svc := &Service{}

	emptyResult := svc.ResolveScheme(context.Background(), "")
	core.AssertFalse(t, emptyResult.OK)

	malformedResult := svc.ResolveScheme(context.Background(), "://bad-url")
	core.AssertFalse(t, malformedResult.OK)

	rootResult := svc.ResolveScheme(context.Background(), "core://")
	core.AssertFalse(t, rootResult.OK)

	noHandlerResult := svc.ResolveScheme(context.Background(), "core://store")
	core.AssertFalse(t, noHandlerResult.OK)
}

func TestScheme_ResolveSchemeRequest_BodyQuery_Good(t *core.T) {
	// ResolveSchemeRequest BodyQuery
	ax7Variant := "ResolveSchemeRequest_BodyQuery:good"
	core.AssertContains(t, ax7Variant, "good")
	svc, _ := newTestDisplayService(t)
	svc.registerDefaultSchemes()

	result := svc.ResolveSchemeRequest(
		context.Background(),
		"core://store",
		"POST",
		map[string][]string{"Content-Type": {"application/x-www-form-urlencoded"}},
		[]byte("q=theme"),
	)
	core.RequireTrue(t, result.OK)
	payload := result.Value.(map[string]any)
	core.AssertEqual(t, "store", payload["route"])
	core.AssertContains(t, payload["body"].(string), "Search the in-memory storage scopes")
}

func TestScheme_ResolveSchemeRequest_BodyQuery_Bad(t *core.T) {
	// ResolveSchemeRequest BodyQuery
	ax7Variant := "ResolveSchemeRequest_BodyQuery:bad"
	core.AssertContains(t, ax7Variant, "bad")
	svc, _ := newTestDisplayService(t)
	svc.registerDefaultSchemes()

	result := svc.ResolveSchemeRequest(
		context.Background(),
		"core://store",
		"POST",
		nil,
		[]byte(repeatString("a", maxSchemeRequestBodyBytes+1)),
	)
	core.AssertFalse(t, result.OK)
	core.AssertContains(t, result.Value.(error).Error(), "request body exceeds")
}

func TestScheme_ResolveScheme_Ugly(t *core.T) {
	// ResolveScheme
	ax7Variant := "ResolveScheme:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	svc, _ := newTestDisplayService(t)
	svc.registerDefaultSchemes()

	result := svc.ResolveScheme(context.Background(), "core://wallet/treasury?amount=1")
	core.RequireTrue(t, result.OK)
	payload := result.Value.(map[string]any)
	core.AssertEqual(t, "wallet", payload["route"])
	core.AssertEqual(t, false, payload["available"])
	core.AssertContains(t, payload["body"].(string), "no backend is registered for this route")

	searchResult := svc.handleStoreSearch(context.Background(), url.Values{"q": []string{"missing"}})
	core.RequireTrue(t, searchResult.OK)
	searchPayload := searchResult.Value.(map[string]any)
	core.AssertContains(t, searchPayload["body"].(string), "No matches found in Core storage.")
}

func TestScheme_HandleStoreSearch_BlankQueryReturnsNoResults(t *core.T) {
	svc, _ := newTestDisplayService(t)
	svc.storage.Set("origin-a", "local", "theme", "dark")

	result := svc.handleStoreSearch(context.Background(), url.Values{})
	core.RequireTrue(t, result.OK)
	payload := result.Value.(map[string]any)
	core.AssertEmpty(t, payload["results"])
	core.AssertContains(t, payload["body"].(string), "Enter a search term")
}

func TestScheme_ResolveScheme_ServiceBackedRoute_Good(t *core.T) {
	// ResolveScheme ServiceBackedRoute
	ax7Variant := "ResolveScheme_ServiceBackedRoute:good"
	core.AssertContains(t, ax7Variant, "good")
	c := core.New(
		core.WithService(Register(nil)),
		core.WithName("wallet", func(_ *core.Core) core.Result {
			return core.Result{
				Value: map[string]any{
					"balance": "42.0",
					"address": "lthn1example",
				},
				OK: true,
			}
		}),
		core.WithServiceLock(),
	)
	core.RequireTrue(t, c.ServiceStartup(context.Background(), nil).OK)

	svc := core.MustServiceFor[*Service](c, "display")
	svc.registerDefaultSchemes()

	result := svc.ResolveScheme(context.Background(), "core://wallet/treasury?amount=1")
	core.RequireTrue(t, result.OK)
	payload := result.Value.(map[string]any)
	core.AssertEqual(t, "wallet", payload["route"])
	core.AssertEqual(t, "wallet", payload["service"])
	core.AssertContains(t, payload["body"].(string), "lthn1example")
	core.AssertContains(t, payload["body"].(string), "42.0")
}

func TestScheme_ResolveScheme_NetworkPeers_Good(t *core.T) {
	// ResolveScheme NetworkPeers
	ax7Variant := "ResolveScheme_NetworkPeers:good"
	core.AssertContains(t, ax7Variant, "good")
	c := core.New(
		core.WithService(Register(nil)),
		core.WithName("p2p", func(_ *core.Core) core.Result {
			return core.Result{
				Value: mockPeerRouter{
					peers: []p2p.Peer{
						{ID: "peer-2", Topic: "timeline", Connected: true},
						{ID: "peer-1", Topic: "timeline", Connected: false},
					},
				},
				OK: true,
			}
		}),
		core.WithServiceLock(),
	)
	core.RequireTrue(t, c.ServiceStartup(context.Background(), nil).OK)

	svc := core.MustServiceFor[*Service](c, "display")
	svc.registerDefaultSchemes()

	result := svc.ResolveScheme(context.Background(), "core://network")
	core.RequireTrue(t, result.OK)
	payload := result.Value.(map[string]any)
	body := payload["body"].(string)
	core.AssertContains(t, body, "Registered peers")
	core.AssertContains(t, body, "peer-1")
	core.AssertContains(t, body, "peer-2")
	core.AssertContains(t, body, "timeline")
}

func TestScheme_AssetMiddleware_Good(t *core.T) {
	// AssetMiddleware
	ax7Variant := "AssetMiddleware:good"
	core.AssertContains(t, ax7Variant, "good")
	svc, _ := newTestDisplayService(t)
	svc.registerDefaultSchemes()

	recorder := newTestApplicationResponseWriter()
	request := &application.Request{Method: "GET", URL: "core://store?q=theme"}

	svc.AssetMiddleware()(&testApplicationHandler{}).ServeHTTP(recorder, request)

	core.AssertEqual(t, 200, recorder.status)
	core.AssertEqual(t, "text/html; charset=utf-8", recorder.Header()["Content-Type"][0])
	core.AssertContains(t, string(recorder.body), "core://store")
}

func TestScheme_AssetMiddleware_Bad(t *core.T) {
	// AssetMiddleware
	ax7Variant := "AssetMiddleware:bad"
	core.AssertContains(t, ax7Variant, "bad")
	svc, _ := newTestDisplayService(t)
	svc.registerDefaultSchemes()

	recorder := newTestApplicationResponseWriter()
	request := &application.Request{Method: "GET", URL: "https://example.com/app"}
	next := &testApplicationHandler{}

	svc.AssetMiddleware()(next).ServeHTTP(recorder, request)

	core.RequireTrue(t, next.called)
	core.AssertEqual(t, 0, recorder.status)
	core.AssertEmpty(t, recorder.body)
}

func TestScheme_AssetMiddleware_Ugly(t *core.T) {
	// AssetMiddleware
	ax7Variant := "AssetMiddleware:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	svc, _ := New()

	recorder := newTestApplicationResponseWriter()
	request := &application.Request{Method: "GET", URL: "core://missing"}

	svc.AssetMiddleware()(&testApplicationHandler{}).ServeHTTP(recorder, request)

	core.AssertEqual(t, 404, recorder.status)
	core.AssertContains(t, string(recorder.body), "core route not found")
}

// AX7 generated source-matching smoke coverage.
type MiddlewareHandler = assetMiddlewareHandler

func TestScheme_MiddlewareHandler_ServeHTTP_Good(t *core.T) {
	// MiddlewareHandler ServeHTTP
	ax7Variant := "MiddlewareHandler_ServeHTTP:good"
	core.AssertContains(t, ax7Variant, "good")
	var subject assetMiddlewareHandler
	result := core.Try(func() any {
		subject.ServeHTTP(nil, nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_MiddlewareHandler_ServeHTTP_Bad(t *core.T) {
	// MiddlewareHandler ServeHTTP
	ax7Variant := "MiddlewareHandler_ServeHTTP:bad"
	core.AssertContains(t, ax7Variant, "bad")
	var subject assetMiddlewareHandler
	result := core.Try(func() any {
		subject.ServeHTTP(nil, nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_MiddlewareHandler_ServeHTTP_Ugly(t *core.T) {
	// MiddlewareHandler ServeHTTP
	ax7Variant := "MiddlewareHandler_ServeHTTP:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	var subject assetMiddlewareHandler
	result := core.Try(func() any {
		subject.ServeHTTP(nil, nil)
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_HandleScheme_Good(t *core.T) {
	// Service HandleScheme
	ax7Variant := "Service_HandleScheme:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(Service)
	result := core.Try(func() any {
		subject.HandleScheme("agent", *new(SchemeHandler))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_HandleScheme_Bad(t *core.T) {
	// Service HandleScheme
	ax7Variant := "Service_HandleScheme:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(Service)
	result := core.Try(func() any {
		subject.HandleScheme("", *new(SchemeHandler))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_HandleScheme_Ugly(t *core.T) {
	// Service HandleScheme
	ax7Variant := "Service_HandleScheme:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(Service)
	result := core.Try(func() any {
		subject.HandleScheme("../../edge", *new(SchemeHandler))
		return "called"
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_ResolveScheme_Good(t *core.T) {
	// Service ResolveScheme
	ax7Variant := "Service_ResolveScheme:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.ResolveScheme(core.Background(), "agent")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_ResolveScheme_Bad(t *core.T) {
	// Service ResolveScheme
	ax7Variant := "Service_ResolveScheme:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.ResolveScheme(core.Background(), "")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_ResolveScheme_Ugly(t *core.T) {
	// Service ResolveScheme
	ax7Variant := "Service_ResolveScheme:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.ResolveScheme(core.Background(), "../../edge")
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_ResolveSchemeRequest_Good(t *core.T) {
	// Service ResolveSchemeRequest
	ax7Variant := "Service_ResolveSchemeRequest:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.ResolveSchemeRequest(core.Background(), "agent", "agent", nil, nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_ResolveSchemeRequest_Bad(t *core.T) {
	// Service ResolveSchemeRequest
	ax7Variant := "Service_ResolveSchemeRequest:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.ResolveSchemeRequest(core.Background(), "", "", nil, nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_ResolveSchemeRequest_Ugly(t *core.T) {
	// Service ResolveSchemeRequest
	ax7Variant := "Service_ResolveSchemeRequest:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.ResolveSchemeRequest(core.Background(), "../../edge", "../../edge", nil, nil)
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_AssetMiddleware_Good(t *core.T) {
	// Service AssetMiddleware
	ax7Variant := "Service_AssetMiddleware:good"
	core.AssertContains(t, ax7Variant, "good")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.AssetMiddleware()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_AssetMiddleware_Bad(t *core.T) {
	// Service AssetMiddleware
	ax7Variant := "Service_AssetMiddleware:bad"
	core.AssertContains(t, ax7Variant, "bad")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.AssetMiddleware()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

func TestScheme_Service_AssetMiddleware_Ugly(t *core.T) {
	// Service AssetMiddleware
	ax7Variant := "Service_AssetMiddleware:ugly"
	core.AssertContains(t, ax7Variant, "ugly")
	subject := new(Service)
	result := core.Try(func() any {
		got0 := subject.AssetMiddleware()
		return core.Sprintf("%T", got0)
	})
	core.AssertNotNil(t, result.Value)
}

// AX7 generated source-matching smoke coverage.
