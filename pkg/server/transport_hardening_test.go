// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"

	core "dappco.re/go"
	coreio "dappco.re/go/io"

	"dappco.re/go/ide/pkg/config"
)

type hardeningToolListResponse struct {
	Success bool `json:"success"`
	Data    []struct {
		Name string `json:"name"`
	} `json:"data"`
}

func TestTransport_HTTP_Good_BearerTokenRequiredAccepted(t *testing.T) {
	addr := freeLoopbackAddr(t)
	srv, err := newHTTPHardeningServer(addr, "good-token")
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errCh := runServerForTest(ctx, srv)
	waitForHTTPStatus(t, "http://"+addr+"/health", "", http.StatusOK)

	response, body := doHTTPForTest(t, http.MethodGet, "http://"+addr+"/v1/tools", "good-token", "")
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected bearer-authenticated tools list, got %d: %s", response.StatusCode, body)
	}
	var envelope hardeningToolListResponse
	if result := core.JSONUnmarshalString(body, &envelope); !result.OK {
		t.Fatalf("decode tools response: %v", result.Value)
	}
	if !envelope.Success || len(envelope.Data) != 19 {
		t.Fatalf("expected 19 tools, got success=%v count=%d", envelope.Success, len(envelope.Data))
	}

	cancel()
	if err := <-errCh; err != nil {
		t.Fatalf("server shutdown: %v", err)
	}
}

func TestTransport_HTTP_Bad_NoTokenStartFails(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:0"
	cfg.Ide.Transport.Token = ""
	t.Setenv("MCP_AUTH_TOKEN", "")
	srv, err := NewServer(Options{Config: cfg, Medium: coreio.NewMemoryMedium(), PreferConfiguredTransport: true})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	err = srv.Run(context.Background())
	if err == nil || !core.Contains(err.Error(), "bearer token required for HTTP mode") {
		t.Fatalf("expected bearer-token-required error, got %v", err)
	}
}

func TestTransport_HTTP_Bad_WrongTokenRejects401(t *testing.T) {
	addr := freeLoopbackAddr(t)
	srv, err := newHTTPHardeningServer(addr, "right-token")
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errCh := runServerForTest(ctx, srv)
	waitForHTTPStatus(t, "http://"+addr+"/health", "", http.StatusOK)

	response, _ := doHTTPForTest(t, http.MethodGet, "http://"+addr+"/v1/tools", "wrong-token", "")
	if response.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for wrong bearer token, got %d", response.StatusCode)
	}

	cancel()
	if err := <-errCh; err != nil {
		t.Fatalf("server shutdown: %v", err)
	}
}

func TestTransport_HTTP_Ugly_WildcardBindRejected(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "0.0.0.0:9880"
	cfg.Ide.Transport.Token = "token"
	_, err := NewServer(Options{Config: cfg, Medium: coreio.NewMemoryMedium(), PreferConfiguredTransport: true})
	if err == nil || !core.Contains(err.Error(), "loopback-only") {
		t.Fatalf("expected loopback-only wildcard bind error, got %v", err)
	}
}

func TestTransport_HTTP_Ugly_ExternallyRoutableBindRejected(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "192.168.1.50:9880"
	cfg.Ide.Transport.Token = "token"
	_, err := NewServer(Options{Config: cfg, Medium: coreio.NewMemoryMedium(), PreferConfiguredTransport: true})
	if err == nil || !core.Contains(err.Error(), "loopback-only") {
		t.Fatalf("expected loopback-only external bind error, got %v", err)
	}
}

func TestTransport_HTTP_Ugly_OversizedBodyRejected(t *testing.T) {
	addr := freeLoopbackAddr(t)
	srv, err := newHTTPHardeningServer(addr, "good-token")
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errCh := runServerForTest(ctx, srv)
	waitForHTTPStatus(t, "http://"+addr+"/health", "", http.StatusOK)

	body := strings.Repeat("a", httpMaxBodyBytes+1)
	response, _ := doHTTPForTest(t, http.MethodPost, "http://"+addr+"/v1/tools/brain_recall", "good-token", body)
	if response.StatusCode != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413 for oversized tool body, got %d", response.StatusCode)
	}

	cancel()
	if err := <-errCh; err != nil {
		t.Fatalf("server shutdown: %v", err)
	}
}

func newHTTPHardeningServer(addr string, token string) (*Server, error) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = addr
	cfg.Ide.Transport.Token = token
	return NewServer(Options{
		Config:                    cfg,
		Medium:                    coreio.NewMemoryMedium(),
		PreferConfiguredTransport: true,
	})
}

func freeLoopbackAddr(t *testing.T) string {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen free loopback addr: %v", err)
	}
	addr := listener.Addr().String()
	if err := listener.Close(); err != nil {
		t.Fatalf("close free loopback listener: %v", err)
	}
	return addr
}

func runServerForTest(ctx context.Context, srv *Server) <-chan error {
	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Run(ctx)
	}()
	return errCh
}

func waitForHTTPStatus(t *testing.T, url string, token string, status int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	var lastStatus int
	for time.Now().Before(deadline) {
		response, _ := doHTTPForTest(t, http.MethodGet, url, token, "")
		if response != nil {
			lastStatus = response.StatusCode
			if response.StatusCode == status {
				return
			}
		}
		time.Sleep(25 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s to return %d, last status %d", url, status, lastStatus)
}

func doHTTPForTest(t *testing.T, method string, url string, token string, body string) (*http.Response, string) {
	t.Helper()
	request, err := http.NewRequestWithContext(context.Background(), method, url, strings.NewReader(body))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, ""
	}
	defer response.Body.Close()
	raw := core.ReadAll(response.Body)
	if !raw.OK {
		t.Fatalf("read response body: %v", raw.Value)
	}
	return response, raw.Value.(string)
}
