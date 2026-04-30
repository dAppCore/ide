//go:build ios

package main

import core "dappco.re/go"

func TestMainIos_WailsIOSMain_Good(t *core.T) {
	fn := WailsIOSMain
	typeName := core.Sprintf("%T", fn)
	core.AssertNotNil(t, fn)
	core.AssertContains(t, typeName, "func")
}

func TestMainIos_WailsIOSMain_Bad(t *core.T) {
	var fn func() = WailsIOSMain
	core.AssertNotNil(t, fn)
	core.AssertFalse(t, fn == nil)
}

func TestMainIos_WailsIOSMain_Ugly(t *core.T) {
	fn := WailsIOSMain
	core.AssertNotNil(t, fn)
	core.AssertContains(t, core.Sprintf("%T", fn), "func")
}
