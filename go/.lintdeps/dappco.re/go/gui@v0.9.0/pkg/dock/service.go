package dock

import (
	"context"

	core "dappco.re/go"
	"dappco.re/go/gui/pkg/internal/coreutil"
)

type Options struct{}

type Service struct {
	*core.ServiceRuntime[Options]
	platform Platform
}

func (s *Service) OnStartup(_ context.Context) core.Result {
	s.Core().RegisterQuery(s.handleQuery)
	s.Core().Action("dock.showIcon", func(_ context.Context, _ core.Options) core.Result {
		if err := s.platform.ShowIcon(); err != nil {
			return core.Result{Value: err, OK: false}
		}
		coreutil.DispatchAction(s.Core(), "dock.showIcon", ActionVisibilityChanged{Visible: true})
		return core.Result{OK: true}
	})
	s.Core().Action("dock.hideIcon", func(_ context.Context, _ core.Options) core.Result {
		if err := s.platform.HideIcon(); err != nil {
			return core.Result{Value: err, OK: false}
		}
		coreutil.DispatchAction(s.Core(), "dock.hideIcon", ActionVisibilityChanged{Visible: false})
		return core.Result{OK: true}
	})
	s.Core().Action("dock.setBadge", func(_ context.Context, opts core.Options) core.Result {
		if err := s.platform.SetBadge(opts.String("label")); err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{OK: true}
	})
	s.Core().Action("dock.removeBadge", func(_ context.Context, _ core.Options) core.Result {
		if err := s.platform.RemoveBadge(); err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{OK: true}
	})
	s.Core().Action("dock.setProgressBar", func(_ context.Context, opts core.Options) core.Result {
		t, _ := opts.Get("task").Value.(TaskSetProgressBar)
		if err := s.platform.SetProgressBar(t.Progress); err != nil {
			return core.Result{Value: err, OK: false}
		}
		coreutil.DispatchAction(s.Core(), "dock.setProgressBar", ActionProgressChanged{Progress: t.Progress})
		return core.Result{OK: true}
	})
	s.Core().Action("dock.bounce", func(_ context.Context, opts core.Options) core.Result {
		t, _ := opts.Get("task").Value.(TaskBounce)
		requestID, err := s.platform.Bounce(t.BounceType)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		coreutil.DispatchAction(s.Core(), "dock.bounce", ActionBounceStarted{RequestID: requestID, BounceType: t.BounceType})
		return core.Result{Value: requestID, OK: true}
	})
	s.Core().Action("dock.stopBounce", func(_ context.Context, opts core.Options) core.Result {
		t, _ := opts.Get("task").Value.(TaskStopBounce)
		if err := s.platform.StopBounce(t.RequestID); err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{OK: true}
	})
	return core.Result{OK: true}
}

func (s *Service) HandleIPCEvents(_ *core.Core, _ core.Message) core.Result {
	return core.Result{OK: true}
}

func (s *Service) handleQuery(_ *core.Core, q core.Query) core.Result {
	switch q.(type) {
	case QueryVisible:
		return core.Result{Value: s.platform.IsVisible(), OK: true}
	default:
		return core.Result{}
	}
}
