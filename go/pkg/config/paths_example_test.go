package config

import core "dappco.re/go"

func ExampleDefaultPaths() {
	_ = any(DefaultPaths)
	core.Println("DefaultPaths")
	// Output: DefaultPaths
}
