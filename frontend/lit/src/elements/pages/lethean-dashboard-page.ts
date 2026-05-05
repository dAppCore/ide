// <lethean-dashboard-page> — order.host.uk.com customer account
// dashboard. 240px sidebar (overview/subscriptions/invoices/payment
// methods/usage/team/security/help + Vi help-card at bottom) + main
// area (header with status pill, 4-up billing-summary cards,
// subscriptions table, invoices + payment-methods panels in a 2-up grid).
// Ported from dashboard.jsx > AccountDashboard with all sub-renderers
// inlined.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../atoms/lethean-brand-mark';
import '../atoms/lethean-vi';

interface SidebarItem {
  icon: string;
  label: string;
  active?: boolean;
}

interface SummaryCard {
  label: string;
  value: string;
  sub: string;
  icon: string;
  bar?: number;
}

interface SubscriptionRow {
  name: string;
  icon: string;
  state: 'Active' | 'Provisioning' | 'Trial · 9 days left';
  price: number; // 0 = free trial
  next: string;
  since: string;
}

interface InvoiceRow {
  id: string;
  date: string;
  amount: number;
  state: 'Paid' | 'Open' | 'Overdue';
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { icon: 'house', label: 'Overview', active: true },
  { icon: 'boxes-stacked', label: 'Subscriptions' },
  { icon: 'receipt', label: 'Invoices' },
  { icon: 'credit-card', label: 'Payment methods' },
  { icon: 'chart-pie', label: 'Usage' },
  { icon: 'users', label: 'Team' },
  { icon: 'shield-halved', label: 'Security' },
  { icon: 'circle-question', label: 'Help & support' },
];

const SUMMARY_CARDS: SummaryCard[] = [
  { label: 'Next charge', value: '£40.80', sub: '12 May 2026 · in 8 days', icon: 'calendar-check' },
  { label: 'This month', value: '£40.80', sub: '1 invoice · paid', icon: 'receipt' },
  { label: 'Storage used', value: '6.4 GB', sub: 'of 10 GB · 64%', icon: 'database', bar: 64 },
  { label: 'Seats', value: '3 / 5', sub: '2 invitations pending', icon: 'users' },
];

const SUBSCRIPTIONS: SubscriptionRow[] = [
  { name: 'Host UK Family', icon: 'boxes-stacked', state: 'Active', price: 24, next: '12 May', since: 'Jan 2026' },
  { name: 'Analytics — extra domains', icon: 'chart-line', state: 'Active', price: 4, next: '12 May', since: 'Mar 2026' },
  { name: 'Storage top-up · 50 GB', icon: 'database', state: 'Provisioning', price: 6, next: '12 May', since: 'Today' },
  { name: 'Host Trust', icon: 'shield-check', state: 'Trial · 9 days left', price: 0, next: '—', since: '—' },
];

const INVOICES: InvoiceRow[] = [
  { id: 'INV-2026-0412', date: '12 Apr 2026', amount: 40.80, state: 'Paid' },
  { id: 'INV-2026-0312', date: '12 Mar 2026', amount: 34.80, state: 'Paid' },
  { id: 'INV-2026-0212', date: '12 Feb 2026', amount: 28.80, state: 'Paid' },
  { id: 'INV-2026-0112', date: '12 Jan 2026', amount: 28.80, state: 'Paid' },
];

const gbp = (n: number) => `£${n.toFixed(2)}`;

