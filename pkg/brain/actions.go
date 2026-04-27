package brain

import (
	"context"

	core "dappco.re/go/core"
)

func (s *Subsystem) registerActions(c *core.Core) {
	c.Action("ide.brain.recall", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[RecallInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.recall(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.remember", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[RememberInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.remember(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.forget", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ForgetInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.forget(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.list", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ListInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.list(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.context", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ContextInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.context(ctx, input)
		return core.Result{}.New(out, err)
	})
}
