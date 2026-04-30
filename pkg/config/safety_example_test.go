package config

import core "dappco.re/go"

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
