package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	coreerr "dappco.re/go/core/log"
	"dappco.re/go/core/scm/manifest"
	"dappco.re/go/core/scm/marketplace"
	"forge.lthn.ai/core/api"
	"forge.lthn.ai/core/api/pkg/provider"
	"github.com/gin-gonic/gin"
)

// RuntimeProvider represents a running provider process with its proxy.
type RuntimeProvider struct {
	Dir      string
	Manifest *manifest.Manifest
	Port     int
	Cmd      *exec.Cmd
}

// RuntimeManager discovers, starts, and stops runtime provider processes.
// Each provider runs as a separate binary on 127.0.0.1, reverse-proxied
// through the IDE's Gin router via ProxyProvider.
type RuntimeManager struct {
	engine    *api.Engine
	providers []*RuntimeProvider
	mu        sync.Mutex
}

// NewRuntimeManager creates a RuntimeManager.
func NewRuntimeManager(engine *api.Engine) *RuntimeManager {
	return &RuntimeManager{
		engine: engine,
	}
}

// defaultProvidersDir returns ~/.core/providers/.
func defaultProvidersDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = os.TempDir()
	}
	return filepath.Join(home, ".core", "providers")
}

// StartAll discovers providers in ~/.core/providers/ and starts each one.
// Providers that fail to start are logged and skipped — they do not prevent
// other providers from starting.
func (rm *RuntimeManager) StartAll(ctx context.Context) error {
	dir := defaultProvidersDir()
	discovered, err := marketplace.DiscoverProviders(dir)
	if err != nil {
		return coreerr.E("runtime.StartAll", "discover providers", err)
	}

	if len(discovered) == 0 {
		log.Println("runtime: no providers found in", dir)
		return nil
	}

	log.Printf("runtime: discovered %d provider(s) in %s", len(discovered), dir)
	started := make([]*RuntimeProvider, 0, len(discovered))
	seen := make(map[string]struct{}, len(discovered))

	for _, dp := range discovered {
		key := fmt.Sprintf("%s|%s", dp.Manifest.Code, dp.Manifest.Namespace)
		if _, ok := seen[key]; ok {
			log.Printf("runtime: skipped duplicate provider discovery for %s", dp.Manifest.Code)
			continue
		}

		rp, err := rm.startProvider(ctx, dp)
		if err != nil {
			log.Printf("runtime: failed to start %s: %v", dp.Manifest.Code, err)
			continue
		}
		seen[key] = struct{}{}
		started = append(started, rp)
		log.Printf("runtime: started %s on port %d", dp.Manifest.Code, rp.Port)
	}

	rm.mu.Lock()
	rm.providers = append(rm.providers, started...)
	rm.mu.Unlock()

	return nil
}

// startProvider starts a single provider binary and registers its proxy.
func (rm *RuntimeManager) startProvider(ctx context.Context, dp marketplace.DiscoveredProvider) (*RuntimeProvider, error) {
	m := dp.Manifest
	if rm.engine == nil {
		return nil, coreerr.E("runtime.startProvider", "runtime engine not configured", nil)
	}

	// Assign a free port.
	port, err := findFreePort()
	if err != nil {
		return nil, coreerr.E("runtime.startProvider", "find free port", err)
	}

	// Resolve binary path.
	binaryPath := m.Binary
	if !filepath.IsAbs(binaryPath) {
		binaryPath = filepath.Join(dp.Dir, binaryPath)
	}

	// Build command args.
	args := make([]string, len(m.Args))
	copy(args, m.Args)
	args = append(args, "--namespace", m.Namespace, "--port", strconv.Itoa(port))

	// Start the process.
	cmd := exec.CommandContext(ctx, binaryPath, args...)
	cmd.Dir = dp.Dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, coreerr.E("runtime.startProvider", fmt.Sprintf("start binary %s", binaryPath), err)
	}

	// Wait for health check.
	healthURL := fmt.Sprintf("http://127.0.0.1:%d/health", port)
	if err := waitForHealth(ctx, healthURL, 10*time.Second); err != nil {
		// Stop the process if health check fails.
		stopProviderProcess(cmd, 2*time.Second)
		return nil, coreerr.E("runtime.startProvider", fmt.Sprintf("health check failed for %s", m.Code), err)
	}

	// Register proxy provider.
	cfg := provider.ProxyConfig{
		Name:     m.Code,
		BasePath: m.Namespace,
		Upstream: fmt.Sprintf("http://127.0.0.1:%d", port),
	}
	if m.Element != nil {
		cfg.Element = provider.ElementSpec{
			Tag:    m.Element.Tag,
			Source: m.Element.Source,
		}
	}
	if m.Spec != "" {
		cfg.SpecFile = filepath.Join(dp.Dir, m.Spec)
	}

	proxy := provider.NewProxy(cfg)
	rm.engine.Register(proxy)

	// Serve JS assets if the provider has an element source.
	if m.Element != nil && m.Element.Source != "" {
		assetsDir := filepath.Join(dp.Dir, "assets")
		if _, err := os.Stat(assetsDir); err == nil {
			// Assets are served at /assets/{code}/
			rm.engine.Register(&staticAssetGroup{
				name:     m.Code + "-assets",
				basePath: "/assets/" + m.Code,
				dir:      assetsDir,
			})
		}
	}

	rp := &RuntimeProvider{
		Dir:      dp.Dir,
		Manifest: m,
		Port:     port,
		Cmd:      cmd,
	}

	return rp, nil
}

