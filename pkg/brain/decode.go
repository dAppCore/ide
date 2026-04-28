package brain

import core "dappco.re/go"

func decode[T any](opts core.Options) (T, error) {
	var out T
	input := map[string]any{}
	for _, item := range opts.Items() {
		input[item.Key] = item.Value
	}
	if result := core.JSONUnmarshalString(core.JSONMarshalString(input), &out); !result.OK {
		if err, ok := result.Value.(error); ok {
			return out, err
		}
		return out, core.E("ide.brain.decode", "decode options", nil)
	}
	return out, nil
}
