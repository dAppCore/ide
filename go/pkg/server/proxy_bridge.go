// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// handleProxy is the dAppServer-pattern reverse proxy. Any URL passed via the
// `url` query param is fetched, headers like Content-Security-Policy and
// X-Frame-Options stripped, and HTML responses get a <base> tag injected so
// relative resources still resolve back to the upstream origin.
//
// The point: a window pointed at /proxy?url=https://anthropic.com/news loads
// the page from origin 127.0.0.1:9877 — the same origin as our /internal/
// endpoints — so the wrapped-script fetch-back used by webview_eval works
// without CSP or CORS interference. Every webpage becomes a programmable,
// agent-addressable surface.
//
//	GET /proxy?url=https://anthropic.com/news
//
// The proxy is loopback-only by virtue of the bridge listener (127.0.0.1).
func (b *MCPBridge) handleProxy(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("url")
	if target == "" {
		http.Error(w, "missing url query param", http.StatusBadRequest)
		return
	}
	parsed, err := url.Parse(target)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		http.Error(w, "scheme must be http or https", http.StatusBadRequest)
		return
	}

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, parsed.String(), nil)
	if err != nil {
		http.Error(w, "build upstream request: "+err.Error(), http.StatusBadGateway)
		return
	}
	// Forward a sane user agent so sites that gate on it serve real content.
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 core-ide/0.1")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "upstream fetch failed: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Forward content-type so HTML/JSON/etc render right. Strip the headers
	// that would defeat the agent-driveable property (CSP, X-Frame-Options,
	// X-Content-Type-Options nosniff doesn't matter much here).
	for _, h := range []string{"Content-Type", "Cache-Control", "Date", "Content-Language", "Content-Encoding"} {
		if v := resp.Header.Get(h); v != "" {
			w.Header().Set(h, v)
		}
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	// Explicitly no CSP. Explicitly frame-able.

	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(strings.ToLower(contentType), "text/html") {
		// Non-HTML: just stream through.
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, resp.Body)
		return
	}

	// HTML: read fully so we can inject a <base> tag. Keeps relative <img>,
	// <script>, <link> requests resolving to the upstream origin.
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "read upstream body: "+err.Error(), http.StatusBadGateway)
		return
	}
	html := string(body)
	baseTag := `<base href="` + parsed.Scheme + "://" + parsed.Host + `/">`
	// Wails 3 gates ExecJS behind a runtimeLoaded flag that only flips when
	// the page emits 'wails:runtime:ready' via the webkit external message
	// handler. Foreign pages don't ship the Wails runtime, so without this
	// shim every ExecJS call queues forever. One-line postMessage flips the
	// flag, draining the queue and unlocking webview_eval / webview_url /
	// every other JS-driven bridge tool against this page.
	bootShim := `<script>(function(){try{if(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.external){window.webkit.messageHandlers.external.postMessage('wails:runtime:ready');}}catch(e){}})();</script>`
	injection := baseTag + bootShim
	// Insert just after <head> if present; otherwise prepend to body.
	lower := strings.ToLower(html)
	if idx := strings.Index(lower, "<head>"); idx >= 0 {
		html = html[:idx+6] + injection + html[idx+6:]
	} else if idx := strings.Index(lower, "<head "); idx >= 0 {
		// <head with attributes>
		end := strings.Index(html[idx:], ">")
		if end > 0 {
			cut := idx + end + 1
			html = html[:cut] + injection + html[cut:]
		}
	} else {
		html = injection + html
	}

	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, strings.NewReader(html))
}
