package navigate

import (
	"context"
	"reflect"
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
	redacted := redactReflectValue(reflect.ValueOf(value))
	if !redacted.IsValid() {
		return value
	}
	return redacted.Interface()
}

func isSensitiveKey(key string) bool {
	key = strings.ToLower(core.Trim(key))
	switch key {
	case "token", "key", "secret", "password", "passphrase", "api_key", "apikey", "client_secret", "access_token", "refresh_token", "private_key", "authorization", "bearer":
		return true
	}
	return strings.HasSuffix(key, "_token") || strings.HasSuffix(key, "_key") || strings.HasSuffix(key, "_secret") || strings.HasSuffix(key, "_password")
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
		out := reflect.MakeSlice(value.Type(), value.Len(), value.Len())
		for i := 0; i < value.Len(); i++ {
			redacted := redactReflectValue(value.Index(i))
			if redacted.IsValid() && redacted.Type().AssignableTo(value.Type().Elem()) {
				out.Index(i).Set(redacted)
			} else if redacted.IsValid() && redacted.Type().ConvertibleTo(value.Type().Elem()) {
				out.Index(i).Set(redacted.Convert(value.Type().Elem()))
			} else {
				out.Index(i).Set(value.Index(i))
			}
		}
		return out
	case reflect.Array:
		out := reflect.New(value.Type()).Elem()
		for i := 0; i < value.Len(); i++ {
			redacted := redactReflectValue(value.Index(i))
			if redacted.IsValid() && redacted.Type().AssignableTo(value.Type().Elem()) {
				out.Index(i).Set(redacted)
			} else if redacted.IsValid() && redacted.Type().ConvertibleTo(value.Type().Elem()) {
				out.Index(i).Set(redacted.Convert(value.Type().Elem()))
			} else {
				out.Index(i).Set(value.Index(i))
			}
		}
		return out
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

func fieldName(field reflect.StructField) string {
	if tag := strings.TrimSpace(field.Tag.Get("json")); tag != "" && tag != "-" {
		return strings.Split(tag, ",")[0]
	}
	if tag := strings.TrimSpace(field.Tag.Get("yaml")); tag != "" && tag != "-" {
		return strings.Split(tag, ",")[0]
	}
	return field.Name
}
