// <lethean-lthn-landing-page> — lthn.ai marketing landing. Confident-
// technical, type-led, terminal motif. Architecture three-layer, Vi
// manifesto pull-quote, product grid (4 lthn surfaces), CTA, footer.
// Distinct from <lethean-host-landing-page> — different audience
// (developers, self-hosters) and different sections.
//
// Ported from lethean-landing.jsx — kept as a single page-element
// because brand is fixed (always Lethean studio) and most sections
// are bespoke to that brand.

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Mode = 'dark' | 'light';

const ARCHITECTURE = [
  {
    tag: 'L1 · core/agent',
    title: 'The agent runtime',
    desc: 'Plan → act → observe loop with policy gates and tenant scoping. Pluggable models (OpenAI, Anthropic, local).',
    rows: ['LLM provider · pluggable', 'Policy engine · OPA-compatible', 'Trace stream · OpenTelemetry'],
  },
  {
    tag: 'L2 · core/tenant',
    title: 'The multi-tenancy spine',
    desc: 'BelongsToWorkspace trait, domain-routed boot, per-tenant keys + audit log. The thing that makes one server safely serve many customers.',
    rows: ['Workspace isolation', 'Domain → tenant mapping', 'Per-tenant audit log'],
  },
  {
    tag: 'L3 · core/uptelligence',
    title: 'The observability layer',
    desc: "Uptime, traces, billing-grade event log. What you'd build if you were also responsible for invoicing customers.",
    rows: ['Uptime probes · 30s', 'Distributed traces', 'Billable event log'],
  },
];

const PRODUCT_GRID = [
  { tag: 'lthn.ai/agent', name: 'Agent runtime', desc: 'Self-host the same agent that runs Vi. Bring your own model.', cta: 'Read agent docs' },
  { tag: 'team.lthn.ai', name: 'Branded chat', desc: 'Mattermost, themed for your studio. Federated with the agent.', cta: 'Open team.lthn.ai' },
  { tag: 'wiki.lthn.sh', name: 'Internal wiki', desc: 'BookStack with our shell. Where we keep the runbooks.', cta: 'Browse the wiki' },
  { tag: 'forge.lthn.ai', name: 'Source forge', desc: 'Forgejo for the open-source code. PRs welcome.', cta: 'Open the forge' },
];

const TRACE_ROWS: Array<[string, string, string]> = [
  ['09:42:18', 'agent.plan() → policy.check(write_dns)', '12'],
  ['09:42:18', 'tools.dns.create(zone=acme.host.uk.com)', '184'],
  ['09:42:19', 'agent.observe() → cert.issued', '31'],
  ['09:42:19', 'tenant.audit_log.append(actor=vi)', '8'],
  ['09:42:20', "agent.report() → 'site live · ready'", '14'],
];

const FOOTER_COLS: Array<[string, string[]]> = [
  ['Agent', ['Runtime', 'Policies', 'Tracing', 'Models']],
  ['Hosted', ['Plans', 'SLAs', 'Migration', 'Status']],
  ['Source', ['github', 'Forge', 'Roadmap', 'Releases']],
  ['Studio', ['Host UK', 'OFM', 'About', 'Contact']],
];

@customElement('lethean-lthn-landing-page')
export class LetheanLthnLandingPage extends LitElement {
  @property({ reflect: true }) mode: Mode = 'dark';

  protected createRenderRoot() {
    return this;
  }

  private _wordmark() {
    return html`
      <div style="display: flex; align-items: center; gap: 10px;">
        <div
          style="
            width: 18px; height: 18px;
            background: var(--brand-500);
            border-radius: 4px;
            position: relative;
            box-shadow: inset 0 1px 0 var(--line-2);
          "
        >
          <div style="position: absolute; inset: 4px; background: var(--ink-0); border-radius: 1px;"></div>
          <div
            style="
              position: absolute; left: 7px; top: 7px;
              width: 4px; height: 4px;
              background: var(--brand-300); border-radius: 1px;
            "
          ></div>
        </div>
        <span
          style="
            font-family: var(--font-mono); font-size: 15px;
            color: var(--fg-0); letter-spacing: -0.02em; font-weight: 500;
          "
        >lethean</span>
        <span
          style="
            font-family: var(--font-mono); font-size: 11px;
            color: var(--fg-4); margin-left: -4px;
          "
        >.ai</span>
      </div>
    `;
  }

