import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Brand = 'hostuk' | 'lethean' | 'ofm';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  k?: string;
  count?: number;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'house', k: 'G D' },
      { id: 'sites', label: 'Sites', icon: 'globe', k: 'G S', count: 3 },
      { id: 'domains', label: 'Domains', icon: 'at', k: 'G N', count: 4 },
      { id: 'mail', label: 'Mailboxes', icon: 'envelope', k: 'G M', count: 5 },
    ],
  },
  {
    title: 'Vi',
    items: [
      { id: 'agent', label: 'Agent activity', icon: 'sparkles', k: 'G A' },
      { id: 'policies', label: 'Policies', icon: 'shield-halved', k: 'G P' },
      { id: 'logs', label: 'Audit log', icon: 'scroll', k: 'G L' },
    ],
  },
  {
    title: 'You',
    items: [
      { id: 'account', label: 'Account', icon: 'user', k: ',' },
      { id: 'billing', label: 'Billing', icon: 'receipt', k: 'G B' },
      { id: 'team', label: 'Team', icon: 'users', k: 'G T' },
    ],
  },
];

@customElement('lethean-desktop')
export class LetheanDesktop extends LitElement {
  @property() brand: Brand = 'hostuk';
  @property({ attribute: 'active-nav' }) activeNav = 'account';

  // Light DOM so tokens.css + FA from document scope apply.
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private brandTitle(): string {
    return this.brand === 'hostuk' ? 'Host UK' : this.brand === 'lethean' ? 'Lethean' : 'OFM';
  }

  render() {
    return html`
      <div
        data-brand=${this.brand}
        class="surface"
        style="
          width: 100%;
          height: 100%;
          background: var(--ink-0);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--line-2);
          box-shadow: var(--shadow-3);
          display: flex;
          flex-direction: column;
        "
      >
        ${this.renderTitlebar()}
        <div
          style="
            flex: 1;
            display: grid;
            grid-template-columns: 220px 1fr;
            overflow: hidden;
            min-height: 0;
          "
        >
          ${this.renderSidebar()}
          ${this.renderBody()}
        </div>
      </div>
    `;
  }

  private renderTitlebar() {
    return html`
      <div
        style="
          height: 38px;
          flex-shrink: 0;
          background: var(--ink-2);
          border-bottom: 1px solid var(--line-1);
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          padding: 0 12px;
          -webkit-app-region: drag;
        "
      >
        <div style="display: flex; gap: 8px;">
          <span style="width: 12px; height: 12px; border-radius: 999px; background: #ff5f57; border: 0.5px solid rgba(0,0,0,0.2);"></span>
          <span style="width: 12px; height: 12px; border-radius: 999px; background: #febc2e; border: 0.5px solid rgba(0,0,0,0.2);"></span>
          <span style="width: 12px; height: 12px; border-radius: 999px; background: #28c840; border: 0.5px solid rgba(0,0,0,0.2);"></span>
        </div>
        <div style="text-align: center; font-size: 12.5px; color: var(--fg-2); letter-spacing: -0.005em;">
          ${this.brandTitle()} Desktop · Account
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--fg-4); font-family: var(--font-mono);">
          <kbd style="padding: 1px 6px; background: var(--ink-3); border: 1px solid var(--line-2); border-radius: 3px;">⌘K</kbd>
          <span>Search</span>
        </div>
      </div>
    `;
  }

  private renderSidebar() {
    return html`
      <aside
        style="
          background: var(--ink-0);
          border-right: 1px solid var(--line-1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        "
      >
        <button
          style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            margin: 8px 8px 4px;
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 6px;
            text-align: left;
            color: inherit;
            cursor: pointer;
          "
        >
          <span
            style="
              width: 22px; height: 22px; border-radius: 4px;
              background: var(--brand-500);
              display: grid; place-items: center;
              font-size: 11px; font-weight: 600; color: var(--fg-0);
            "
            >NN</span
          >
          <span style="flex: 1; min-width: 0;">
            <span
              style="display: block; font-size: 12.5px; color: var(--fg-0); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
            >North Notes</span>
            <span style="display: block; font-size: 10.5px; color: var(--fg-4); font-family: var(--font-mono);">Standard · 3 sites</span>
          </span>
          <i class="fa-solid fa-chevron-down" style="font-size: 9px; color: var(--fg-4);"></i>
        </button>

        <div style="flex: 1; overflow: auto; padding: 8px 4px;">
          ${NAV_GROUPS.map((g) => this.renderNavGroup(g))}
        </div>

        ${this.renderViDock()}
      </aside>
    `;
  }

