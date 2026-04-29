package provider

import (
	core "dappco.re/go"
	"dappco.re/go/api"
	"github.com/gin-gonic/gin"
)

type providerStub struct{}

func (providerStub) Name() string                     { return "provider" }
func (providerStub) BasePath() string                 { return "/provider" }
func (providerStub) RegisterRoutes(*gin.RouterGroup)  {}
func (providerStub) Channels() []string               { return []string{"events"} }
func (providerStub) Describe() []api.RouteDescription { return []api.RouteDescription{{Method: "GET"}} }
func (providerStub) Element() ElementSpec             { return ElementSpec{Tag: "core-panel"} }

func TestProvider_Provider_Good(t *core.T) {
	var value Provider = providerStub{}
	core.AssertEqual(t, "provider", value.Name())
	core.AssertEqual(t, "/provider", value.BasePath())
}

func TestProvider_Provider_Bad(t *core.T) {
	var value Provider = providerStub{}
	core.AssertEqual(t, "/provider", value.BasePath())
	core.AssertEqual(t, "provider", value.Name())
}

func TestProvider_Provider_Ugly(t *core.T) {
	var value Provider = providerStub{}
	value.RegisterRoutes(nil)
	core.AssertNotNil(t, value)
}

func TestProvider_Streamable_Good(t *core.T) {
	var value Streamable = providerStub{}
	core.AssertEqual(t, 1, len(value.Channels()))
	core.AssertEqual(t, "events", value.Channels()[0])
}

func TestProvider_Streamable_Bad(t *core.T) {
	var value Streamable = providerStub{}
	core.AssertContains(t, value.Channels()[0], "events")
	core.AssertEqual(t, 1, len(value.Channels()))
}

func TestProvider_Streamable_Ugly(t *core.T) {
	var value Streamable = providerStub{}
	core.AssertNotNil(t, value.Channels())
	core.AssertEqual(t, "events", value.Channels()[0])
}

func TestProvider_Describable_Good(t *core.T) {
	var value Describable = providerStub{}
	core.AssertEqual(t, "GET", value.Describe()[0].Method)
	core.AssertEqual(t, 1, len(value.Describe()))
}

func TestProvider_Describable_Bad(t *core.T) {
	var value Describable = providerStub{}
	core.AssertEqual(t, 1, len(value.Describe()))
	core.AssertEqual(t, "GET", value.Describe()[0].Method)
}

func TestProvider_Describable_Ugly(t *core.T) {
	var value Describable = providerStub{}
	core.AssertNotNil(t, value.Describe())
	core.AssertEqual(t, "GET", value.Describe()[0].Method)
}

func TestProvider_ElementSpec_Good(t *core.T) {
	value := ElementSpec{Tag: "core-panel"}
	core.AssertEqual(t, "core-panel", value.Tag)
	core.AssertEqual(t, "", value.Source)
}

func TestProvider_ElementSpec_Bad(t *core.T) {
	value := ElementSpec{}
	core.AssertEqual(t, "", value.Source)
	core.AssertEqual(t, "", value.Tag)
}

func TestProvider_ElementSpec_Ugly(t *core.T) {
	value := ElementSpec{Source: "/assets/panel.js"}
	core.AssertContains(t, value.Source, "assets")
	core.AssertEqual(t, "", value.Tag)
}

func TestProvider_Renderable_Good(t *core.T) {
	var value Renderable = providerStub{}
	core.AssertEqual(t, "core-panel", value.Element().Tag)
	core.AssertEqual(t, "", value.Element().Source)
}

func TestProvider_Renderable_Bad(t *core.T) {
	var value Renderable = providerStub{}
	core.AssertEqual(t, "", value.Element().Source)
	core.AssertEqual(t, "core-panel", value.Element().Tag)
}

func TestProvider_Renderable_Ugly(t *core.T) {
	var value Renderable = providerStub{}
	core.AssertNotNil(t, value.Element())
	core.AssertEqual(t, "core-panel", value.Element().Tag)
}
