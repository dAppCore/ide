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

	"forge.lthn.ai/core/api"
	"forge.lthn.ai/core/api/pkg/provider"
	"forge.lthn.ai/core/go-scm/manifest"
	"forge.lthn.ai/core/go-scm/marketplace"
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
	rm.mu.Lock()
	defer rm.mu.Unlock()

	dir := defaultProvidersDir()
	discovered, err := marketplace.DiscoverProviders(dir)
	if err != nil {
		return fmt.Errorf("runtime: discover providers: %w", err)
	}

	if len(discovered) == 0 {
		log.Println("runtime: no providers found in", dir)
		return nil
	}

	log.Printf("runtime: discovered %d provider(s) in %s", len(discovered), dir)

	for _, dp := range discovered {
		rp, err := rm.startProvider(ctx, dp)
		if err != nil {
			log.Printf("runtime: failed to start %s: %v", dp.Manifest.Code, err)
			continue
		}
		rm.providers = append(rm.providers, rp)
		log.Printf("runtime: started %s on port %d", dp.Manifest.Code, rp.Port)
	}

	return nil
}

// startProvider starts a single provider binary and registers its proxy.
func (rm *RuntimeManager) startProvider(ctx context.Context, dp marketplace.DiscoveredProvider) (*RuntimeProvider, error) {
	m := dp.Manifest

	// Assign a free port.
	port, err := findFreePort()
	if err != nil {
		return nil, fmt.Errorf("find free port: %w", err)
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
		return nil, fmt.Errorf("start binary %s: %w", binaryPath, err)
	}

	// Wait for health check.
	healthURL := fmt.Sprintf("http://127.0.0.1:%d/health", port)
	if err := waitForHealth(healthURL, 10*time.Second); err != nil {
		// Kill the process if health check fails.
		_ = cmd.Process.Kill()
		return nil, fmt.Errorf("health check failed for %s: %w", m.Code, err)
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
	defer rm.mu.Unlock()

	for _, rp := range rm.providers {
		if rp.Cmd != nil && rp.Cmd.Process != nil {
			log.Printf("runtime: stopping %s (pid %d)", rp.Manifest.Code, rp.Cmd.Process.Pid)
			_ = rp.Cmd.Process.Signal(os.Interrupt)

			// Give the process 5 seconds to exit gracefully.
			done := make(chan error, 1)
			go func() { done <- rp.Cmd.Wait() }()

			select {
			case <-done:
				// Exited cleanly.
			case <-time.After(5 * time.Second):
				_ = rp.Cmd.Process.Kill()
			}
		}
	}

	rm.providers = nil
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
}

// findFreePort asks the OS for an available TCP port on 127.0.0.1.
func findFreePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}

// waitForHealth polls a health URL until it returns 200 or the timeout expires.
func waitForHealth(url string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 2 * time.Second}

	for time.Now().Before(deadline) {
		resp, err := client.Get(url)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(100 * time.Millisecond)
	}

	return fmt.Errorf("health check timed out after %s: %s", timeout, url)
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
