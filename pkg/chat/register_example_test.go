package chat

import core "dappco.re/go"

func ExampleNewExecutor() {
	_ = any(NewExecutor)
	core.Println("NewExecutor")
	// Output: NewExecutor
}

func ExampleExecutor_Attach() {
	_ = any((*Executor).Attach)
	core.Println("Executor.Attach")
	// Output: Executor.Attach
}

func ExampleExecutor_Manifest() {
	_ = any((*Executor).Manifest)
	core.Println("Executor.Manifest")
	// Output: Executor.Manifest
}

func ExampleExecutor_ManifestText() {
	_ = any((*Executor).ManifestText)
	core.Println("Executor.ManifestText")
	// Output: Executor.ManifestText
}

func ExampleExecutor_CallTool() {
	_ = any((*Executor).CallTool)
	core.Println("Executor.CallTool")
	// Output: Executor.CallTool
}

func ExampleNewRegister() {
	_ = any(NewRegister)
	core.Println("NewRegister")
	// Output: NewRegister
}