  private _renderNav() {
    return html`
      <header
        style="
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 56px;
          border-bottom: 1px solid var(--line-1);
          position: sticky; top: 0; z-index: 10;
          background: color-mix(in oklch, var(--ink-0) 80%, transparent);
          backdrop-filter: blur(8px);
        "
      >
        <div style="display: flex; align-items: center; gap: 32px;">
          ${this._wordmark()}
          <nav style="display: flex; gap: 22px; font-size: 13px; color: var(--fg-2);">
            <a>Agent</a><a>Infrastructure</a><a>Open source</a>
            <a>Docs</a><a>Pricing</a><a>Company</a>
          </nav>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <a
            style="
              font-size: 12.5px; color: var(--fg-3);
              font-family: var(--font-mono);
              display: inline-flex; align-items: center; gap: 6px;
            "
          >
            <i class="fa-brands fa-github" style="font-size: 12px;"></i>
            github.com/lethean
          </a>
          <button class="btn btn-ghost btn-sm">Sign in</button>
          <button class="btn btn-primary btn-sm">Start hosted trial</button>
        </div>
      </header>
    `;
  }

  private _termPrompt(user = 'ada', host = 'vivian') {
    return html`<span style="color: var(--fg-4);">
      <span style="color: var(--brand-300);">${user}</span>@<span style="color: var(--gold-400);">${host}</span> $
    </span> `;
  }

  private _renderTerminal() {
    return html`
      <div
        style="
          background: var(--ink-1);
          border: 1px solid var(--line-2);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 24px 56px color-mix(in oklch, #000 35%, transparent);
          position: relative;
        "
      >
        <div
          style="
            display: flex; align-items: center; gap: 8px;
            padding: 10px 14px;
            background: var(--ink-2);
            border-bottom: 1px solid var(--line-1);
          "
        >
          <div style="display: flex; gap: 6px;">
            <span style="width: 11px; height: 11px; border-radius: 999px; background: color-mix(in oklch, var(--danger-500) 70%, var(--ink-3));"></span>
            <span style="width: 11px; height: 11px; border-radius: 999px; background: color-mix(in oklch, var(--warning-500) 70%, var(--ink-3));"></span>
            <span style="width: 11px; height: 11px; border-radius: 999px; background: color-mix(in oklch, var(--success-500) 70%, var(--ink-3));"></span>
          </div>
          <div
            style="
              flex: 1; text-align: center;
              font-size: 11.5px; font-family: var(--font-mono); color: var(--fg-3);
            "
          >~/lethean-agent — zsh — 92×24</div>
        </div>
        <div
          style="
            padding: 18px 20px;
            font-family: var(--font-mono); font-size: 12.5px;
            line-height: 1.65; color: var(--fg-1);
            background: var(--ink-1);
            white-space: pre;
          "
        >
          <div>${this._termPrompt()}<span style="color: var(--fg-1);">lethean agent run --tenant=acme --policy=strict</span></div>
          <div>
            <span style="color: var(--brand-200);">→</span> loading core/agent v0.42
            <span style="color: var(--fg-4);">(EUPL-1.2)</span>
          </div>
          <div>
            <span style="color: var(--brand-200);">→</span> tenant
            <span style="color: var(--gold-400);">acme</span> · workspace boundary verified
          </div>
          <div>
            <span style="color: var(--brand-200);">→</span> policy
            <span style="color: var(--gold-400);">strict</span> · 14 capabilities allow-listed
          </div>
          <div>
            <span style="color: var(--success-400);">✓</span> agent ready ·
            <span style="color: var(--fg-3);">listening on tenant socket</span>
          </div>
          <div style="height: 10px;"></div>
          <div>${this._termPrompt()}<span>lethean trace --last 5m</span></div>
          <div
            style="
              margin-top: 6px; padding: 10px 12px;
              background: var(--ink-0);
              border: 1px solid var(--line-1);
              border-radius: 6px;
              font-size: 11.5px;
              white-space: normal;
            "
          >
            <div
              style="
                display: grid; grid-template-columns: 70px 1fr 60px;
                color: var(--fg-4); margin-bottom: 6px;
              "
            >
              <span>TIME</span><span>CALL</span><span style="text-align: right;">MS</span>
            </div>
            ${TRACE_ROWS.map(
              ([t, c, ms], i) => html`
                <div
                  style="
                    display: grid; grid-template-columns: 70px 1fr 60px;
                    color: var(--fg-2); padding: 2px 0;
                  "
                >
                  <span style="color: var(--fg-4);">${t}</span>
                  <span style="color: ${i === 4 ? 'var(--success-400)' : 'var(--fg-1)'};">${c}</span>
                  <span style="text-align: right; color: var(--fg-3);">${ms}</span>
                </div>
              `
            )}
          </div>
          <div style="height: 8px;"></div>
          <div>
            ${this._termPrompt()}
            <span
              style="
                display: inline-block; width: 8px; height: 14px;
                background: var(--brand-300); margin-left: 4px; vertical-align: middle;
              "
            ></span>
          </div>
        </div>
      </div>
    `;
  }

