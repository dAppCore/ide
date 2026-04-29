package brain

import core "dappco.re/go"

func ExampleMemory() {
	memory := Memory{ID: "m1", Content: "alpha"}
	core.Println(memory.ID, memory.Content)
	// Output: m1 alpha
}
