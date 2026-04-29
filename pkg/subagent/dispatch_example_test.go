package subagent

import core "dappco.re/go"

func ExampleSubsystem_DispatchGuided() {
	_ = any((*Subsystem).DispatchGuided)
	core.Println("Subsystem.DispatchGuided")
	// Output: Subsystem.DispatchGuided
}
