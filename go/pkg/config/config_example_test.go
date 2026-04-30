package config

import core "dappco.re/go"

func ExampleTransport_WithDefaults() {
	_ = any((*Transport).WithDefaults)
	core.Println("Transport.WithDefaults")
	// Output: Transport.WithDefaults
}

func ExampleBrain_WithDefaults() {
	_ = any((*Brain).WithDefaults)
	core.Println("Brain.WithDefaults")
	// Output: Brain.WithDefaults
}

func ExampleCache_WithDefaults() {
	_ = any((*Cache).WithDefaults)
	core.Println("Cache.WithDefaults")
	// Output: Cache.WithDefaults
}

func ExampleBrainHTTP_WithDefaults() {
	_ = any((*BrainHTTP).WithDefaults)
	core.Println("BrainHTTP.WithDefaults")
	// Output: BrainHTTP.WithDefaults
}

func ExampleBrainRetry_WithDefaults() {
	_ = any((*BrainRetry).WithDefaults)
	core.Println("BrainRetry.WithDefaults")
	// Output: BrainRetry.WithDefaults
}

func ExampleBrainCircuitBreaker_WithDefaults() {
	_ = any((*BrainCircuitBreaker).WithDefaults)
	core.Println("BrainCircuitBreaker.WithDefaults")
	// Output: BrainCircuitBreaker.WithDefaults
}

func ExampleWorkspace_WithDefaults() {
	_ = any((*Workspace).WithDefaults)
	core.Println("Workspace.WithDefaults")
	// Output: Workspace.WithDefaults
}

func ExampleSubagent_WithDefaults() {
	_ = any((*Subagent).WithDefaults)
	core.Println("Subagent.WithDefaults")
	// Output: Subagent.WithDefaults
}

func ExampleSubagentRelay_WithDefaults() {
	_ = any((*SubagentRelay).WithDefaults)
	core.Println("SubagentRelay.WithDefaults")
	// Output: SubagentRelay.WithDefaults
}

func ExampleSubagentRelay_URL() {
	_ = any((*SubagentRelay).URL)
	core.Println("SubagentRelay.URL")
	// Output: SubagentRelay.URL
}

func ExampleSubagentDispatch_WithDefaults() {
	_ = any((*SubagentDispatch).WithDefaults)
	core.Println("SubagentDispatch.WithDefaults")
	// Output: SubagentDispatch.WithDefaults
}

func ExampleSubagentTimeouts_WithDefaults() {
	_ = any((*SubagentTimeouts).WithDefaults)
	core.Println("SubagentTimeouts.WithDefaults")
	// Output: SubagentTimeouts.WithDefaults
}

func ExampleNavigate_WithDefaults() {
	_ = any((*Navigate).WithDefaults)
	core.Println("Navigate.WithDefaults")
	// Output: Navigate.WithDefaults
}

func ExampleMarketplace_WithDefaults() {
	_ = any((*Marketplace).WithDefaults)
	core.Println("Marketplace.WithDefaults")
	// Output: Marketplace.WithDefaults
}

func ExampleChat_WithDefaults() {
	_ = any((*Chat).WithDefaults)
	core.Println("Chat.WithDefaults")
	// Output: Chat.WithDefaults
}

func ExampleLoad() {
	_ = any(Load)
	core.Println("Load")
	// Output: Load
}

func ExampleLoadWithOptions() {
	_ = any(LoadWithOptions)
	core.Println("LoadWithOptions")
	// Output: LoadWithOptions
}

func ExampleIDEConfig_WithDefaults() {
	_ = any((*IDEConfig).WithDefaults)
	core.Println("IDEConfig.WithDefaults")
	// Output: IDEConfig.WithDefaults
}
