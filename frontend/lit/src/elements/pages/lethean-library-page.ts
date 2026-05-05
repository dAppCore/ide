import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '../atoms/lethean-icon';
import '../atoms/lethean-raven';
import '../atoms/lethean-brand-mark';
import '../atoms/lethean-vi';
import '../atoms/lethean-pill';
import '../atoms/lethean-button';
import '../atoms/lethean-card';
import '../atoms/lethean-status-dot';
import '../forms/lethean-input';
import '../forms/lethean-toggle';
import '../forms/lethean-field';
import '../forms/lethean-slider';
import '../forms/lethean-select';
import '../forms/lethean-radio-group';
import '../forms/lethean-number-stepper';
import '../forms/lethean-color-picker';
import '../feedback/lethean-dialog';
import '../feedback/lethean-toast';
import '../feedback/lethean-empty-state';
import '../shell/lethean-site-card';
import '../vi/lethean-action-card';
import '../shell/lethean-section-header';
import '../shell/lethean-brief-card';
import '../shell/lethean-vi-message';
import '../vi/lethean-prov-step';
import '../vi/lethean-prov-timeline';
import '../feedback/lethean-error-page';
import '../feedback/lethean-uptime-strip';
import '../marketing/lethean-mkt-hero';
import '../marketing/lethean-mkt-section';
import '../marketing/lethean-mkt-cta';
import '../marketing/lethean-mkt-nav';
import '../marketing/lethean-mkt-footer';
import '../marketing/lethean-products-grid';
import '../commerce/lethean-cart-row';
import '../commerce/lethean-cart-summary';
import '../commerce/lethean-subscription-card';
import '../commerce/lethean-invoice-row';
import '../commerce/lethean-payment-method-card';
import '../commerce/lethean-email-template';
import '../vi/lethean-checklist-item';
import '../vi/lethean-first-win';

