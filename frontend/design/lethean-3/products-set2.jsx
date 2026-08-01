/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Product pages — set 2: Notify · Social · Trust · Mail
// ─────────────────────────────────────────────────────────

/* ═════════════════════════════════════════════════════════
   4 · notify.host.uk.com — TIMELINE-LED
   Push notifications. Story = a delivery timeline.
   ═════════════════════════════════════════════════════════ */
function ProductNotify({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="products" />
      <MktHero
        eyebrow="HOST NOTIFY · WEB + APP PUSH · DELIVERABILITY YOU CAN AUDIT"
        title="Push, that arrives."
        italics="And tells you why if it doesn't."
        body="Web push, iOS, Android. APNs and FCM under the hood, with a delivery timeline so honest your support team can copy-paste it back to a customer."
        primary="Send your first push"
        secondary="See sample timeline"
        viProduct="notify"
        proof={["98.4% delivery · last 30 days", "GDPR consent baked in", "10k free pushes / month"]}
      />
      <NotifyDeliveryTimeline />
      <NotifyComposer />
      <NotifyDeliverabilityStrip />
      <MktCTA
        title={<>One SDK. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Six channels.</span></>}
        body="Web push, iOS, Android, email fallback, in-app inbox, SMS. Pick what you need."
        primary="Read the SDK docs"
      />
      <MarketingFooter />
    </div>
  );
}

