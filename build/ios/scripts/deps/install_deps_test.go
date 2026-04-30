package main

import core "dappco.re/go"

func TestInstallDeps_Dependency_Good(t *core.T) {
	dependency := Dependency{Name: "Xcode", Required: true}
	core.AssertEqual(t, "Xcode", dependency.Name)
	core.AssertTrue(t, dependency.Required)
}

func TestInstallDeps_Dependency_Bad(t *core.T) {
	dependency := Dependency{}
	core.AssertEqual(t, "", dependency.Name)
	core.AssertFalse(t, dependency.Required)
}

func TestInstallDeps_Dependency_Ugly(t *core.T) {
	dependency := Dependency{
		CheckFunc: func() (bool, string) {
			return true, "available"
		},
	}
	ok, details := dependency.CheckFunc()
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "available", details)
}
