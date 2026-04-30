package brain

import brainpkg "dappco.re/go/mcp/pkg/mcp/brain"

type (
	RememberInput  = brainpkg.RememberInput
	RememberOutput = brainpkg.RememberOutput
	RecallInput    = brainpkg.RecallInput
	RecallOutput   = brainpkg.RecallOutput
	RecallFilter   = brainpkg.RecallFilter
	Memory         = brainpkg.Memory
	ForgetInput    = brainpkg.ForgetInput
	ForgetOutput   = brainpkg.ForgetOutput
	ListInput      = brainpkg.ListInput
	ListOutput     = brainpkg.ListOutput
	ContextInput   struct {
		Project string `json:"project,omitempty"`
	}
	ContextOutput struct {
		Overview    string   `json:"overview"`
		Recent      []Memory `json:"recent"`
		Conventions []string `json:"conventions"`
	}
)
