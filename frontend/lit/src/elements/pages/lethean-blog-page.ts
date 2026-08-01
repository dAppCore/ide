// <lethean-blog-page> — blog.host.uk.com index. Lead feature
// (image-quote panel + headline + lede + author meta), 3-up grid of
// recent posts, archive list, subscribe-newsletter callout. Ported
// from help-blog-changelog.jsx > BlogIndex.

import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

const FEATURES = [
  {
    tag: 'ESSAY',
    date: '14 MAR 2026',
    title: 'What we mean by',
    titleQuote: 'sovereign hosting',
    titleRest: '',
    quote: 'Sovereign isn\'t a marketing word. It\'s ',
    quoteAccent: 'a contract.',
    lead: 'We host in Manchester. The data is in the UK. The company is in the UK. None of these are accidents — and here\'s why each one matters in 2026.',
    author: 'Anson Le',
    min: 12,
  },
];

const GRID_POSTS = [
  { tag: 'ENGINEERING', date: '12 Mar', title: 'How Vi runs migrations overnight', min: 6, author: 'Lina Holm' },
  { tag: 'POLICY', date: '08 Mar', title: 'What the new Online Safety guidance means for small UK sites', min: 8, author: 'Dr. Priya Patel' },
  { tag: 'PRODUCT', date: '01 Mar', title: "Host Mail's deliverability story, six months in", min: 5, author: 'Anson Le' },
];

const ARCHIVE = [
  { date: '24 FEB', title: "Why we don't have a Black Friday sale", tag: 'ESSAY' },
  { date: '17 FEB', title: 'Reading our DMARC reports out loud, properly', tag: 'ENGINEERING' },
  { date: '10 FEB', title: 'Adding Apple Maps reviews to Host Trust', tag: 'PRODUCT' },
  { date: '03 FEB', title: 'How we onboarded our first 100 charity customers', tag: 'STORIES' },
  { date: '27 JAN', title: 'An honest comparison of UK hosts in 2026', tag: 'POLICY' },
  { date: '20 JAN', title: "Vi's runbook for the November 2025 outage", tag: 'ENGINEERING' },
  { date: '13 JAN', title: 'Reflections on year one', tag: 'ESSAY' },
];

