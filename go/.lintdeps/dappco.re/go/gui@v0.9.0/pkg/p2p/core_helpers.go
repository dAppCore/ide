package p2p

import core "dappco.re/go"

func coreResultError(result core.Result, fallback string) error {
	if result.OK {
		return nil
	}
	if err, ok := result.Value.(error); ok {
		return err
	}
	if text := core.Trim(result.Error()); text != "" {
		return core.NewError(text)
	}
	return core.NewError(fallback)
}

func jsonMarshal(value any) ([]byte, error) {
	result := core.JSONMarshal(value)
	if !result.OK {
		return nil, coreResultError(result, "failed to encode JSON")
	}
	return result.Value.([]byte), nil
}

func jsonUnmarshal(data []byte, target any) error {
	return coreResultError(core.JSONUnmarshal(data, target), "failed to decode JSON")
}
