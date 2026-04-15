package navigate

import (
	"context"
	"strings"

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
	output, schema, err := s.resolveQuery(ctx, "config.dump")
	if err != nil {
		return nil, nil, err
	}
	settings, ok := output.(Output)
	if !ok {
		return output, schema, nil
	}
	if !settings.Available {
		return settings, schema, nil
	}
	settings.Data = redactSensitiveValue(settings.Data)
	return settings, schema, nil
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

func redactSensitiveValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, nested := range typed {
			if isSensitiveKey(key) {
				out[key] = "[redacted]"
				continue
			}
			out[key] = redactSensitiveValue(nested)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, nested := range typed {
			out[i] = redactSensitiveValue(nested)
		}
		return out
	default:
		return value
	}
}

func isSensitiveKey(key string) bool {
	key = strings.ToLower(core.Trim(key))
	switch key {
	case "token", "key", "secret", "password", "passphrase", "api_key", "apikey", "client_secret", "access_token", "refresh_token", "private_key", "authorization", "bearer":
		return true
	}
	return strings.HasSuffix(key, "_token") || strings.HasSuffix(key, "_key") || strings.HasSuffix(key, "_secret") || strings.HasSuffix(key, "_password")
}
