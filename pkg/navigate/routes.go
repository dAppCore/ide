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

func (s *Subsystem) registerRoutes() {
	s.router = &Router{}
	if !s.routeEnabled("core://store") {
		return
	}
	s.router.Handle("core://store", s.resolveStore)
	s.router.Handle("core://store/{namespace}", s.resolveStoreNamespace)
	if s.routeEnabled("core://models") {
		s.router.Handle("core://models", s.resolveModels)
	}
	if s.routeEnabled("core://agent") {
		s.router.Handle("core://agent", s.resolveAgent)
	}
	if s.routeEnabled("core://network") {
		s.router.Handle("core://network", s.resolveNetwork)
	}
	if s.routeEnabled("core://settings") {
		s.router.Handle("core://settings", s.resolveSettings)
	}
	if s.routeEnabled("core://identity") {
		s.router.Handle("core://identity", s.resolveIdentity)
	}
	if s.routeEnabled("core://wallet") {
		s.router.Handle("core://wallet", s.resolveWallet)
	}
}

func (s *Subsystem) routeEnabled(route string) bool {
	if s == nil || len(s.cfg.Routes) == 0 {
		return true
	}
	for _, candidate := range s.cfg.Routes {
		if core.Trim(candidate) == route {
			return true
		}
	}
	return false
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
	route = core.Trim(route)
	if handler, ok := r.handlers[route]; ok {
		return handler(ctx, filter)
	}
	for pattern, handler := range r.handlers {
		routeFilter, ok := matchRoutePattern(pattern, route)
		if !ok {
			continue
		}
		merged := Filter{Values: map[string]any{}}
		for key, value := range filter.Values {
			merged.Values[key] = value
		}
		for key, value := range routeFilter.Values {
			merged.Values[key] = value
		}
		return handler(ctx, merged)
	}
	return nil, nil, core.E("ide.navigate.Resolve", core.Concat("unknown route ", route), nil)
}

func matchRoutePattern(pattern, route string) (Filter, bool) {
	pattern = core.Trim(pattern)
	route = core.Trim(route)
	if pattern == "" || route == "" {
		return Filter{}, false
	}
	if pattern == route {
		return Filter{}, true
	}
	const namespacePattern = "{namespace}"
	if !core.HasSuffix(pattern, namespacePattern) {
		return Filter{}, false
	}
	prefix := core.TrimSuffix(pattern, namespacePattern)
	if !core.HasSuffix(prefix, "/") {
		return Filter{}, false
	}
	if !core.HasPrefix(route, prefix) {
		return Filter{}, false
	}
	value := core.TrimPrefix(route, prefix)
	if value == "" || core.Contains(value, "/") {
		return Filter{}, false
	}
	return Filter{Values: map[string]any{"namespace": value}}, true
}
