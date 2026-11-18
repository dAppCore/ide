package config

import core "github.com/dappcore/go"

func ExampleDefaultPaths() {
	_ = any(DefaultPaths)
	core.Println("DefaultPaths")
	// Output: DefaultPaths
}
