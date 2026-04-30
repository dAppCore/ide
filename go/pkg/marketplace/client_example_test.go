package marketplace

import core "dappco.re/go"

func ExampleNewClient() {
	_ = any(NewClient)
	core.Println("NewClient")
	// Output: NewClient
}

func ExampleClient_AttachMedium() {
	_ = any((*Client).AttachMedium)
	core.Println("Client.AttachMedium")
	// Output: Client.AttachMedium
}

func ExampleClient_AttachAI() {
	_ = any((*Client).AttachAI)
	core.Println("Client.AttachAI")
	// Output: Client.AttachAI
}

func ExampleClient_Search() {
	_ = any((*Client).Search)
	core.Println("Client.Search")
	// Output: Client.Search
}

func ExampleClient_Info() {
	_ = any((*Client).Info)
	core.Println("Client.Info")
	// Output: Client.Info
}

func ExampleClient_Install() {
	_ = any((*Client).Install)
	core.Println("Client.Install")
	// Output: Client.Install
}