function NotifyDeliveryTimeline() {
  const events = [
    { t: "T+0ms", actor: "api", line: "POST /v1/messages · campaign=order_shipped · audience=12,847", state: "queued" },
    { t: "T+12ms", actor: "vi", line: "deduped 314 unsubscribed · validated payload · split by platform", state: "ok" },
    { t: "T+84ms", actor: "fcm", line: "batched 8 412 → fcm.googleapis.com · 6 batches × 1 500", state: "sending" },
    { t: "T+117ms", actor: "apns", line: "batched 4 121 → api.push.apple.com · ECDSA P-256 token", state: "sending" },
    { t: "T+342ms", actor: "fcm", line: "8 412 sent · 8 402 accepted · 10 invalid (auto-pruned)", state: "ok" },
    { t: "T+412ms", actor: "apns", line: "4 121 sent · 4 098 accepted · 23 BadDeviceToken (auto-pruned)", state: "ok" },
    { t: "T+1.4s", actor: "client", line: "7 281 delivered · ack within 1 200ms", state: "ok" },
    { t: "T+12s", actor: "vi", line: "98.4% delivery rate · CTR running at 4.2% · sample size 12 500+", state: "ok" },
  ];
  return (
    <section style={{ padding: "80px 56px" }}>
      <div style={{ maxWidth: 720, marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
          THE DELIVERY TIMELINE
        </div>
        <h2 style={{ fontSize: 36, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
          You can see every push. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Including why one didn't make it.</span>
        </h2>
      </div>
      <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 14, padding: 24, fontFamily: "var(--font-mono)" }}>
        <div style={{ fontSize: 11, color: "var(--fg-4)", letterSpacing: "0.06em", marginBottom: 18 }}>
          CAMPAIGN · order_shipped · 17 Mar 14:32:08
        </div>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
          <div style={{ position: "absolute", left: 78, top: 0, bottom: 0, width: 1, background: "var(--line-2)" }} />
          {events.map((e, i) => (
            <li key={i} style={{ display: "grid", gridTemplateColumns: "70px 24px 1fr 80px", gap: 12, alignItems: "center", position: "relative" }}>
              <span style={{ color: "var(--fg-4)", fontSize: 11.5, textAlign: "right" }}>{e.t}</span>
              <span style={{
                width: 12, height: 12, borderRadius: 999, justifySelf: "center",
                background: e.state === "ok" ? "var(--success-400)" : e.state === "sending" ? "var(--brand-400)" : "var(--fg-4)",
                boxShadow: e.state === "sending" ? "0 0 12px var(--brand-400)" : "none",
              }} />
              <span style={{ fontSize: 12.5, color: "var(--fg-1)" }}>
                <span style={{ color: "var(--brand-300)" }}>{e.actor}</span>
                <span style={{ color: "var(--fg-4)" }}> · </span>{e.line}
              </span>
              <span style={{ fontSize: 10.5, color: e.state === "ok" ? "var(--success-400)" : e.state === "sending" ? "var(--brand-300)" : "var(--fg-4)", letterSpacing: "0.04em", textAlign: "right" }}>● {e.state.toUpperCase()}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function NotifyComposer() {
  return (
    <MktSection
      eyebrow="THE COMPOSER"
      title="Write once. Show on every device, properly."
      body="One composer, automatic preview for web/iOS/Android. Variables, conditional content, A/B at the row level."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 28 }}>
        {/* composer pane */}
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["TITLE", "Your order's left the warehouse"],
              ["BODY", "Track it from the email, or open the app — Vi will tell you when it's near."],
              ["URL", "{{app_url}}/orders/{{order_id}}"],
              ["ICON", "/static/icon-192.png"],
              ["AUDIENCE", "segment: customers WHERE last_order > 7d"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 6 }}>{k}</div>
                <div style={{ padding: "10px 14px", background: "var(--ink-1)", border: "1px solid var(--line-1)", borderRadius: 8, fontSize: 13, color: "var(--fg-0)", fontFamily: k === "URL" || k === "AUDIENCE" || k === "ICON" ? "var(--font-mono)" : "inherit" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* device previews */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { os: "iOS", style: { background: "color-mix(in oklch, var(--ink-3) 70%, white 6%)" } },
            { os: "Android", style: { background: "var(--ink-3)" } },
            { os: "Web · Chrome", style: { background: "var(--ink-3)" } },
          ].map((d) => (
            <div key={d.os} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", textAlign: "right" }}>{d.os}</div>
              <div style={{ ...d.style, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line-2)", display: "grid", gridTemplateColumns: "32px 1fr 50px", gap: 10, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: "var(--brand-500)" }} />
                <div>
                  <div style={{ fontSize: 12, color: "var(--fg-0)", fontWeight: 600 }}>Your order's left the warehouse</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-2)", marginTop: 2 }}>Track it from the email, or open the app…</div>
                </div>
                <span style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textAlign: "right" }}>now</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MktSection>
  );
}

function NotifyDeliverabilityStrip() {
  return (
    <section style={{ padding: "48px 56px", background: "var(--ink-1)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, textAlign: "center" }}>
        {[
          ["98.4%", "delivery · 30d"],
          ["12 ms", "median enqueue"],
          ["6", "channels per SDK"],
          ["10k", "free pushes / month"],
        ].map(([n, l], i) => (
          <div key={i}>
            <div className="num tnum" style={{ fontSize: 38, color: "var(--fg-0)", letterSpacing: "-0.03em", fontWeight: 600 }}>{n}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6, fontFamily: "var(--font-mono)" }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════
   5 · social.host.uk.com — CALENDAR-LED
   Hero is the product surface (calendar grid).
   ═════════════════════════════════════════════════════════ */
function ProductSocial({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="products" />
      <SocialHero />
      <SocialNetworks />
      <SocialAnalytics />
      <SocialTeams />
      <MktCTA
        title={<>Six networks. One queue. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Sleeps when you do.</span></>}
        body="Buffer-style scheduling, calmly. Vi reads your draft and asks the awkward questions before your followers do."
        primary="Schedule your week"
      />
      <MarketingFooter />
    </div>
  );
}

function SocialHero() {
  return (
    <section style={{ padding: "72px 56px 48px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", marginBottom: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))", fontSize: 11.5, color: "var(--brand-200)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", gap: 8, alignItems: "center" }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--brand-300)" }} />
            HOST SOCIAL · SCHEDULING · ANALYTICS · INBOX
          </div>
          <h1 style={{ fontSize: 56, letterSpacing: "-0.04em", lineHeight: 1.04 }}>
            A calmer<br />
            <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)", fontSize: 58 }}>social calendar.</span>
          </h1>
          <p style={{ fontSize: 17, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 480 }}>
            Schedule across Mastodon, Bluesky, LinkedIn, Instagram, X, Threads. Vi sweeps for typos, missing alt-text, broken links — before they go out.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary btn-lg">Try free for 30 days</button>
            <button className="btn btn-secondary btn-lg">Watch the demo<Icon name="arrow-right" size={11} /></button>
          </div>
        </div>
        <SocialCalendarMock />
      </div>
    </section>
  );
}

function SocialCalendarMock() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const posts = [
    { d: 0, h: 9, net: "ma", title: "Behind the scenes" },
    { d: 0, h: 14, net: "li", title: "Hiring update" },
    { d: 1, h: 11, net: "bs", title: "Friday's recap" },
    { d: 2, h: 8, net: "ig", title: "New menu drop" },
    { d: 2, h: 15, net: "x", title: "Quote of the week" },
    { d: 3, h: 10, net: "li", title: "Case study · Lethean" },
    { d: 4, h: 12, net: "th", title: "Friday's drop" },
    { d: 4, h: 17, net: "ma", title: "Long-read" },
    { d: 6, h: 10, net: "ig", title: "Sunday menu" },
  ];
  const netColor = { ma: "#6364FF", li: "#0A66C2", bs: "#1185FE", ig: "#E1306C", x: "#FFFFFF", th: "#FFFFFF" };
  return (
    <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 14, padding: 18, boxShadow: "var(--shadow-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--fg-0)" }}><span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Week of</span> 17 March</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ width: 22, height: 22, border: "1px solid var(--line-2)", background: "var(--ink-3)", borderRadius: 5, color: "var(--fg-2)", fontSize: 11 }}>‹</button>
          <button style={{ width: 22, height: 22, border: "1px solid var(--line-2)", background: "var(--ink-3)", borderRadius: 5, color: "var(--fg-2)", fontSize: 11 }}>›</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", gap: 4 }}>
        <div />
        {days.map((d, i) => (
          <div key={d} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: i === 4 ? "var(--brand-300)" : "var(--fg-4)", textAlign: "center", padding: "4px 0", letterSpacing: "0.04em" }}>{d.toUpperCase()} {17 + i}</div>
        ))}
        {[8, 10, 12, 14, 16, 18].map((h) => (
          <React.Fragment key={h}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-4)", textAlign: "right", paddingTop: 14 }}>{h}:00</div>
            {Array.from({ length: 7 }).map((_, d) => {
              const here = posts.find(p => p.d === d && p.h >= h && p.h < h + 2);
              return (
                <div key={d} style={{ height: 38, background: "var(--ink-1)", border: "1px solid var(--line-1)", borderRadius: 4, padding: 4, position: "relative", overflow: "hidden" }}>
                  {here && (
                    <div style={{
                      padding: "3px 5px",
                      background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-2))",
                      border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
                      borderRadius: 3, height: "100%", display: "flex", flexDirection: "column", gap: 2,
                    }}>
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: netColor[here.net] }} />
                        <span style={{ fontSize: 8.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)", textTransform: "uppercase" }}>{here.net}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--fg-0)", lineHeight: 1.1, overflow: "hidden" }}>{here.title}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: "10px 12px", background: "color-mix(in oklch, var(--brand-500) 10%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--brand-500) 22%, var(--line-2))", borderRadius: 8, display: "flex", gap: 10, alignItems: "center" }}>
        <ViAvatar size={28} pose="thinking" />
        <span style={{ fontSize: 12, color: "var(--fg-1)" }}>Tuesday's draft is missing alt-text on the menu image. Want me to draft one?</span>
      </div>
    </div>
  );
}

function SocialNetworks() {
  const nets = [
    { name: "Mastodon", icon: "mastodon", note: "OAuth, custom instance, CW + alt-text required" },
    { name: "Bluesky", icon: "bluesky", note: "AT Protocol, custom domain handles" },
    { name: "LinkedIn", icon: "linkedin", note: "Personal + company pages" },
    { name: "Instagram", icon: "instagram", note: "Posts, Reels, Stories · Business accounts" },
    { name: "X", icon: "x-twitter", note: "Posts + threads · API v2" },
    { name: "Threads", icon: "threads", note: "Posts · official API" },
  ];
  return (
    <MktSection
      eyebrow="WHERE IT POSTS"
      title="Six networks. Including the ones you actually use."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {nets.map((n) => (
          <div key={n.name} style={{
            padding: "16px 18px", borderRadius: 10, background: "var(--ink-2)", border: "1px solid var(--line-1)",
            display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center",
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 7, background: "var(--ink-3)", display: "grid", placeItems: "center", border: "1px solid var(--line-2)" }}>
              <i className={`fa-brands fa-${n.icon}`} style={{ fontSize: 16, color: "var(--brand-200)" }} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, color: "var(--fg-0)", fontWeight: 500 }}>{n.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>{n.note}</div>
            </div>
          </div>
        ))}
      </div>
    </MktSection>
  );
}

function SocialAnalytics() {
  return (
    <MktSection eyebrow="THE NUMBERS" title="Engagement, by network, by post." body="Click any post for the full audit — when it went out, who shared it, where it landed.">
      <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 80px 80px", padding: "10px 18px", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", borderBottom: "1px solid var(--line-1)" }}>
          <span>POST</span><span style={{ textAlign: "right" }}>NET</span><span style={{ textAlign: "right" }}>IMPR.</span><span style={{ textAlign: "right" }}>LIKES</span><span style={{ textAlign: "right" }}>SHARES</span><span style={{ textAlign: "right" }}>CTR</span>
        </div>
        {[
          ["Behind the scenes · the test kitchen", "Mastodon", 4218, 312, 84, "3.8%"],
          ["Hiring · senior platform engineer", "LinkedIn", 12842, 184, 64, "1.2%"],
          ["New menu · Tuesday's photoshoot", "Instagram", 8421, 642, 28, "4.4%"],
          ["Friday's recap thread", "Bluesky", 2849, 264, 142, "5.2%"],
          ["Quote of the week", "X", 6128, 412, 88, "2.1%"],
        ].map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 80px 80px", padding: "11px 18px", fontSize: 13, borderTop: "1px solid var(--line-1)" }}>
            <span style={{ color: "var(--fg-1)" }}>{r[0]}</span>
            <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 11.5, textAlign: "right" }}>{r[1]}</span>
            <span className="num tnum" style={{ color: "var(--fg-1)", textAlign: "right" }}>{r[2].toLocaleString()}</span>
            <span className="num tnum" style={{ color: "var(--fg-1)", textAlign: "right" }}>{r[3]}</span>
            <span className="num tnum" style={{ color: "var(--fg-1)", textAlign: "right" }}>{r[4]}</span>
            <span className="num tnum" style={{ color: "var(--success-400)", textAlign: "right" }}>{r[5]}</span>
          </div>
        ))}
      </div>
    </MktSection>
  );
}

