/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Email design system — 6 transactional templates in one
// artboard. Same dark-calm tokens. Vi present but restrained.
// Rendered as faux-email cards: subject + from + body in a
// fixed-width column. Real implementation: MJML / React Email.
// ─────────────────────────────────────────────────────────

function EmailGrid({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: 28,
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 18,
    }}>
      <EmailFrame
        subject="Welcome to Host UK, Sam"
        from="vi@host.uk.com"
        preview="Your sites are live, your mailbox is ready, and I'll be here whenever you need me."
        eyebrow="ONBOARDING"
      >
        <EmailHero>
          <h1 style={emailH1}>You're in.</h1>
          <p style={emailLead}>
            Welcome, Sam. Everything you bought is set up — <span className="num">hookway.co.uk</span> is live, your mailbox is ready, your bio-link page is at <span className="num">link.host.uk.com/sam</span>.
          </p>
        </EmailHero>
        <EmailBody>
          <EmailKeyValue rows={[
            ["Site", "hookway.co.uk · Standard hosting"],
            ["Mail", "sam@hookway.co.uk · 5 GB"],
            ["Trial ends", "03 Nov 2025 · I'll remind you"],
          ]} />
          <EmailButton primary>Open your control panel</EmailButton>
          <EmailSig />
        </EmailBody>
      </EmailFrame>

      <EmailFrame
        subject="Your domain renews in 7 days"
        from="vi@host.uk.com"
        preview="lethean.host · £18.40 · auto-renew is off · acting only on your say-so"
        eyebrow="RENEWAL"
        tone="warning"
      >
        <EmailHero tone="warning">
          <h1 style={emailH1}>One thing waits on you.</h1>
          <p style={emailLead}>
            <span className="num">lethean.host</span> renews on <strong>10 October</strong>. Auto-renew is off, so I'll let it lapse unless you tell me otherwise.
          </p>
        </EmailHero>
        <EmailBody>
          <div style={{
            background: "var(--ink-1)",
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <div>
                <div style={{ color: "var(--fg-3)", fontSize: 11.5 }}>12-month renewal</div>
                <div className="num" style={{ color: "var(--fg-0)", marginTop: 2 }}>lethean.host</div>
              </div>
              <div className="num tnum" style={{ color: "var(--fg-0)", fontSize: 18 }}>£18.40</div>
            </div>
          </div>
          <EmailButton primary>Renew now</EmailButton>
          <EmailButton>Turn auto-renew on</EmailButton>
          <EmailSig />
        </EmailBody>
      </EmailFrame>

      <EmailFrame
        subject="Receipt · INV-2025-0094 · £24.40"
        from="billing@host.uk.com"
        preview="Paid 04 Oct 2025 · Mastercard ·· 4421 · attached PDF"
        eyebrow="RECEIPT"
      >
        <EmailHero>
          <h1 style={emailH1}>Paid. Thanks, Sam.</h1>
          <p style={emailLead}>
            <span className="num">£24.40</span> charged to Mastercard ending <span className="num">4421</span>. Full PDF attached for your records.
          </p>
        </EmailHero>
        <EmailBody>
          <EmailKeyValue rows={[
            ["Invoice", "INV-2025-0094"],
            ["Period", "01 Oct – 31 Oct 2025"],
            ["Sites", "hookway.co.uk · ofm-staging"],
            ["VAT (20%)", "£4.07"],
            ["Total", "£24.40"],
          ]} />
          <EmailButton primary icon="download">Download PDF</EmailButton>
          <EmailSig />
        </EmailBody>
      </EmailFrame>

      <EmailFrame
        subject="Your password was reset"
        from="vi@host.uk.com"
        preview="From a new device · 04 Oct 14:22 · London IP · was this you?"
        eyebrow="SECURITY"
        tone="warning"
      >
        <EmailHero tone="warning">
          <h1 style={emailH1}>Was this you?</h1>
          <p style={emailLead}>
            Someone reset your password from <strong>Chrome on macOS · London</strong> at <span className="num">14:22 BST today</span>.
          </p>
        </EmailHero>
        <EmailBody>
          <EmailKeyValue rows={[
            ["When", "04 Oct 2025 · 14:22 BST"],
            ["Where", "London, UK · 81.140.42.18"],
            ["Device", "Chrome 129 · macOS"],
          ]} />
          <EmailButton primary>Yes, that was me</EmailButton>
          <EmailButton>It wasn't me — secure my account</EmailButton>
          <EmailSig />
        </EmailBody>
      </EmailFrame>

      <EmailFrame
        subject="hookway.co.uk is back up"
        from="vi@host.uk.com"
        preview="Down for 2m 14s · failed health check on worker-3 · auto-failover engaged"
        eyebrow="INCIDENT · RESOLVED"
        tone="success"
      >
        <EmailHero tone="success">
          <h1 style={emailH1}>Back to green.</h1>
          <p style={emailLead}>
            <span className="num">hookway.co.uk</span> was down for <strong>2 minutes 14 seconds</strong> just now. I noticed at the first failed check and failed over to the standby — everything's serving normally again.
          </p>
        </EmailHero>
        <EmailBody>
          <EmailKeyValue rows={[
            ["Outage start", "14:02:11 BST"],
            ["Resolved", "14:04:25 BST"],
            ["Cause", "worker-3 ran out of memory · auto-restarted"],
            ["Visitors affected", "≈ 18 (3 saw a 503)"],
          ]} />
          <EmailButton primary>Read the post-mortem</EmailButton>
          <EmailSig />
        </EmailBody>
      </EmailFrame>

      <EmailFrame
        subject="Vi's weekly brief · 04 Oct"
        from="vi@host.uk.com"
        preview="3 things I did, 1 thing waits on you, 0 things to worry about"
        eyebrow="WEEKLY"
      >
        <EmailHero>
          <h1 style={emailH1}>The week, briefly.</h1>
          <p style={emailLead}>
            <span className="editorial" style={{ fontStyle: "italic" }}>Quiet week.</span> Three sites, all green, no surprises.
          </p>
        </EmailHero>
        <EmailBody>
          <EmailListItem icon="shield-check" tone="success">
            Renewed SSL on 3 sites · valid through Jan 2026
          </EmailListItem>
          <EmailListItem icon="wave-pulse" tone="info">
            Scaled hookway.co.uk 2→4 workers during a HN spike · scaled back at quiet
          </EmailListItem>
          <EmailListItem icon="database" tone="info">
            Backed up everything · 412 MB total · stored 14 days
          </EmailListItem>
          <EmailListItem icon="clock" tone="warning">
            <strong style={{ color: "var(--fg-0)" }}>lethean.host renews in 6 days.</strong> Auto-renew is off — you'll need to act.
          </EmailListItem>
          <EmailButton primary>Open the brief</EmailButton>
          <EmailSig />
        </EmailBody>
      </EmailFrame>
    </div>
  );
}