// StopAll terminates all running provider processes.
func (rm *RuntimeManager) StopAll() {
	rm.mu.Lock()
	providers := rm.providers
	rm.providers = nil
	rm.mu.Unlock()

	for _, rp := range providers {
		if rp.Cmd != nil && rp.Cmd.Process != nil {
			name := ""
			if rp.Manifest != nil {
				name = rp.Manifest.Code
			}
			log.Printf("runtime: stopping provider (%s) pid %d", name, rp.Cmd.Process.Pid)
			stopProviderProcess(rp.Cmd, 5*time.Second)
		}
	}
}

// List returns a copy of all running provider info.
func (rm *RuntimeManager) List() []RuntimeProviderInfo {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	infos := make([]RuntimeProviderInfo, 0, len(rm.providers))
	for _, rp := range rm.providers {
		infos = append(infos, RuntimeProviderInfo{
			Code:      rp.Manifest.Code,
			Name:      rp.Manifest.Name,
			Version:   rp.Manifest.Version,
			Namespace: rp.Manifest.Namespace,
			Port:      rp.Port,
			Dir:       rp.Dir,
			Status:    "running",
		})
	}
	return infos
}

// RuntimeProviderInfo is a serialisable summary of a running provider.
type RuntimeProviderInfo struct {
	Code      string `json:"code"`
	Name      string `json:"name"`
	Version   string `json:"version"`
	Namespace string `json:"namespace"`
	Port      int    `json:"port"`
	Dir       string `json:"dir"`
	Status    string `json:"status"`
}

// findFreePort asks the OS for an available TCP port on 127.0.0.1.
func findFreePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()
	tcpAddr, ok := l.Addr().(*net.TCPAddr)
	if !ok {
		return 0, coreerr.E("runtime.findFreePort", "unexpected address type", nil)
	}
	return tcpAddr.Port, nil
}

// waitForHealth polls a health URL until it returns 200 or the timeout expires.
func waitForHealth(ctx context.Context, url string, timeout time.Duration) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	client := &http.Client{Timeout: 2 * time.Second}
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		req, err := http.NewRequestWithContext(timeoutCtx, http.MethodGet, url, nil)
		if err != nil {
			return coreerr.E("runtime.waitForHealth", "create health request", err)
		}

		resp, err := client.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		select {
		case <-timeoutCtx.Done():
			return coreerr.E(
				"runtime.waitForHealth",
				fmt.Sprintf("timed out after %s: %s", timeout, url),
				timeoutCtx.Err(),
			)
		case <-ticker.C:
			// Keep polling until timeout.
		}
	}
}

func stopProviderProcess(cmd *exec.Cmd, timeout time.Duration) {
	if cmd == nil || cmd.Process == nil {
		return
	}

	if timeout <= 0 {
		timeout = 1 * time.Second
	}

	_ = cmd.Process.Signal(os.Interrupt)
	if stopProviderProcessWait(cmd, timeout) {
		return
	}

	_ = cmd.Process.Kill()
	stopProviderProcessWait(cmd, 2*time.Second)
}

func stopProviderProcessWait(cmd *exec.Cmd, timeout time.Duration) bool {
	done := make(chan struct{})
	go func() {
		_ = cmd.Wait()
		close(done)
	}()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case <-done:
		return true
	case <-timer.C:
		return false
	}
}

// staticAssetGroup is a simple RouteGroup that serves static files.
// Used to serve provider JS assets.
type staticAssetGroup struct {
	name     string
	basePath string
	dir      string
}

func (s *staticAssetGroup) Name() string     { return s.name }
func (s *staticAssetGroup) BasePath() string { return s.basePath }

func (s *staticAssetGroup) RegisterRoutes(rg *gin.RouterGroup) {
	rg.Static("/", s.dir)
}
