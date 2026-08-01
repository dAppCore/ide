// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// tenantBridge — typed wails wrapper over MCPBridge tenant_* tools
// (multi-tenancy + entitlements over core/go-tenant).
type tenantBridge struct {
	core *core.Core
}

type TenantStatusOutput struct {
	OK          bool   `json:"ok"`
	Registered  bool   `json:"registered"`
	Online      bool   `json:"online"`
	APIURL      string `json:"api_url,omitempty"`
	APITokenSet bool   `json:"api_token_set"`
	Hint        string `json:"hint,omitempty"`
	Error       string `json:"error,omitempty"`
}

type TenantWorkspaceInput struct {
	Slug      string `json:"slug,omitempty"`
	UUID      string `json:"uuid,omitempty"`
	ID        int    `json:"id,omitempty"`
	Subdomain string `json:"subdomain,omitempty"`
}

// TenantPayloadOutput passes the Workspace / User / Usage struct shapes
// through verbatim — the panel renders them via JSON.stringify and v2
// will introduce concrete shapes once tenant_*'s contracts are stable.
type TenantPayloadOutput struct {
	OK    bool           `json:"ok"`
	Value map[string]any `json:"value,omitempty"`
	Error string         `json:"error,omitempty"`
}

type TenantUserInput struct {
	Force bool `json:"force,omitempty"`
}

type TenantCanInput struct {
	WorkspaceUUID string `json:"workspace_uuid,omitempty"`
	WorkspaceSlug string `json:"workspace_slug,omitempty"`
	Feature       string `json:"feature"`
	Quantity      int    `json:"quantity,omitempty"`
}

type TenantCanOutput struct {
	OK        bool   `json:"ok"`
	Allowed   bool   `json:"allowed"`
	Reason    string `json:"reason,omitempty"`
	Feature   string `json:"feature,omitempty"`
	Quantity  int    `json:"quantity,omitempty"`
	Workspace string `json:"workspace,omitempty"`
	Used      int    `json:"used,omitempty"`
	Limit     int    `json:"limit,omitempty"`
	Remaining int    `json:"remaining,omitempty"`
	Error     string `json:"error,omitempty"`
}

func (b *tenantBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// payloadOutput coerces a tenant tool response into the wrap-around
// {ok, value} shape. Workspace and User payloads have variable struct
// shapes; the frontend just renders them as JSON for now.
func payloadOutput(raw map[string]any) TenantPayloadOutput {
	out := TenantPayloadOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if value, ok := raw["value"].(map[string]any); ok {
		out.Value = value
	} else if raw["value"] != nil {
		out.Value = map[string]any{"_": raw["value"]}
	}
	return out
}

func (b *tenantBridge) Status() (TenantStatusOutput, error) {
	m := b.mcp()
	if m == nil {
		return TenantStatusOutput{}, core.E("ide.server.Tenant.Status", "mcp bridge unavailable", nil)
	}
	raw := m.toolTenantStatus(nil, nil)
	out := TenantStatusOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if v, ok := value["registered"].(bool); ok {
		out.Registered = v
	}
	if v, ok := value["online"].(bool); ok {
		out.Online = v
	}
	if s, ok := value["api_url"].(string); ok {
		out.APIURL = s
	}
	if v, ok := value["api_token_set"].(bool); ok {
		out.APITokenSet = v
	}
	if s, ok := value["hint"].(string); ok {
		out.Hint = s
	}
	return out, nil
}

func (b *tenantBridge) Workspace(ctx context.Context, input TenantWorkspaceInput) (TenantPayloadOutput, error) {
	m := b.mcp()
	if m == nil {
		return TenantPayloadOutput{}, core.E("ide.server.Tenant.Workspace", "mcp bridge unavailable", nil)
	}
	params := map[string]any{}
	if input.Slug != "" {
		params["slug"] = input.Slug
	}
	if input.UUID != "" {
		params["uuid"] = input.UUID
	}
	if input.ID > 0 {
		params["id"] = input.ID
	}
	if input.Subdomain != "" {
		params["subdomain"] = input.Subdomain
	}
	return payloadOutput(m.toolTenantWorkspace(ctx, params)), nil
}

func (b *tenantBridge) User(ctx context.Context, input TenantUserInput) (TenantPayloadOutput, error) {
	m := b.mcp()
	if m == nil {
		return TenantPayloadOutput{}, core.E("ide.server.Tenant.User", "mcp bridge unavailable", nil)
	}
	return payloadOutput(m.toolTenantUser(ctx, map[string]any{"force": input.Force})), nil
}

func (b *tenantBridge) Can(ctx context.Context, input TenantCanInput) (TenantCanOutput, error) {
	m := b.mcp()
	if m == nil {
		return TenantCanOutput{}, core.E("ide.server.Tenant.Can", "mcp bridge unavailable", nil)
	}
	params := map[string]any{
		"feature":  input.Feature,
		"quantity": input.Quantity,
	}
	if input.WorkspaceUUID != "" {
		params["workspace_uuid"] = input.WorkspaceUUID
	}
	if input.WorkspaceSlug != "" {
		params["workspace_slug"] = input.WorkspaceSlug
	}
	raw := m.toolTenantCan(ctx, params)
	out := TenantCanOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if v, ok := value["allowed"].(bool); ok {
		out.Allowed = v
	}
	if s, ok := value["reason"].(string); ok {
		out.Reason = s
	}
	if s, ok := value["feature"].(string); ok {
		out.Feature = s
	}
	if n, ok := value["quantity"].(float64); ok {
		out.Quantity = int(n)
	}
	if s, ok := value["workspace"].(string); ok {
		out.Workspace = s
	}
	if n, ok := value["used"].(float64); ok {
		out.Used = int(n)
	}
	if n, ok := value["limit"].(float64); ok {
		out.Limit = int(n)
	}
	if n, ok := value["remaining"].(float64); ok {
		out.Remaining = int(n)
	}
	return out, nil
}
