// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"time"

	core "dappco.re/go"
	"dappco.re/go/tenant"
)

// tenant_* bridge tools surface core/go-tenant's Service to the /tenant
// panel. Service is registered at composeRuntime time; this bridge layer
// just dispatches calls + formats responses for the frontend.

func (b *MCPBridge) tenantService() *tenant.Tenant {
	svc, _ := core.ServiceFor[*tenant.Tenant](b.Core(), "tenant")
	return svc
}

// toolTenantStatus reports whether the tenant service is registered and
// whether a PHP backend is configured (api_url + api_token present).
func (b *MCPBridge) toolTenantStatus(_ context.Context, _ map[string]any) map[string]any {
	svc := b.tenantService()
	if svc == nil {
		return map[string]any{
			"ok": true,
			"value": map[string]any{
				"registered": false,
				"online":     false,
				"hint":       "tenant service not registered",
			},
		}
	}
	cfg := b.Core().Config()
	apiURL := ""
	apiToken := ""
	if cfg != nil {
		apiURL = cfg.String("tenant.api_url")
		apiToken = cfg.String("tenant.api_token")
		if apiURL == "" {
			apiURL = cfg.String("api_url")
		}
		if apiToken == "" {
			apiToken = cfg.String("api_token")
		}
	}
	online := apiURL != "" && apiToken != ""
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"registered": true,
			"online":     online,
			"api_url":    apiURL,
			"api_token_set": apiToken != "",
			"hint":       tenantHint(online),
		},
	}
}

func tenantHint(online bool) string {
	if online {
		return "tenant client configured — calls to GetWorkspace/Can/RecordUsage hit the PHP API"
	}
	return "set tenant.api_url + tenant.api_token in ~/.core/config.yaml to enable live calls; offline mode returns cache-only or client-not-configured errors"
}

// toolTenantWorkspace looks up a workspace by slug, uuid, or id. The
// service's three Get methods all share the same return shape.
func (b *MCPBridge) toolTenantWorkspace(ctx context.Context, params map[string]any) map[string]any {
	svc := b.tenantService()
	if svc == nil {
		return errResp("tenant service not registered")
	}
	if slug := paramString(params, "slug", ""); slug != "" {
		return tenantResultToResponse(svc.GetWorkspace(ctx, slug))
	}
	if uuid := paramString(params, "uuid", ""); uuid != "" {
		return tenantResultToResponse(svc.GetWorkspaceByUUID(ctx, uuid))
	}
	if id := paramInt(params, "id", 0); id > 0 {
		return tenantResultToResponse(svc.GetWorkspaceByID(ctx, int64(id)))
	}
	if host := paramString(params, "subdomain", ""); host != "" {
		return tenantResultToResponse(svc.GetWorkspaceBySubdomain(ctx, host))
	}
	return errResp("provide one of: slug, uuid, id, subdomain")
}

// toolTenantUser fetches the authenticated user (per the API token's
// associated identity). Errors when no client is configured.
func (b *MCPBridge) toolTenantUser(ctx context.Context, params map[string]any) map[string]any {
	svc := b.tenantService()
	if svc == nil {
		return errResp("tenant service not registered")
	}
	// DuckDB cache — auth-bound user data is stable for the session;
	// 5min TTL covers the common nav-and-back. Force-refresh available.
	const collection = "tenant_user"
	const ttl = 5 * time.Minute
	force := paramBool(params, "force", false)
	if !force && cacheAge(collection) < ttl {
		_, raws, hit := cacheGetCollection(collection)
		if hit && len(raws) > 0 {
			var cached any
			if err := json.Unmarshal(raws[0], &cached); err == nil {
				return map[string]any{"ok": true, "value": cached}
			}
		}
	}
	resp := tenantResultToResponse(svc.GetUser(ctx))
	if ok, _ := resp["ok"].(bool); ok {
		_ = cacheSetCollection(collection, []cacheItem{{Key: "_root", Data: resp["value"]}})
	}
	return resp
}

// toolTenantCan runs an entitlement check. Cache-first; falls back to
// the API when the entitlement isn't cached. Result.IsAllowed() / Reason
// surface in the panel as Allow/Deny + explanation.
func (b *MCPBridge) toolTenantCan(ctx context.Context, params map[string]any) map[string]any {
	svc := b.tenantService()
	if svc == nil {
		return errResp("tenant service not registered")
	}
	wsUUID := paramString(params, "workspace_uuid", "")
	wsSlug := paramString(params, "workspace_slug", "")
	feature := paramString(params, "feature", "")
	qty := paramInt(params, "quantity", 1)
	if feature == "" {
		return errResp("feature is required")
	}
	if wsUUID == "" && wsSlug == "" {
		return errResp("workspace_uuid or workspace_slug is required")
	}
	// Resolve the workspace first.
	var ws *tenant.Workspace
	if wsUUID != "" {
		r := svc.GetWorkspaceByUUID(ctx, wsUUID)
		if !r.OK {
			return tenantResultToResponse(r)
		}
		w, ok := r.Value.(*tenant.Workspace)
		if !ok {
			return errResp("unexpected workspace shape")
		}
		ws = w
	} else {
		r := svc.GetWorkspace(ctx, wsSlug)
		if !r.OK {
			return tenantResultToResponse(r)
		}
		w, ok := r.Value.(*tenant.Workspace)
		if !ok {
			return errResp("unexpected workspace shape")
		}
		ws = w
	}
	result := svc.Can(ctx, ws, feature, qty)
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"allowed":   result.Allowed,
			"reason":    result.Reason,
			"feature":   feature,
			"quantity":  qty,
			"workspace": ws.Slug,
			"used":      result.Used,
			"limit":     result.Limit,
			"remaining": result.Remaining,
		},
	}
}

// toolTenantUsage returns the workspace's aggregated usage summary
// (per-feature counts vs limits). Cached for 60s per the RFC.
func (b *MCPBridge) toolTenantUsage(ctx context.Context, params map[string]any) map[string]any {
	svc := b.tenantService()
	if svc == nil {
		return errResp("tenant service not registered")
	}
	wsUUID := paramString(params, "workspace_uuid", "")
	wsSlug := paramString(params, "workspace_slug", "")
	if wsUUID == "" && wsSlug == "" {
		return errResp("workspace_uuid or workspace_slug is required")
	}
	var ws *tenant.Workspace
	if wsUUID != "" {
		r := svc.GetWorkspaceByUUID(ctx, wsUUID)
		if !r.OK {
			return tenantResultToResponse(r)
		}
		w, _ := r.Value.(*tenant.Workspace)
		ws = w
	} else {
		r := svc.GetWorkspace(ctx, wsSlug)
		if !r.OK {
			return tenantResultToResponse(r)
		}
		w, _ := r.Value.(*tenant.Workspace)
		ws = w
	}
	if ws == nil {
		return errResp("workspace resolved nil")
	}
	return tenantResultToResponse(svc.GetUsageSummary(ctx, ws))
}

func tenantResultToResponse(result core.Result) map[string]any {
	if !result.OK {
		if err, ok := result.Value.(error); ok {
			return map[string]any{"ok": false, "error": err.Error()}
		}
		return map[string]any{"ok": false, "error": "tenant call failed"}
	}
	return map[string]any{"ok": true, "value": result.Value}
}
