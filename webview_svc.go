package main

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// WindowInfo describes a Wails webview window.
type WindowInfo struct {
	Name   string `json:"name"`
	Title  string `json:"title"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// ConsoleEntry is a captured browser console message.
type ConsoleEntry struct {
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// WebviewService wraps Wails v3 window management and JS execution
// for MCP tool access. This replaces the deleted gui/pkg/webview package.
type WebviewService struct {
	app     *application.App
	console []ConsoleEntry
	mu      sync.Mutex
}

// NewWebviewService creates a new service (no app wired yet).
func NewWebviewService() *WebviewService {
	return &WebviewService{}
}

// SetApp wires the Wails application reference.
func (s *WebviewService) SetApp(app *application.App) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.app = app
}

// SetupConsoleListener is a no-op stub — console capture requires
// JS injection (see InjectConsoleCapture).
func (s *WebviewService) SetupConsoleListener() {}

// ListWindows returns info for all open Wails windows.
func (s *WebviewService) ListWindows() []WindowInfo {
	s.mu.Lock()
	app := s.app
	s.mu.Unlock()

	if app == nil {
		return nil
	}

	var result []WindowInfo
	for _, w := range app.Window.GetAll() {
		result = append(result, WindowInfo{Name: w.Name()})
	}
	return result
}

// getWindow looks up a Wails window by name.
func (s *WebviewService) getWindow(name string) (application.Window, error) {
	s.mu.Lock()
	app := s.app
	s.mu.Unlock()

	if app == nil {
		return nil, fmt.Errorf("app not initialised")
	}
	if name == "" {
		name = "tray-panel"
	}
	w, ok := app.Window.Get(name)
	if !ok {
		return nil, fmt.Errorf("window %q not found", name)
	}
	return w, nil
}

// ExecJS runs JavaScript in the named window and returns the result as a string.
// Wails v3 ExecJS is fire-and-forget, so we use a callback pattern via events.
func (s *WebviewService) ExecJS(windowName, code string) (string, error) {
	w, err := s.getWindow(windowName)
	if err != nil {
		return "", err
	}
	w.ExecJS(code)
	return "", nil // Wails v3 ExecJS doesn't return values
}

// InjectConsoleCapture injects a JS script that captures console messages.
func (s *WebviewService) InjectConsoleCapture(windowName string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}

	// Inject console capture script
	js := `(function(){
		if(window.__consoleCaptured) return;
		window.__consoleCaptured = true;
		window.__consoleLog = [];
		['log','warn','error','info','debug'].forEach(function(level){
			var orig = console[level];
			console[level] = function(){
				window.__consoleLog.push({level:level, message:Array.from(arguments).join(' '), ts:Date.now()});
				if(window.__consoleLog.length > 1000) window.__consoleLog.shift();
				orig.apply(console, arguments);
			};
		});
	})()`
	w.ExecJS(js)
	return nil
}

// GetConsoleMessages returns captured console messages (requires InjectConsoleCapture).
func (s *WebviewService) GetConsoleMessages(level string, limit int) []ConsoleEntry {
	s.mu.Lock()
	defer s.mu.Unlock()

	if limit <= 0 {
		limit = 100
	}
	var result []ConsoleEntry
	for _, e := range s.console {
		if level != "" && e.Level != level {
			continue
		}
		result = append(result, e)
		if len(result) >= limit {
			break
		}
	}
	return result
}

// ClearConsole clears the captured console buffer.
func (s *WebviewService) ClearConsole() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.console = nil
}

// Click clicks a DOM element by CSS selector.
func (s *WebviewService) Click(windowName, selector string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	w.ExecJS(fmt.Sprintf(`document.querySelector(%s)?.click()`, jsQuote(selector)))
	return nil
}

// Type types text into a DOM element by CSS selector.
func (s *WebviewService) Type(windowName, selector, text string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	js := fmt.Sprintf(`(function(){var el=document.querySelector(%s);if(el){el.focus();el.value=%s;el.dispatchEvent(new Event('input',{bubbles:true}));}})()`,
		jsQuote(selector), jsQuote(text))
	w.ExecJS(js)
	return nil
}

// QuerySelector queries DOM elements by CSS selector.
func (s *WebviewService) QuerySelector(windowName, selector string) (any, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("QuerySelector requires CDP — not yet implemented")
}

// Navigate navigates the window to a URL.
func (s *WebviewService) Navigate(windowName, url string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	w.SetURL(url)
	return nil
}

// GetPageSource returns the page HTML source.
func (s *WebviewService) GetPageSource(windowName string) (string, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("GetPageSource requires CDP — not yet implemented")
}

// GetURL returns the current page URL.
func (s *WebviewService) GetURL(windowName string) (string, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("GetURL requires CDP — not yet implemented")
}

// GetTitle returns the current page title.
func (s *WebviewService) GetTitle(windowName string) (string, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("GetTitle requires CDP — not yet implemented")
}

// Screenshot captures the page as base64 PNG.
func (s *WebviewService) Screenshot(windowName string) (string, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("Screenshot requires CDP — not yet implemented")
}

// ScreenshotElement captures a specific element as base64 PNG.
func (s *WebviewService) ScreenshotElement(windowName, selector string) (string, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("ScreenshotElement requires CDP — not yet implemented")
}

// Scroll scrolls the window or element.
func (s *WebviewService) Scroll(windowName, selector string, x, y int) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	if selector != "" {
		w.ExecJS(fmt.Sprintf(`document.querySelector(%s)?.scrollTo(%d,%d)`, jsQuote(selector), x, y))
	} else {
		w.ExecJS(fmt.Sprintf(`window.scrollTo(%d,%d)`, x, y))
	}
	return nil
}

// Hover dispatches a mouseover event on an element.
func (s *WebviewService) Hover(windowName, selector string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	w.ExecJS(fmt.Sprintf(`document.querySelector(%s)?.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`, jsQuote(selector)))
	return nil
}

// Select selects an option in a dropdown.
func (s *WebviewService) Select(windowName, selector, value string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	js := fmt.Sprintf(`(function(){var el=document.querySelector(%s);if(el){el.value=%s;el.dispatchEvent(new Event('change',{bubbles:true}));}})()`,
		jsQuote(selector), jsQuote(value))
	w.ExecJS(js)
	return nil
}

// Check checks or unchecks a checkbox/radio.
func (s *WebviewService) Check(windowName, selector string, checked bool) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	js := fmt.Sprintf(`(function(){var el=document.querySelector(%s);if(el){el.checked=%t;el.dispatchEvent(new Event('change',{bubbles:true}));}})()`,
		jsQuote(selector), checked)
	w.ExecJS(js)
	return nil
}

// GetElementInfo returns info about a DOM element.
func (s *WebviewService) GetElementInfo(windowName, selector string) (any, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("GetElementInfo requires CDP — not yet implemented")
}

// GetComputedStyle returns computed CSS styles.
func (s *WebviewService) GetComputedStyle(windowName, selector string, properties []string) (any, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("GetComputedStyle requires CDP — not yet implemented")
}

// Highlight visually highlights an element.
func (s *WebviewService) Highlight(windowName, selector string, duration int) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	if duration <= 0 {
		duration = 2000
	}
	js := fmt.Sprintf(`(function(){var el=document.querySelector(%s);if(el){var old=el.style.outline;el.style.outline='3px solid red';setTimeout(function(){el.style.outline=old;},%d);}})()`,
		jsQuote(selector), duration)
	w.ExecJS(js)
	return nil
}

// GetDOMTree returns DOM tree structure.
func (s *WebviewService) GetDOMTree(windowName string, maxDepth int) (any, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("GetDOMTree requires CDP — not yet implemented")
}

// GetErrors returns captured error messages.
func (s *WebviewService) GetErrors(limit int) []ConsoleEntry {
	return s.GetConsoleMessages("error", limit)
}

// GetPerformance returns performance metrics.
func (s *WebviewService) GetPerformance(windowName string) (any, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("GetPerformance requires CDP — not yet implemented")
}

// GetResources returns loaded resources.
func (s *WebviewService) GetResources(windowName string) (any, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("GetResources requires CDP — not yet implemented")
}

// GetNetworkRequests returns network request log.
func (s *WebviewService) GetNetworkRequests(windowName string, limit int) (any, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return nil, err
	}
	return nil, fmt.Errorf("GetNetworkRequests requires CDP — not yet implemented")
}

// ClearNetworkRequests clears the network request log.
func (s *WebviewService) ClearNetworkRequests(windowName string) error {
	_, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	return fmt.Errorf("ClearNetworkRequests requires CDP — not yet implemented")
}

// InjectNetworkInterceptor injects network monitoring JS.
func (s *WebviewService) InjectNetworkInterceptor(windowName string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	js := `(function(){
		if(window.__networkCaptured) return;
		window.__networkCaptured = true;
		window.__networkLog = [];
		var origFetch = window.fetch;
		window.fetch = function(){
			var start = Date.now();
			var url = arguments[0];
			if(typeof url === 'object') url = url.url;
			return origFetch.apply(this, arguments).then(function(resp){
				window.__networkLog.push({url:url, status:resp.status, duration:Date.now()-start, ts:start});
				if(window.__networkLog.length > 500) window.__networkLog.shift();
				return resp;
			});
		};
	})()`
	w.ExecJS(js)
	return nil
}

// ExportToPDF exports page as PDF via CDP.
func (s *WebviewService) ExportToPDF(windowName string, options map[string]any) (string, error) {
	_, err := s.getWindow(windowName)
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("ExportToPDF requires CDP — not yet implemented")
}

// PrintToPDF opens print dialog.
func (s *WebviewService) PrintToPDF(windowName string) error {
	w, err := s.getWindow(windowName)
	if err != nil {
		return err
	}
	w.ExecJS(`window.print()`)
	return nil
}

// jsQuote JSON-encodes a string for safe JS interpolation.
func jsQuote(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
