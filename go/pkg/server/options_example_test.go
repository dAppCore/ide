package server

import core "github.com/dappcore/go"

func ExampleOptions_Register() {
	_ = any((*Options).Register)
	core.Println("Options.Register")
	// Output: Options.Register
}
