package brain

import (
	"net/http"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	aipkg "dappco.re/go/core/ide/pkg/ai"
	"dappco.re/go/core/ide/pkg/config"
	"dappco.re/go/core/ide/pkg/workspace"
	storelib "dappco.re/go/store"
)

type Subsystem struct {
	cfg       config.Brain
	medium    coreio.Medium
	client    *http.Client
	cache     *Cache
	workspace *workspace.Subsystem
	ai        *aipkg.Service
}

func New(cfg config.Brain, medium coreio.Medium, storeInstance *storelib.Store, workspaceSubsystem *workspace.Subsystem, aiService *aipkg.Service) *Subsystem {
	if medium == nil {
		medium = coreio.Local
	}
	return &Subsystem{
		cfg:       cfg,
		medium:    medium,
		client:    &http.Client{Timeout: 30 * time.Second},
		cache:     NewCache(storeInstance, cfg.Cache.Namespace, cfg.Cache.TTL, config.BoolValue(cfg.Cache.Enabled, true)),
		workspace: workspaceSubsystem,
		ai:        aiService,
	}
}

func (s *Subsystem) Name() string { return "brain" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	s.registerTools(svc)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	s.registerActions(c)
}
