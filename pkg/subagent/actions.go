package subagent

import (
	"context"

	core "dappco.re/go/core"
)

func (s *Subsystem) registerActions(c *core.Core) {
	register := func(name string, run func(context.Context, core.Options) core.Result) {
		c.Action(name, run)
	}
	register("ide.subagent.guide", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[GuideInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.guide(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.ask", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[AskInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.ask(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.progress", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ProgressInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.progress(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.watch", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[WatchInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.watch(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.answer", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[AnswerInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.answer(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.dispatch_guided", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[DispatchGuidedInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.DispatchGuided(ctx, input)
		return core.Result{}.New(out, err)
	})
}
