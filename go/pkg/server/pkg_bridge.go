// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// pkg_* bridge tools dispatch into the marketplace.Subsystem via the Core
// actions registered by marketplace/actions.go. The frontend Marketplace
// surface uses these directly through /mcp/call rather than going via the
// MCP-typed pipeline so it can render structured JSON without a schema dance.

func (b *MCPBridge) toolPkgSearch(ctx context.Context, params map[string]any) map[string]any {
	result := b.Core().Action("ide.pkg.search").Run(ctx, core.NewOptions(
		core.Option{Key: "query", Value: paramString(params, "query", "")},
		core.Option{Key: "category", Value: paramString(params, "category", "")},
	))
	return pkgResultToResponse(result)
}

func (b *MCPBridge) toolPkgInfo(ctx context.Context, params map[string]any) map[string]any {
	code := paramString(params, "code", "")
	if code == "" {
		return errResp("code is required")
	}
	result := b.Core().Action("ide.pkg.info").Run(ctx, core.NewOptions(
		core.Option{Key: "code", Value: code},
	))
	return pkgResultToResponse(result)
}

func (b *MCPBridge) toolPkgInstall(ctx context.Context, params map[string]any) map[string]any {
	code := paramString(params, "code", "")
	if code == "" {
		return errResp("code is required")
	}
	result := b.Core().Action("ide.pkg.install").Run(ctx, core.NewOptions(
		core.Option{Key: "code", Value: code},
	))
	return pkgResultToResponse(result)
}

func (b *MCPBridge) toolPkgInstalled(ctx context.Context) map[string]any {
	result := b.Core().Action("ide.pkg.installed").Run(ctx, core.NewOptions())
	return pkgResultToResponse(result)
}

func (b *MCPBridge) toolPkgRemove(ctx context.Context, params map[string]any) map[string]any {
	code := paramString(params, "code", "")
	if code == "" {
		return errResp("code is required")
	}
	result := b.Core().Action("ide.pkg.remove").Run(ctx, core.NewOptions(
		core.Option{Key: "code", Value: code},
	))
	return pkgResultToResponse(result)
}

func (b *MCPBridge) toolPkgMenus(ctx context.Context) map[string]any {
	result := b.Core().Action("ide.pkg.menus").Run(ctx, core.NewOptions())
	return pkgResultToResponse(result)
}

// pkgResultToResponse flattens the action result so the response is the
// underlying struct directly (with an "ok" sentinel) rather than the wrapped
// {"ok":true,"value":...} shape the generic resultToResponse uses. Easier to
// consume from JS without a destructuring step.
func pkgResultToResponse(result core.Result) map[string]any {
	if !result.OK {
		if err, ok := result.Value.(error); ok {
			return map[string]any{"ok": false, "error": err.Error()}
		}
		return map[string]any{"ok": false, "error": "pkg action failed"}
	}
	out := map[string]any{"ok": true}
	if result.Value != nil {
		out["value"] = result.Value
	}
	return out
}