  private renderNavGroup(g: NavGroup) {
    return html`
      <div style="margin-bottom: 14px;">
        <div
          style="
            padding: 6px 12px 4px;
            font-size: 10.5px;
            font-family: var(--font-mono);
            color: var(--fg-4);
            letter-spacing: 0.08em;
          "
        >
          ${g.title.toUpperCase()}
        </div>
        ${g.items.map((it) => this.renderNavItem(it))}
      </div>
    `;
  }

  private renderNavItem(it: NavItem) {
    const active = this.activeNav === it.id;
    return html`
      <button
        @click=${() => (this.activeNav = it.id)}
        style="
          width: calc(100% - 8px);
          display: grid;
          grid-template-columns: 16px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 5px 12px;
          background: ${active ? 'var(--ink-3)' : 'transparent'};
          color: ${active ? 'var(--fg-0)' : 'var(--fg-2)'};
          border: none;
          border-radius: 4px;
          text-align: left;
          margin: 1px 4px;
          font-size: 12.5px;
          font-weight: ${active ? 500 : 400};
          cursor: pointer;
          font-family: inherit;
        "
      >
        <i class="fa-solid fa-${it.icon}" style="font-size: 11px; color: ${active ? 'var(--brand-300)' : 'var(--fg-3)'};"></i>
        <span>${it.label}</span>
        ${it.count !== undefined
          ? html`<span style="font-size: 10px; font-family: var(--font-mono); color: var(--fg-4);">${it.count}</span>`
          : html`<span style="font-size: 9.5px; font-family: var(--font-mono); color: var(--fg-4);">${it.k ?? ''}</span>`}
      </button>
    `;
  }

  private renderViDock() {
    return html`
      <div
        style="
          padding: 10px 12px;
          border-top: 1px solid var(--line-1);
          display: flex;
          align-items: center;
          gap: 10px;
        "
      >
        <div
          style="
            width: 28px; height: 28px; border-radius: 6px;
            background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2));
            border: 1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2));
            overflow: hidden; position: relative;
            display: grid; place-items: center;
          "
        >
          <i class="fa-solid fa-feather" style="font-size: 13px; color: var(--brand-200);"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 11.5px; color: var(--fg-1);">Vi · idle</div>
          <div style="font-size: 10px; color: var(--fg-4); font-family: var(--font-mono);">watching 3 sites</div>
        </div>
        <i class="fa-solid fa-circle" style="font-size: 6px; color: var(--success-400);"></i>
      </div>
    `;
  }

  private renderBody() {
    return html`
      <div style="display: flex; flex-direction: column; background: var(--ink-1); overflow: hidden; min-width: 0;">
        ${this.renderPageHeader()}
        ${this.renderScrollBody()}
        ${this.renderStatusBar()}
      </div>
    `;
  }

  private renderPageHeader() {
    return html`
      <div
        style="
          padding: 20px 28px 16px;
          border-bottom: 1px solid var(--line-1);
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        "
      >
        <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">
          ACCOUNT · SETTINGS
        </div>
        <h1 style="font-size: 22px; letter-spacing: -0.02em; color: var(--fg-0); margin: 0;">Account settings</h1>
      </div>
    `;
  }

  private renderScrollBody() {
    return html`
      <div style="flex: 1; overflow: auto; padding: 20px 0 32px;">
        ${this.renderSection('Profile', html`
          ${this.renderRow('Name', html`Ada Patel`, 'edit')}
          ${this.renderRow('Email', html`ada@northnotes.co.uk`, 'edit')}
          ${this.renderRow('Workspace', html`North Notes Ltd`, 'switch')}
          ${this.renderRow(
            'Avatar',
            html`<span style="width: 28px; height: 28px; border-radius: 999px; background: var(--brand-500); color: var(--fg-0); display: grid; place-items: center; font-size: 12px; font-weight: 500;">AP</span>`,
            'change',
            true
          )}
        `, false)}

        ${this.renderSection('Security', html`
          ${this.renderRow(
            'Two-factor authentication',
            html`<span style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px; background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3)); border: 1px solid color-mix(in oklch, var(--success-500) 28%, transparent); color: var(--success-400); font-size: 11px;"><i class="fa-solid fa-circle" style="font-size: 5px;"></i> On · Authenticator</span>`,
            'manage',
            true
          )}
          ${this.renderRow(
            'Recovery codes',
            html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">10 unused</span>`,
            'view',
            true
          )}
          ${this.renderRow(
            'Active sessions',
            html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">3 devices</span>`,
            'review',
            true
          )}
        `)}

        ${this.renderSection('Subscription', html`
          ${this.renderRow('Current plan', html`Standard · annual`, 'change')}
          ${this.renderRow(
            'Renews',
            html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">14 Mar 2027 · £144/yr</span>`,
            null,
            true
          )}
          ${this.renderRow(
            'Payment method',
            html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">Visa · 4242</span>`,
            'update',
            true
          )}
        `)}

        ${this.renderSection('Notifications', html`
          ${this.renderToggleRow('Email alerts', true)}
          ${this.renderToggleRow('Push (mobile)', false)}
          ${this.renderToggleRow('Slack channel', true, true)}
        `)}

        ${this.renderDangerZone()}
      </div>
    `;
  }

