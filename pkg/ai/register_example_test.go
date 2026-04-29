package ai

import core "dappco.re/go"

func ExampleRegister() {
	_ = any(Register)
	core.Println("Register")
	// Output: Register
}

func ExampleService_OnStartup() {
	_ = any((*Service).OnStartup)
	core.Println("Service.OnStartup")
	// Output: Service.OnStartup
}

func ExampleService_Record() {
	_ = any((*Service).Record)
	core.Println("Service.Record")
	// Output: Service.Record
}

func ExampleService_Search() {
	_ = any((*Service).Search)
	core.Println("Service.Search")
	// Output: Service.Search
}

func ExampleRecord() {
	_ = any(Record)
	core.Println("Record")
	// Output: Record
}