@customElement('lethean-library-page')
export class LetheanLibraryPage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private toggleDialog = (id: string, open: boolean) => {
    const el = this.querySelector('#' + id) as { open?: boolean } | null;
    if (el) el.open = open;
  };

  render() {
    return html`
      <div
        style="
          padding: 16px 22px 12px;
          border-bottom: 1px solid var(--line-1);
          flex-shrink: 0;
        "
      >
        <div
          style="
            font-size: 11px;
            color: var(--brand-300);
            font-family: var(--font-mono);
            letter-spacing: 0.06em;
            text-transform: uppercase;
          "
        >LETHEAN-3 · COMPONENT LIBRARY</div>
        <h1
          style="
            font-family: var(--font-display, inherit);
            font-size: 22px;
            margin: 4px 0 0;
            font-weight: 600;
            letter-spacing: -0.025em;
            color: var(--fg-0);
          "
        >Every primitive, on one page.</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: var(--fg-2); max-width: 640px;">
          Atoms, forms, feedback, Vi flows. Browse what's there, copy the tag, drop it where you need it.
        </p>
      </div>

      <div style="flex: 1; overflow: auto; padding: 22px; display: flex; flex-direction: column; gap: 26px;">
        ${this.renderAtoms()}
        ${this.renderForms()}
        ${this.renderAdvancedForms()}
        ${this.renderFeedback()}
        ${this.renderViFlow()}
        ${this.renderProvisioning()}
        ${this.renderShellSamples()}
        ${this.renderUptime()}
        ${this.renderEmptyState()}
        ${this.renderErrorPages()}
        ${this.renderOnboarding()}
        ${this.renderProductsGrid()}
        ${this.renderMarketingPreview()}
        ${this.renderMarketingChrome()}
        ${this.renderCommerce()}
        ${this.renderEmailTemplates()}
      </div>

      ${this.renderDialogs()}
    `;
  }

  private renderAtoms() {
    return html`
      <section>
        <lethean-section-header heading="Atoms" subtitle="brand glyphs / pills / buttons / cards"></lethean-section-header>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">RAVEN · BRAND-MARK</div>
            <div style="display: flex; gap: 18px; align-items: center; flex-wrap: wrap;">
              <lethean-raven size="20" color="var(--brand-200)"></lethean-raven>
              <lethean-raven size="32" color="var(--brand-200)"></lethean-raven>
              <lethean-brand-mark size="sm" name="Lethean"></lethean-brand-mark>
            </div>
            <lethean-brand-mark size="md" name="Lethean" subdomain="ide"></lethean-brand-mark>
          </div>

          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">PILLS</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <lethean-pill>neutral</lethean-pill>
              <lethean-pill tone="brand" dot>brand</lethean-pill>
              <lethean-pill tone="success" dot>success</lethean-pill>
              <lethean-pill tone="warning" dot>warning</lethean-pill>
              <lethean-pill tone="info" dot>info</lethean-pill>
              <lethean-pill tone="danger" dot>danger</lethean-pill>
            </div>
          </div>

          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">BUTTONS</div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <lethean-button variant="primary" size="sm">Primary sm</lethean-button>
              <lethean-button variant="secondary" size="md">Secondary md</lethean-button>
              <lethean-button variant="ghost" size="md">Ghost</lethean-button>
              <lethean-button variant="danger" size="md">Danger</lethean-button>
              <lethean-button variant="primary" size="lg">Primary lg</lethean-button>
            </div>
          </div>

          <lethean-card>
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em; margin-bottom: 8px;">CARD</div>
            <div style="font-size: 13px; color: var(--fg-1); line-height: 1.5;">
              A plain Lethean card. Pass <code style="background: var(--ink-3); padding: 1px 4px; border-radius: 3px;">tone="warning"</code> to tint the border.
            </div>
          </lethean-card>
        </div>
      </section>
    `;
  }

  private renderForms() {
    return html`
      <section>
        <lethean-section-header heading="Forms" subtitle="inputs / toggles / fields"></lethean-section-header>
        <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 22px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px;">
          <lethean-field label="Workspace name" hint="Visible to teammates only.">
            <lethean-input value="North Notes Ltd"></lethean-input>
          </lethean-field>
          <lethean-field label="Email" error="That email is already in use.">
            <lethean-input type="email" value="ada@northnotes.co.uk"></lethean-input>
          </lethean-field>
          <lethean-field label="Slack notifications">
            <div style="display: flex; align-items: center; gap: 10px;">
              <lethean-toggle checked></lethean-toggle>
              <span style="font-size: 12px; color: var(--fg-3);">Enabled — Vi posts to #ops</span>
            </div>
          </lethean-field>
        </div>
      </section>
    `;
  }

  private renderAdvancedForms() {
    return html`
      <section>
        <lethean-section-header heading="Advanced controls" subtitle="slider / select / radio / stepper / color"></lethean-section-header>
        <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 22px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px;">
          <lethean-field label="Sites watched" hint="Vi pings each site at this rate.">
            <lethean-slider label="Polling cadence" .value=${30} min="5" max="120" step="5" unit="s"></lethean-slider>
          </lethean-field>
          <lethean-field label="Daily soft-spend" hint="Vi acts up to this; asks above.">
            <lethean-number-stepper label="Cap" .value=${25} min="0" max="500" step="5" unit="GBP"></lethean-number-stepper>
          </lethean-field>
          <lethean-field label="Notification preference">
            <lethean-radio-group
              .options=${['Quiet', 'Standard', 'Loud']}
              value="Standard"
            ></lethean-radio-group>
          </lethean-field>
          <lethean-field label="Default region">
            <lethean-select
              .options=${[
                { value: 'eu-south', label: 'EU-South · Manchester' },
                { value: 'eu-west', label: 'EU-West · Frankfurt' },
                { value: 'us-east', label: 'US-East · Virginia' },
              ]}
              value="eu-south"
            ></lethean-select>
          </lethean-field>
          <lethean-field label="Brand accent">
            <lethean-color-picker value="#7e57ff"></lethean-color-picker>
          </lethean-field>
          <lethean-field label="Status indicators" hint="Same dot, every tone.">
            <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--fg-1);">
                <lethean-status-dot tone="success" pulse></lethean-status-dot> Live
              </span>
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--fg-1);">
                <lethean-status-dot tone="warning"></lethean-status-dot> Warn
              </span>
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--fg-1);">
                <lethean-status-dot tone="danger"></lethean-status-dot> Down
              </span>
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--fg-1);">
                <lethean-status-dot tone="brand"></lethean-status-dot> Vi
              </span>
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--fg-1);">
                <lethean-status-dot tone="neutral"></lethean-status-dot> Idle
              </span>
            </div>
          </lethean-field>
        </div>
      </section>
    `;
  }

  private renderFeedback() {
    return html`
      <section>
        <lethean-section-header heading="Feedback" subtitle="dialog / toast"></lethean-section-header>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">DIALOG</div>
            <div style="font-size: 13px; color: var(--fg-2);">Modal with header, body, and footer slot for actions. ESC dismisses unless <code style="background: var(--ink-3); padding: 1px 4px; border-radius: 3px;">no-close</code> is set.</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <lethean-button variant="primary" size="sm" @click=${() => this.toggleDialog('lib-dialog-1', true)}>Open dialog</lethean-button>
              <lethean-button variant="ghost" size="sm" @click=${() => this.toggleDialog('lib-dialog-2', true)}>Confirm danger</lethean-button>
            </div>
          </div>

          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">TOAST</div>
            <lethean-toast open tone="success" icon="circle-check" heading="Saved" body="Your changes are live across the family."></lethean-toast>
            <lethean-toast open tone="warning" icon="triangle-exclamation" heading="Storage at 82%" body="Vi will auto-archive backups older than 60 days unless you override."></lethean-toast>
          </div>
        </div>
      </section>
    `;
  }

  private renderViFlow() {
    return html`
      <section>
        <lethean-section-header heading="Vi flow" subtitle="message / typing / inline action card"></lethean-section-header>
        <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 22px; display: flex; flex-direction: column; gap: 18px;">
          <lethean-vi-message who="you">
            What's slow on hookway.co.uk?
          </lethean-vi-message>
          <lethean-vi-message who="vi">
            <p style="margin: 0;">Two things stand out today — image payload on <span style="font-family: var(--font-mono); color: var(--fg-0);">/blog/2024-recap</span>, and the comments endpoint averaging 412ms.</p>
          </lethean-vi-message>
          <lethean-vi-message who="vi">
            <span style="display: inline-flex; align-items: center; gap: 8px; color: var(--fg-2); font-size: 13px;">
              <lethean-vi-typing></lethean-vi-typing>
              Converting 14 images…
            </span>
          </lethean-vi-message>

          <lethean-action-card
            eyebrow="RENEWAL · 12 MONTHS"
            heading="lethean.host"
            subhead="Expires 10 Oct 2025 → 10 Oct 2026"
            amount="£18.40"
            amount-meta="inc. VAT"
            meta="Mastercard ·· 4421"
          >
            <lethean-button slot="actions" variant="ghost" size="sm">Set auto-renew</lethean-button>
            <lethean-button slot="actions" variant="primary" size="sm">Confirm &amp; renew</lethean-button>
          </lethean-action-card>
        </div>
      </section>
    `;
  }

  private renderProvisioning() {
    return html`
      <section>
        <lethean-section-header heading="Provisioning timeline" subtitle="Vi narrating long-running work"></lethean-section-header>
        <lethean-prov-timeline
          eyebrow="PROVISIONING · LIVE"
          heading="hookway.co.uk is going live."
          narration="I'm setting up your domain, mailbox, and certificate. Stay if you like — this takes about a minute. I'll email you when it's done."
          .progress=${0.55}
          elapsed="5.2s elapsed"
          remaining="~5s remaining"
          .steps=${[
            { id: 'domain', icon: 'globe', label: 'Domain registered', detail: 'hookway.co.uk · whois → claim', state: 'done' },
            { id: 'dns', icon: 'diagram-project', label: 'DNS records writing', detail: 'MX · A · TXT', state: 'active' },
            { id: 'ssl', icon: 'shield-halved', label: 'SSL certificate minted', detail: 'Let’s Encrypt · pending', state: 'pending' },
            { id: 'mail', icon: 'envelope', label: 'Mailboxes provisioned', detail: '3 boxes · pending', state: 'pending' },
          ]}
        >
          <div slot="actions" style="display: flex; gap: 10px; opacity: 0.5;">
            <lethean-button variant="primary" size="md" disabled>Open inbox</lethean-button>
            <lethean-button variant="ghost" size="md" disabled>Visit site</lethean-button>
          </div>
        </lethean-prov-timeline>
      </section>
    `;
  }

  private renderUptime() {
    const days: ('up' | 'partial' | 'down' | 'unknown')[] = [
      ...Array(60).fill('up'),
      'up', 'up', 'partial', 'up', 'up', 'up', 'up',
      ...Array(20).fill('up'),
      'up', 'down', 'partial', 'up', 'up',
      ...Array(2).fill('up'),
    ];
    return html`
      <section>
        <lethean-section-header heading="Uptime strip" subtitle="status-page primitive · 90 days"></lethean-section-header>
        <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">
          <lethean-uptime-strip
            label="hookway.co.uk"
            summary="99.94% · 1 incident in 90 days"
            .days=${days}
          ></lethean-uptime-strip>
          <lethean-uptime-strip
            label="lethean.host"
            summary="99.998% · no incidents"
            .days=${Array(90).fill('up')}
          ></lethean-uptime-strip>
        </div>
      </section>
    `;
  }

  private renderErrorPages() {
    return html`
      <section>
        <lethean-section-header heading="Error pages" subtitle="404 / 500 / 503 · same Vi voice"></lethean-section-header>
        <div style="display: grid; grid-template-columns: 1fr; gap: 14px;">
          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden;">
            <lethean-error-page
              code="404"
              eyebrow="NOT FOUND"
              heading="I can't find that page."
              body="That URL doesn't exist on this site, or it was moved. If you typed it from memory, try the help centre — I usually know where things ended up."
              meta="GET /old-page · 04 Oct 2025 09:14 GMT"
              tone="neutral"
            >
              <lethean-button slot="actions" variant="primary">Back to home</lethean-button>
              <lethean-button slot="actions" variant="ghost">Search the help centre</lethean-button>
            </lethean-error-page>
          </div>
          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden;">
            <lethean-error-page
              code="503"
              eyebrow="MAINTENANCE"
              heading="We're doing some plumbing."
              body="Scheduled maintenance window — should be back in about ten minutes. I'm watching the deploy and will refresh this page automatically."
              meta="status.host.uk.com · ETA 09:25 GMT"
              tone="warning"
            >
              <lethean-button slot="actions" variant="primary">View status page</lethean-button>
              <lethean-button slot="actions" variant="ghost">Subscribe to updates</lethean-button>
            </lethean-error-page>
          </div>
        </div>
      </section>
    `;
  }

  private renderMarketingPreview() {
    return html`
      <section>
        <lethean-section-header heading="Marketing primitives" subtitle="hero / section / CTA — for marketing surfaces"></lethean-section-header>
        <div style="background: var(--ink-1); border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden;">
          <lethean-mkt-hero
            eyebrow="Built for AI agents · MCP-native"
            title="Hosting,"
            italics="built for the age of agents"
            body="Native MCP servers for every Host UK service. Entitlement-aware tools. Ethical foundations. Not bolted on."
          >
            <lethean-button slot="actions" variant="primary" size="lg">Explore MCP</lethean-button>
            <lethean-button slot="actions" variant="ghost" size="lg">Read the ethics</lethean-button>
          </lethean-mkt-hero>
          <lethean-mkt-section
            eyebrow="WHAT AGENTS CAN DO"
            title="One MCP, every surface."
            body="Your agent reads workspace data, schedules posts, manages bio links, and rolls back its own decisions when you ask. The same tools every Host UK customer gets — yours when an agent asks too."
            align="center"
          ></lethean-mkt-section>
          <lethean-mkt-cta
            title="Stop watching dashboards."
            body="Vi already is. Start with Host UK and let your AI handle the bits that don't need you."
          >
            <lethean-button slot="actions" variant="primary" size="lg">Start free</lethean-button>
            <lethean-button slot="actions" variant="ghost" size="lg">Talk to us</lethean-button>
          </lethean-mkt-cta>
        </div>
      </section>
    `;
  }

  private renderOnboarding() {
    return html`
      <section>
        <lethean-section-header heading="Onboarding" subtitle="checklist · first-win celebration"></lethean-section-header>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 22px;">
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em; margin-bottom: 14px;">FIRST 5 MINUTES · 4 STEPS</div>
            <lethean-checklist-item state="done" label="Add a payment method" detail="Visa · 4242 · added 2m ago"></lethean-checklist-item>
            <lethean-checklist-item state="done" label="Connect a domain" detail="hookway.co.uk"></lethean-checklist-item>
            <lethean-checklist-item state="current" label="Pick where to host it" detail="EU-South · Manchester (Vi suggests)"></lethean-checklist-item>
            <lethean-checklist-item state="pending" label="Send yourself a test email"></lethean-checklist-item>
          </div>

          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden;">
            <lethean-first-win
              eyebrow="FIRST WIN"
              heading="Your site is live."
              body="hookway.co.uk responded in 114ms from Manchester. SSL valid through Jan 2026. Mailbox sam@hookway.co.uk is taking mail."
              footnote="Vi will keep watching — you'll only hear from her if something needs you."
              .stats=${[
                { value: '114', suffix: 'ms', label: 'Response', detail: 'from EU-South' },
                { value: '99.998', suffix: '%', label: 'Uptime', detail: '90 days' },
                { value: '£0', label: 'This month', detail: 'on the trial' },
              ]}
            >
              <lethean-button slot="actions" variant="primary" size="lg">Open inbox</lethean-button>
              <lethean-button slot="actions" variant="ghost" size="lg">Visit site</lethean-button>
            </lethean-first-win>
          </div>
        </div>
      </section>
    `;
  }

  private renderProductsGrid() {
    const HOSTUK_PRODUCTS = [
      { id: 'link', name: 'Host Link', tag: 'Bio link', icon: 'link', subdomain: 'link.host.uk.com', desc: 'One link, everything you do.', price: 4 },
      { id: 'social', name: 'Host Social', tag: 'Scheduling', icon: 'calendar-days', subdomain: 'social.host.uk.com', desc: 'Schedule posts. Analyse results.', price: 12 },
      { id: 'analytics', name: 'Host Analytics', tag: 'Privacy analytics', icon: 'chart-line', subdomain: 'analytics.host.uk.com', desc: 'Cookieless. GDPR. Yours.', price: 9 },
      { id: 'trust', name: 'Host Trust', tag: 'Social proof', icon: 'shield-check', subdomain: 'trust.host.uk.com', desc: 'Reviews and proof, on-site.', price: 7 },
      { id: 'notify', name: 'Host Notify', tag: 'Push', icon: 'bell', subdomain: 'notify.host.uk.com', desc: 'Bring people back, gently.', price: 6 },
      { id: 'mail', name: 'Host Mail', tag: 'Webmail', icon: 'envelope', subdomain: 'mail.host.org.mx', desc: 'Private, UK-hosted email.', price: 5 },
    ];
    return html`
      <section>
        <lethean-section-header heading="Products grid" subtitle="Host UK family of 6 SaaS · price-on/off variant"></lethean-section-header>
        <lethean-products-grid .products=${HOSTUK_PRODUCTS} show-price></lethean-products-grid>
      </section>
    `;
  }

  private renderMarketingChrome() {
    const NAV_LINKS = [
      { label: 'Products', href: '#' },
      { label: 'Pricing', href: '#', active: true },
      { label: 'AI', href: '#' },
      { label: 'Open source', href: '#' },
      { label: 'Help', href: '#' },
    ];
    const FOOTER_COLS = [
      { title: 'Products', links: [{ label: 'Hosting' }, { label: 'Link' }, { label: 'Analytics' }, { label: 'Mail' }] },
      { title: 'Open source', links: [{ label: 'EUPL-1.2' }, { label: 'core/agent' }, { label: 'RFC registry' }] },
      { title: 'Company', links: [{ label: 'About' }, { label: 'Contact' }, { label: 'Status' }] },
    ];
    return html`
      <section>
        <lethean-section-header heading="Marketing chrome" subtitle="sticky nav · footer · same on every public page"></lethean-section-header>
        <div style="background: var(--ink-1); border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden;">
          <lethean-mkt-nav brand="Lethean" .links=${NAV_LINKS}></lethean-mkt-nav>
          <div style="padding: 32px; text-align: center; color: var(--fg-3); font-size: 12px; font-family: var(--font-mono);">
            (page content goes here)
          </div>
          <lethean-mkt-footer
            brand="Lethean"
            tagline="Open source AI infrastructure. Use the OSS, or pay us to host it for you."
            copyright="© 2026 Lethean CIC · 7 Bridge Street, Taunton"
            .columns=${FOOTER_COLS}
          >
            <span slot="meta">EUPL-1.2 · UK CIC #13396632</span>
          </lethean-mkt-footer>
        </div>
      </section>
    `;
  }

  private renderCommerce() {
    return html`
      <section>
        <lethean-section-header heading="Commerce" subtitle="cart · checkout · subscriptions · invoices · payment methods"></lethean-section-header>

        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px;">
          <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 12px; overflow: hidden;">
            <header style="padding: 14px 18px; border-bottom: 1px solid var(--line-1);">
              <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">CART · 3 LINES</div>
            </header>
            <lethean-cart-row icon="boxes-stacked" heading="Host UK Family" description="All six products · 5 seats · 10 GB" .price=${24} cadence="monthly"></lethean-cart-row>
            <lethean-cart-row icon="chart-line" heading="Host Analytics — extra domains" description="5 additional domains, no cookies" .price=${4} cadence="monthly"></lethean-cart-row>
            <lethean-cart-row icon="database" heading="Storage top-up" description="+50 GB pooled across services" .price=${6} cadence="monthly"></lethean-cart-row>
          </div>

          <lethean-cart-summary
            heading="Order summary"
            total-label="Total today"
            total-value="£40.80"
            total-meta="inc. VAT, billed monthly"
            .lines=${[
              { label: 'Subtotal', value: '£34.00' },
              { label: 'VAT (20%)', value: '£6.80' },
              { label: 'Discount', value: '£0.00', meta: 'apply code →' },
            ]}
          >
            <lethean-button slot="actions" variant="primary" size="lg">Proceed to checkout</lethean-button>
            <lethean-button slot="actions" variant="ghost" size="md">Save for later</lethean-button>
          </lethean-cart-summary>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px;">
          <lethean-subscription-card
            name="Host UK Family"
            plan="Standard · annual"
            icon="boxes-stacked"
            status="active"
            renews="14 Mar 2027"
            .price=${24}
            cadence="/ month"
            .usage=${[
              { label: 'Sites', used: 3, limit: 10 },
              { label: 'Storage', used: 4, limit: 10, unit: ' GB' },
              { label: 'Mailboxes', used: 12, limit: 50 },
            ]}
          >
            <lethean-button slot="actions" variant="ghost" size="sm">Change plan</lethean-button>
            <lethean-button slot="actions" variant="ghost" size="sm">Pause</lethean-button>
          </lethean-subscription-card>

          <lethean-subscription-card
            name="Lethean Forge"
            plan="Solo · monthly"
            icon="code-branch"
            status="paused"
            renews="resumes when you are"
            .price=${10}
            cadence="/ month"
            .usage=${[
              { label: 'Repos', used: 18, limit: 25 },
              { label: 'CI minutes', used: 1840, limit: 2000 },
            ]}
          >
            <lethean-button slot="actions" variant="primary" size="sm">Resume</lethean-button>
            <lethean-button slot="actions" variant="ghost" size="sm">Cancel</lethean-button>
          </lethean-subscription-card>
        </div>

        <div style="margin-top: 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 12px; overflow: hidden;">
          <header style="padding: 14px 18px; border-bottom: 1px solid var(--line-1); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">INVOICES · LAST 6 MONTHS</div>
            <lethean-button variant="ghost" size="sm">Export all</lethean-button>
          </header>
          <lethean-invoice-row number="INV-2025-0094" period="March 2025 · cycle 09" amount="£40.80" status="paid" issued="14 Mar 2025"></lethean-invoice-row>
          <lethean-invoice-row number="INV-2025-0072" period="February 2025 · cycle 08" amount="£40.80" status="paid" issued="14 Feb 2025"></lethean-invoice-row>
          <lethean-invoice-row number="INV-2025-0049" period="January 2025 · cycle 07" amount="£40.80" status="pending" issued="14 Jan 2025"></lethean-invoice-row>
          <lethean-invoice-row number="INV-2024-0381" period="December 2024 · cycle 06" amount="£28.80" status="refunded" issued="14 Dec 2024"></lethean-invoice-row>
        </div>

        <div style="margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <lethean-payment-method-card brand="visa" last4="4242" expiry="04/27" holder="Sam Mooney" is-default>
            <lethean-button slot="actions" variant="ghost" size="sm">Edit</lethean-button>
          </lethean-payment-method-card>
          <lethean-payment-method-card brand="mastercard" last4="4421" expiry="11/26" holder="Sam Mooney">
            <lethean-button slot="actions" variant="ghost" size="sm">Make default</lethean-button>
            <lethean-button slot="actions" variant="ghost" size="sm">Remove</lethean-button>
          </lethean-payment-method-card>
        </div>
      </section>
    `;
  }

  private renderEmailTemplates() {
    return html`
      <section>
        <lethean-section-header heading="Email templates" subtitle="transactional · plain text + HTML · Vi voice"></lethean-section-header>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px;">
          <lethean-email-template
            eyebrow="ONBOARDING"
            subject="Welcome to Host UK, Sam"
            from="vi@host.uk.com"
            to="sam@hookway.co.uk"
            preview="Your sites are live, your mailbox is ready, and I'll be here whenever you need me."
          >
            <p style="margin: 0 0 12px;">Hi Sam,</p>
            <p style="margin: 0 0 12px;">Your Host UK account is set up. Three things are live for you right now:</p>
            <ul style="padding-left: 20px; margin: 0 0 12px;">
              <li>hookway.co.uk — hosting, mail, analytics</li>
              <li>sam@hookway.co.uk — receiving and sending</li>
              <li>SSL valid through 02 Jan 2026 — I'll renew it automatically</li>
            </ul>
            <p style="margin: 0;">If you want me to check on something specific, just reply to this email — I read everything that comes back.</p>
            <p style="margin: 16px 0 0; color: var(--fg-3);">— Vi</p>
          </lethean-email-template>

          <lethean-email-template
            eyebrow="BILLING"
            subject="Invoice INV-2025-0094 · paid"
            from="billing@host.uk.com"
            to="sam@hookway.co.uk"
            preview="£40.80 · Mastercard ·· 4421 · paid 14 Mar"
          >
            <p style="margin: 0 0 12px;">Your March invoice has been paid.</p>
            <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 12px 14px; margin: 14px 0;">
              <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em;">INV-2025-0094</div>
              <div style="font-size: 22px; color: var(--fg-0); font-family: var(--font-mono); margin-top: 4px;">£40.80</div>
              <div style="font-size: 12px; color: var(--fg-3); margin-top: 4px;">Mastercard ·· 4421 · 14 Mar 2025</div>
            </div>
            <p style="margin: 0;">PDF attached. Next renewal in 30 days — same amount unless you change your plan.</p>
          </lethean-email-template>

          <lethean-email-template
            eyebrow="ALERT"
            subject="lethean.host renews in 6 days"
            from="vi@host.uk.com"
            to="sam@hookway.co.uk"
            preview="Auto-renew is off · £18.40 for 12 months · I won't act unless you say"
          >
            <p style="margin: 0 0 12px;">Your domain <strong style="color: var(--fg-0); font-family: var(--font-mono);">lethean.host</strong> renews on 10 October — that's 6 days from now.</p>
            <p style="margin: 0 0 12px;">Auto-renew is off, so I'll wait for your call. £18.40 for 12 months at today's rate.</p>
            <p style="margin: 0; color: var(--fg-3);">Reply <em>renew</em> to confirm, or <em>let lapse</em> if you don't want it any more.</p>
          </lethean-email-template>
        </div>
      </section>
    `;
  }

  private renderHelp() {
    const CATS = [
      { icon: 'rocket', title: 'Getting started', count: 18, lead: 'Make your first site, point your domain, set up email.' },
      { icon: 'server', title: 'Hosting', count: 42, lead: 'WordPress, Ghost, Node, Python — runtime quirks, debugging.' },
      { icon: 'envelope', title: 'Email & DNS', count: 24, lead: 'DKIM, SPF, DMARC, MX records the way Vi writes them.' },
      { icon: 'credit-card', title: 'Billing', count: 16, lead: 'Invoices, VAT, plan changes, refunds.' },
    ];
    return html`
      <section>
        <lethean-section-header heading="Help / docs" subtitle="article · search · category grid"></lethean-section-header>
        <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 22px; display: flex; flex-direction: column; gap: 18px;">
          <lethean-search-field large placeholder="Ask Vi or search the help centre" kbd="⌘K"></lethean-search-field>
          <lethean-help-categories .categories=${CATS}></lethean-help-categories>
        </div>

        <div style="margin-top: 14px; background: var(--ink-1); border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden;">
          <lethean-article
            eyebrow="GETTING STARTED"
            title="How to point a domain to your Host UK site"
            lede="Most of the work happens at your registrar — you change two records and wait a bit. Vi watches the DNS and tells you the moment the domain resolves."
            author="Vi"
            avatar="V"
            updated="Updated 4 Oct 2025"
            read-min="4"
            .breadcrumbs=${[
              { label: 'Help', href: '#' },
              { label: 'Domains', href: '#' },
              { label: 'Pointing a domain' },
            ]}
          >
            <p>If your registrar is one of the major ones — GoDaddy, Namecheap, Cloudflare — Vi can do the entire change for you in one call. Otherwise the manual recipe is below.</p>
            <ol>
              <li>Sign in to your registrar and find the DNS settings for your domain.</li>
              <li>Add an <code>A</code> record pointing to <code>185.101.184.42</code>.</li>
              <li>Add a <code>CNAME</code> for <code>www</code> pointing to your bare domain.</li>
            </ol>
            <p>Save and wait. Most resolves happen in 5–15 minutes; some registrars (looking at you, 1and1) take a couple of hours.</p>
          </lethean-article>
        </div>
      </section>
    `;
  }

  private renderShowcase() {
    return html`
      <section>
        <lethean-section-header heading="Showcase frames" subtitle="browser · iOS · Android · App Store icons"></lethean-section-header>
        <div style="display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 14px; align-items: start;">
          <lethean-browser-window url="https://host.uk.com" tab-title="Host UK · Hosting + SaaS" .height=${360}>
            <div style="padding: 32px; display: flex; flex-direction: column; gap: 12px;">
              <div style="font-size: 13px; color: var(--brand-300); font-family: var(--font-mono); letter-spacing: 0.06em;">HOSTING + SAAS · UK</div>
              <h2 style="margin: 0; font-size: 28px; letter-spacing: -0.025em; color: var(--fg-0);">Hosting,
                <span style="font-style: italic; color: var(--brand-200); font-weight: 400;">built quietly</span>.
              </h2>
              <p style="font-size: 13px; color: var(--fg-2); margin: 0; max-width: 380px;">One login across the family. Privacy-first by default. Plain pricing.</p>
            </div>
          </lethean-browser-window>

          <lethean-ios-frame .width=${230} .height=${440} dark>
            <div style="padding: 22px 18px; color: #fff;">
              <div style="font-size: 11px; font-family: var(--font-mono); color: var(--brand-200); letter-spacing: 0.08em;">TODAY · 09:14</div>
              <h2 style="margin: 8px 0 12px; font-size: 22px; letter-spacing: -0.02em;">Good morning, Sam.</h2>
              <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 12px;">
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--warning-400); letter-spacing: 0.06em;">06:42 · WAITS ON YOU</div>
                <div style="font-size: 14px; color: #fff; margin-top: 4px;">lethean.host renews in 6 days</div>
              </div>
            </div>
          </lethean-ios-frame>

          <lethean-android-frame .width=${230} .height=${440} dark>
            <div style="padding: 18px;">
              <div style="font-size: 18px; color: #fff; font-weight: 500;">Account</div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 16px;">North Notes Ltd</div>
              <div style="margin-top: 14px; font-size: 12px; color: rgba(255,255,255,0.85);">Vi is watching 3 sites · all green · 1 thing waits on you.</div>
            </div>
          </lethean-android-frame>
        </div>

        <div style="margin-top: 16px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; padding: 22px;">
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--fg-4); letter-spacing: 0.06em; margin-bottom: 16px;">APP ICONS · 16 → 512</div>
          <div style="display: flex; gap: 22px; align-items: flex-end; flex-wrap: wrap;">
            <lethean-app-icon size="32" label="32"></lethean-app-icon>
            <lethean-app-icon size="64" label="64"></lethean-app-icon>
            <lethean-app-icon size="96" label="96"></lethean-app-icon>
            <lethean-app-icon size="128" label="128"></lethean-app-icon>
            <lethean-app-icon size="180" label="180 · iOS"></lethean-app-icon>
          </div>
        </div>
      </section>
    `;
  }

  private renderShellSamples() {
    return html`
      <section>
        <lethean-section-header heading="Shell" subtitle="brief / site card / Vi mascot"></lethean-section-header>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          <lethean-brief-card
            tone="warning"
            time="06:42"
            heading="lethean.host renews in 6 days"
            body="Auto-renew is off. £18.40 for 12 months at the current rate."
            shortcut="⌘1"
            .actions=${[
              { label: 'Renew now', primary: true },
              { label: 'Auto-renew' },
              { label: 'Let lapse' },
            ]}
          ></lethean-brief-card>

          <lethean-site-card
            domain="hookway.co.uk"
            stack="Host UK · Mail · Analytics"
            status="green"
            uptime="99.998"
            .response=${114}
            last-deploy="2d ago"
            .sparkData=${[80, 60, 90, 70, 85, 95, 65, 75, 88, 92, 70, 85]}
          ></lethean-site-card>

          <lethean-site-card
            domain="lethean.host"
            stack="Lethean Core · Forge"
            status="green"
            uptime="99.94"
            .response=${203}
            last-deploy="6h ago"
            warn="Renewal in 6d"
            .sparkData=${[60, 65, 80, 75, 70, 60, 55, 65, 72, 80, 78, 70]}
          ></lethean-site-card>
        </div>
      </section>
    `;
  }

  private renderEmptyState() {
    return html`
      <section>
        <lethean-section-header heading="Empty state" subtitle="onboarding / first-run / zero-data"></lethean-section-header>
        <div style="background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 10px; overflow: hidden;">
          <lethean-empty-state
            heading="It's just us in here."
            body="You haven't added a payment method or a site yet. I'll walk you through it — takes about three minutes, and you can stop me at any point."
            footnote="Same Vi, same words, every device."
          >
            <lethean-button slot="actions" variant="primary" size="lg">Set up with Vi</lethean-button>
            <lethean-button slot="actions" variant="ghost" size="lg">I'll do it myself</lethean-button>
          </lethean-empty-state>
        </div>
      </section>
    `;
  }

  private renderDialogs() {
    return html`
      <lethean-dialog id="lib-dialog-1" heading="Confirm renewal" subhead="lethean.host renews 10 Oct 2026 for £18.40 inc. VAT.">
        <p style="margin: 0;">
          Vi will charge the Mastercard ending <span style="font-family: var(--font-mono); color: var(--fg-0);">·· 4421</span> and turn off the renewal reminder.
          You can roll this back from the audit log within 30 days.
        </p>
        <lethean-button slot="actions" variant="ghost" size="sm" @click=${() => this.toggleDialog('lib-dialog-1', false)}>Not yet</lethean-button>
        <lethean-button slot="actions" variant="primary" size="sm" @click=${() => this.toggleDialog('lib-dialog-1', false)}>Confirm &amp; renew</lethean-button>
      </lethean-dialog>

      <lethean-dialog id="lib-dialog-2" heading="Close account?" subhead="GDPR-compliant data export. Account deletes after 30 days." tone="danger">
        <p style="margin: 0;">
          You'll get a sealed export of every site, every mailbox, every audit-log entry.
          You can sign back in any time in the next 30 days to undo this.
        </p>
        <lethean-button slot="actions" variant="ghost" size="sm" @click=${() => this.toggleDialog('lib-dialog-2', false)}>Cancel</lethean-button>
        <lethean-button slot="actions" variant="danger" size="sm" @click=${() => this.toggleDialog('lib-dialog-2', false)}>Request export</lethean-button>
      </lethean-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-library-page': LetheanLibraryPage;
  }
}
