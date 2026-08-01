<!-- SPDX-License-Identifier: EUPL-1.2 -->

# Agent Notes

This repository builds **Lethean Desktop's IDE component** — the binary that
ships as Lethean Desktop, the umbrella native product across Darwin / Linux /
Windows / iOS / iPadOS. The plan that defines what Lethean Desktop is, what
it composes, how the Vi Control Panel shell wraps the IDE surface, and where
the design system flows from lives in the canonical plans tree at
`plans/project/lthn/desktop/RFC.md` (`forge.lthn.sh/core/plans`). **If a
capability isn't defined in the plans tree, it isn't real.** This binary owns
composition (which packages get pulled in, how they wire at boot, how Vi
surfaces them), not the implementation of each capability — capabilities are
spec'd in their canonical homes per the desktop RFC §4 service composition map.

Default brand: Lethean (cool indigo, hue 270). Vi (Violet) is the shell spine,
not a chat widget — calm presence, raven on the tower, surfacing what matters.
See `plans/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md` for
character canon.

It is a Go module that exposes the same capabilities through Core actions, MCP
tools, and the optional GUI shell. The active packages live under `pkg/`:
workspace inspection, OpenBrain memory, subagent relay, navigation, marketplace
installation, chat integration, and the server transports that compose them.

Use `dappco.re/go` primitives in new Go code. Direct imports of stdlib helper
packages such as `fmt`, `errors`, `strings`, `path/filepath`, `os`, `log`,
`encoding/json`, and `bytes` are not part of this repository's current style;
the Core wrapper package provides the formatting, error wrapping, string,
path, filesystem, JSON, and buffer APIs expected by the compliance audit.

Tests are file-local. When a source file exports a symbol, its Good, Bad, and
Ugly triplet tests belong in the sibling `<file>_test.go`, and its runnable
example belongs in `<file>_example_test.go`. Test bodies should exercise the
symbol they name directly enough that the symbol token appears in the body.
Examples print through `core.Println`, not `fmt.Println`, and their `// Output:`
blocks must match the real output.

Do not add AX7 catch-all test files, versioned test files, or stdlib-shaped
compatibility packages. If a package needs a shared helper, keep it in the
normal package test file where the surrounding tests already live, and keep the
helper small enough that the named tests still show their actual behaviour.

The local verification contract is:

```sh
GOWORK=off go mod tidy
GOWORK=off go vet ./...
GOWORK=off go test -count=1 ./...
gofmt -l .
bash /Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh .
```

The audit script is the compliance source of truth for this lane. A change is
not ready while any audit dimension reports a non-zero counter.
