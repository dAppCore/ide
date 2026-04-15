package navigate

import (
	"context"
	"net/url"
	"reflect"

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
	output, schema, err := s.resolveQuery(ctx, "identity.status")
	if err != nil {
		return nil, nil, err
	}
	identity, ok := output.(Output)
	if !ok {
		return output, schema, nil
	}
	if !identity.Available {
		return identity, schema, nil
	}
	identity.Data = redactSensitiveValue(identity.Data)
	return identity, schema, nil
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
	redacted := redactReflectValue(reflect.ValueOf(value))
	if !redacted.IsValid() {
		return value
	}
	return redacted.Interface()
}

func isSensitiveKey(key string) bool {
	key = normalizeSensitiveKey(key)
	if key == "" {
		return false
	}
	switch key {
	case "token", "key", "secret", "password", "passphrase", "api", "client", "access", "refresh", "private", "authorization", "bearer":
		return true
	}
	for _, needle := range []string{
		"token",
		"key",
		"secret",
		"password",
		"passphrase",
		"apikey",
		"privatekey",
		"clientsecret",
		"accesstoken",
		"refreshtoken",
		"authorization",
		"bearer",
	} {
		if core.Contains(key, needle) {
			return true
		}
	}
	return false
}

func normalizeSensitiveKey(key string) string {
	key = core.Lower(core.Trim(key))
	if key == "" {
		return ""
	}
	normalized := make([]rune, 0, len(key))
	for _, r := range key {
		switch {
		case r >= 'a' && r <= 'z':
			normalized = append(normalized, r)
		case r >= '0' && r <= '9':
			normalized = append(normalized, r)
		}
	}
	return string(normalized)
}

func redactReflectValue(value reflect.Value) reflect.Value {
	if !value.IsValid() {
		return value
	}
	switch value.Kind() {
	case reflect.Interface, reflect.Pointer:
		if value.IsNil() {
			return value
		}
		return redactReflectValue(value.Elem())
	case reflect.Map:
		if value.IsNil() {
			return value
		}
		out := reflect.MakeMapWithSize(value.Type(), value.Len())
		for _, key := range value.MapKeys() {
			nested := value.MapIndex(key)
			if key.Kind() == reflect.String && isSensitiveKey(key.String()) {
				redacted := reflect.ValueOf("[redacted]")
				if redacted.Type().AssignableTo(value.Type().Elem()) {
					out.SetMapIndex(key, redacted)
				} else if redacted.Type().ConvertibleTo(value.Type().Elem()) {
					out.SetMapIndex(key, redacted.Convert(value.Type().Elem()))
				}
				continue
			}
			redacted := redactReflectValue(nested)
			if !redacted.IsValid() {
				continue
			}
			if redacted.Type().AssignableTo(value.Type().Elem()) {
				out.SetMapIndex(key, redacted)
				continue
			}
			if redacted.Type().ConvertibleTo(value.Type().Elem()) {
				out.SetMapIndex(key, redacted.Convert(value.Type().Elem()))
			}
		}
		return out
	case reflect.Slice:
		out := make([]any, 0, value.Len())
		for i := 0; i < value.Len(); i++ {
			redacted := redactReflectValue(value.Index(i))
			if !redacted.IsValid() {
				continue
			}
			out = append(out, redacted.Interface())
		}
		return reflect.ValueOf(out)
	case reflect.Array:
		out := make([]any, 0, value.Len())
		for i := 0; i < value.Len(); i++ {
			redacted := redactReflectValue(value.Index(i))
			if !redacted.IsValid() {
				continue
			}
			out = append(out, redacted.Interface())
		}
		return reflect.ValueOf(out)
	case reflect.String:
		return reflect.ValueOf(redactSensitiveString(value.String()))
	case reflect.Struct:
		out := make(map[string]any, value.NumField())
		valueType := value.Type()
		for i := 0; i < value.NumField(); i++ {
			field := valueType.Field(i)
			if field.PkgPath != "" {
				continue
			}
			key := fieldName(field)
			if key == "" {
				continue
			}
			if isSensitiveKey(key) {
				out[key] = "[redacted]"
				continue
			}
			out[key] = redactReflectValue(value.Field(i)).Interface()
		}
		return reflect.ValueOf(out)
	default:
		return value
	}
}

func redactSensitiveString(value string) string {
	trimmed := core.Trim(value)
	if trimmed == "" {
		return value
	}
	lower := core.Lower(trimmed)
	if core.HasPrefix(lower, "bearer ") || core.HasPrefix(lower, "basic ") {
		return "[redacted]"
	}
	if parsed, err := url.Parse(trimmed); err == nil && parsed.Scheme != "" && parsed.Host != "" {
		if parsed.User != nil {
			return "[redacted]"
		}
		query := parsed.Query()
		for key := range query {
			if isSensitiveKey(key) {
				return "[redacted]"
			}
		}
	}
	if core.HasPrefix(lower, "--") {
		lower = core.TrimPrefix(lower, "--")
		trimmed = core.TrimPrefix(trimmed, "--")
	}
	if core.HasPrefix(lower, "-") {
		lower = core.TrimPrefix(lower, "-")
		trimmed = core.TrimPrefix(trimmed, "-")
	}
	for _, separator := range []string{"=", ":"} {
		if parts := core.SplitN(trimmed, separator, 2); len(parts) == 2 {
			if isSensitiveKey(core.Trim(parts[0])) {
				return "[redacted]"
			}
		}
	}
	if parts := core.Split(lower, " "); len(parts) > 0 && isSensitiveKey(parts[0]) {
		return "[redacted]"
	}
	return value
}

func fieldName(field reflect.StructField) string {
	if tag := core.Trim(field.Tag.Get("json")); tag != "" && tag != "-" {
		return core.Split(tag, ",")[0]
	}
	if tag := core.Trim(field.Tag.Get("yaml")); tag != "" && tag != "-" {
		return core.Split(tag, ",")[0]
	}
	return field.Name
}
