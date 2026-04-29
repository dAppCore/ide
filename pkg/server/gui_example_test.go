package server

import core "dappco.re/go"

type Bridge = chatBridge

func ExampleNewGUIShell() {
	_ = any(NewGUIShell)
	core.Println("NewGUIShell")
	// Output: NewGUIShell
}

func ExampleGUIShell_Run() {
	_ = any((*GUIShell).Run)
	core.Println("GUIShell.Run")
	// Output: GUIShell.Run
}

func ExampleBridge_Tools() {
	_ = any((*chatBridge).Tools)
	core.Println("Bridge.Tools")
	// Output: Bridge.Tools
}

func ExampleBridge_ToolManifest() {
	_ = any((*chatBridge).ToolManifest)
	core.Println("Bridge.ToolManifest")
	// Output: Bridge.ToolManifest
}

func ExampleBridge_CallTool() {
	_ = any((*chatBridge).CallTool)
	core.Println("Bridge.CallTool")
	// Output: Bridge.CallTool
}
