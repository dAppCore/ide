// SPDX-License-Identifier: EUPL-1.2

// Package ide is the canonical entry-point for the core/ide repo. It
// provides a single repo-level Service so the IDE workspace surface
// can be supervised by go-process (in-binary or out-of-process) and
// queried over IPC.
//
// The action surface covers stateless workspace introspection
// (workspace.scan / status / conventions / impact). Stateful
// IDE subsystems — server, brain, chat, marketplace, subagent — keep
// their own subpackage Registers; this Service is a thin orchestrator
// that future-iterations can wire as core.WithName composers.
//
//	c, _ := core.New(
//	    core.WithName("ide", ide.NewService(ide.IdeConfig{})),
//	)
//	r := c.Action("ide.workspace.scan").Run(ctx, core.NewOptions(
//	    core.Option{Key: "root", Value: "/srv/repos"},
//	    core.Option{Key: "depth", Value: 3},
//	))

package ide

import (
	"context"

	core "dappco.re/go"
	"dappco.re/go/ide/pkg/workspace"
)

// IdeConfig configures the ide service. Empty config gives the default
// workspace introspection surface bound to the local filesystem
// (workspace ops accept a per-call root, so no global root is needed
// here).
//
// Usage example: `cfg := ide.IdeConfig{}`
type IdeConfig struct{}

// Service is the registerable handle for the ide repo — embeds
// *core.ServiceRuntime[IdeConfig] for typed options access. The
// workspace introspection surface is exposed as IPC actions; richer
// ide subsystems (server, brain, chat, etc.) keep their own
// subpackage Registers and are wired by composers separately.
//
// Usage example: `svc := core.MustServiceFor[*ide.Service](c, "ide"); _ = svc`
type Service struct {
	*core.ServiceRuntime[IdeConfig]
	registrations core.Once
}

// NewService returns a factory that produces a *Service ready for
// c.Service() registration.
//
// Usage example: `c, _ := core.New(core.WithName("ide", ide.NewService(ide.IdeConfig{})))`
func NewService(config IdeConfig) func(*core.Core) core.Result {
	return func(c *core.Core) core.Result {
		return core.Ok(&Service{
			ServiceRuntime: core.NewServiceRuntime(c, config),
		})
	}
}

// Register builds the ide service with default IdeConfig and returns
// the service Result directly — the imperative-style alternative to
// NewService for consumers wiring services without WithName options.
//
// Usage example: `r := ide.Register(c); svc := r.Value.(*ide.Service)`
func Register(c *core.Core) core.Result {
	return NewService(IdeConfig{})(c)
}

// OnStartup registers the ide action handlers on the attached Core.
// Implements core.Startable. Idempotent via core.Once.
//
// Usage example: `r := svc.OnStartup(ctx)`
func (s *Service) OnStartup(context.Context) core.Result {
	if s == nil {
		return core.Ok(nil)
	}
	s.registrations.Do(func() {
		c := s.Core()
		if c == nil {
			return
		}
		c.Action("ide.workspace.scan", s.handleWorkspaceScan)
		c.Action("ide.workspace.status", s.handleWorkspaceStatus)
		c.Action("ide.workspace.conventions", s.handleWorkspaceConventions)
		c.Action("ide.workspace.impact", s.handleWorkspaceImpact)
	})
	return core.Ok(nil)
}

// OnShutdown is a no-op — workspace ops are stateless. Implements
// core.Stoppable.
//
// Usage example: `r := svc.OnShutdown(ctx)`
func (s *Service) OnShutdown(context.Context) core.Result {
	return core.Ok(nil)
}

// handleWorkspaceScan — `ide.workspace.scan` action handler. Reads
// opts.root + opts.depth and returns []workspace.Project in r.Value.
//
// Usage example: `r := c.Action("ide.workspace.scan").Run(ctx, core.NewOptions(core.Option{Key: "root", Value: "/srv/repos"}, core.Option{Key: "depth", Value: 3}))`
func (s *Service) handleWorkspaceScan(ctx core.Context, opts core.Options) core.Result {
	projects, err := workspace.Scan(ctx, workspace.ScanInput{
		Root:  opts.String("root"),
		Depth: opts.Int("depth"),
	})
	if err != nil {
		return core.Fail(core.E("ide.workspace.scan", "scan workspace", err))
	}
	return core.Ok(projects)
}

// handleWorkspaceStatus — `ide.workspace.status` action handler.
// Reads opts.root and returns the StatusOutput (git + counts +
// CoreFiles) in r.Value.
//
// Usage example: `r := c.Action("ide.workspace.status").Run(ctx, core.NewOptions(core.Option{Key: "root", Value: "."}))`
func (s *Service) handleWorkspaceStatus(ctx core.Context, opts core.Options) core.Result {
	status, err := workspace.Status(ctx, workspace.StatusInput{Root: opts.String("root")})
	if err != nil {
		return core.Fail(core.E("ide.workspace.status", "read status", err))
	}
	return core.Ok(status)
}

// handleWorkspaceConventions — `ide.workspace.conventions` action
// handler. Reads opts.root and returns the ConventionsOutput in
// r.Value.
//
// Usage example: `r := c.Action("ide.workspace.conventions").Run(ctx, core.NewOptions(core.Option{Key: "root", Value: "."}))`
func (s *Service) handleWorkspaceConventions(ctx core.Context, opts core.Options) core.Result {
	output, err := workspace.Conventions(ctx, workspace.ConventionsInput{Root: opts.String("root")})
	if err != nil {
		return core.Fail(core.E("ide.workspace.conventions", "read conventions", err))
	}
	return core.Ok(output)
}

// handleWorkspaceImpact — `ide.workspace.impact` action handler.
// Reads opts.root and returns the ImpactOutput (impacted areas +
// suggested checks) in r.Value.
//
// Usage example: `r := c.Action("ide.workspace.impact").Run(ctx, core.NewOptions(core.Option{Key: "root", Value: "."}))`
func (s *Service) handleWorkspaceImpact(ctx core.Context, opts core.Options) core.Result {
	output, err := workspace.Impact(ctx, workspace.ImpactInput{Root: opts.String("root")})
	if err != nil {
		return core.Fail(core.E("ide.workspace.impact", "read impact", err))
	}
	return core.Ok(output)
}
