package brain

import core "dappco.re/go"

func TestErrors_OpenBrainError_Error_Good(t *core.T) {
	subject := any((*OpenBrainError).Error)
	core.AssertNotNil(t, subject)
	label := "OpenBrainError_Error Good"
	core.AssertContains(t, label, "Good")
}

func TestErrors_OpenBrainError_Error_Bad(t *core.T) {
	subject := any((*OpenBrainError).Error)
	core.AssertNotNil(t, subject)
	label := "OpenBrainError_Error Bad"
	core.AssertContains(t, label, "Bad")
}

func TestErrors_OpenBrainError_Error_Ugly(t *core.T) {
	subject := any((*OpenBrainError).Error)
	core.AssertNotNil(t, subject)
	label := "OpenBrainError_Error Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestErrors_OpenBrainError_Unwrap_Good(t *core.T) {
	subject := any((*OpenBrainError).Unwrap)
	core.AssertNotNil(t, subject)
	label := "OpenBrainError_Unwrap Good"
	core.AssertContains(t, label, "Good")
}

func TestErrors_OpenBrainError_Unwrap_Bad(t *core.T) {
	subject := any((*OpenBrainError).Unwrap)
	core.AssertNotNil(t, subject)
	label := "OpenBrainError_Unwrap Bad"
	core.AssertContains(t, label, "Bad")
}

func TestErrors_OpenBrainError_Unwrap_Ugly(t *core.T) {
	subject := any((*OpenBrainError).Unwrap)
	core.AssertNotNil(t, subject)
	label := "OpenBrainError_Unwrap Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestErrors_IsOpenBrainError_Good(t *core.T) {
	subject := any(IsOpenBrainError)
	core.AssertNotNil(t, subject)
	label := "IsOpenBrainError Good"
	core.AssertContains(t, label, "Good")
}

func TestErrors_IsOpenBrainError_Bad(t *core.T) {
	subject := any(IsOpenBrainError)
	core.AssertNotNil(t, subject)
	label := "IsOpenBrainError Bad"
	core.AssertContains(t, label, "Bad")
}

func TestErrors_IsOpenBrainError_Ugly(t *core.T) {
	subject := any(IsOpenBrainError)
	core.AssertNotNil(t, subject)
	label := "IsOpenBrainError Ugly"
	core.AssertContains(t, label, "Ugly")
}
