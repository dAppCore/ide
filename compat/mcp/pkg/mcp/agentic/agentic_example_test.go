package agentic

import (
	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"
)

func ExampleNewPrep() {
	prep := NewPrep()
	core.Println(prep != nil)
	// Output: true
}

func ExamplePrep_RegisterTools() {
	prep := NewPrep()
	service, _ := coremcp.New(coremcp.Options{})
	prep.RegisterTools(service)
	core.Println(service.Tools()[0].Name)
	// Output: agentic_dispatch
}