  private _renderHero() {
    return html`
      <section
        style="
          padding: 72px 56px 40px;
          display: grid; grid-template-columns: 1.05fr 1fr; gap: 64px;
          align-items: center;
          position: relative;
        "
      >
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div
            style="
              display: inline-flex; align-items: center; gap: 8px;
              padding: 5px 12px;
              background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
              border-radius: 999px;
              font-size: 11.5px;
              color: var(--brand-200);
              font-family: var(--font-mono);
              letter-spacing: 0.04em;
              align-self: flex-start;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 999px; background: var(--brand-300); box-shadow: 0 0 8px var(--brand-400);"></span>
            EUPL-1.2 · core/agent v0.42
          </div>
          <h1
            style="
              font-size: 64px; letter-spacing: -0.04em; line-height: 1.02;
              color: var(--fg-0); margin: 0;
            "
          >
            Open source AI<br />
            infrastructure,
            <span
              class="editorial"
              style="font-style: italic; color: var(--brand-200); font-size: 66px; letter-spacing: -0.025em;"
            >built ethically.</span>
          </h1>
          <p
            style="
              font-size: 18px; color: var(--fg-2);
              line-height: 1.5; max-width: 540px; margin: 0;
            "
          >
            The agent runtime, observability stack, and tenant model
            we use to run Host UK — released as open source under EUPL-1.2.
            Self-host the lot, or pay us to run it for you.
          </p>
          <div style="display: flex; gap: 12px; margin-top: 6px;">
            <button class="btn btn-primary btn-lg">
              <i class="fa-solid fa-terminal" style="font-size: 13px; margin-right: 8px;"></i>
              <code style="font-family: var(--font-mono); font-size: 13.5px;">brew install lethean</code>
            </button>
            <button class="btn btn-secondary btn-lg">
              Read the architecture
              <i class="fa-solid fa-arrow-right" style="font-size: 11px; margin-left: 8px;"></i>
            </button>
          </div>
          <div
            style="
              display: flex; gap: 22px; margin-top: 8px;
              font-size: 12px; color: var(--fg-3);
              font-family: var(--font-mono);
            "
          >
            <span>
              <i class="fa-solid fa-circle-check" style="font-size: 11px; color: var(--success-400);"></i>
              EUPL-1.2
            </span>
            <span>
              <i class="fa-solid fa-circle-check" style="font-size: 11px; color: var(--success-400);"></i>
              No CLA
            </span>
            <span>
              <i class="fa-solid fa-circle-check" style="font-size: 11px; color: var(--success-400);"></i>
              UK / EU sovereign hosting
            </span>
          </div>
        </div>
        ${this._renderTerminal()}
      </section>
    `;
  }

  private _renderProofStrip() {
    const domains = ['host.uk.com', 'team.lthn.ai', 'wiki.lthn.sh', 'tasks.lthn.sh', 'forge.lthn.ai'];
    return html`
      <section
        style="
          padding: 32px 56px;
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-1);
          background: var(--ink-1);
        "
      >
        <div
          style="
            display: flex; justify-content: space-between; align-items: center;
            gap: 32px;
            font-family: var(--font-mono); font-size: 12.5px; color: var(--fg-3);
          "
        >
          <span style="color: var(--fg-4);">RUNNING IN PRODUCTION AT</span>
          ${domains.map((d) => html`<span style="color: var(--fg-1);">${d}</span>`)}
        </div>
      </section>
    `;
  }

