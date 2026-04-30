package main

import core "dappco.re/go"

func ExampleDependency() {
	dependency := Dependency{Name: "Xcode", Required: true}
	core.Println(dependency.Name)
	core.Println(dependency.Required)
	// Output:
	// Xcode
	// true
}