const emailH1 = { fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--fg-0)" };
const emailLead = { fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55, marginTop: 8 };

function EmailFrame({ subject, from, preview, eyebrow, tone = "neutral", children }) {
  const toneColor = { warning: "var(--warning-400)", success: "var(--success-400)", neutral: "var(--brand-300)" }[tone];
  return (
    <article style={{
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* envelope chrome */}
      <header style={{
        padding: "10px 14px",
        background: "var(--ink-1)",
        borderBottom: "1px solid var(--line-1)",
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: toneColor, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{eyebrow}</span>
          <span style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>04 Oct · 09:14</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500, letterSpacing: "-0.005em", marginTop: 4 }}>{subject}</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)" }}><span className="num">{from}</span></div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview}</div>
      </header>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </article>
  );
}

function EmailHero({ tone = "neutral", children }) {
  const bg = {
    warning: "linear-gradient(180deg, color-mix(in oklch, var(--warning-500) 12%, var(--ink-1)), var(--ink-2))",
    success: "linear-gradient(180deg, color-mix(in oklch, var(--success-500) 10%, var(--ink-1)), var(--ink-2))",
    neutral: "linear-gradient(180deg, color-mix(in oklch, var(--brand-500) 10%, var(--ink-1)), var(--ink-2))",
  }[tone];
  return (
    <div style={{
      padding: "20px 22px 16px",
      background: bg,
      borderBottom: "1px solid var(--line-1)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -10, right: -10, width: 60, height: 60,
        opacity: 0.4,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
          display: "grid", placeItems: "center", overflow: "hidden",
        }}>
          <Vi pose="master" size={64} style={{ marginTop: 6 }} />
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 1, paddingRight: 56 }}>
        {children}
      </div>
    </div>
  );
}

