package config

import core "github.com/dappcore/go"

func ExampleBoolPtr() {
	_ = any(BoolPtr)
	core.Println("BoolPtr")
	// Output: BoolPtr
}

func ExampleBoolValue() {
	_ = any(BoolValue)
	core.Println("BoolValue")
	// Output: BoolValue
}
