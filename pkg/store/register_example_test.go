package store

import core "dappco.re/go"

func ExampleRegister() {
	_ = any(Register)
	core.Println("Register")
	// Output: Register
}

func ExampleService_OnShutdown() {
	_ = any((*Service).OnShutdown)
	core.Println("Service.OnShutdown")
	// Output: Service.OnShutdown
}
