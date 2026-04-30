package marketplace

import (
	"context"

	core "dappco.re/go"
)

func (s *Subsystem) registerActions(c *core.Core) {
	c.Action("ide.pkg.search", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[SearchInput](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.search(ctx, input)
		return core.ResultOf(out, err)
	})
	c.Action("ide.pkg.info", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[InfoInput](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.info(ctx, input)
		return core.ResultOf(out, err)
	})
	c.Action("ide.pkg.install", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[InstallInput](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.install(ctx, input)
		return core.ResultOf(out, err)
	})
}
