package brain

import core "github.com/dappcore/go"

func ExampleOpenBrainError_Error() {
	_ = any((*OpenBrainError).Error)
	core.Println("OpenBrainError.Error")
	// Output: OpenBrainError.Error
}

func ExampleOpenBrainError_Unwrap() {
	_ = any((*OpenBrainError).Unwrap)
	core.Println("OpenBrainError.Unwrap")
	// Output: OpenBrainError.Unwrap
}

func ExampleIsOpenBrainError() {
	_ = any(IsOpenBrainError)
	core.Println("IsOpenBrainError")
	// Output: IsOpenBrainError
}