function SocialTeams() {
  return (
    <MktSection
      eyebrow="FOR TEAMS"
      title={<>Drafts. Approvals. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Without the Slack tax.</span></>}
      body="Marketing drafts, founder approves, Vi schedules. Audit log on every edit."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          ["14:02", "lina@", "drafted: \"Hiring · senior platform engineer\""],
          ["14:08", "vi", "flagged: 'remote-first' isn't quite right per your hiring page · suggest 'UK remote'"],
          ["14:11", "lina@", "edited: 'remote-first' → 'UK remote'"],
          ["14:14", "anson@", "approved · 'looks great, ship it'"],
          ["14:14", "vi", "scheduled: LinkedIn (10:00 Tue), Mastodon (10:30 Tue)"],
        ].map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 90px 1fr", gap: 14, fontSize: 13, fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--fg-4)" }}>{r[0]}</span>
            <span style={{ color: r[1] === "vi" ? "var(--brand-300)" : "var(--fg-1)" }}>{r[1]}</span>
            <span style={{ color: "var(--fg-1)" }}>{r[2]}</span>
          </div>
        ))}
      </div>
    </MktSection>
  );
}

/* ═════════════════════════════════════════════════════════
   6 · trust.host.uk.com — WIDGET-LED
   Embeddable social proof. Page IS a showroom of widgets.
   ═════════════════════════════════════════════════════════ */
