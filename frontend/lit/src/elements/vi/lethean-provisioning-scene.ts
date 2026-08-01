// <lethean-provisioning-scene> — the animated provisioning theatre.
// 12s loop showing: domain register → DNS records → SSL minting →
// mailboxes provisioning → Vi's "all done" moment. Consumes the
// timeline context from the parent <lethean-stage>; everything
// downstream re-renders against `t`.
//
// Ported from provisioning.jsx — ProvisioningScene + ProvGlow +
// ViNarration + ProvStep(Icon/Detail) + Domain/Dns/Ssl/Mail Detail.
// Consolidated into one element for a tight 1:1 port; sub-renderers
// are private methods rather than separate elements.

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';

import { timelineContext, type TimelineState } from '../animation/context';
import { clamp } from '../animation/easing';
import '../atoms/lethean-vi';

interface ProvStepDef {
  id: 'domain' | 'dns' | 'ssl' | 'mail';
  label: string;
  start: number;
  end: number;
  icon: string;
  meta: string;
}

const STEPS: ProvStepDef[] = [
  { id: 'domain', label: 'Domain registered',     start: 0.0, end: 2.5, icon: 'globe',           meta: 'hookway.co.uk · 12 month registration' },
  { id: 'dns',    label: 'DNS records written',   start: 2.3, end: 5.0, icon: 'diagram-project', meta: '5 records · 60s TTL' },
  { id: 'ssl',    label: 'SSL certificate minted', start: 4.8, end: 7.5, icon: 'shield-check',    meta: "Let's Encrypt · 90 day cert" },
  { id: 'mail',   label: 'Mailboxes provisioned', start: 7.3, end: 10.0, icon: 'envelope',       meta: '1 mailbox · IMAP/SMTP/JMAP' },
];

@customElement('lethean-provisioning-scene')
export class LetheanProvisioningScene extends LitElement {
  @consume({ context: timelineContext, subscribe: true })
  @state()
  private _timeline: TimelineState = { time: 0, duration: 0, playing: false };

  protected createRenderRoot() {
    return this;
  }

  // ── Vi narration text per phase ───────────────────────────
  private _narration(t: number, allDone: boolean): { line: string; sub: string } {
    if (allDone) return { line: 'All four systems green.', sub: 'Took 9.4 seconds. Faster than a kettle.' };
    if (t < 2.5) return { line: 'Claiming the domain…', sub: 'ICANN whois — clean' };
    if (t < 5.0) return { line: 'Pointing DNS records.', sub: 'MX, A, TXT — propagating' };
    if (t < 7.5) return { line: 'Minting your certificate.', sub: "Let's Encrypt · ACME challenge" };
    if (t < 10.0) return { line: 'Spinning up your mailbox.', sub: 'sam@hookway.co.uk · 5 GB' };
    return { line: 'All four systems green.', sub: 'Took 9.4 seconds. Faster than a kettle.' };
  }

