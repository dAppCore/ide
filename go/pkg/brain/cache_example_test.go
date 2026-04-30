package brain

import core "dappco.re/go"

func ExampleNewCache() {
	_ = any(NewCache)
	core.Println("NewCache")
	// Output: NewCache
}

func ExampleCache_Key() {
	_ = any((*Cache).Key)
	core.Println("Cache.Key")
	// Output: Cache.Key
}

func ExampleCache_Get() {
	_ = any((*Cache).Get)
	core.Println("Cache.Get")
	// Output: Cache.Get
}

func ExampleCache_Set() {
	_ = any((*Cache).Set)
	core.Println("Cache.Set")
	// Output: Cache.Set
}

func ExampleCache_Clear() {
	_ = any((*Cache).Clear)
	core.Println("Cache.Clear")
	// Output: Cache.Clear
}
