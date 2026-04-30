// pkg/lifecycle/platform.go
package lifecycle

// EventType identifies application and system lifecycle events.
type EventType int

const (
	EventApplicationStarted EventType = iota
	EventWillTerminate                // macOS only
	EventDidBecomeActive              // macOS only
	EventDidResignActive              // macOS only
	EventPowerStatusChanged           // Windows only (APMPowerStatusChange)
	EventSystemSuspend                // Windows only (APMSuspend)
	EventSystemResume                 // Windows only (APMResume)
)

// Platform abstracts the application lifecycle backend (Wails v3).
// OnApplicationEvent registers a handler for a fire-and-forget event type.
// OnOpenedWithFile registers a handler for file-open events (carries path data).
// Both return a cancel function that deregisters the handler.
// Platform-specific events no-op silently on unsupported OS (adapter registers nothing).
type Platform interface {
	OnApplicationEvent(eventType EventType, handler func()) func()
	OnOpenedWithFile(handler func(path string)) func()
}
