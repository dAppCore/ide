package navigate

import core "github.com/dappcore/go"

func ExampleRouter_Handle() {
	_ = any((*Router).Handle)
	core.Println("Router.Handle")
	// Output: Router.Handle
}

func ExampleRouter_Resolve() {
	_ = any((*Router).Resolve)
	core.Println("Router.Resolve")
	// Output: Router.Resolve
}