  private _renderArchitecture() {
    return html`
      <section style="padding: 80px 56px 48px;">
        <div style="max-width: 640px; margin-bottom: 48px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >THE ARCHITECTURE</div>
          <h2 style="font-size: 38px; letter-spacing: -0.03em; line-height: 1.08; margin: 0;">
            Three layers.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">Same shape</span>
            as our hosted service.
          </h2>
          <p style="font-size: 15px; color: var(--fg-2); margin-top: 14px; line-height: 1.6;">
            You can run the lot yourself, swap in your own substrates, or pay us to operate it.
            The line between "open source" and "managed service" is exactly the operational glue —
            never the product itself.
          </p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
          ${ARCHITECTURE.map(
            (l) => html`
              <article
                style="
                  background: var(--ink-2);
                  border: 1px solid var(--line-1);
                  border-radius: 12px;
                  padding: 24px;
                  display: flex; flex-direction: column; gap: 14px;
                "
              >
                <div
                  style="
                    font-size: 11px; font-family: var(--font-mono);
                    color: var(--brand-300); letter-spacing: 0.06em;
                  "
                >${l.tag}</div>
                <h3 style="font-size: 19px; letter-spacing: -0.02em; margin: 0;">${l.title}</h3>
                <p style="font-size: 13.5px; color: var(--fg-2); line-height: 1.55; margin: 0;">
                  ${l.desc}
                </p>
                <div class="divider"></div>
                <ul
                  style="
                    list-style: none; padding: 0; margin: 0;
                    display: flex; flex-direction: column; gap: 8px;
                  "
                >
                  ${l.rows.map(
                    (r) => html`
                      <li
                        style="
                          display: flex; gap: 8px; align-items: center;
                          font-size: 12.5px; color: var(--fg-2);
                          font-family: var(--font-mono);
                        "
                      >
                        <span
                          style="
                            width: 5px; height: 5px; border-radius: 50%;
                            background: var(--brand-400);
                          "
                        ></span>
                        <span>${r}</span>
                      </li>
                    `
                  )}
                </ul>
              </article>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderManifesto() {
    return html`
      <section
        style="
          padding: 96px 56px;
          background: var(--ink-1);
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-1);
          position: relative; overflow: hidden;
        "
      >
        <div
          class="brand-glow"
          style="position: absolute; inset: 0; opacity: 0.5; pointer-events: none;"
        ></div>
        <div
          style="
            position: relative; z-index: 1;
            max-width: 880px; margin: 0 auto;
            display: grid; grid-template-columns: auto 1fr; gap: 40px;
            align-items: center;
          "
        >
          <div
            style="
              width: 140px; height: 140px;
              border-radius: 16px;
              background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2));
              border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2));
              display: grid; place-items: center;
              overflow: hidden;
              position: relative;
            "
          >
            <i
              class="fa-solid fa-feather"
              style="font-size: 80px; color: color-mix(in oklch, var(--brand-300) 80%, transparent);"
            ></i>
          </div>
          <div>
            <div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 16px;
              "
            >VI · STUDIO MASCOT · OUR POSITION</div>
            <blockquote
              class="editorial"
              style="
                font-style: italic;
                font-size: 36px;
                line-height: 1.18;
                letter-spacing: -0.02em;
                color: var(--fg-0);
                margin: 0;
              "
            >
              "We don't think AI infrastructure should require handing the keys to your business
              to a frontier lab. So we wrote our own — and gave it away. The hosted service is for
              people who'd rather not run servers."
            </blockquote>
            <div
              style="
                margin-top: 18px; font-size: 13px; color: var(--fg-3);
                font-family: var(--font-mono);
              "
            >— vi · the lethean agent · maintainer since v0.1</div>
          </div>
        </div>
      </section>
    `;
  }

  private _renderProductGrid() {
    return html`
      <section style="padding: 80px 56px 48px;">
        <div style="max-width: 640px; margin-bottom: 36px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em; margin-bottom: 12px;
            "
          >WHAT YOU CAN RUN</div>
          <h2 style="font-size: 32px; letter-spacing: -0.03em; margin: 0;">
            Use what you need.
            <span class="editorial" style="font-style: italic; color: var(--brand-200);">Ignore the rest.</span>
          </h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
          ${PRODUCT_GRID.map(
            (p) => html`
              <article
                style="
                  background: var(--ink-2);
                  border: 1px solid var(--line-1);
                  border-radius: 12px;
                  padding: 22px;
                  display: grid; grid-template-columns: 1fr auto;
                  gap: 16px; align-items: center;
                "
              >
                <div>
                  <div
                    style="
                      font-size: 11.5px; font-family: var(--font-mono);
                      color: var(--fg-4); margin-bottom: 6px;
                    "
                  >${p.tag}</div>
                  <h3 style="font-size: 16px; letter-spacing: -0.015em; margin: 0;">${p.name}</h3>
                  <p style="font-size: 13px; color: var(--fg-2); margin: 4px 0 0; line-height: 1.5;">
                    ${p.desc}
                  </p>
                </div>
                <button class="btn btn-secondary btn-sm">
                  ${p.cta}
                  <i class="fa-solid fa-arrow-right" style="font-size: 10px; margin-left: 6px;"></i>
                </button>
              </article>
            `
          )}
        </div>
      </section>
    `;
  }

  private _renderCTA() {
    return html`
      <section style="padding: 64px 56px;">
        <div
          style="
            background: var(--ink-2);
            border: 1px solid var(--line-2);
            border-radius: 18px;
            padding: 36px;
            display: grid; grid-template-columns: 1fr auto;
            gap: 32px; align-items: center;
            position: relative; overflow: hidden;
          "
        >
          <div
            class="brand-glow"
            style="position: absolute; inset: 0; opacity: 0.7; pointer-events: none;"
          ></div>
          <div style="position: relative; z-index: 1;">
            <h2 style="font-size: 28px; letter-spacing: -0.025em; max-width: 520px; line-height: 1.15; margin: 0;">
              Run it yourself.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">Or let us run it for you.</span>
            </h2>
            <p style="font-size: 14px; color: var(--fg-2); margin: 8px 0 0; max-width: 520px; line-height: 1.55;">
              Hosted service starts at £180/month — UK or EU sovereign infrastructure, 24/7 on-call,
              4-hour SLA. Or take the source and roll your own.
            </p>
          </div>
          <div style="position: relative; z-index: 1; display: flex; gap: 10px;">
            <button class="btn btn-primary btn-lg">Talk to us</button>
            <button class="btn btn-secondary btn-lg">
              <i class="fa-brands fa-github" style="font-size: 13px; margin-right: 8px;"></i>
              View source
            </button>
          </div>
        </div>
      </section>
    `;
  }

  private _renderFooter() {
    return html`
      <footer
        style="
          padding: 48px 56px 32px;
          border-top: 1px solid var(--line-1);
          background: var(--ink-0);
        "
      >
        <div
          style="
            display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
            gap: 32px; margin-bottom: 32px;
          "
        >
          <div>
            ${this._wordmark()}
            <p
              style="
                font-size: 12.5px; color: var(--fg-3);
                margin-top: 14px; line-height: 1.55; max-width: 280px;
              "
            >
              Open source AI infrastructure. EUPL-1.2 licensed.
              Built in the UK, hosted in the UK + EU.
            </p>
          </div>
          ${FOOTER_COLS.map(
            ([h, items]) => html`
              <div>
                <div
                  style="
                    font-size: 11px; font-family: var(--font-mono);
                    color: var(--fg-4); letter-spacing: 0.06em; margin-bottom: 12px;
                  "
                >${h.toUpperCase()}</div>
                <ul
                  style="
                    list-style: none; padding: 0; margin: 0;
                    display: flex; flex-direction: column; gap: 7px;
                  "
                >
                  ${items.map(
                    (i) => html`<li style="font-size: 13px; color: var(--fg-2);">${i}</li>`
                  )}
                </ul>
              </div>
            `
          )}
        </div>
        <div
          style="
            display: flex; justify-content: space-between; align-items: center;
            padding-top: 20px; border-top: 1px solid var(--line-1);
            font-size: 11.5px; color: var(--fg-4);
            font-family: var(--font-mono);
          "
        >
          <span>© Lethean Studio 2026 · EUPL-1.2 · UK Ltd. 14982737</span>
          <span>${this.mode === 'light' ? 'light mode' : 'dark mode'} · system aware</span>
        </div>
      </footer>
    `;
  }

  render() {
    return html`
      <div
        class="surface"
        data-brand="lethean"
        data-mode=${this.mode}
        style="
          width: 100%; min-height: 100%;
          background: var(--ink-0);
          padding: 0;
          display: flex; flex-direction: column;
          font-family: var(--font-sans);
        "
      >
        ${this._renderNav()}
        ${this._renderHero()}
        ${this._renderProofStrip()}
        ${this._renderArchitecture()}
        ${this._renderManifesto()}
        ${this._renderProductGrid()}
        ${this._renderCTA()}
        ${this._renderFooter()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-lthn-landing-page': LetheanLthnLandingPage;
  }
}
