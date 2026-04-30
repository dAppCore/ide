# Core GUI Documentation

Core GUI is split into focused Go packages that can be registered into a Core
runtime and then driven through IPC, MCP tools, or Wails-style desktop
integration. The main package tree is under `pkg/`; Wails compatibility stubs
live under `stubs/wails`; generated and vendor-like external material should not
be mixed into service packages.

Start with `architecture.md` for the package layout and runtime flow. Read
`development.md` before changing tests, examples, or dependency wrappers. The
framework notes under `docs/framework/` describe the intended GUI capabilities
in more detail, including display, lifecycle, MCP, runtime, services, webview,
and window behaviour.

The compliance audit is part of the development contract for this repository.
It checks import discipline, Result shapes, file-aware tests, examples, and
documentation presence. A change is not ready while any audit counter is
non-zero.
