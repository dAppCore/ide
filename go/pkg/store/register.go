package store

import (
	"context"

	core "dappco.re/go"
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
		return core.Fail(err)
	}
	storeInstance, result := storelib.New(path)
	if !result.OK {
		return result
	}
	svc := &Service{
		ServiceRuntime: core.NewServiceRuntime[struct{}](c, struct{}{}),
		Store:          storeInstance,
	}
	svc.registerQueries(c)
	return core.Ok(svc)
}

func defaultStorePath() string {
	home := core.Trim(core.Getenv("DIR_HOME"))
	if home == "" {
		home = core.Env("DIR_HOME")
	}
	if home == "" {
		home = core.Trim(core.Getenv("HOME"))
	}
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
		return core.Ok(nil)
	}
	if result := s.Store.Close(); !result.OK {
		return result
	}
	return core.Ok(nil)
}

func (s *Service) registerQueries(c *core.Core) {
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		name, ok := query.(string)
		if !ok {
			return core.Fail(nil)
		}
		switch {
		case name == "store.get_all":
			return core.Ok(s.snapshot())
		case core.HasPrefix(name, "store.get_namespace:"):
			namespace := core.TrimPrefix(name, "store.get_namespace:")
			entries, getResult := s.Store.GetAll(namespace)
			if !getResult.OK {
				return core.Fail(nil)
			}
			return core.Ok(map[string]any{"namespace": namespace, "entries": entries})
		default:
			return core.Fail(nil)
		}
	})
}

func (s *Service) snapshot() map[string]any {
	out := map[string]any{"namespaces": []map[string]any{}}
	if s == nil || s.Store == nil {
		return out
	}
	namespaces, groupsResult := s.Store.Groups()
	if !groupsResult.OK {
		return out
	}
	items := make([]map[string]any, 0, len(namespaces))
	for _, namespace := range namespaces {
		entries, groupResult := s.Store.GetAll(namespace)
		if !groupResult.OK {
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
