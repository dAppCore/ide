# Core GUI Agent Notes

This repository contains the Go backend layer for the Core GUI. The code is
organised as small service packages under `pkg/`, with Wails-compatible stubs in
`stubs/wails` and reference Wails source snapshots under `docs/ref/wails-v3`.
Agents working here should treat the service packages as the product code and
the stubs/reference tree as compatibility fixtures that keep the GUI backend
buildable without a native Wails runtime.

The package pattern is intentionally repetitive. Most feature areas expose a
`Register` function, a `Service` with `OnStartup` and `HandleIPCEvents`, message
DTOs, and a narrow `Platform` interface. Preserve that shape when adding browser,
clipboard, dock, environment, menu, notification, screen, systray, webview, or
window functionality. The `pkg/display` package is the orchestration layer and
bridges windowing, preload injection, marketplace installation, local schemes,
network diagnostics, and browser-facing APIs.

Core dependencies must route through `dappco.re/go` wrappers. Direct imports of
`fmt`, `errors`, `strings`, `path/filepath`, `os`, `os/exec`,
`encoding/json`, or `bytes` are intentionally avoided in package code and tests.
Where legacy adapter APIs still expect those package names, use the local
`compat/*` packages rather than importing standard-library packages directly.

Tests follow the source-file-aware AX-7 convention used by `core/go`: public
symbols in `foo.go` are covered in `foo_test.go`, and usage examples live in
`foo_example_test.go`. Do not add AX-7 dump files, versioned test files, or
cross-file monoliths. The compliance audit at
`/Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh` is the authoritative
shape check for this repository.