function ProductTrust({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="products" />
      <MktHero
        eyebrow="HOST TRUST · TESTIMONIAL & REVIEW WIDGETS"
        title="Your customers' words."
        italics="On your site. Looking like yours."
        body="Embeddable testimonials, review collection, star widgets. Imports from Trustpilot, Google, Apple. Your design, not theirs."
        primary="Browse widget gallery"
        secondary="Try in 2 mins"
        viProduct="trust"
        proof={["GDPR-compliant collection", "Schema.org markup baked in", "Light + dark themes per widget"]}
      />
      <TrustWidgetGallery />
      <TrustImportFlow />
      <TrustReplyMode />
      <MktCTA
        title={<>Words from your customers. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>That match your stylesheet.</span></>}
        primary="Generate your widget"
      />
      <MarketingFooter />
    </div>
  );
}

function TrustWidgetGallery() {
  return (
    <MktSection eyebrow="THE GALLERY" title="Six widgets. Drop in any of them." body="Each one is a single <script> tag. They render lazily, they don't block your page, and they style off your CSS variables.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {/* widget: stars + count */}
        <WidgetFrame label="Stars + count">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ display: "flex", gap: 1, color: "var(--gold-400)", fontSize: 16 }}>★★★★★</span>
            <span className="num tnum" style={{ fontSize: 14, color: "var(--fg-0)", fontWeight: 600 }}>4.9</span>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>· 312 reviews</span>
          </div>
        </WidgetFrame>
        {/* widget: single quote */}
        <WidgetFrame label="Single quote">
          <p style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.55, margin: 0 }}>
            "Vi found the leaky migration in the first hour. Felt like having a senior engineer on retainer."
          </p>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>— Anson L., founder · Lethean</div>
        </WidgetFrame>
        {/* widget: marquee */}
        <WidgetFrame label="Marquee · scroll">
          <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
            {["★ 4.9 · 312", "Lethean", "Open Food", "Patel & Co", "Oxbow Press"].map((t) => (
              <span key={t} style={{ padding: "4px 10px", background: "var(--ink-3)", borderRadius: 999, fontSize: 11, color: "var(--fg-2)", whiteSpace: "nowrap", border: "1px solid var(--line-2)" }}>{t}</span>
            ))}
          </div>
        </WidgetFrame>
        {/* widget: stacked grid */}
        <WidgetFrame label="3-up grid">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: 8, background: "var(--ink-3)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--gold-400)" }}>★★★★★</span>
                <span style={{ fontSize: 10, color: "var(--fg-2)", lineHeight: 1.4 }}>"Best decision we made all year."</span>
              </div>
            ))}
          </div>
        </WidgetFrame>
        {/* widget: floater */}
        <WidgetFrame label="Floating ribbon">
          <div style={{ padding: "8px 12px", background: "var(--success-500)", color: "white", fontSize: 11.5, borderRadius: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <Icon name="circle-check" size={11} color="white" />
            <span>Trusted by 312 UK businesses</span>
          </div>
        </WidgetFrame>
        {/* widget: hero */}
        <WidgetFrame label="Hero pull-quote">
          <div className="editorial" style={{ fontStyle: "italic", fontSize: 17, color: "var(--fg-0)", lineHeight: 1.35, letterSpacing: "-0.01em" }}>
            "Like having someone on the team who actually reads the runbook."
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>Patel & Co · 4.9 ★</div>
        </WidgetFrame>
      </div>
    </MktSection>
  );
}