  private renderSection(tag: string, body: unknown, first = false) {
    return html`
      <section style="margin-top: ${first ? 0 : 22}px; padding: 0 28px;">
        <div
          style="
            font-size: 11px;
            font-family: var(--font-mono);
            color: var(--fg-4);
            letter-spacing: 0.08em;
            padding: 0 4px 8px;
          "
        >${tag.toUpperCase()}</div>
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-1);
            border-radius: 10px;
            overflow: hidden;
          "
        >${body}</div>
      </section>
    `;
  }

  private renderRow(label: string, value: unknown, action: string | null, isLast = false) {
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: 180px 1fr auto;
          align-items: center;
          min-height: 44px;
          padding: 0 14px;
          border-bottom: ${isLast ? 'none' : '1px solid var(--line-1)'};
          gap: 12px;
        "
      >
        <div style="font-size: 13.5px; color: var(--fg-2);">${label}</div>
        <div style="font-size: 13.5px; color: var(--fg-0); display: flex; align-items: center; gap: 10px;">${value}</div>
        ${action
          ? html`<button
              style="
                background: transparent;
                border: 1px solid var(--line-2);
                color: var(--fg-1);
                padding: 4px 10px;
                border-radius: 5px;
                font-size: 12px;
                cursor: pointer;
                font-family: inherit;
              "
            >${action}</button>`
          : html``}
      </div>
    `;
  }

  private renderToggleRow(label: string, on: boolean, isLast = false) {
    return html`
      <div
        style="
          display: grid;
          grid-template-columns: 180px 1fr auto;
          align-items: center;
          min-height: 44px;
          padding: 0 14px;
          border-bottom: ${isLast ? 'none' : '1px solid var(--line-1)'};
          gap: 12px;
        "
      >
        <div style="font-size: 13.5px; color: var(--fg-2);">${label}</div>
        <div></div>
        <div
          style="
            width: 44px; height: 24px; border-radius: 999px;
            background: ${on ? 'var(--brand-500)' : 'var(--ink-4, #2a2733)'};
            border: 1px solid ${on ? 'var(--brand-400)' : 'var(--line-2)'};
            position: relative;
            cursor: pointer;
            transition: background 120ms ease;
          "
        >
          <div
            style="
              position: absolute;
              top: 1px;
              left: ${on ? '23px' : '1px'};
              width: 20px; height: 20px;
              border-radius: 999px;
              background: var(--fg-0);
              box-shadow: 0 1px 2px rgba(0,0,0,.3);
              transition: left 120ms ease;
            "
          ></div>
        </div>
      </div>
    `;
  }

  private renderDangerZone() {
    return html`
      <div style="padding: 22px 28px 0;">
        <div
          style="
            background: color-mix(in oklch, var(--danger-500) 6%, var(--ink-2));
            border: 1px solid color-mix(in oklch, var(--danger-500) 30%, var(--line-2));
            border-radius: 8px;
            padding: 14px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
          "
        >
          <div>
            <div style="font-size: 13px; color: var(--fg-0); font-weight: 500;">Export &amp; close account</div>
            <div style="font-size: 12px; color: var(--fg-3); margin-top: 3px;">GDPR-compliant data export. Deletes after 30 days.</div>
          </div>
          <button
            style="
              background: transparent;
              border: 1px solid color-mix(in oklch, var(--danger-500) 50%, var(--line-2));
              color: var(--danger-400);
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12.5px;
              font-weight: 500;
              white-space: nowrap;
              cursor: pointer;
              font-family: inherit;
            "
          >Request export</button>
        </div>
      </div>
    `;
  }

  private renderStatusBar() {
    return html`
      <div
        style="
          height: 28px;
          flex-shrink: 0;
          border-top: 1px solid var(--line-1);
          background: var(--ink-2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--fg-3);
        "
      >
        <div style="display: flex; gap: 14px; align-items: center;">
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <i class="fa-solid fa-circle-check" style="font-size: 9px; color: var(--success-400);"></i>
            Synced · 14:02
          </span>
          <span style="color: var(--fg-4);">·</span>
          <span>v0.42.7</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="color: var(--fg-4);">Press</span>
          <kbd style="padding: 1px 6px; background: var(--ink-3); border: 1px solid var(--line-2); border-radius: 3px; font-size: 10px;">⌘K</kbd>
          <span style="color: var(--fg-4);">for Vi</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-desktop': LetheanDesktop;
  }
}
