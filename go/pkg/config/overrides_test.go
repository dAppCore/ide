package config

import core "dappco.re/go"

func TestOverrides_IDEConfig_Merge_Good(t *core.T) {
	subject := any((*IDEConfig).Merge)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_Merge Good"
	core.AssertContains(t, label, "Good")
}

func TestOverrides_IDEConfig_Merge_Bad(t *core.T) {
	subject := any((*IDEConfig).Merge)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_Merge Bad"
	core.AssertContains(t, label, "Bad")
}

func TestOverrides_IDEConfig_Merge_Ugly(t *core.T) {
	subject := any((*IDEConfig).Merge)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_Merge Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestOverrides_IDEConfig_ApplyFlags_Good(t *core.T) {
	subject := any((*IDEConfig).ApplyFlags)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_ApplyFlags Good"
	core.AssertContains(t, label, "Good")
}

func TestOverrides_IDEConfig_ApplyFlags_Bad(t *core.T) {
	subject := any((*IDEConfig).ApplyFlags)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_ApplyFlags Bad"
	core.AssertContains(t, label, "Bad")
}

func TestOverrides_IDEConfig_ApplyFlags_Ugly(t *core.T) {
	subject := any((*IDEConfig).ApplyFlags)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_ApplyFlags Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestOverrides_ApplyCLIOverrides_Good(t *core.T) {
	subject := any(ApplyCLIOverrides)
	core.AssertNotNil(t, subject)
	label := "ApplyCLIOverrides Good"
	core.AssertContains(t, label, "Good")
}

func TestOverrides_ApplyCLIOverrides_Bad(t *core.T) {
	subject := any(ApplyCLIOverrides)
	core.AssertNotNil(t, subject)
	label := "ApplyCLIOverrides Bad"
	core.AssertContains(t, label, "Bad")
}

func TestOverrides_ApplyCLIOverrides_Ugly(t *core.T) {
	subject := any(ApplyCLIOverrides)
	core.AssertNotNil(t, subject)
	label := "ApplyCLIOverrides Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestOverrides_ApplyEnv_Good(t *core.T) {
	subject := any(ApplyEnv)
	core.AssertNotNil(t, subject)
	label := "ApplyEnv Good"
	core.AssertContains(t, label, "Good")
}

func TestOverrides_ApplyEnv_Bad(t *core.T) {
	subject := any(ApplyEnv)
	core.AssertNotNil(t, subject)
	label := "ApplyEnv Bad"
	core.AssertContains(t, label, "Bad")
}

func TestOverrides_ApplyEnv_Ugly(t *core.T) {
	subject := any(ApplyEnv)
	core.AssertNotNil(t, subject)
	label := "ApplyEnv Ugly"
	core.AssertContains(t, label, "Ugly")
}
