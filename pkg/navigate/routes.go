package navigate

import (
	"context"

	core "dappco.re/go/core"
)

type NavigateInput = Input
type NavigateOutput = Output

type Data = any
type Schema = any

type Filter struct {
	Values map[string]any `json:"values,omitempty"`
}

type Handler func(ctx context.Context, filter Filter) (Data, Schema, error)

type Router struct {
	handlers map[string]Handler
}

func (r *Router) Handle(route string, handler Handler) {
	if r == nil || core.Trim(route) == "" || handler == nil {
		return
	}
	if r.handlers == nil {
		r.handlers = map[string]Handler{}
	}
	r.handlers[core.Trim(route)] = handler
}

func (r *Router) Resolve(ctx context.Context, route string, filter Filter) (Data, Schema, error) {
	if r == nil {
		return nil, nil, core.E("ide.navigate.Resolve", "router is nil", nil)
	}
	handler, ok := r.handlers[core.Trim(route)]
	if !ok {
		return nil, nil, core.E("ide.navigate.Resolve", core.Concat("unknown route ", core.Trim(route)), nil)
	}
	return handler(ctx, filter)
}
