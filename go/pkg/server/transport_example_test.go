package server

import core "dappco.re/go"

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
