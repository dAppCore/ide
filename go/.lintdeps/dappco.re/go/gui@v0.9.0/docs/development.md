# Development

Work from the repository root with `GOWORK=off`. The root module replaces
`github.com/wailsapp/wails/v3` with `./stubs/wails`, so tests exercise the GUI
backend against the local Wails-compatible stub rather than native desktop
bindings.

Before editing a package, identify the source file that owns the public symbol.
Tests for `foo.go` belong in `foo_test.go`, and examples belong in
`foo_example_test.go`. Keep Good, Bad, and Ugly test variants distinct; they are
not aliases for the same assertion. Avoid helper dispatchers that hide which
symbol is being exercised.

Use Core wrappers consistently. Import `dappco.re/go` for assertions, Result
helpers, formatting, filesystem/path helpers, JSON helpers, environment access,
and test types. The local `compat/*` packages exist only to preserve package-like
call sites while routing implementation through Core wrappers or small adapters.

Run the full local gate before handing off a change:

```sh
GOWORK=off go mod tidy
GOWORK=off go vet ./...
GOWORK=off go test -count=1 ./...
gofmt -l .
bash /Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh .
```

If the Go build cache is not writable in a sandboxed environment, set
`GOCACHE` to a writable temporary directory while preserving `GOWORK=off`.
Do not edit `BRIEF.md`, `.git`, `.codex`, or any `third_party` directory.