function WidgetFrame({ label, children }) {
  return (
    <div style={{ position: "relative", background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 12, padding: 18, paddingTop: 36 }}>
      <div style={{ position: "absolute", top: 8, left: 12, fontSize: 9.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
      {children}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--line-2)", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-4)", lineHeight: 1.5 }}>
        &lt;script src="trust.host.uk.com/w/{label.toLowerCase().replace(/[^a-z]+/g, "-")}.js"&gt;&lt;/script&gt;
      </div>
    </div>
  );
}

function TrustImportFlow() {
  return (
    <MktSection
      eyebrow="IMPORT"
      title="Bring in everything you've earned elsewhere."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { name: "Trustpilot", icon: "star", note: "OAuth, real-time sync" },
          { name: "Google Reviews", icon: "google", note: "Place ID, daily sync" },
          { name: "Apple Maps", icon: "apple", note: "MapKit, daily sync" },
          { name: "CSV import", icon: "file-csv", note: "One-off, signed off" },
        ].map((s) => (
          <div key={s.name} style={{ background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 7, background: "var(--ink-3)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center" }}>
              <Icon name={s.icon} size={14} color="var(--brand-200)" />
            </div>
            <div style={{ fontSize: 13.5, color: "var(--fg-0)", fontWeight: 500 }}>{s.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{s.note}</div>
          </div>
        ))}
      </div>
    </MktSection>
  );
}

function TrustReplyMode() {
  return (
    <MktSection eyebrow="VI HELPS" title="Vi drafts the replies. You hit send.">
      <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: 14, background: "var(--ink-1)", border: "1px solid var(--line-1)", borderRadius: 10, fontSize: 13, color: "var(--fg-1)", lineHeight: 1.55 }}>
          <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>★★☆☆☆ · Sarah · 12 Mar</div>
          "The migration started fine but hit a snag with the staging URL. Took support four hours to spot it. Solved in the end, but please add a check for this."
        </div>
        <div style={{ padding: 14, background: "color-mix(in oklch, var(--brand-500) 10%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--brand-500) 25%, var(--line-2))", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--brand-300)", fontFamily: "var(--font-mono)" }}>
            <ViAvatar size={20} pose="thinking" /> VI'S DRAFT REPLY
          </div>
          <p style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.55, margin: 0 }}>
            Sarah — that staging-URL check is now in the migration runbook (changelog 2026-03-15). Sorry it cost you four hours; we've credited you a month. — Anson
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary btn-sm">Send</button>
            <button className="btn btn-secondary btn-sm">Edit</button>
            <button className="btn btn-ghost btn-sm">Try another tone</button>
          </div>
        </div>
      </div>
    </MktSection>
  );
}