function EmailBody({ children }) {
  return <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>;
}

function EmailKeyValue({ rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 10 }}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line-1)" }}>
            <td style={{ padding: "7px 0", color: "var(--fg-3)", width: "38%" }}>{k}</td>
            <td style={{ padding: "7px 0", color: "var(--fg-0)", fontFamily: typeof v === "string" && /[£\d]/.test(v) ? "var(--font-mono)" : "inherit" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmailButton({ primary, icon, children }) {
  return (
    <button className={primary ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"} style={{
      width: "100%", justifyContent: "center",
      border: primary ? undefined : "1px solid var(--line-2)",
    }}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </button>
  );
}

function EmailListItem({ icon, tone, children }) {
  const toneColor = { success: "var(--success-400)", warning: "var(--warning-400)", info: "var(--info-400)" }[tone];
  return (
    <div style={{
      display: "flex", gap: 10,
      padding: "10px 0",
      borderTop: "1px solid var(--line-1)",
      fontSize: 13, color: "var(--fg-1)", lineHeight: 1.5,
    }}>
      <Icon name={icon} size={12} color={toneColor} />
      <span>{children}</span>
    </div>
  );
}

function EmailSig() {
  return (
    <div style={{
      marginTop: 12, paddingTop: 12,
      borderTop: "1px solid var(--line-1)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
        border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
        display: "grid", placeItems: "center", overflow: "hidden",
      }}>
        <Vi pose="master" size={32} style={{ marginTop: 3 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, color: "var(--fg-1)", fontWeight: 500 }}>Vi · Host UK</div>
        <div style={{ fontSize: 10, color: "var(--fg-4)" }}>Reply to this email to talk back. I read everything.</div>
      </div>
    </div>
  );
}

// ─── Print/PDF invoice ────────────────────────────────────
function InvoicePDF({ brand = "hostuk" }) {
  // Print-style: paper-on-paper feel even in dark mode.
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: "32px 40px",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{
        width: 720,
        background: "oklch(0.96 0.003 285)",
        color: "oklch(0.18 0.012 285)",
        borderRadius: 10,
        boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
        padding: "48px 52px",
        fontFamily: "var(--font-sans)",
        fontSize: 13, lineHeight: 1.55,
      }}>
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 28, borderBottom: "1px solid oklch(0.85 0.01 285)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--brand-500)", display: "grid", placeItems: "center" }}>
                <RavenGlyph size={16} color="oklch(0.96 0.003 285)" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "oklch(0.18 0.012 285)" }}>Host UK</span>
            </div>
            <div style={{ fontSize: 11, color: "oklch(0.42 0.012 285)", marginTop: 14, lineHeight: 1.6 }}>
              Hookway Limited<br />
              Shieldhall Business Centre<br />
              Glasgow, G51 4HG, UK<br />
              <span style={{ fontFamily: "var(--font-mono)" }}>VAT GB 412 8329 11</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "oklch(0.42 0.012 285)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>INVOICE</div>
            <div style={{ fontSize: 24, color: "oklch(0.18 0.012 285)", letterSpacing: "-0.02em", marginTop: 4, fontFamily: "var(--font-mono)", fontWeight: 500 }}>INV-2025-0094</div>
            <div style={{ fontSize: 11, color: "oklch(0.42 0.012 285)", marginTop: 10 }}>
              <div>Issued <span style={{ fontFamily: "var(--font-mono)" }}>04 Oct 2025</span></div>
              <div>Due <span style={{ fontFamily: "var(--font-mono)" }}>04 Oct 2025</span> · paid</div>
            </div>
          </div>
        </header>

        {/* Bill to / period */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, padding: "24px 0", borderBottom: "1px solid oklch(0.85 0.01 285)" }}>
          <div>
            <div style={invoiceLabel}>BILLED TO</div>
            <div style={{ fontSize: 13.5, color: "oklch(0.18 0.012 285)", fontWeight: 500, marginTop: 6 }}>Sam Mooney · Hookway Limited</div>
            <div style={{ fontSize: 11.5, color: "oklch(0.42 0.012 285)", marginTop: 4, lineHeight: 1.6 }}>
              hello@hookway.co.uk<br />
              48 Fitzhardinge Street<br />
              London, W1H 6EE, UK
            </div>
          </div>
          <div>
            <div style={invoiceLabel}>PERIOD</div>
            <div style={{ fontSize: 13.5, color: "oklch(0.18 0.012 285)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
              01 Oct → 31 Oct 2025
            </div>
            <div style={invoiceLabel} >PAYMENT</div>
            <div style={{ fontSize: 11.5, color: "oklch(0.42 0.012 285)", marginTop: 6 }}>
              Paid 04 Oct 2025 · Mastercard <span style={{ fontFamily: "var(--font-mono)" }}>·· 4421</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid oklch(0.85 0.01 285)" }}>
              <th style={invoiceTh}>DESCRIPTION</th>
              <th style={{ ...invoiceTh, width: 70, textAlign: "right" }}>QTY</th>
              <th style={{ ...invoiceTh, width: 100, textAlign: "right" }}>UNIT</th>
              <th style={{ ...invoiceTh, width: 110, textAlign: "right" }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {[
              { d: "Standard hosting · hookway.co.uk", sub: "Oct 2025 · 20 GB · UK-South", q: 1, u: 12.00 },
              { d: "Mailbox · sam@hookway.co.uk", sub: "Oct 2025 · 5 GB", q: 1, u: 5.00 },
              { d: "Staging hosting · ofm-staging", sub: "Oct 2025 · 10 GB", q: 1, u: 3.33 },
              { d: "Domain renewal credit", sub: "lethean.host · pre-paid", q: 1, u: 0.00 },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid oklch(0.92 0.005 285)" }}>
                <td style={{ padding: "12px 0" }}>
                  <div style={{ color: "oklch(0.18 0.012 285)" }}>{row.d}</div>
                  <div style={{ fontSize: 11, color: "oklch(0.50 0.012 285)", marginTop: 2 }}>{row.sub}</div>
                </td>
                <td style={{ padding: "12px 0", textAlign: "right", fontFamily: "var(--font-mono)", color: "oklch(0.30 0.012 285)" }}>{row.q}</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontFamily: "var(--font-mono)", color: "oklch(0.30 0.012 285)" }}>£{row.u.toFixed(2)}</td>
                <td style={{ padding: "12px 0", textAlign: "right", fontFamily: "var(--font-mono)", color: "oklch(0.18 0.012 285)" }}>£{(row.q * row.u).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <table style={{ width: 280, fontSize: 12.5 }}>
            <tbody>
              {[
                ["Subtotal", "£20.33"],
                ["VAT (20%)", "£4.07"],
              ].map(([k, v], i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 0", color: "oklch(0.42 0.012 285)" }}>{k}</td>
                  <td style={{ padding: "6px 0", textAlign: "right", fontFamily: "var(--font-mono)", color: "oklch(0.18 0.012 285)" }}>{v}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid oklch(0.18 0.012 285)" }}>
                <td style={{ padding: "10px 0", color: "oklch(0.18 0.012 285)", fontWeight: 600, fontSize: 14 }}>Total · GBP</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontFamily: "var(--font-mono)", color: "oklch(0.18 0.012 285)", fontSize: 18, fontWeight: 600 }}>£24.40</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid oklch(0.85 0.01 285)", display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "oklch(0.50 0.012 285)" }}>
          <div>
            <div>Host UK is a trading name of Hookway Hosting Ltd · Registered in Scotland · SC 821 449</div>
            <div style={{ marginTop: 4 }}>Questions? <span style={{ fontFamily: "var(--font-mono)", color: "oklch(0.30 0.012 285)" }}>billing@host.uk.com</span> · we reply within 1 working day.</div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)" }}>1 / 1</div>
        </footer>
      </div>
    </div>
  );
}

const invoiceLabel = { fontSize: 10, color: "oklch(0.50 0.012 285)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", fontWeight: 500 };
const invoiceTh = { fontSize: 10, color: "oklch(0.50 0.012 285)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textAlign: "left", padding: "0 0 10px", fontWeight: 500 };

Object.assign(window, { EmailGrid, InvoicePDF });
