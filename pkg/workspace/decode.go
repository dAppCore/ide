package workspace

import core "dappco.re/go"

func decode[T any](
	opts core.Options,
) (T, error) {
	var out T
	input := map[string]any{}
	for _, item := range opts.Items() {
		input[item.Key] = item.Value
	}
	raw := core.JSONMarshalString(input)
	if result := core.JSONUnmarshalString(raw, &out); !result.OK {
		if err, ok := result.Value.(error); ok {
			return out, err
		}
		return out, core.E("ide.workspace.decode", "decode options", nil)
	}
	return out, nil
}

func unique(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = core.Trim(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}
