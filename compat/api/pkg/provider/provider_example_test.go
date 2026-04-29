package provider

import (
	core "dappco.re/go"
	"dappco.re/go/api"
	"github.com/gin-gonic/gin"
)

type exampleProvider struct{}

func (exampleProvider) Name() string                    { return "provider" }
func (exampleProvider) BasePath() string                { return "/provider" }
func (exampleProvider) RegisterRoutes(*gin.RouterGroup) {}
func (exampleProvider) Channels() []string              { return []string{"events"} }
func (exampleProvider) Describe() []api.RouteDescription {
	return []api.RouteDescription{{Method: "GET"}}
}
func (exampleProvider) Element() ElementSpec { return ElementSpec{Tag: "core-panel"} }

func ExampleProvider() {
	var value Provider = exampleProvider{}
	core.Println(value.Name())
	// Output: provider
}

func ExampleStreamable() {
	var value Streamable = exampleProvider{}
	core.Println(value.Channels()[0])
	// Output: events
}

func ExampleDescribable() {
	var value Describable = exampleProvider{}
	core.Println(value.Describe()[0].Method)
	// Output: GET
}

func ExampleElementSpec() {
	value := ElementSpec{Tag: "core-panel"}
	core.Println(value.Tag)
	// Output: core-panel
}

func ExampleRenderable() {
	var value Renderable = exampleProvider{}
	core.Println(value.Element().Tag)
	// Output: core-panel
}