@customElement('lethean-dashboard-page')
export class LetheanDashboardPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private _sidebar(): TemplateResult {
    return html`
      <aside
        style="
          background: var(--ink-0);
          border-right: 1px solid var(--line-1);
          padding: 24px 16px;
          display: flex; flex-direction: column; gap: 4px;
        "
      >
        <div style="padding: 0 8px 18px; border-bottom: 1px solid var(--line-1); margin-bottom: 14px;">
          <lethean-brand-mark size="sm" name="Host UK" subdomain="order"></lethean-brand-mark>
          <div
            style="
              font-family: var(--font-mono);
              font-size: 10.5px; color: var(--fg-4);
              margin-top: 6px;
            "
          >order.host.uk.com</div>
        </div>
        ${SIDEBAR_ITEMS.map(
          (it) => html`
            <a
              href="#"
              style="
                display: flex; align-items: center; gap: 11px;
                padding: 8px 10px; border-radius: 7px;
                font-size: 13.5px;
                color: ${it.active ? 'var(--fg-0)' : 'var(--fg-2)'};
                background: ${it.active ? 'var(--ink-3)' : 'transparent'};
                border: 1px solid ${it.active ? 'var(--line-1)' : 'transparent'};
                text-decoration: none;
              "
            >
              <i
                class="fa-solid fa-${it.icon}"
                style="font-size: 13px; color: ${it.active ? 'var(--brand-200)' : 'var(--fg-3)'};"
              ></i>
              ${it.label}
            </a>
          `
        )}
        <div
          style="
            margin-top: auto;
            padding: 12px 10px;
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 10px;
            font-size: 12px;
          "
        >
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
            <lethean-vi pose="peek-left" size="36"></lethean-vi>
            <div style="font-weight: 500; color: var(--fg-1);">Need a hand?</div>
          </div>
          <div style="color: var(--fg-3); line-height: 1.4;">
            I'll find a real human in under 4 hours, 9–5 UK.
          </div>
        </div>
      </aside>
    `;
  }

  private _header(): TemplateResult {
    return html`
      <div
        style="
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 22px;
        "
      >
        <div>
          <div class="pill" style="margin-bottom: 8px;">
            <span
              style="
                width: 7px; height: 7px; border-radius: 50%;
                background: var(--success-400);
                display: inline-block; margin-right: 6px;
              "
            ></span>
            Active · monthly billing
          </div>
          <h1 style="font-size: 28px; letter-spacing: -0.025em; margin: 0;">
            Account · Little Wave Studio
          </h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-download" style="font-size: 11px; margin-right: 4px;"></i>
            Export data (GDPR)
          </button>
          <button class="btn btn-primary btn-sm">
            <i class="fa-solid fa-plus" style="font-size: 11px; margin-right: 4px;"></i>
            Add a product
          </button>
        </div>
      </div>
    `;
  }

  private _summaryRow(): TemplateResult {
    return html`
      <div
        style="
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 14px; margin-bottom: 24px;
        "
      >
        ${SUMMARY_CARDS.map(
          (c) => html`
            <div class="card" style="padding: 16px;">
              <div
                style="
                  display: flex; align-items: center;
                  justify-content: space-between; margin-bottom: 10px;
                "
              >
                <span
                  style="
                    font-size: 11.5px; color: var(--fg-3);
                    letter-spacing: 0.02em; text-transform: uppercase;
                  "
                >${c.label}</span>
                <i class="fa-solid fa-${c.icon}" style="font-size: 12px; color: var(--fg-4);"></i>
              </div>
              <div
                class="tnum"
                style="
                  font-size: 24px; font-weight: 600; color: var(--fg-0);
                  letter-spacing: -0.02em; margin-bottom: 4px;
                "
              >${c.value}</div>
              <div style="font-size: 11.5px; color: var(--fg-3);">${c.sub}</div>
              ${c.bar !== undefined
                ? html`<div
                    style="
                      margin-top: 10px; height: 4px;
                      background: var(--ink-3); border-radius: 2px;
                      overflow: hidden;
                    "
                  >
                    <div
                      style="
                        width: ${c.bar}%; height: 100%;
                        background: var(--brand-400);
                      "
                    ></div>
                  </div>`
                : html``}
            </div>
          `
        )}
      </div>
    `;
  }

  private _subscriptionsTable(): TemplateResult {
    return html`
      <div class="card" style="overflow: hidden; margin-bottom: 24px;">
        <div
          style="
            padding: 16px 20px; border-bottom: 1px solid var(--line-1);
            display: flex; justify-content: space-between; align-items: center;
          "
        >
          <div style="font-size: 14px; font-weight: 600; color: var(--fg-0);">Active subscriptions</div>
          <a href="#" style="font-size: 12px; color: var(--brand-200); text-decoration: none;">Manage all</a>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--ink-1);">
              ${['Product', 'Status', 'Price', 'Next charge', 'Started', ''].map(
                (h, i) => html`
                  <th
                    style="
                      text-align: ${i === 2 ? 'right' : 'left'};
                      padding: 10px 20px;
                      font-size: 11px; font-weight: 500;
                      color: var(--fg-3); letter-spacing: 0.05em;
                      text-transform: uppercase;
                      border-bottom: 1px solid var(--line-1);
                    "
                  >${h}</th>
                `
              )}
            </tr>
          </thead>
          <tbody>
            ${SUBSCRIPTIONS.map(
              (r, i) => html`
                <tr style="border-bottom: ${i < SUBSCRIPTIONS.length - 1 ? '1px solid var(--line-1)' : 'none'};">
                  <td style="padding: 14px 20px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div
                        style="
                          width: 30px; height: 30px; border-radius: 7px;
                          background: var(--ink-3);
                          display: grid; place-items: center;
                          border: 1px solid var(--line-2);
                        "
                      >
                        <i class="fa-solid fa-${r.icon}" style="font-size: 12px; color: var(--brand-200);"></i>
                      </div>
                      <span style="font-size: 13.5px; color: var(--fg-0); font-weight: 500;">${r.name}</span>
                    </div>
                  </td>
                  <td style="padding: 14px 20px;">
                    <span
                      class=${r.state === 'Active'
                        ? 'pill pill-success'
                        : r.state === 'Provisioning'
                        ? 'pill pill-warn'
                        : 'pill'}
                    >${r.state}</span>
                  </td>
                  <td
                    class="tnum"
                    style="padding: 14px 20px; font-size: 13.5px; color: var(--fg-0); text-align: right;"
                  >
                    ${r.price === 0
                      ? html`<span style="color: var(--fg-3);">Free trial</span>`
                      : html`${gbp(r.price)}<span style="color: var(--fg-3); font-size: 12px;"> /mo</span>`}
                  </td>
                  <td style="padding: 14px 20px; font-size: 13px; color: var(--fg-1);">${r.next}</td>
                  <td style="padding: 14px 20px; font-size: 13px; color: var(--fg-3);">${r.since}</td>
                  <td style="padding: 14px 20px; text-align: right;">
                    <button class="btn btn-ghost btn-sm">
                      <i class="fa-solid fa-ellipsis" style="font-size: 11px;"></i>
                    </button>
                  </td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  private _invoicesPanel(): TemplateResult {
    return html`
      <div class="card" style="overflow: hidden;">
        <div
          style="
            padding: 16px 20px; border-bottom: 1px solid var(--line-1);
            display: flex; justify-content: space-between; align-items: center;
          "
        >
          <div style="font-size: 14px; font-weight: 600; color: var(--fg-0);">Recent invoices</div>
          <a href="#" style="font-size: 12px; color: var(--brand-200); text-decoration: none;">See all 12</a>
        </div>
        ${INVOICES.map(
          (r, i) => html`
            <div
              style="
                padding: 12px 20px;
                display: grid; grid-template-columns: auto 1fr auto auto auto;
                gap: 14px; align-items: center;
                border-bottom: ${i < INVOICES.length - 1 ? '1px solid var(--line-1)' : 'none'};
              "
            >
              <i class="fa-solid fa-file-pdf" style="font-size: 14px; color: var(--fg-3);"></i>
              <div>
                <div class="tnum" style="font-size: 13px; color: var(--fg-0);">${r.id}</div>
                <div style="font-size: 11.5px; color: var(--fg-3);">${r.date}</div>
              </div>
              <span class="pill pill-success" style="font-size: 10.5px;">${r.state}</span>
              <span class="tnum" style="font-size: 13px; color: var(--fg-0);">${gbp(r.amount)}</span>
              <button class="btn btn-ghost btn-sm" style="width: 28px; padding: 0;">
                <i class="fa-solid fa-download" style="font-size: 11px;"></i>
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  private _paymentMethodsPanel(): TemplateResult {
    return html`
      <div class="card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 14px;">
          <div style="font-size: 14px; font-weight: 600; color: var(--fg-0);">Payment methods</div>
          <button class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-plus" style="font-size: 10px; margin-right: 4px;"></i>
            Add
          </button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div
            style="
              padding: 14px;
              background: var(--ink-1);
              border-radius: 10px;
              border: 1px solid var(--line-2);
              display: flex; gap: 14px; align-items: center;
            "
          >
            <div
              style="
                width: 38px; height: 26px; border-radius: 4px;
                background: linear-gradient(135deg, var(--brand-700), var(--brand-500));
                display: grid; place-items: center;
                color: white; font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
              "
            >VISA</div>
            <div style="flex: 1;">
              <div class="tnum" style="font-size: 13.5px; color: var(--fg-0);">•••• •••• •••• 4242</div>
              <div style="font-size: 11.5px; color: var(--fg-3);">Alex Linton · expires 12 / 28</div>
            </div>
            <span class="pill pill-brand">Default</span>
          </div>
          <div
            style="
              padding: 14px;
              background: var(--ink-1);
              border-radius: 10px;
              border: 1px solid var(--line-1);
              display: flex; gap: 14px; align-items: center;
            "
          >
            <div
              style="
                width: 38px; height: 26px; border-radius: 4px;
                background: var(--ink-3);
                display: grid; place-items: center;
                color: var(--fg-2); font-size: 11px;
              "
            >
              <i class="fa-solid fa-building-columns" style="font-size: 12px;"></i>
            </div>
            <div style="flex: 1;">
              <div style="font-size: 13.5px; color: var(--fg-0);">Bacs Direct Debit</div>
              <div style="font-size: 11.5px; color: var(--fg-3);">Lloyds · ••55-91 · A LINTON</div>
            </div>
            <button class="btn btn-ghost btn-sm">Make default</button>
          </div>
        </div>
        <div
          style="
            margin-top: 18px; padding: 12px;
            background: color-mix(in oklch, var(--info-500) 7%, var(--ink-2));
            border: 1px solid color-mix(in oklch, var(--info-500) 22%, transparent);
            border-radius: 8px;
            font-size: 12px; color: var(--fg-2);
            display: flex; gap: 10px;
          "
        >
          <i class="fa-solid fa-circle-info" style="font-size: 12px; color: var(--info-400); margin-top: 2px;"></i>
          <div>
            Cards are stored by Stripe. We never see the number — your bank
            handles 3-D Secure when needed.
          </div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          display: grid; grid-template-columns: 240px 1fr;
        "
      >
        ${this._sidebar()}
        <div style="padding: 28px 36px; overflow: hidden;">
          ${this._header()}
          ${this._summaryRow()}
          ${this._subscriptionsTable()}
          <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; margin-top: 24px;">
            ${this._invoicesPanel()}
            ${this._paymentMethodsPanel()}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-dashboard-page': LetheanDashboardPage;
  }
}
