// <lethean-changelog-page> — engineering changelog. Mono-led, sticky
// release-list rail, per-release card with semver + tag + bullets
// categorised by kind (new/chg/fix/sec/docs). Ported from
// help-blog-changelog.jsx > ChangelogPage.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

type ReleaseTag = 'FEATURE' | 'PERFORMANCE' | 'SECURITY' | 'PRODUCT' | 'DOCS';
type BulletKind = 'new' | 'chg' | 'fix' | 'sec' | 'docs';

interface ReleaseEntry {
  v: string;
  date: string;
  tag: ReleaseTag;
  title: string;
  bullets: Array<[BulletKind, string]>;
}

const TAG_COLORS: Record<ReleaseTag, string> = {
  FEATURE: 'var(--brand-300)',
  PERFORMANCE: 'var(--success-400)',
  SECURITY: 'var(--danger-400)',
  PRODUCT: 'var(--brand-300)',
  DOCS: 'var(--fg-2)',
};

const KIND_COLORS: Record<BulletKind, string> = {
  new: 'var(--success-400)',
  chg: 'var(--brand-300)',
  fix: 'var(--gold-400)',
  sec: 'var(--danger-400)',
  docs: 'var(--fg-3)',
};

const RELEASES: ReleaseEntry[] = [
  {
    v: '2026.03.14', date: '14 MARCH', tag: 'FEATURE',
    title: 'Vi can now read DMARC reports out loud',
    bullets: [
      ['new', 'Daily DMARC summary in the inbox · per-domain · per-source'],
      ['new', 'Vi auto-generates the corrected SPF when a third-party sender is found'],
      ['fix', 'Edge case where DKIM rotation lagged 6h on .uk.com domains · resolved'],
      ['docs', 'Help · Email & DNS · Setting up DKIM, SPF, DMARC properly · rewritten'],
    ],
  },
  {
    v: '2026.03.07', date: '07 MARCH', tag: 'PERFORMANCE',
    title: 'Faster TTFB on UK-South · median 28 ms',
    bullets: [
      ['chg', 'FrankenPHP upgraded · 7 % CPU reduction across PHP-Nginx workloads'],
      ['chg', 'Anycast DNS edges in UK-South now run RFC 9460 (HTTPS records)'],
      ['fix', 'Slow first-request after sleep on Standard plan · resolved'],
    ],
  },
  {
    v: '2026.02.28', date: '28 FEBRUARY', tag: 'FEATURE',
    title: 'Host Trust · Apple Maps reviews',
    bullets: [
      ['new', 'Connect Apple Maps · OAuth · daily sync · same widget gallery'],
      ['new', 'Per-source filter on every widget ("only show 4★ and up")'],
      ['chg', 'Trust widgets now lazy-load · 1.2KB → 0.8KB initial JS'],
    ],
  },
  {
    v: '2026.02.21', date: '21 FEBRUARY', tag: 'SECURITY',
    title: 'Per-team passkey enrolment, by default',
    bullets: [
      ['new', 'Passkeys (WebAuthn) supported on every account · TOTP fallback retained'],
      ['sec', 'Session token rotation aligned with NIST SP 800-63B Rev 4'],
      ['fix', 'Phantom "unknown device" entries on account audit log · resolved'],
    ],
  },
  {
    v: '2026.02.14', date: '14 FEBRUARY', tag: 'PRODUCT',
    title: 'Host Notify · Threads support',
    bullets: [
      ['new', 'Threads is now a target in Notify campaigns · OAuth, instant'],
      ['chg', "Composer auto-suggests channel-specific tone (Threads is friendlier than X)"],
    ],
  },
];

