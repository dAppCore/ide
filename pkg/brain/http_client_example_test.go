package brain

import core "dappco.re/go"

type BrainHTTPClient = openBrainHTTPClient
type BrainCircuitBreaker = openBrainCircuitBreaker

func ExampleBrainHTTPClient_DoJSON() {
	_ = any((*openBrainHTTPClient).DoJSON)
	core.Println("BrainHTTPClient.DoJSON")
	// Output: BrainHTTPClient.DoJSON
}

func ExampleBrainCircuitBreaker_Allow() {
	_ = any((*openBrainCircuitBreaker).Allow)
	core.Println("BrainCircuitBreaker.Allow")
	// Output: BrainCircuitBreaker.Allow
}

func ExampleBrainCircuitBreaker_RecordSuccess() {
	_ = any((*openBrainCircuitBreaker).RecordSuccess)
	core.Println("BrainCircuitBreaker.RecordSuccess")
	// Output: BrainCircuitBreaker.RecordSuccess
}

func ExampleBrainCircuitBreaker_RecordFailure() {
	_ = any((*openBrainCircuitBreaker).RecordFailure)
	core.Println("BrainCircuitBreaker.RecordFailure")
	// Output: BrainCircuitBreaker.RecordFailure
}
