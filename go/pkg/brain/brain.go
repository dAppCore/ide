package brain

import (
	"net/http"

	core "github.com/dappcore/go"
	coreio "github.com/dappcore/go-io/go"
	coremcp "github.com/dappcore/mcp/go/pkg/mcp"

	storelib "github.com/dappcore/go-store/go"
	aipkg "github.com/dappcore/ide/go/pkg/ai"
	"github.com/dappcore/ide/go/pkg/config"
	"github.com/dappcore/ide/go/pkg/workspace"
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
