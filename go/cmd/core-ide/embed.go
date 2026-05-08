// SPDX-License-Identifier: EUPL-1.2

package main

import (
	"embed"
	"io/fs"

	core "dappco.re/go"
)

// frontendDist is the embedded frontend bundle. Populated at build time via
// the build:native task copying frontend/dist into ./dist before `go build`.
//
//go:embed all:dist
var frontendDist embed.FS

// FrontendFS returns the production frontend assets embedded into the binary.
// Returns the dist/ subdirectory rooted at "/" so the asset server can serve
// index.html at the webview root path.
func FrontendFS() fs.FS {
	sub, err := fs.Sub(frontendDist, "dist")
	if err != nil {
		core.Error("ide.main", "embed.sub", err)
		return frontendDist
	}
	return sub
}
