import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('lethean-account-page')
export class LetheanAccountPage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      ${this.renderPageHeader()}
      ${this.renderScrollBody()}
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
        `, true)}

        ${this.renderSection('Security', html`
          ${this.renderRow(
            'Two-factor authentication',
            html`<span style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px; background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3)); border: 1px solid color-mix(in oklch, var(--success-500) 28%, transparent); color: var(--success-400); font-size: 11px;"><i class="fa-solid fa-circle" style="font-size: 5px;"></i> On · Authenticator</span>`,
            'manage'
          )}
          ${this.renderRow(
            'Recovery codes',
            html`<span style="font-family: var(--font-mono); font-size: 12px; color: var(--fg-3);">10 unused</span>`,
            'view'
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
            null
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
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-account-page': LetheanAccountPage;
  }
}
