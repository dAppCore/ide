package brain

import (
	"errors"

	core "dappco.re/go/core"
)

// OpenBrainErrorKind identifies the class of a direct OpenBrain failure.
//
//	var apiErr *OpenBrainError
//	if errors.As(err, &apiErr) && apiErr.Kind == OpenBrainErrorStatus {
//	    status := apiErr.StatusCode
//	    _ = status
//	}
type OpenBrainErrorKind string

const (
	OpenBrainErrorMissingAPIKey    OpenBrainErrorKind = "missing_api_key"
	OpenBrainErrorRequest          OpenBrainErrorKind = "request"
	OpenBrainErrorTransport        OpenBrainErrorKind = "transport"
	OpenBrainErrorStatus           OpenBrainErrorKind = "status"
	OpenBrainErrorDecode           OpenBrainErrorKind = "decode"
	OpenBrainErrorResponseTooLarge OpenBrainErrorKind = "response_too_large"
	OpenBrainErrorCircuitOpen      OpenBrainErrorKind = "circuit_open"
)

// OpenBrainError carries machine-readable details for OpenBrain HTTP failures.
//
//	var apiErr *OpenBrainError
//	if errors.As(err, &apiErr) && apiErr.Retryable { /* retry at caller boundary */ }
type OpenBrainError struct {
	Kind       OpenBrainErrorKind `json:"kind"`
	Method     string             `json:"method,omitempty"`
	Path       string             `json:"path,omitempty"`
	StatusCode int                `json:"statusCode,omitempty"`
	Status     string             `json:"status,omitempty"`
	Body       string             `json:"body,omitempty"`
	Retryable  bool               `json:"retryable"`
	Cause      error              `json:"-"`
}

func (err *OpenBrainError) Error() string {
	if err == nil {
		return ""
	}
	switch err.Kind {
	case OpenBrainErrorStatus:
		if err.Body != "" {
			return core.Sprintf("openbrain %s %s returned %s: %s", err.Method, err.Path, err.Status, err.Body)
		}
		return core.Sprintf("openbrain %s %s returned %s", err.Method, err.Path, err.Status)
	case OpenBrainErrorCircuitOpen:
		return core.Sprintf("openbrain circuit open for %s %s", err.Method, err.Path)
	case OpenBrainErrorTransport:
		if err.Cause != nil {
			return core.Sprintf("openbrain %s %s transport failed: %s", err.Method, err.Path, err.Cause.Error())
		}
	}
	if err.Cause != nil {
		return core.Sprintf("openbrain %s: %s", err.Kind, err.Cause.Error())
	}
	return core.Sprintf("openbrain %s", err.Kind)
}

func (err *OpenBrainError) Unwrap() error {
	if err == nil {
		return nil
	}
	return err.Cause
}

// IsOpenBrainError reports whether an error chain contains a given OpenBrain kind.
//
//	if brain.IsOpenBrainError(err, brain.OpenBrainErrorCircuitOpen) { return cachedFallback }
func IsOpenBrainError(err error, kind OpenBrainErrorKind) bool {
	var apiErr *OpenBrainError
	return errors.As(err, &apiErr) && apiErr.Kind == kind
}

func wrapOpenBrainError(scope, message string, err *OpenBrainError) error {
	return core.E(scope, message, err)
}

func openBrainErrorFrom(err error) (*OpenBrainError, bool) {
	var apiErr *OpenBrainError
	if errors.As(err, &apiErr) {
		return apiErr, true
	}
	return nil, false
}
