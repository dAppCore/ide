// SPDX-License-Identifier: EUPL-1.2

package marketplace

import (
	core "dappco.re/go"
	scmmarketplace "dappco.re/go/scm/marketplace"
)

// fixtureModules is the built-in sample marketplace catalogue. The IDE
// surfaces it whenever no remote endpoint is configured (config.Marketplace
// .Endpoint is empty), so a fresh install lights up the marketplace UI
// without needing a server. Once a real Lethean marketplace feed is wired,
// cfg.Endpoint takes over and these fixtures stop being consulted.
//
// Modules with an Entrypoint URL become runnable as webview dApps —
// installed → "Run" button opens window_open at the entrypoint, addressable
// by the same MCP bridge. Modules without an entrypoint are passive
// (themes, snippet packs, tool integrations).
var fixtureModules = []IdeModule{
	{
		Module:      scmmarketplace.Module{Code: "vi", Name: "Vi — local IDE companion", Version: "0.1.0", Repo: "lthn/vi", Category: "agents"},
		Description: "Vi is your in-IDE companion — watches your sites, surfaces alerts, runs local agents.",
		Entrypoint:  "http://127.0.0.1:9877/plugin/vi/",
		NativeTag:   "lethean-vi-plugin",
		DefaultMode: "native",
		Menu: &PluginMenu{
			Label:   "Vi",
			IconSVG: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>`,
			Subpages: []PluginMenuEntry{
				{Label: "Presence", Path: "presence"},
				{Label: "Ask", Path: "ask"},
				{Label: "Watched sites", Path: "sites"},
			},
		},
	},
	{
		Module:      scmmarketplace.Module{Code: "lemma-runner", Name: "Lemma local runner", Version: "0.3.1", Repo: "lthn/lemma-runner", Category: "agents"},
		Description: "Run Lemma / Gemma 4 / Qwen 3 locally via go-mlx. Browse models, generate, fine-tune.",
		Entrypoint:  "http://127.0.0.1:9877/plugin/lemma-runner/",
		DefaultMode: "iframe",
		Menu: &PluginMenu{
			Label:   "Lemma",
			IconSVG: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6"/><path d="M5 8h14l-1 12H6z"/><circle cx="12" cy="14" r="2"/></svg>`,
			Subpages: []PluginMenuEntry{
				{Label: "Models", Path: "models"},
				{Label: "Generate", Path: "generate"},
			},
		},
	},
	{
		Module:      scmmarketplace.Module{Code: "lethean-theme", Name: "Lethean theme pack", Version: "1.0.0", Repo: "lthn/lethean-theme", Category: "themes"},
		Description: "Brand-tuned editor and UI palettes (Lethean dark, Lethean tide, Lethean ember).",
	},
	{
		Module:      scmmarketplace.Module{Code: "core-formatter", Name: "Core formatter", Version: "0.5.0", Repo: "lthn/core-formatter", Category: "tools"},
		Description: "AX-aware formatter — collapses With*/Must*/For[T] to canonical Core primitives.",
	},
	{
		Module:      scmmarketplace.Module{Code: "go-snippets", Name: "Go snippets", Version: "1.2.0", Repo: "lthn/go-snippets", Category: "snippets"},
		Description: "Snippet pack for Core idioms — Service.go boilerplate, c.Action wiring, Result handling.",
	},
}

func fixtureSearch(input SearchInput) []IdeModule {
	queryLower := core.Lower(core.Trim(input.Query))
	categoryLower := core.Lower(core.Trim(input.Category))
	out := make([]IdeModule, 0, len(fixtureModules))
	for _, mod := range fixtureModules {
		if categoryLower != "" && core.Lower(mod.Category) != categoryLower {
			continue
		}
		if queryLower != "" {
			haystack := core.Lower(core.Concat(mod.Code, " ", mod.Name, " ", mod.Category, " ", mod.Description))
			if !core.Contains(haystack, queryLower) {
				continue
			}
		}
		out = append(out, mod)
	}
	return out
}

func fixtureFind(code string) (IdeModule, bool) {
	target := core.Lower(core.Trim(code))
	for _, mod := range fixtureModules {
		if core.Lower(mod.Code) == target {
			return mod, true
		}
	}
	return IdeModule{}, false
}
