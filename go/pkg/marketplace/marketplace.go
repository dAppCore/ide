package marketplace

import (
	"context"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	scmmarketplace "dappco.re/go/scm/marketplace"

	aipkg "dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/config"
)

type Subsystem struct {
	cfg    config.Marketplace
	client *Client
}

type SearchInput struct {
	Query    string `json:"query,omitempty"`
	Category string `json:"category,omitempty"`
}

// IdeModule extends the upstream scm/marketplace Module with IDE-side
// runtime metadata — entrypoint URL (for plugin-as-webview dApps), a
// human description, and a Menu declaration that lets the plugin extend
// the IDE's frame (sidebar + routes).
//
// The Menu is the load-bearing part of the "pluginable IDE frame" pattern —
// installed plugins contribute to the user's sidebar, sub-pages route to
// /plugin/<code>/<subpage>, and the CoreApp end-state is a bundled set of
// plugins whose menus together compose a new application.
type IdeModule struct {
	scmmarketplace.Module
	Entrypoint  string      `json:"entrypoint,omitempty"`
	Description string      `json:"description,omitempty"`
	Menu        *PluginMenu `json:"menu,omitempty"`
	NativeTag   string      `json:"native_tag,omitempty"`
	DefaultMode string      `json:"default_mode,omitempty"`
}

// PluginMenu declares how a plugin extends the IDE's sidebar. Renders as a
// nav row under the "Plugins" group; subpages render below as nested rows
// when the parent is active. User can disable / merge plugin menu entries
// via Settings (planned).
type PluginMenu struct {
	Label    string            `json:"label"`
	IconSVG  string            `json:"icon_svg,omitempty"`
	Subpages []PluginMenuEntry `json:"subpages,omitempty"`
}

// PluginMenuEntry is one sub-page below a plugin's main menu row. The path
// is relative to the plugin's base; the IDE composes /plugin/<code>/<path>
// when a sub-page is selected, and forwards that to the plugin element /
// iframe / window as a prop or URL.
type PluginMenuEntry struct {
	Label string `json:"label"`
	Path  string `json:"path"`
}

type SearchOutput struct {
	Query    string      `json:"query,omitempty"`
	Category string      `json:"category,omitempty"`
	Packages []IdeModule `json:"packages"`
}

type InfoInput struct {
	Code string `json:"code"`
}

type InfoOutput struct {
	Package IdeModule `json:"package"`
}

type InstallInput struct {
	Code string `json:"code"`
}

type InstallOutput struct {
	Installed bool   `json:"installed"`
	Code      string `json:"code"`
}

type InstalledOutput struct {
	Packages []scmmarketplace.InstalledModule `json:"packages"`
}

type RemoveInput struct {
	Code string `json:"code"`
}

type RemoveOutput struct {
	Removed bool   `json:"removed"`
	Code    string `json:"code"`
}

// MenusOutput is the joined view of installed plugins + their menu metadata.
// Drives the IDE sidebar's "Plugins" group — the IDE frame literally is
// the union of installed plugin menus.
type MenusOutput struct {
	Plugins []PluginMenuRecord `json:"plugins"`
}

type PluginMenuRecord struct {
	Code        string      `json:"code"`
	Name        string      `json:"name"`
	NativeTag   string      `json:"native_tag,omitempty"`
	DefaultMode string      `json:"default_mode,omitempty"`
	Entrypoint  string      `json:"entrypoint,omitempty"`
	Menu        *PluginMenu `json:"menu,omitempty"`
}

func New(cfg config.Marketplace) *Subsystem {
	return &Subsystem{cfg: cfg, client: NewClient(cfg)}
}

func (s *Subsystem) AttachAI(service *aipkg.Service) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	s.client.AttachAI(service)
}

func (s *Subsystem) AttachMedium(medium coreio.Medium) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	s.client.AttachMedium(medium)
}

func (s *Subsystem) Name() string { return "marketplace" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	s.registerTools(svc)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	s.registerActions(c)
}

func (s *Subsystem) search(
	ctx context.Context,
	input SearchInput,
) (SearchOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Search(ctx, input)
}

func (s *Subsystem) info(
	ctx context.Context,
	input InfoInput,
) (InfoOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Info(ctx, input)
}

func (s *Subsystem) install(
	ctx context.Context,
	input InstallInput,
) (InstallOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Install(ctx, input)
}

func (s *Subsystem) installed(
	ctx context.Context,
) (InstalledOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Installed(ctx)
}

func (s *Subsystem) remove(
	ctx context.Context,
	input RemoveInput,
) (RemoveOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Remove(ctx, input)
}

func (s *Subsystem) menus(
	ctx context.Context,
) (MenusOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	installed, err := s.client.Installed(ctx)
	if err != nil {
		return MenusOutput{}, err
	}
	out := MenusOutput{Plugins: []PluginMenuRecord{}}
	for _, mod := range installed.Packages {
		// Re-resolve full module metadata (menu, native_tag, etc.) from the
		// marketplace surface — installed records carry only basic fields.
		// For fixture modules this is a fast in-memory lookup; for HTTP
		// feeds it's a per-module Info call (cached by upstream when wired).
		info, err := s.client.Info(ctx, InfoInput{Code: mod.Code})
		if err != nil {
			continue
		}
		out.Plugins = append(out.Plugins, PluginMenuRecord{
			Code:        info.Package.Code,
			Name:        info.Package.Name,
			NativeTag:   info.Package.NativeTag,
			DefaultMode: info.Package.DefaultMode,
			Entrypoint:  info.Package.Entrypoint,
			Menu:        info.Package.Menu,
		})
	}
	return out, nil
}
