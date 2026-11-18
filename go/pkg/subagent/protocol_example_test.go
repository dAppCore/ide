package subagent

import core "github.com/dappcore/go"

func ExampleEncodeMessage() {
	_ = any(EncodeMessage)
	core.Println("EncodeMessage")
	// Output: EncodeMessage
}

func ExampleDecodeMessage() {
	_ = any(DecodeMessage)
	core.Println("DecodeMessage")
	// Output: DecodeMessage
}
