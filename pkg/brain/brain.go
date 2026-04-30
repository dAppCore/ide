package brain

import (
	"net/http"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	aipkg "dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/config"
	"dappco.re/go/ide/pkg/workspace"
	storelib "dappco.re/go/store"
)

type Subsystem struct {
	cfg        config.Brain
	medium     coreio.Medium
	client     *http.Client
	httpClient *openBrainHTTPClient
	cache      *Cache
	workspace  *workspace.Subsystem
	ai         *aipkg.Service
}

func New(cfg config.Brain, medium coreio.Medium, storeInstance *storelib.Store, workspaceSubsystem *workspace.Subsystem, aiService *aipkg.Service) *Subsystem {
	cfg = cfg.WithDefaults()
	if medium == nil {
		medium = coreio.Local
	}
	client := &http.Client{Timeout: cfg.HTTP.Timeout}
	return &Subsystem{
		cfg:        cfg,
		medium:     medium,
		client:     client,
		httpClient: newOpenBrainHTTPClient(cfg, client),
		cache:      NewCache(storeInstance, cfg.Cache.Namespace, cfg.Cache.TTL, config.BoolValue(cfg.Cache.Enabled, true)),
		workspace:  workspaceSubsystem,
		ai:         aiService,
	}
}

func (s *Subsystem) Name() string { return "brain" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	s.registerTools(svc)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	s.registerActions(c)
}
