package navigate

import (
	"context"

	core "dappco.re/go/core"
)

func (s *Subsystem) resolveStore(ctx context.Context, _ Filter) (Data, Schema, error) {
	output, err := s.storeSnapshot()
	if err != nil {
		return nil, nil, err
	}
	return output, output.Schema, nil
}

func (s *Subsystem) resolveStoreNamespace(ctx context.Context, filter Filter) (Data, Schema, error) {
	namespace := filterString(filter, "namespace")
	if namespace == "" {
		return Output{Available: false, Reason: "namespace is required"}, nil, nil
	}
	output, err := s.storeNamespace(namespace)
	if err != nil {
		return nil, nil, err
	}
	return output, output.Schema, nil
}

func (s *Subsystem) resolveModels(ctx context.Context, _ Filter) (Data, Schema, error) {
	return s.resolveQuery(ctx, "ai.models.list")
}

func (s *Subsystem) resolveAgent(ctx context.Context, _ Filter) (Data, Schema, error) {
	return s.resolveQuery(ctx, "agent.workspaces.status")
}

func (s *Subsystem) resolveNetwork(ctx context.Context, _ Filter) (Data, Schema, error) {
	return s.resolveQuery(ctx, "network.status")
}

func (s *Subsystem) resolveSettings(ctx context.Context, _ Filter) (Data, Schema, error) {
	return s.resolveQuery(ctx, "config.dump")
}

func (s *Subsystem) resolveIdentity(ctx context.Context, _ Filter) (Data, Schema, error) {
	return s.resolveQuery(ctx, "identity.status")
}

func (s *Subsystem) resolveWallet(ctx context.Context, _ Filter) (Data, Schema, error) {
	return s.resolveQuery(ctx, "wallet.status")
}

func (s *Subsystem) resolveQuery(ctx context.Context, action string) (Data, Schema, error) {
	output, err := s.query(ctx, action)
	if err != nil {
		return nil, nil, err
	}
	return output, output.Schema, nil
}

func filterString(filter Filter, key string) string {
	if len(filter.Values) == 0 {
		return ""
	}
	value, ok := filter.Values[key]
	if !ok {
		return ""
	}
	text, _ := value.(string)
	return core.Trim(text)
}
