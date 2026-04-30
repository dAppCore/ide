package subagent

import core "dappco.re/go"

func ExampleNew() {
	_ = any(New)
	core.Println("New")
	// Output: New
}

func ExampleNewWithHistory() {
	_ = any(NewWithHistory)
	core.Println("NewWithHistory")
	// Output: NewWithHistory
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
