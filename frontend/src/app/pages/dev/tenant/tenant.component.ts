// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import * as TenantBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/tenantbridge';

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
 * Migrated 2026-05-10 to typed TenantBridge wails binding for the
 * tenant_status / tenant_workspace / tenant_user / tenant_can methods.
 * Workspace + User payloads pass through as map[string]any since the
 * tenant struct shapes are still in flux; rendered as JSON for now.
 */
@Component({
  selector: 'dev-tenant',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block tnt-block">
      <div class="block-header tnt-header">
        <h2 class="block-title">{{ 'tenant.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'tenant.subtitle.prefix' | translate }} <code>core/go-tenant</code> · {{ 'tenant.subtitle.suffix' | translate }}</span>
      </div>

      @if (tenantStatus(); as status) {
        <div class="tnt-status" [class.online]="status.online" [class.offline]="!status.online">
          <div class="tnt-status-row">
            <span class="tnt-status-pill">{{ (status.online ? 'tenant.status.online' : 'tenant.status.offline') | translate }}</span>
            <span class="tnt-status-detail">
              @if (status.online) { {{ 'tenant.status.connected-to' | translate }} <code>{{ status.api_url }}</code> }
              @else if (status.registered) { {{ 'tenant.status.registered-no-api' | translate }} }
              @else { {{ 'tenant.status.not-registered' | translate }} }
            </span>
            <button class="btn btn-ghost btn-sm" (click)="loadTenantStatus()">{{ 'tenant.button.refresh' | translate }}</button>
          </div>
          <div class="tnt-status-hint">{{ status.hint }}</div>
        </div>
      }

      <div class="tnt-body">
        <div class="tnt-card">
          <h3>{{ 'tenant.card.workspace-lookup' | translate }}</h3>
          <div class="tnt-form-row">
            <input class="tnt-input" type="text" [placeholder]="'tenant.placeholder.workspace-slug' | translate"
                   [value]="tenantWorkspaceLookup()"
                   (input)="tenantWorkspaceLookup.set($any($event.target).value)"
                   (keyup.enter)="tenantLookupWorkspace()" />
            <button class="btn btn-primary btn-sm" (click)="tenantLookupWorkspace()">{{ 'tenant.button.lookup' | translate }}</button>
          </div>
          @if (tenantWorkspaceError(); as err) {
            <div class="tnt-error">{{ err }}</div>
          }
          @if (tenantWorkspaceResult(); as ws) {
            <pre class="tnt-result">{{ formatJson(ws) }}</pre>
          }
        </div>

        <div class="tnt-card">
          <h3>{{ 'tenant.card.authenticated-user' | translate }}</h3>
          <button class="btn btn-ghost btn-sm" (click)="tenantLookupUser(true)">{{ 'tenant.button.get-user-force' | translate }}</button>
          @if (tenantUserResult(); as user) {
            <pre class="tnt-result">{{ formatJson(user) }}</pre>
          }
        </div>

        <div class="tnt-card">
          <h3>{{ 'tenant.card.entitlement-check' | translate }}</h3>
          <div class="tnt-form-grid">
            <label>
              <span>{{ 'tenant.label.workspace-slug' | translate }}</span>
              <input class="tnt-input" type="text" [value]="tenantCanForm().workspace" (input)="tenantCanField('workspace', $any($event.target).value)" />
            </label>
            <label>
              <span>{{ 'tenant.label.feature-code' | translate }}</span>
              <input class="tnt-input" type="text" [value]="tenantCanForm().feature" (input)="tenantCanField('feature', $any($event.target).value)" [placeholder]="'tenant.placeholder.feature' | translate" />
            </label>
            <label>
              <span>{{ 'tenant.label.quantity' | translate }}</span>
              <input class="tnt-input num" type="number" min="1" [value]="tenantCanForm().quantity" (input)="tenantCanField('quantity', $any($event.target).value)" />
            </label>
          </div>
          <button class="btn btn-primary btn-sm" (click)="runTenantCan()">{{ 'tenant.button.check-entitlement' | translate }}</button>
          @if (tenantCanError(); as err) {
            <div class="tnt-error">{{ err }}</div>
          }
          @if (tenantCanResult(); as r) {
            <div class="tnt-can-result" [class.allowed]="r.allowed" [class.denied]="!r.allowed">
              <div class="tnt-can-verdict">
                <span class="tnt-can-pill">{{ (r.allowed ? 'tenant.verdict.allow' : 'tenant.verdict.deny') | translate }}</span>
                <span>{{ r.feature }} × {{ tenantCanForm().quantity }} {{ 'tenant.label.on' | translate }} {{ r.workspace }}</span>
              </div>
              @if (r.reason) { <div class="tnt-can-reason">{{ r.reason }}</div> }
              @if (r.used !== undefined || r.limit !== undefined) {
                <div class="tnt-can-meta">{{ 'tenant.label.used' | translate }} {{ r.used ?? '—' }} / {{ 'tenant.label.limit' | translate }} {{ r.limit ?? '∞' }}{{ r.remaining !== undefined ? ' · ' + ('tenant.label.remaining' | translate) + ' ' + r.remaining : '' }}</div>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Tenant panel */
    .tnt-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .tnt-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .tnt-status { padding: 10px 18px; border-bottom: 1px solid var(--line-1); display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .tnt-status.online { background: color-mix(in oklch, #34d399 6%, transparent); }
    .tnt-status.offline { background: color-mix(in oklch, var(--fg-3) 6%, transparent); }
    .tnt-status-row { display: flex; align-items: center; gap: 10px; }
    .tnt-status-pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em; background: var(--ink-1); color: var(--fg-3); font-family: var(--font-mono); }
    .tnt-status.online .tnt-status-pill { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .tnt-status.offline .tnt-status-pill { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .tnt-status-detail { font-size: 12px; color: var(--fg-2); flex: 1; }
    .tnt-status-detail code { font-family: var(--font-mono); color: var(--fg-1); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; }
    .tnt-status-hint { font-size: 11px; color: var(--fg-3); font-style: italic; padding-left: 4px; }
    .tnt-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
    .tnt-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    .tnt-card h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0; }
    .tnt-form-row { display: flex; gap: 8px; }
    .tnt-form-grid { display: grid; grid-template-columns: 1fr 1fr 100px; gap: 8px; }
    .tnt-form-grid label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--fg-3); }
    .tnt-input { background: var(--ink-1); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 9px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); flex: 1; }
    .tnt-input:focus { border-color: var(--brand-400); outline: none; }
    .tnt-input.num { width: 80px; flex: 0 0 80px; }
    .tnt-error { color: #f87171; font-size: 12px; padding: 6px 10px; background: color-mix(in oklch, #f87171 8%, var(--ink-1)); border-radius: 4px; font-family: var(--font-mono); }
    .tnt-result { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 10px 12px; margin: 0; max-height: 280px; overflow-y: auto; background: var(--ink-1); border: 1px solid var(--line-1); border-radius: 5px; color: var(--fg-2); white-space: pre-wrap; }
    .tnt-can-result { padding: 10px 12px; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; }
    .tnt-can-result.allowed { background: color-mix(in oklch, #34d399 8%, var(--ink-1)); border: 1px solid color-mix(in oklch, #34d399 30%, var(--line-1)); }
    .tnt-can-result.denied { background: color-mix(in oklch, #f87171 8%, var(--ink-1)); border: 1px solid color-mix(in oklch, #f87171 30%, var(--line-1)); }
    .tnt-can-verdict { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .tnt-can-pill { font-family: var(--font-mono); font-size: 10px; padding: 3px 10px; border-radius: 4px; font-weight: 700; }
    .tnt-can-result.allowed .tnt-can-pill { background: #34d399; color: #064e3b; }
    .tnt-can-result.denied .tnt-can-pill { background: #f87171; color: #7f1d1d; }
    .tnt-can-reason { font-size: 12px; color: var(--fg-2); font-style: italic; }
    .tnt-can-meta { font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); }
  `],
})
export class TenantComponent implements OnInit {
  private readonly t = inject(TranslateService);

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
      const v = await TenantBridge.Status();
      this.tenantStatus.set({
        registered: v.registered,
        online: v.online,
        api_url: v.api_url || '',
        api_token_set: v.api_token_set,
        hint: v.hint || '',
      });
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
      const v = await TenantBridge.Workspace({ slug });
      this.tenantWorkspaceResult.set(v.value || null);
    } catch (e) {
      this.tenantWorkspaceError.set(this.t.instant('tenant.error.workspace-lookup') + ': ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async tenantLookupUser(force: boolean = false): Promise<void> {
    this.tenantUserResult.set(null);
    try {
      const v = await TenantBridge.User({ force });
      this.tenantUserResult.set(v.value || null);
    } catch (e) {
      this.tenantUserResult.set({ error: this.t.instant('tenant.error.user-lookup') + ': ' + (e instanceof Error ? e.message : String(e)) });
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
      const v = await TenantBridge.Can({
        workspace_slug: form.workspace,
        feature: form.feature,
        quantity: form.quantity,
      });
      this.tenantCanResult.set({
        allowed: v.allowed,
        reason: v.reason || '',
        feature: v.feature || form.feature,
        workspace: v.workspace || form.workspace,
        used: v.used,
        limit: v.limit,
        remaining: v.remaining,
      });
    } catch (e) {
      this.tenantCanError.set(this.t.instant('tenant.error.entitlement-check') + ': ' + (e instanceof Error ? e.message : String(e)));
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
