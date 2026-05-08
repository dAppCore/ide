// SPDX-License-Identifier: EUPL-1.2

package server

import (
	core "dappco.re/go"
	"dappco.re/go/tenant"
)

// registerTenantService mounts core/go-tenant's Tenant Service under the
// IDE's Core. The service operates in two modes:
//
//   - Offline: no tenant.api_url + api_token configured → no client; cache
//     is local-only; reads return "client not configured" errors but the
//     /tenant panel can still render the surface (workspace lookup forms
//     work, just error gracefully).
//   - Live: configured → calls PHP REST API for all reads/writes, caches
//     locally per the RFC's TTLs.
//
// Configuration lives under "tenant.api_url" / "tenant.api_token" /
// "tenant.timeout" in core/config (same shape as the package's RFC).
func registerTenantService(c *core.Core) core.Result {
	// tenant.Register is a factory — it returns the constructed *Tenant in
	// result.Value but doesn't bind it to the Core's service registry. Most
	// callers wire it as core.WithService(tenant.Register) in core.New;
	// we're past that point so do the bind manually so subsequent
	// core.ServiceFor[*tenant.Tenant](c, "tenant") resolves.
	r := tenant.Register(c)
	if !r.OK {
		return r
	}
	if r.Value == nil {
		return core.Fail(core.E("tenant", "register returned nil service", nil))
	}
	return c.RegisterService("tenant", r.Value)
}