@customElement('lethean-changelog-page')
export class LetheanChangelogPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <!-- Header -->
        <section
          style="
            padding: 56px 56px 32px;
            display: grid; grid-template-columns: 1fr auto;
            gap: 32px; align-items: end;
            border-bottom: 1px solid var(--line-1);
          "
        >
          <div>
            <div
              style="
                font-size: 11px; font-family: var(--font-mono);
                color: var(--brand-300); letter-spacing: 0.1em;
                margin-bottom: 14px;
              "
            >CHANGELOG · ATOM FEED · GIT TAGS · SEMVER</div>
            <h1 style="font-size: 44px; letter-spacing: -0.04em; line-height: 1.06; margin: 0;">
              What shipped, when.
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">
                Boringly so.
              </span>
            </h1>
            <p style="font-size: 15px; color: var(--fg-2); margin: 12px 0 0; max-width: 580px; line-height: 1.6;">
              One entry per release. Bullet under
              <span style="font-family: var(--font-mono); color: var(--success-400);">new</span>
              for new behaviour,
              <span style="font-family: var(--font-mono); color: var(--brand-300);">chg</span>
              for changed,
              <span style="font-family: var(--font-mono); color: var(--gold-400);">fix</span>
              for fixes,
              <span style="font-family: var(--font-mono); color: var(--danger-400);">sec</span>
              for security. No marketing words, no spin.
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-rss" style="font-size: 11px; margin-right: 4px;"></i>
              RSS / Atom
            </button>
            <button class="btn btn-ghost btn-sm">Subscribe by email</button>
          </div>
        </section>

        <!-- Releases -->
        <section style="padding: 48px 56px 64px;">
          <div style="display: grid; grid-template-columns: 200px 1fr; gap: 36px; position: relative;">
            <!-- timeline rail -->
            <div style="position: relative;">
              <div
                style="
                  position: sticky; top: 90px;
                  font-size: 10.5px; font-family: var(--font-mono);
                  color: var(--fg-4); letter-spacing: 0.08em;
                "
              >
                <div style="margin-bottom: 12px;">RELEASES · ${RELEASES.length} SHOWN</div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${RELEASES.map(
                    (r) => html`
                      <a
                        href="#${r.v}"
                        style="color: var(--fg-3); padding: 4px 0; text-decoration: none;"
                      >
                        ${r.v}
                        <span style="color: ${TAG_COLORS[r.tag]}; margin-left: 6px;">● ${r.tag}</span>
                      </a>
                    `
                  )}
                </div>
                <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--line-1);">
                  <a href="#" style="color: var(--brand-300); text-decoration: none;">Older releases (47) →</a>
                </div>
              </div>
            </div>

            <!-- release entries -->
            <div style="display: flex; flex-direction: column; gap: 36px;">
              ${RELEASES.map(
                (r) => html`
                  <article
                    id=${r.v}
                    style="
                      padding: 28px;
                      background: var(--ink-2); border: 1px solid var(--line-1);
                      border-radius: 14px;
                    "
                  >
                    <header
                      style="
                        display: flex; justify-content: space-between;
                        align-items: baseline; margin-bottom: 16px; gap: 16px;
                      "
                    >
                      <div>
                        <div style="display: flex; gap: 14px; align-items: baseline; margin-bottom: 6px;">
                          <span
                            style="
                              font-family: var(--font-mono);
                              font-size: 13px; color: var(--brand-300);
                              letter-spacing: 0.04em;
                            "
                          >v${r.v}</span>
                          <span
                            style="
                              font-family: var(--font-mono);
                              font-size: 11px; color: ${TAG_COLORS[r.tag]};
                              letter-spacing: 0.06em;
                            "
                          >● ${r.tag}</span>
                        </div>
                        <h2
                          style="
                            font-size: 22px; color: var(--fg-0);
                            letter-spacing: -0.02em; line-height: 1.2; margin: 0;
                          "
                        >${r.title}</h2>
                      </div>
                      <span
                        style="
                          font-size: 11.5px; font-family: var(--font-mono);
                          color: var(--fg-4); letter-spacing: 0.06em; white-space: nowrap;
                        "
                      >${r.date}</span>
                    </header>
                    <ul
                      style="
                        list-style: none; padding: 0; margin: 0;
                        display: flex; flex-direction: column; gap: 10px;
                      "
                    >
                      ${r.bullets.map(
                        ([kind, text]) => html`
                          <li
                            style="
                              display: grid; grid-template-columns: 44px 1fr;
                              gap: 12px; font-size: 13.5px; line-height: 1.5;
                            "
                          >
                            <span
                              style="
                                font-family: var(--font-mono);
                                font-size: 10.5px; letter-spacing: 0.06em;
                                color: ${KIND_COLORS[kind]};
                                padding: 2px 7px; border-radius: 4px;
                                align-self: flex-start;
                                background: var(--ink-1);
                                border: 1px solid var(--line-2);
                                text-align: center; width: fit-content;
                                text-transform: uppercase;
                              "
                            >${kind}</span>
                            <span style="color: var(--fg-1);">${text}</span>
                          </li>
                        `
                      )}
                    </ul>
                  </article>
                `
              )}
            </div>
          </div>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-changelog-page': LetheanChangelogPage;
  }
}