/* ═════════════════════════════════════════════════════════
   7 · mail.host.org.mx — INBOX-MOCK LED
   Webmail. Hero is an inbox; the rest is deliverability proof.
   ═════════════════════════════════════════════════════════ */
function ProductMail({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="products" />
      <MailHero />
      <MailDeliverability />
      <MailViAssistant />
      <MailDomains />
      <MktCTA
        title={<>Plain mail. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Properly delivered.</span></>}
        body="DKIM, SPF, DMARC set up correctly. From £4 per box."
        primary="Set up your mail"
      />
      <MarketingFooter />
    </div>
  );
}

function MailHero() {
  return (
    <section style={{ padding: "72px 56px 48px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 56, alignItems: "center", marginBottom: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))", fontSize: 11.5, color: "var(--brand-200)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", gap: 8, alignItems: "center" }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--brand-300)" }} />
            HOST MAIL · WEBMAIL · DELIVERABILITY YOU CAN AUDIT
          </div>
          <h1 style={{ fontSize: 54, letterSpacing: "-0.04em", lineHeight: 1.04 }}>
            Email that arrives.<br />
            <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)", fontSize: 56 }}>And looks like work.</span>
          </h1>
          <p style={{ fontSize: 17, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 480 }}>
            Webmail with proper DKIM/SPF/DMARC. Vi checks your sending domain on day one and writes you the DNS records.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary btn-lg">Set up a mailbox</button>
            <button className="btn btn-secondary btn-lg">See deliverability</button>
          </div>
        </div>
        <MailInboxMock />
      </div>
    </section>
  );
}

