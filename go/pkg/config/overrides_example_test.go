package config

import core "dappco.re/go"

func ExampleIDEConfig_Merge() {
	_ = any((*IDEConfig).Merge)
	core.Println("IDEConfig.Merge")
	// Output: IDEConfig.Merge
}

func ExampleIDEConfig_ApplyFlags() {
	_ = any((*IDEConfig).ApplyFlags)
	core.Println("IDEConfig.ApplyFlags")
	// Output: IDEConfig.ApplyFlags
}

func ExampleApplyCLIOverrides() {
	_ = any(ApplyCLIOverrides)
	core.Println("ApplyCLIOverrides")
	// Output: ApplyCLIOverrides
}

func ExampleApplyEnv() {
	_ = any(ApplyEnv)
	core.Println("ApplyEnv")
	// Output: ApplyEnv
}
