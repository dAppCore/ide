package server

import core "github.com/dappcore/go"

func ExampleSelectTransport() {
	_ = any(SelectTransport)
	core.Println("SelectTransport")
	// Output: SelectTransport
}

func ExampleSelectRelayTransport() {
	_ = any(SelectRelayTransport)
	core.Println("SelectRelayTransport")
	// Output: SelectRelayTransport
}