function MailInboxMock() {
  const mails = [
    { from: "Lina Holm", subj: "Re: Tuesday's brief", time: "09:42", unread: true, label: "Team" },
    { from: "Vi · Host UK", subj: "Your DMARC record passed alignment", time: "09:18", unread: true, label: "Vi" },
    { from: "Patel & Co invoice", subj: "Invoice #INV-2026-0124 due", time: "08:31", unread: false, label: "Finance" },
    { from: "Newsletter · Stratechery", subj: "AI's new bottlenecks", time: "07:00", unread: false },
    { from: "Anson Le", subj: "weekend reading", time: "Yest", unread: false },
    { from: "GitHub", subj: "[host-uk/platform] PR #2841 merged", time: "Yest", unread: false, label: "Eng" },
  ];
  return (
    <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 280px", height: 460 }}>
        {/* sidebar */}
        <div style={{ background: "var(--ink-1)", borderRight: "1px solid var(--line-1)", padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { name: "Inbox", count: 4, active: true },
            { name: "Sent", count: null },
            { name: "Drafts", count: 2 },
            { name: "Archive", count: null },
            { name: "Spam", count: null },
            { name: "Trash", count: null },
          ].map((f) => (
            <div key={f.name} style={{ padding: "6px 10px", borderRadius: 5, background: f.active ? "var(--ink-3)" : "transparent", color: f.active ? "var(--fg-0)" : "var(--fg-2)", fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{f.name}</span>
              {f.count && <span className="num tnum" style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{f.count}</span>}
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", padding: "0 10px 6px" }}>LABELS</div>
          {[
            ["Team", "var(--brand-400)"],
            ["Vi", "var(--brand-300)"],
            ["Finance", "var(--gold-400)"],
            ["Eng", "var(--success-400)"],
          ].map(([n, c]) => (
            <div key={n} style={{ padding: "5px 10px", fontSize: 12, color: "var(--fg-2)", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
              {n}
            </div>
          ))}
        </div>
        {/* list */}
        <div style={{ borderRight: "1px solid var(--line-1)", overflow: "hidden" }}>
          {mails.map((m, i) => (
            <div key={i} style={{
              padding: "12px 16px", borderBottom: "1px solid var(--line-1)",
              background: i === 1 ? "color-mix(in oklch, var(--brand-500) 8%, transparent)" : "transparent",
              display: "grid", gridTemplateColumns: "1fr 60px", gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 12.5, color: m.unread ? "var(--fg-0)" : "var(--fg-2)", fontWeight: m.unread ? 600 : 400 }}>{m.from}</div>
                <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2 }}>{m.subj}</div>
                {m.label && <span style={{ marginTop: 4, display: "inline-block", padding: "1px 7px", borderRadius: 3, background: "var(--ink-3)", border: "1px solid var(--line-2)", fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{m.label}</span>}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{m.time}</div>
            </div>
          ))}
        </div>
        {/* preview */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500 }}>Your DMARC record passed alignment</div>
          <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>vi@host.uk.com · 09:18</div>
          <div style={{ fontSize: 12, color: "var(--fg-1)", lineHeight: 1.55 }}>
            Hi Anson — your DMARC record now reports 100% alignment for the past 7 days. SPF passing, DKIM passing, p=quarantine in effect. Nothing for you to do.
            <br /><br />Want me to bump it to p=reject next week?
          </div>
          <div style={{ marginTop: 8, padding: 10, background: "var(--ink-1)", border: "1px solid var(--line-1)", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", lineHeight: 1.6 }}>
            v=DMARC1; p=quarantine;<br />rua=mailto:dmarc@host.uk.com;<br />pct=100; aspf=s; adkim=s
          </div>
        </div>
      </div>
    </div>
  );
}

function MailDeliverability() {
  return (
    <MktSection
      eyebrow="DELIVERABILITY"
      title={<>The boring stuff, <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>set up properly.</span></>}
      body="Vi runs DKIM, SPF, DMARC checks on every domain you connect, and writes you the exact DNS records to paste."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { tag: "SPF", state: "PASS", note: "v=spf1 include:_spf.host.uk.com ~all" },
          { tag: "DKIM", state: "PASS", note: "key=2048 · selector=hk1 · rotation: monthly" },
          { tag: "DMARC", state: "PASS", note: "p=quarantine · pct=100 · 100% alignment 7d" },
          { tag: "MX", state: "PASS", note: "mx1.host.uk.com · mx2.host.uk.com" },
        ].map((c) => (
          <div key={c.tag} style={{ padding: 18, borderRadius: 10, background: "var(--ink-2)", border: "1px solid var(--line-1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "var(--fg-0)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{c.tag}</span>
              <span style={{ fontSize: 10.5, color: "var(--success-400)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>● {c.state}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", lineHeight: 1.5, wordBreak: "break-all" }}>{c.note}</div>
          </div>
        ))}
      </div>
    </MktSection>
  );
}

function MailViAssistant() {
  return (
    <MktSection eyebrow="VI IN MAIL" title="An assistant that lives in your inbox.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {[
          { title: "Triage", body: "Vi proposes labels, archives the obvious, and surfaces what's actually for you." },
          { title: "Draft", body: "Reply in your voice. She studies your last 200 sent emails and matches the tone." },
          { title: "Audit", body: "Catches phishy senders, broken DKIM, and forwarded credentials before you click." },
        ].map((c) => (
          <article key={c.title} style={{ padding: 22, borderRadius: 10, background: "var(--ink-2)", border: "1px solid var(--line-1)" }}>
            <div style={{ fontSize: 16, color: "var(--fg-0)", fontWeight: 500, letterSpacing: "-0.015em" }}>{c.title}</div>
            <p style={{ fontSize: 13.5, color: "var(--fg-2)", marginTop: 8, lineHeight: 1.55 }}>{c.body}</p>
          </article>
        ))}
      </div>
    </MktSection>
  );
}

function MailDomains() {
  return (
    <MktSection
      eyebrow="DOMAINS"
      title="Your address, your domain."
      body="anson@yourcompany.com is included on every plan. We'll set the DNS up for you."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 12, padding: 24, display: "flex", justifyContent: "center", gap: 16, fontSize: 13, color: "var(--fg-1)", fontFamily: "var(--font-mono)", flexWrap: "wrap" }}>
        {["@yourcompany.com", "@yourname.uk", "@yourshop.co.uk", "@yourbrand.studio", "@host.uk.com"].map((d) => (
          <span key={d} style={{ padding: "6px 14px", background: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 999 }}>{d}</span>
        ))}
      </div>
    </MktSection>
  );
}

Object.assign(window, { ProductNotify, ProductSocial, ProductTrust, ProductMail });
