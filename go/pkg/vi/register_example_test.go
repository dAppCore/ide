// SPDX-License-Identifier: EUPL-1.2

package vi_test

import (
	core "dappco.re/go"
	"dappco.re/go/ide/pkg/vi"
)

func ExampleRegister() {
	c := core.New(core.WithService(vi.Register))
	svc, _ := core.ServiceFor[*vi.Service](c, "vi")
	core.Println(svc != nil)
	// Output: true
}

func ExampleService_Status() {
	c := core.New(core.WithService(vi.Register))
	svc, _ := core.ServiceFor[*vi.Service](c, "vi")
	status := svc.Status()
	core.Println(status.Connected)
	// Output: true
}

func ExampleService_Briefs() {
	c := core.New(core.WithService(vi.Register))
	svc, _ := core.ServiceFor[*vi.Service](c, "vi")
	briefs := svc.Briefs()
	core.Println(len(briefs) > 0)
	// Output: true
}

func ExampleService_Sites() {
	c := core.New(core.WithService(vi.Register))
	svc, _ := core.ServiceFor[*vi.Service](c, "vi")
	sites := svc.Sites()
	core.Println(sites[0].Domain)
	// Output: lthn.ai
}

func ExampleService_Activity() {
	c := core.New(core.WithService(vi.Register))
	svc, _ := core.ServiceFor[*vi.Service](c, "vi")
	activity := svc.Activity()
	core.Println(activity[0].Who)
	// Output: vi
}
