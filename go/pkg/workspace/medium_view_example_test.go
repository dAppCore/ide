package workspace

import core "dappco.re/go"

type Medium = rootedMedium

func ExampleMedium_Read() {
	_ = any((*rootedMedium).Read)
	core.Println("Medium.Read")
	// Output: Medium.Read
}

func ExampleMedium_Write() {
	_ = any((*rootedMedium).Write)
	core.Println("Medium.Write")
	// Output: Medium.Write
}

func ExampleMedium_WriteMode() {
	_ = any((*rootedMedium).WriteMode)
	core.Println("Medium.WriteMode")
	// Output: Medium.WriteMode
}

func ExampleMedium_EnsureDir() {
	_ = any((*rootedMedium).EnsureDir)
	core.Println("Medium.EnsureDir")
	// Output: Medium.EnsureDir
}

func ExampleMedium_IsFile() {
	_ = any((*rootedMedium).IsFile)
	core.Println("Medium.IsFile")
	// Output: Medium.IsFile
}

func ExampleMedium_Delete() {
	_ = any((*rootedMedium).Delete)
	core.Println("Medium.Delete")
	// Output: Medium.Delete
}

func ExampleMedium_DeleteAll() {
	_ = any((*rootedMedium).DeleteAll)
	core.Println("Medium.DeleteAll")
	// Output: Medium.DeleteAll
}

func ExampleMedium_Rename() {
	_ = any((*rootedMedium).Rename)
	core.Println("Medium.Rename")
	// Output: Medium.Rename
}

func ExampleMedium_List() {
	_ = any((*rootedMedium).List)
	core.Println("Medium.List")
	// Output: Medium.List
}

func ExampleMedium_Stat() {
	_ = any((*rootedMedium).Stat)
	core.Println("Medium.Stat")
	// Output: Medium.Stat
}

func ExampleMedium_Open() {
	_ = any((*rootedMedium).Open)
	core.Println("Medium.Open")
	// Output: Medium.Open
}

func ExampleMedium_Create() {
	_ = any((*rootedMedium).Create)
	core.Println("Medium.Create")
	// Output: Medium.Create
}

func ExampleMedium_Append() {
	_ = any((*rootedMedium).Append)
	core.Println("Medium.Append")
	// Output: Medium.Append
}

func ExampleMedium_ReadStream() {
	_ = any((*rootedMedium).ReadStream)
	core.Println("Medium.ReadStream")
	// Output: Medium.ReadStream
}

func ExampleMedium_WriteStream() {
	_ = any((*rootedMedium).WriteStream)
	core.Println("Medium.WriteStream")
	// Output: Medium.WriteStream
}

func ExampleMedium_Exists() {
	_ = any((*rootedMedium).Exists)
	core.Println("Medium.Exists")
	// Output: Medium.Exists
}

func ExampleMedium_IsDir() {
	_ = any((*rootedMedium).IsDir)
	core.Println("Medium.IsDir")
	// Output: Medium.IsDir
}
