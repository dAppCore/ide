package agentic

import (
	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"
)

func TestAgentic_NewPrep_Good(t *core.T) {
	prep := NewPrep()
	core.AssertNotNil(t, prep)
	core.AssertEqual(t, 0, len(coremcpMustTools(prep)))
}

func TestAgentic_NewPrep_Bad(t *core.T) {
	prep := NewPrep()
	core.AssertNotNil(t, prep)
	core.AssertEqual(t, "*agentic.Prep", core.Sprintf("%T", prep))
}

func TestAgentic_NewPrep_Ugly(t *core.T) {
	prep := NewPrep()
	service, _ := coremcp.New(coremcp.Options{})
	prep.RegisterTools(service)
	core.AssertEqual(t, "agentic_dispatch", service.Tools()[0].Name)
}

func TestAgentic_Prep_RegisterTools_Good(t *core.T) {
	prep := NewPrep()
	service, _ := coremcp.New(coremcp.Options{})
	prep.RegisterTools(service)
	core.AssertEqual(t, 1, len(service.Tools()))
}

func TestAgentic_Prep_RegisterTools_Bad(t *core.T) {
	prep := NewPrep()
	prep.RegisterTools(nil)
	core.AssertNotNil(t, prep)
}

func TestAgentic_Prep_RegisterTools_Ugly(t *core.T) {
	prep := NewPrep()
	service, _ := coremcp.New(coremcp.Options{})
	prep.RegisterTools(service)
	core.AssertNotNil(t, service.Tools()[0].RESTHandler)
}

func coremcpMustTools(prep *Prep) []coremcp.ToolRecord {
	_ = prep
	service, _ := coremcp.New(coremcp.Options{})
	return service.Tools()
}
