package chat

import core "dappco.re/go/core"

type Options struct {
	APIURL       string
	StorePath    string
	ToolExecutor any
}

func Register(configure func(*Options)) func(*core.Core) core.Result {
	options := &Options{}
	if configure != nil {
		configure(options)
	}
	_ = options
	return func(*core.Core) core.Result {
		return core.Result{OK: true}
	}
}
