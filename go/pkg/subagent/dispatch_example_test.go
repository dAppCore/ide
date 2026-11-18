package subagent

import core "github.com/dappcore/go"

func ExampleSubsystem_DispatchGuided() {
	_ = any((*Subsystem).DispatchGuided)
	core.Println("Subsystem.DispatchGuided")
	// Output: Subsystem.DispatchGuided
}
