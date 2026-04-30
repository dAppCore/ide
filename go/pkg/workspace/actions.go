package workspace

import (
	"context"

	core "dappco.re/go"
)

func (s *Subsystem) registerActions(c *core.Core) {
	c.Action("ide.workspace.status", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[StatusInput](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.status(ctx, input)
		return core.ResultOf(out, err)
	})
	c.Action("ide.workspace.conventions", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ConventionsInput](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.conventions(ctx, input)
		return core.ResultOf(out, err)
	})
	c.Action("ide.workspace.impact", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ImpactInput](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.impact(ctx, input)
		return core.ResultOf(out, err)
	})
	c.Action("ide.workspace.scan", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ScanInput](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.scan(ctx, input)
		return core.ResultOf(out, err)
	})
}
