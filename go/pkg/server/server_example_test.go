package server

import core "dappco.re/go"

func ExampleNewServer() {
	_ = any(NewServer)
	core.Println("NewServer")
	// Output: NewServer
}

func ExampleCompose() {
	_ = any(Compose)
	core.Println("Compose")
	// Output: Compose
}

func ExampleServer_Run() {
	_ = any((*Server).Run)
	core.Println("Server.Run")
	// Output: Server.Run
}

func ExampleServer_Core() {
	_ = any((*Server).Core)
	core.Println("Server.Core")
	// Output: Server.Core
}

func ExampleServer_MCP() {
	_ = any((*Server).MCP)
	core.Println("Server.MCP")
	// Output: Server.MCP
}