@customElement('lethean-blog-page')
export class LetheanBlogPage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="surface" style="width: 100%; min-height: 100%; background: var(--ink-0);">
        <!-- Title row + topic nav -->
        <section style="padding: 56px 56px 24px;">
          <div
            style="
              display: flex; justify-content: space-between;
              align-items: baseline; margin-bottom: 36px;
            "
          >
            <h1 style="font-size: 48px; letter-spacing: -0.04em; margin: 0;">
              <span class="editorial" style="font-style: italic; color: var(--brand-200);">The</span>
              Host UK
              <span class="editorial" style="font-style: italic;">journal.</span>
            </h1>
            <div
              style="
                display: flex; gap: 20px;
                font-size: 12px; font-family: var(--font-mono);
                color: var(--fg-4); letter-spacing: 0.06em;
              "
            >
              <a href="#">ALL</a><a href="#">ESSAYS</a><a href="#">ENGINEERING</a>
              <a href="#">POLICY</a><a href="#">PRODUCT</a><a href="#">RSS</a>
            </div>
          </div>

          <!-- Lead feature -->
          ${FEATURES.map(
            (f) => html`
              <article
                style="
                  display: grid; grid-template-columns: 1.4fr 1fr;
                  gap: 36px; padding-bottom: 48px;
                  border-bottom: 1px solid var(--line-1);
                "
              >
                <div>
                  <div
                    style="
                      font-size: 10.5px; font-family: var(--font-mono);
                      color: var(--brand-300); letter-spacing: 0.08em;
                      margin-bottom: 14px;
                    "
                  >${f.tag} · ${f.date}</div>
                  <h2 style="font-size: 44px; letter-spacing: -0.035em; line-height: 1.08; margin: 0;">
                    ${f.title}
                    <span class="editorial" style="font-style: italic; color: var(--brand-200);">
                      "${f.titleQuote}"
                    </span>${f.titleRest}
                  </h2>
                  <p
                    style="
                      font-size: 16px; color: var(--fg-2);
                      line-height: 1.6; margin: 18px 0 0; max-width: 560px;
                    "
                  >${f.lead}</p>
                  <div
                    style="
                      display: flex; gap: 14px; align-items: center;
                      margin-top: 26px;
                      font-size: 12.5px; color: var(--fg-3);
                      font-family: var(--font-mono);
                    "
                  >
                    <div
                      style="
                        width: 24px; height: 24px; border-radius: 999px;
                        background: linear-gradient(135deg, var(--brand-400), var(--brand-700));
                      "
                    ></div>
                    <span>${f.author.toUpperCase()}</span>
                    <span style="color: var(--fg-5);">·</span>
                    <span>${f.min} MIN READ</span>
                  </div>
                </div>
                <div
                  style="
                    border-radius: 14px;
                    background: linear-gradient(135deg, color-mix(in oklch, var(--brand-500) 28%, var(--ink-2)), color-mix(in oklch, var(--brand-700) 22%, var(--ink-1)));
                    border: 1px solid color-mix(in oklch, var(--brand-500) 26%, var(--line-2));
                    min-height: 280px;
                    display: grid; place-items: center;
                    position: relative; overflow: hidden;
                  "
                >
                  <div
                    class="editorial"
                    style="
                      font-style: italic;
                      color: color-mix(in oklch, var(--fg-0) 80%, transparent);
                      font-size: 36px; letter-spacing: -0.02em;
                      padding: 24px; text-align: center; line-height: 1.2;
                      max-width: 85%;
                    "
                  >
                    "${f.quote}<span style="color: var(--brand-200);">${f.quoteAccent}</span>"
                  </div>
                </div>
              </article>
            `
          )}
        </section>

        <!-- 3-up grid -->
        <section style="padding: 48px 56px 24px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            ${GRID_POSTS.map(
              (p) => html`
                <article
                  style="
                    padding: 24px;
                    background: var(--ink-2); border: 1px solid var(--line-1);
                    border-radius: 12px;
                    display: flex; flex-direction: column; gap: 16px;
                  "
                >
                  <div
                    style="
                      font-size: 10.5px; font-family: var(--font-mono);
                      color: var(--brand-300); letter-spacing: 0.06em;
                    "
                  >${p.tag} · ${p.date}</div>
                  <h3
                    style="
                      font-size: 21px; letter-spacing: -0.02em;
                      line-height: 1.18; color: var(--fg-0); margin: 0;
                    "
                  >${p.title}</h3>
                  <div
                    style="
                      margin-top: auto; padding-top: 12px;
                      border-top: 1px solid var(--line-1);
                      display: flex; justify-content: space-between;
                      font-size: 11.5px; color: var(--fg-4);
                      font-family: var(--font-mono);
                    "
                  >
                    <span>${p.author}</span>
                    <span>${p.min} MIN</span>
                  </div>
                </article>
              `
            )}
          </div>
        </section>

        <!-- archive -->
        <section style="padding: 32px 56px 64px;">
          <div
            style="
              font-size: 11px; font-family: var(--font-mono);
              color: var(--fg-4); letter-spacing: 0.08em; margin-bottom: 18px;
            "
          >ARCHIVE</div>
          <div style="border-top: 1px solid var(--line-1);">
            ${ARCHIVE.map(
              (p) => html`
                <a
                  href="#"
                  style="
                    display: grid; grid-template-columns: 80px 1fr 110px;
                    padding: 16px 0;
                    border-bottom: 1px solid var(--line-1);
                    align-items: center; cursor: pointer;
                    text-decoration: none; color: inherit;
                  "
                >
                  <span
                    style="
                      font-size: 11px; font-family: var(--font-mono);
                      color: var(--fg-4); letter-spacing: 0.06em;
                    "
                  >${p.date}</span>
                  <span style="font-size: 14.5px; color: var(--fg-1);">${p.title}</span>
                  <span
                    style="
                      font-size: 10.5px; font-family: var(--font-mono);
                      color: var(--brand-300); letter-spacing: 0.06em;
                      text-align: right;
                    "
                  >${p.tag}</span>
                </a>
              `
            )}
          </div>
        </section>

        <!-- Subscribe -->
        <section style="padding: 32px 56px 80px;">
          <div
            style="
              padding: 32px;
              background: var(--ink-1); border: 1px solid var(--line-1);
              border-radius: 14px;
              display: grid; grid-template-columns: 1fr auto;
              gap: 24px; align-items: center;
            "
          >
            <div>
              <div style="font-size: 19px; color: var(--fg-0); letter-spacing: -0.02em; font-weight: 500;">
                <span class="editorial" style="font-style: italic; color: var(--brand-200);">One</span>
                long-read a fortnight.
                <span class="editorial" style="font-style: italic; color: var(--brand-200);">That's it.</span>
              </div>
              <p style="font-size: 13px; color: var(--fg-3); margin: 4px 0 0;">
                2 384 readers. Unsubscribe in one click.
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              <input
                placeholder="anson@yourbrand.com"
                style="
                  width: 240px; height: 40px; padding: 0 14px;
                  background: var(--ink-2); border: 1px solid var(--line-2);
                  border-radius: 8px;
                  color: var(--fg-0); font-family: var(--font-mono);
                  font-size: 13px;
                "
              />
              <button class="btn btn-primary btn-md">Subscribe</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-blog-page': LetheanBlogPage;
  }
}
