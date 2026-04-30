package navigate

import (
	"context"

	core "dappco.re/go"
)

func (s *Subsystem) registerActions(c *core.Core) {
	c.Action("ide.navigate", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[Input](opts)
		if err != nil {
			return core.Fail(err)
		}
		out, err := s.resolve(ctx, input)
		return core.ResultOf(out, err)
	})
}
