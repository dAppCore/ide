// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { callBridge } from '../../../lib/bridge';

interface TenantStatus {
  registered: boolean;
  online: boolean;
  api_url: string;
  api_token_set: boolean;
  hint: string;
}

interface TenantCanForm {
  workspace: string;
  feature: string;
  quantity: number;
}

interface TenantCanResult {
  allowed: boolean;
  reason: string;
  feature: string;
  workspace: string;
  used?: number;
  limit?: number;
  remaining?: number;
}

/**
 * Tenant panel — multi-tenancy + entitlements over core/go-tenant.
 * PHP-API consumer with local cache. Workspace lookup, authenticated
 * user fetch, entitlement check (Can).
 *
 * TODO(snider/wails): swap callBridge('tenant_*') for a tenantBridge
 * wails service.
 */
@Component({
  selector: 'dev-tenant',
  standalone: true,
  template: `
    <section class="block tnt-block">
      <div class="block-header tnt-header">
        <h2 class="block-title">Tenant</h2>
        <span class="editorial subtitle">Multi-tenancy + entitlements over <code>core/go-tenant</code> · PHP-API consumer with local cache.</span>
      </div>

      @if (tenantStatus(); as status) {
        <div class="tnt-status" [class.online]="status.online" [class.offline]="!status.online">
          <div class="tnt-status-row">
            <span class="tnt-status-pill">{{ status.online ? 'online' : 'offline' }}</span>
            <span class="tnt-status-detail">
              @if (status.online) { Connected to <code>{{ status.api_url }}</code> }
              @else if (status.registered) { Service registered — no PHP API configured }
              @else { Service not registered }
            </span>
            <button class="btn btn-ghost btn-sm" (click)="loadTenantStatus()">Refresh</button>
          </div>
          <div class="tnt-status-hint">{{ status.hint }}</div>
        </div>
      }

      <div class="tnt-body">
        <div class="tnt-card">
          <h3>Workspace lookup</h3>
          <div class="tnt-form-row">
            <input class="tnt-input" type="text" placeholder="workspace slug (e.g. lethean)"
                   [value]="tenantWorkspaceLookup()"
                   (input)="tenantWorkspaceLookup.set($any($event.target).value)"
                   (keyup.enter)="tenantLookupWorkspace()" />
            <button class="btn btn-primary btn-sm" (click)="tenantLookupWorkspace()">Lookup</button>
          </div>
          @if (tenantWorkspaceError(); as err) {
            <div class="tnt-error">{{ err }}</div>
          }
          @if (tenantWorkspaceResult(); as ws) {
            <pre class="tnt-result">{{ formatJson(ws) }}</pre>
          }
        </div>

        <div class="tnt-card">
          <h3>Authenticated user</h3>
          <button class="btn btn-ghost btn-sm" (click)="tenantLookupUser()">Get user</button>
          @if (tenantUserResult(); as user) {
            <pre class="tnt-result">{{ formatJson(user) }}</pre>
          }
        </div>

        <div class="tnt-card">
          <h3>Entitlement check (Can)</h3>
          <div class="tnt-form-grid">
            <label>
              <span>Workspace slug</span>
              <input class="tnt-input" type="text" [value]="tenantCanForm().workspace" (input)="tenantCanField('workspace', $any($event.target).value)" />
            </label>
            <label>
              <span>Feature code</span>
              <input class="tnt-input" type="text" [value]="tenantCanForm().feature" (input)="tenantCanField('feature', $any($event.target).value)" placeholder="pages / api_calls / models" />
            </label>
            <label>
              <span>Quantity</span>
              <input class="tnt-input num" type="number" min="1" [value]="tenantCanForm().quantity" (input)="tenantCanField('quantity', $any($event.target).value)" />
            </label>
          </div>
          <button class="btn btn-primary btn-sm" (click)="runTenantCan()">Check entitlement</button>
          @if (tenantCanError(); as err) {
            <div class="tnt-error">{{ err }}</div>
          }
          @if (tenantCanResult(); as r) {
            <div class="tnt-can-result" [class.allowed]="r.allowed" [class.denied]="!r.allowed">
              <div class="tnt-can-verdict">
                <span class="tnt-can-pill">{{ r.allowed ? 'ALLOW' : 'DENY' }}</span>
                <span>{{ r.feature }} × {{ tenantCanForm().quantity }} on {{ r.workspace }}</span>
              </div>
              @if (r.reason) { <div class="tnt-can-reason">{{ r.reason }}</div> }
              @if (r.used !== undefined || r.limit !== undefined) {
                <div class="tnt-can-meta">used {{ r.used ?? '—' }} / limit {{ r.limit ?? '∞' }}{{ r.remaining !== undefined ? ' · remaining ' + r.remaining : '' }}</div>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class TenantComponent implements OnInit {
  readonly tenantStatus = signal<TenantStatus | null>(null);
  readonly tenantWorkspaceLookup = signal<string>('');
  readonly tenantWorkspaceResult = signal<any>(null);
  readonly tenantWorkspaceError = signal<string | null>(null);
  readonly tenantUserResult = signal<any>(null);
  readonly tenantCanForm = signal<TenantCanForm>({ workspace: '', feature: '', quantity: 1 });
  readonly tenantCanResult = signal<TenantCanResult | null>(null);
  readonly tenantCanError = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.tenantStatus()) void this.loadTenantStatus();
  }

  async loadTenantStatus(): Promise<void> {
    try {
      const v = await callBridge<TenantStatus>('tenant_status', {});
      this.tenantStatus.set(v);
    } catch {
      // ignore — let user retry
    }
  }

  async tenantLookupWorkspace(): Promise<void> {
    const slug = this.tenantWorkspaceLookup().trim();
    if (!slug) return;
    this.tenantWorkspaceError.set(null);
    this.tenantWorkspaceResult.set(null);
    try {
      const v = await callBridge<any>('tenant_workspace', { slug });
      this.tenantWorkspaceResult.set(v);
    } catch (e) {
      this.tenantWorkspaceError.set('workspace lookup failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async tenantLookupUser(): Promise<void> {
    this.tenantUserResult.set(null);
    try {
      const v = await callBridge<any>('tenant_user', {});
      this.tenantUserResult.set(v);
    } catch (e) {
      this.tenantUserResult.set({ error: 'user lookup failed: ' + (e instanceof Error ? e.message : String(e)) });
    }
  }

  tenantCanField(field: 'workspace' | 'feature' | 'quantity', value: string): void {
    this.tenantCanForm.update((f) => ({
      ...f,
      [field]: field === 'quantity' ? Math.max(1, parseInt(value) || 1) : value,
    }));
  }

  async runTenantCan(): Promise<void> {
    const form = this.tenantCanForm();
    if (!form.workspace || !form.feature) return;
    this.tenantCanError.set(null);
    this.tenantCanResult.set(null);
    try {
      const v = await callBridge<TenantCanResult>('tenant_can', {
        workspace_slug: form.workspace,
        feature: form.feature,
        quantity: form.quantity,
      });
      this.tenantCanResult.set(v);
    } catch (e) {
      this.tenantCanError.set('entitlement check failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  formatJson(value: any): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