  // ── Pulsing brand glow ────────────────────────────────────
  private _glow(t: number): TemplateResult {
    const intensity = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.65));
    return html`
      <div
        style="
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 80% at 75% 30%, color-mix(in oklch, var(--brand-500) ${24 * intensity}%, transparent), transparent 60%),
            radial-gradient(ellipse 50% 70% at 20% 90%, color-mix(in oklch, var(--brand-700) ${18 * intensity}%, transparent), transparent 60%);
        "
      ></div>
    `;
  }

  // ── Single-step row with state pill, icon, meta, detail ───
  private _renderStep(step: ProvStepDef, t: number, index: number): TemplateResult {
    const before = t < step.start;
    const during = t >= step.start && t < step.end;
    const done = t >= step.end;
    const localT = during ? (t - step.start) / (step.end - step.start) : done ? 1 : 0;

    // Stagger entry so steps fade in one after another.
    const entryDelay = index * 0.15;
    const entryT = clamp((t - entryDelay) / 0.4, 0, 1);

    const borderColor = during
      ? 'color-mix(in oklch, var(--brand-500) 40%, var(--line-2))'
      : 'var(--line-2)';
    const shadow = during
      ? '0 0 0 1px color-mix(in oklch, var(--brand-400) 40%, transparent), 0 8px 24px color-mix(in oklch, var(--brand-700) 18%, transparent)'
      : 'none';

    // Status pill (queued / working / done).
    let pill: TemplateResult;
    if (done) {
      pill = html`
        <span
          style="
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 9px; border-radius: 999px;
            background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3));
            border: 1px solid color-mix(in oklch, var(--success-500) 30%, transparent);
            color: var(--success-400);
            font-size: 10.5px; font-weight: 500; letter-spacing: 0.04em;
          "
        >
          <i class="fa-solid fa-check" style="font-size: 9px;"></i> DONE
        </span>
      `;
    } else if (during) {
      pill = html`
        <span
          style="
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 9px; border-radius: 999px;
            background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-3));
            border: 1px solid color-mix(in oklch, var(--brand-500) 35%, transparent);
            color: var(--brand-200);
            font-size: 10.5px; font-weight: 500; letter-spacing: 0.04em;
          "
        >
          <span
            style="
              width: 5px; height: 5px; border-radius: 50%;
              background: var(--brand-300);
              animation: provPulse 0.8s infinite;
            "
          ></span>
          WORKING
        </span>
      `;
    } else {
      pill = html`<span
        style="
          font-size: 10.5px; color: var(--fg-4);
          font-family: var(--font-mono); letter-spacing: 0.04em;
        "
      >QUEUED</span>`;
    }

    // Icon block with optional pulse-ring while during.
    const iconBg = done
      ? 'color-mix(in oklch, var(--success-500) 22%, var(--ink-3))'
      : during
      ? 'color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))'
      : 'var(--ink-3)';
    const iconColor = done ? 'var(--success-400)' : during ? 'var(--brand-200)' : 'var(--fg-4)';
    const iconBorder = done
      ? 'color-mix(in oklch, var(--success-500) 30%, transparent)'
      : during
      ? 'color-mix(in oklch, var(--brand-500) 35%, transparent)'
      : 'var(--line-1)';
    const ringOpacity = during ? Math.sin(localT * Math.PI * 4) * 0.5 + 0.5 : 0;
    const iconBlock = html`
      <div
        style="
          width: 36px; height: 36px; border-radius: 8px;
          background: ${iconBg};
          border: 1px solid ${iconBorder};
          display: grid; place-items: center;
          flex-shrink: 0; position: relative;
        "
      >
        <i class="fa-solid fa-${step.icon}" style="font-size: 14px; color: ${iconColor};"></i>
        ${during
          ? html`<div
              style="
                position: absolute; inset: -3px;
                border-radius: 11px;
                border: 1px solid color-mix(in oklch, var(--brand-400) 50%, transparent);
                opacity: ${ringOpacity};
              "
            ></div>`
          : html``}
      </div>
    `;

    // Step-specific live detail.
    const detail = during || done ? this._stepDetail(step, during, done, localT) : html``;

    return html`
      <div
        style="
          background: var(--ink-2);
          border: 1px solid ${borderColor};
          border-radius: 12px;
          padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
          transition: border-color 200ms ease;
          opacity: ${0.3 + entryT * 0.7};
          transform: translateY(${(1 - entryT) * 8}px);
          box-shadow: ${shadow};
        "
      >
        <div style="display: flex; align-items: center; gap: 12px;">
          ${iconBlock}
          <div style="flex: 1; min-width: 0;">
            <div
              style="
                font-size: 14px; font-weight: 500;
                color: ${before ? 'var(--fg-3)' : 'var(--fg-0)'};
                letter-spacing: -0.01em;
              "
            >${step.label}</div>
            <div
              style="
                font-size: 11.5px; color: var(--fg-4);
                margin-top: 2px; font-family: var(--font-mono);
              "
            >${step.meta}</div>
          </div>
          <div style="flex-shrink: 0;">${pill}</div>
        </div>
        ${detail}
      </div>
    `;
  }

  private _stepDetail(step: ProvStepDef, during: boolean, done: boolean, localT: number): TemplateResult {
    const lt = during ? localT : 1;
    if (step.id === 'domain') return this._domainDetail(lt, done);
    if (step.id === 'dns') return this._dnsDetail(lt, done);
    if (step.id === 'ssl') return this._sslDetail(lt, done);
    if (step.id === 'mail') return this._mailDetail(lt, done);
    return html``;
  }

  // Domain — terminal-style whois lookup
  private _domainDetail(localT: number, done: boolean): TemplateResult {
    const lines: Array<{ at: number; text: string; ok?: boolean }> = [
      { at: 0.0, text: '› whois hookway.co.uk' },
      { at: 0.2, text: '  status: AVAILABLE', ok: true },
      { at: 0.45, text: '› register --years=1 --owner=hookway-ltd' },
      { at: 0.75, text: '  ✓ claimed by Host UK · expires 04 Oct 2026', ok: true },
    ];
    const visible = lines.filter((l) => localT >= l.at);
    return html`
      <div
        style="
          background: var(--ink-0);
          border-radius: 6px;
          padding: 8px 12px;
          font-family: var(--font-mono); font-size: 11px;
          color: var(--fg-2);
          line-height: 1.55;
          min-height: 70px;
        "
      >
        ${visible.map(
          (l) => html`<div style="color: ${l.ok ? 'var(--success-400)' : 'var(--fg-3)'};">${l.text}</div>`
        )}
        ${done
          ? html``
          : html`<span
              style="
                display: inline-block; width: 7px; height: 12px;
                background: var(--brand-300); vertical-align: middle;
                animation: provBlink 1s infinite;
              "
            ></span>`}
      </div>
    `;
  }

  // DNS — records typing into a table
  private _dnsDetail(localT: number, _done: boolean): TemplateResult {
    const records = [
      { type: 'A', name: '@', value: '185.199.108.153', at: 0.10 },
      { type: 'A', name: 'www', value: '185.199.108.153', at: 0.30 },
      { type: 'MX', name: '@', value: '10 mail.host.uk.com', at: 0.50 },
      { type: 'TXT', name: '@', value: 'v=spf1 include:_spf.host.uk.com ~all', at: 0.70 },
      { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine', at: 0.88 },
    ];
    return html`
      <div
        style="
          background: var(--ink-0);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid var(--line-1);
        "
      >
        <div
          style="
            display: grid; grid-template-columns: 60px 80px 1fr;
            padding: 6px 12px;
            background: var(--ink-2);
            border-bottom: 1px solid var(--line-1);
            font-size: 9.5px; color: var(--fg-4);
            font-family: var(--font-mono); letter-spacing: 0.06em;
          "
        >
          <span>TYPE</span><span>NAME</span><span>VALUE</span>
        </div>
        ${records.map((r, i) => {
          const visible = localT >= r.at;
          const charT = clamp((localT - r.at) / 0.08, 0, 1);
          const shown = visible ? r.value.slice(0, Math.ceil(r.value.length * charT)) : '';
          return html`
            <div
              style="
                display: grid; grid-template-columns: 60px 80px 1fr;
                padding: 5px 12px;
                font-family: var(--font-mono); font-size: 11px;
                color: ${visible ? 'var(--fg-1)' : 'transparent'};
                border-top: ${i === 0 ? 'none' : '1px solid var(--line-1)'};
                transition: color 200ms;
              "
            >
              <span style="color: ${visible ? 'var(--brand-300)' : 'transparent'}; font-weight: 500;">${r.type}</span>
              <span style="color: ${visible ? 'var(--fg-2)' : 'transparent'};">${r.name}</span>
              <span style="color: ${visible ? 'var(--fg-1)' : 'transparent'};">
                ${shown}${visible && charT < 1
                  ? html`<span style="color: var(--brand-300); animation: provBlink 0.8s infinite;">▎</span>`
                  : ''}
              </span>
            </div>
          `;
        })}
      </div>
    `;
  }

  // SSL — handshake phases
  private _sslDetail(localT: number, done: boolean): TemplateResult {
    const phases = [
      { at: 0.0, label: 'ACME challenge requested' },
      { at: 0.25, label: 'DNS-01 token written' },
      { at: 0.5, label: "Let's Encrypt validating…" },
      { at: 0.75, label: 'Certificate signed · 4096-bit RSA' },
    ];
    return html`
      <div
        style="
          background: var(--ink-0);
          border-radius: 6px;
          padding: 10px 14px;
          display: flex; flex-direction: column; gap: 6px;
          min-height: 90px;
        "
      >
        ${phases.map((p, i) => {
          const visible = localT >= p.at;
          const isCurrent = localT >= p.at && localT < (phases[i + 1]?.at ?? 1);
          const color = visible
            ? isCurrent && !done
              ? 'var(--brand-200)'
              : 'var(--success-400)'
            : 'var(--fg-4)';
          return html`
            <div
              style="
                display: flex; align-items: center; gap: 8px;
                font-size: 11px; font-family: var(--font-mono);
                color: ${color};
                opacity: ${visible ? 1 : 0.3};
              "
            >
              <span style="width: 10px;">
                ${visible ? (isCurrent && !done ? '●' : '✓') : '○'}
              </span>
              ${p.label}
            </div>
          `;
        })}
        ${done
          ? html`<div
              style="
                margin-top: 4px; padding: 4px 8px;
                background: color-mix(in oklch, var(--success-500) 12%, transparent);
                border: 1px solid color-mix(in oklch, var(--success-500) 28%, transparent);
                border-radius: 4px;
                font-size: 10.5px; color: var(--success-400);
                font-family: var(--font-mono);
              "
            >fingerprint: 4f:7a:91:c2:e3:8b:5d:a1…</div>`
          : html``}
      </div>
    `;
  }

  // Mail — mailbox materialising + protocols lighting up
  private _mailDetail(localT: number, _done: boolean): TemplateResult {
    return html`
      <div
        style="
          background: var(--ink-0);
          border-radius: 6px;
          padding: 10px 14px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; min-height: 60px;
        "
      >
        <div style="display: flex; align-items: center; gap: 12px;">
          <div
            style="
              width: 36px; height: 36px; border-radius: 8px;
              background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-3));
              border: 1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2));
              display: grid; place-items: center;
              transform: scale(${0.9 + localT * 0.1});
              transition: transform 100ms;
            "
          >
            <i class="fa-solid fa-envelope" style="font-size: 14px; color: var(--brand-200);"></i>
          </div>
          <div>
            <div
              style="
                font-size: 12.5px; color: var(--fg-0);
                font-family: var(--font-mono); font-weight: 500;
              "
            >sam@hookway.co.uk</div>
            <div
              style="
                font-size: 10.5px; color: var(--fg-3);
                margin-top: 2px; font-family: var(--font-mono);
              "
            >5 GB · IMAP/SMTP/JMAP · UK datacentre</div>
          </div>
        </div>
        <div style="display: flex; gap: 4px;">
          ${['IMAP', 'SMTP', 'JMAP'].map((p, i) => {
            const at = 0.3 + i * 0.2;
            const lit = localT >= at;
            return html`
              <div
                style="
                  padding: 2px 7px; border-radius: 999px;
                  font-size: 9.5px; font-family: var(--font-mono);
                  font-weight: 500; letter-spacing: 0.04em;
                  background: ${lit
                    ? 'color-mix(in oklch, var(--success-500) 18%, var(--ink-3))'
                    : 'var(--ink-3)'};
                  border: 1px solid ${lit
                    ? 'color-mix(in oklch, var(--success-500) 32%, transparent)'
                    : 'var(--line-1)'};
                  color: ${lit ? 'var(--success-400)' : 'var(--fg-4)'};
                  transition: all 200ms;
                "
              >${p}</div>
            `;
          })}
        </div>
      </div>
    `;
  }

  render() {
    const t = this._timeline.time;
    const allDone = t > 10.2;
    const { line, sub } = this._narration(t, allDone);
    const ctaOpacity = clamp((t - 10.2) / 0.6, 0, 1);
    const viPulse = 1 + Math.sin(t * 1.6) * 0.012;

    return html`
      <div
        style="
          width: 100%; height: 100%;
          background: var(--ink-1);
          border-radius: 18px;
          border: 1px solid var(--line-2);
          padding: 36px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 36px;
          position: relative; overflow: hidden;
          box-sizing: border-box;
        "
      >
        ${this._glow(t)}

        <!-- Left column: hero copy + Vi narration card -->
        <div style="display: flex; flex-direction: column; gap: 20px; position: relative; z-index: 1;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--brand-300); letter-spacing: 0.1em;
            "
          >PROVISIONING · LIVE</div>
          <h1
            style="
              font-size: 40px; line-height: 1.05;
              letter-spacing: -0.03em; color: var(--fg-0);
              margin: 0;
            "
          >
            ${allDone ? 'All set, Sam.' : 'Hookway.co.uk is going live.'}
          </h1>
          <p
            style="
              font-size: 16px; color: var(--fg-2);
              line-height: 1.55; max-width: 440px; margin: 0;
            "
          >
            ${allDone
              ? html`<span class="editorial" style="font-style: italic; color: var(--fg-1);">
                    That's everything.
                  </span>
                  Your domain, mail, and certificates are live. Try sending yourself a test
                  from sam@hookway.co.uk.`
              : html`I'm setting up your domain, mailbox, and certificate. Stay if you like —
                  this takes about a minute. I'll email you when it's done.`}
          </p>

          <div style="display: flex; align-items: flex-end; gap: 16px; margin-top: auto;">
            <div
              style="
                width: 140px; height: 140px; border-radius: 18px;
                background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-2));
                border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
                display: grid; place-items: center;
                overflow: hidden;
                transform: scale(${viPulse});
              "
            >
              <lethean-vi pose="master" size="170" style="margin-top: 12px;"></lethean-vi>
            </div>
            <div
              style="
                background: var(--ink-2);
                border: 1px solid var(--line-2);
                border-radius: 12px;
                padding: 10px 14px;
                position: relative; max-width: 280px;
              "
            >
              <div
                style="
                  position: absolute; left: -7px; bottom: 14px;
                  width: 0; height: 0;
                  border-top: 7px solid transparent;
                  border-bottom: 7px solid transparent;
                  border-right: 7px solid var(--line-2);
                "
              ></div>
              <div
                style="
                  font-size: 14px; font-weight: 500; color: var(--fg-0);
                  letter-spacing: -0.01em; line-height: 1.35;
                "
              >${line}</div>
              <div
                style="
                  font-size: 11.5px; color: var(--fg-3); margin-top: 3px;
                  font-family: var(--font-mono);
                "
              >${sub}</div>
            </div>
          </div>

          ${allDone
            ? html`<div style="display: flex; gap: 10px; opacity: ${ctaOpacity};">
                <button class="btn btn-primary btn-lg">
                  <i class="fa-solid fa-envelope" style="font-size: 13px; margin-right: 4px;"></i>
                  Open inbox
                </button>
                <button class="btn btn-secondary btn-lg">
                  <i class="fa-solid fa-globe" style="font-size: 13px; margin-right: 4px;"></i>
                  Visit site
                </button>
              </div>`
            : html``}
        </div>

        <!-- Right column: step list + progress strip -->
        <div style="display: flex; flex-direction: column; gap: 14px; position: relative; z-index: 1;">
          ${STEPS.map((s, i) => this._renderStep(s, t, i))}

          <!-- progress strip -->
          <div
            style="
              margin-top: auto; height: 3px; border-radius: 999px;
              background: var(--ink-3);
              overflow: hidden; position: relative;
            "
          >
            <div
              style="
                position: absolute; top: 0; left: 0; bottom: 0;
                width: ${clamp(t / 10, 0, 1) * 100}%;
                background: linear-gradient(90deg, var(--brand-500), var(--brand-300));
                transition: width 60ms linear;
                box-shadow: 0 0 12px color-mix(in oklch, var(--brand-400) 60%, transparent);
              "
            ></div>
          </div>
          <div
            style="
              display: flex; justify-content: space-between;
              font-size: 10.5px; color: var(--fg-4);
              font-family: var(--font-mono); letter-spacing: 0.05em;
            "
          >
            <span>${Math.min(10, t).toFixed(1)}s elapsed</span>
            <span>${allDone ? 'complete' : `~${Math.max(0, 10 - t).toFixed(0)}s remaining`}</span>
          </div>
        </div>

        <style>
          @keyframes provPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
          @keyframes provBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        </style>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-provisioning-scene': LetheanProvisioningScene;
  }
}
