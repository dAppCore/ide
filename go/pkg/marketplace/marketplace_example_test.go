package marketplace

import core "dappco.re/go"

func ExampleNew() {
	_ = any(New)
	core.Println("New")
	// Output: New
}

func ExampleSubsystem_AttachAI() {
	_ = any((*Subsystem).AttachAI)
	core.Println("Subsystem.AttachAI")
	// Output: Subsystem.AttachAI
}

func ExampleSubsystem_AttachMedium() {
	_ = any((*Subsystem).AttachMedium)
	core.Println("Subsystem.AttachMedium")
	// Output: Subsystem.AttachMedium
}

func ExampleSubsystem_Name() {
	_ = any((*Subsystem).Name)
	core.Println("Subsystem.Name")
	// Output: Subsystem.Name
}

func ExampleSubsystem_RegisterTools() {
	_ = any((*Subsystem).RegisterTools)
	core.Println("Subsystem.RegisterTools")
	// Output: Subsystem.RegisterTools
}

func ExampleSubsystem_RegisterActions() {
	_ = any((*Subsystem).RegisterActions)
	core.Println("Subsystem.RegisterActions")
	// Output: Subsystem.RegisterActions
}
