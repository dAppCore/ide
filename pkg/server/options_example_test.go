package server

import core "dappco.re/go"

func ExampleOptions_Register() {
	_ = any((*Options).Register)
	core.Println("Options.Register")
	// Output: Options.Register
}
