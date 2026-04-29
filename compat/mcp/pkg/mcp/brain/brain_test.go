package brain

import core "dappco.re/go"

func TestBrain_Memory_Good(t *core.T) {
	memory := Memory{ID: "m1", Content: "alpha"}
	core.AssertEqual(t, "m1", memory.ID)
	core.AssertEqual(t, "alpha", memory.Content)
}

func TestBrain_Memory_Bad(t *core.T) {
	memory := Memory{}
	core.AssertEqual(t, "", memory.ID)
	core.AssertEqual(t, "", memory.Content)
}

func TestBrain_Memory_Ugly(t *core.T) {
	memory := Memory{Tags: []string{"one", "two"}}
	core.AssertEqual(t, 2, len(memory.Tags))
	core.AssertEqual(t, "two", memory.Tags[1])
}
