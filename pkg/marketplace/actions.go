package marketplace

import (
	"context"

	core "dappco.re/go/core"
)

func (s *Subsystem) registerActions(c *core.Core) {
	c.Action("ide.pkg.search", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[SearchInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.search(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.pkg.info", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[InfoInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.info(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.pkg.install", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[InstallInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.install(ctx, input)
		return core.Result{}.New(out, err)
	})
}
