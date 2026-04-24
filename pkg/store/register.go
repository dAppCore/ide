package store

import (
	"context"

	core "dappco.re/go/core"
	coreio "dappco.re/go/io"
	storelib "dappco.re/go/store"
)

type Service struct {
	*core.ServiceRuntime[struct{}]
	Store *storelib.Store
}

func Register(c *core.Core) core.Result {
	path := defaultStorePath()
	if err := coreio.Local.EnsureDir(core.PathDir(path)); err != nil {
		return core.Result{Value: err, OK: false}
	}
	storeInstance, err := storelib.New(path)
	if err != nil {
		return core.Result{Value: err, OK: false}
	}
	svc := &Service{
		ServiceRuntime: core.NewServiceRuntime[struct{}](c, struct{}{}),
		Store:          storeInstance,
	}
	svc.registerQueries(c)
	return core.Result{Value: svc, OK: true}
}

func defaultStorePath() string {
	home := core.Env("DIR_HOME")
	if home == "" {
		home = core.Env("HOME")
	}
	if home == "" {
		return ":memory:"
	}
	return core.JoinPath(home, ".core", "ide", "store.db")
}

func (s *Service) OnShutdown(context.Context) core.Result {
	if s == nil || s.Store == nil {
		return core.Result{OK: true}
	}
	if err := s.Store.Close(); err != nil {
		return core.Result{Value: err, OK: false}
	}
	return core.Result{OK: true}
}

func (s *Service) registerQueries(c *core.Core) {
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		name, ok := query.(string)
		if !ok {
			return core.Result{}
		}
		switch {
		case name == "store.get_all":
			return core.Result{Value: s.snapshot(), OK: true}
		case core.HasPrefix(name, "store.get_namespace:"):
			namespace := core.TrimPrefix(name, "store.get_namespace:")
			entries, err := s.Store.GetAll(namespace)
			if err != nil {
				return core.Result{}
			}
			return core.Result{Value: map[string]any{"namespace": namespace, "entries": entries}, OK: true}
		default:
			return core.Result{}
		}
	})
}

func (s *Service) snapshot() map[string]any {
	out := map[string]any{"namespaces": []map[string]any{}}
	if s == nil || s.Store == nil {
		return out
	}
	namespaces, err := s.Store.Groups()
	if err != nil {
		return out
	}
	items := make([]map[string]any, 0, len(namespaces))
	for _, namespace := range namespaces {
		entries, groupErr := s.Store.GetAll(namespace)
		if groupErr != nil {
			continue
		}
		recent := make([]string, 0, len(entries))
		for key := range entries {
			recent = append(recent, key)
		}
		items = append(items, map[string]any{
			"name":       namespace,
			"count":      len(entries),
			"recentKeys": recent,
		})
	}
	out["namespaces"] = items
	return out
}
