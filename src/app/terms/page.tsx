"use client";

import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const pillars = [
  { label: "Built for real life", sub: "No streaks. No guilt. Use it when life is busy." },
  { label: "Privacy-first", sub: "Nothing read. Nothing tracked. Only what you enter." },
  { label: "14-day refund", sub: "Not right for you? Email us. Done." },
  { label: "Not therapy", sub: "A support tool. Not a replacement for care." },
];

const sections: { title: string; items: string[] }[] = [
  {
    title: "What Driftlatch is",
    items: [
      "A privacy-first tool for founders and high-drive professionals navigating the gap between work pressure and home life.",
      "It works through check-ins, a Pressure Profile, matched micro-tools, and weekly reflection. The goal is one clean next step — not a perfect routine.",
    ],
  },
  {
    title: "Who it's for",
    items: [
      "Adults using it for personal reflection, day-to-day regulation, and relationship-aware support under pressure.",
      "It is not designed for minors and should not be used as a substitute for professional mental health support.",
    ],
  },
  {
    title: "Your account",
    items: [
      "Some features require an account and an active paid plan.",
      "You are responsible for keeping your login email accessible and for all activity that occurs under your account.",
    ],
  },
  {
    title: "Billing and renewal",
    items: [
      "Driftlatch offers monthly and annual access, billed at the start of each period.",
      "Billing is processed securely through our payment provider, Paddle.",
      "Access to paid features requires a valid active entitlement at the time of use.",
    ],
  },
  {
    title: "Refunds",
    items: [
      "14-day full refund guarantee from the date of purchase — no explanation needed.",
      "Email support@driftlatch.com within 14 days and we'll process it.",
      "Requests outside the 14-day window may be declined unless required by law.",
    ],
  },
  {
    title: "Cancellation",
    items: [
      "Cancel at any time. Cancellation stops future billing immediately.",
      "Cancellation does not refund payments already made, except where covered by the 14-day guarantee above.",
    ],
  },
  {
    title: "Privacy",
    items: [
      "Driftlatch does not read your messages, emails, or calls.",
      "Driftlatch does not track your phone activity or location.",
      "The product works only from what you choose to enter.",
      "Our Privacy Policy explains how account and billing data are stored and used.",
    ],
  },
  {
    title: "Acceptable use",
    items: [
      "You may not misuse, copy, reverse-engineer, scrape, resell, or interfere with Driftlatch or its systems.",
      "You agree to use the service lawfully and in good faith.",
    ],
  },
  {
    title: "What Driftlatch is not",
    items: [
      "Driftlatch does not diagnose. It is not a replacement for therapy, psychiatric care, emergency services, legal advice, or medical treatment.",
      "If you are in crisis, please contact an emergency service or mental health professional.",
    ],
  },
  {
    title: "Service changes",
    items: [
      "We may improve, update, pause, or remove parts of Driftlatch as the product evolves.",
      "We do not guarantee uninterrupted or error-free availability at all times.",
    ],
  },
  {
    title: "Changes to these Terms",
    items: [
      "We may update these Terms periodically. Continued use of Driftlatch after changes means you accept the updated Terms.",
    ],
  },
  {
    title: "Contact",
    items: [
      "For support, billing, or refund questions:",
      "support@driftlatch.com",
    ],
  },
];

export default function TermsPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--bg)",
      padding: "40px 20px 100px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Atmosphere */}
      <motion.div
        animate={{ opacity: [0.10, 0.17, 0.10] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 700, borderRadius: 999, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(circle, rgba(194,122,92,0.18) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, width: "min(760px, 100%)", margin: "0 auto" }}>

        {/* Back */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ marginBottom: 32 }}
        >
          <a href="/pricing" style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            color: "rgba(161,161,170,0.55)", textDecoration: "none",
            fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
          }}>
            ← Pricing
          </a>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ marginBottom: 48 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "6px 14px", borderRadius: 999, marginBottom: 20,
            border: "1px solid rgba(194,122,92,0.24)",
            background: "rgba(194,122,92,0.07)",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: 999,
              background: "rgba(194,122,92,0.9)",
              boxShadow: "0 0 6px rgba(194,122,92,0.8)",
              display: "inline-block",
            }} />
            <span style={{ color: "rgba(194,122,92,0.9)", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>
              TERMS OF SERVICE
            </span>
          </div>

          <h1 style={{
            margin: "0 0 16px",
            fontSize: "clamp(3rem, 8vw, 5.4rem)",
            lineHeight: 0.94,
            letterSpacing: "-0.055em",
            color: "rgba(244,244,245,0.92)",
            fontWeight: 700,
            fontFamily: "Zodiak, Georgia, serif",
          }}>
            Plain terms.
          </h1>

          <p style={{
            margin: 0,
            color: "rgba(161,161,170,0.68)",
            fontSize: 17,
            lineHeight: 1.7,
            maxWidth: 560,
          }}>
            How Driftlatch works, what's included, and what to expect. No legal padding.
          </p>
        </motion.div>

        {/* Pillars */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: EASE }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10, marginBottom: 48,
          }}
        >
          {pillars.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 + i * 0.06, ease: EASE }}
              style={{
                background: "rgba(39,39,42,0.55)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "16px 16px",
                backdropFilter: "blur(14px)",
              }}
            >
              <div style={{
                color: "rgba(244,244,245,0.88)",
                fontSize: 13, fontWeight: 800,
                letterSpacing: "-0.01em",
                marginBottom: 5,
              }}>
                {p.label}
              </div>
              <div style={{ color: "rgba(161,161,170,0.58)", fontSize: 12, lineHeight: 1.55 }}>
                {p.sub}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Sections — stacked accordion style */}
        <div style={{ display: "grid", gap: 3 }}>
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.04, ease: EASE }}
              style={{
                borderRadius: i === 0 ? "18px 18px 6px 6px"
                  : i === sections.length - 1 ? "6px 6px 18px 18px"
                  : 6,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(22,22,26,0.75)",
                backdropFilter: "blur(12px)",
                overflow: "hidden",
              }}
            >
              {/* Section label */}
              <div style={{
                padding: "18px 22px 0",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 3, height: 14, borderRadius: 999, flexShrink: 0,
                  background: "linear-gradient(180deg, rgba(194,122,92,0.85), rgba(194,122,92,0.25))",
                }} />
                <h2 style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.09em",
                  color: "rgba(244,244,245,0.65)",
                  textTransform: "uppercase",
                }}>
                  {section.title}
                </h2>
              </div>

              <div style={{ padding: "12px 22px 20px" }}>
                {section.items.map((line, j) => (
                  <p key={j} style={{
                    margin: j > 0 ? "10px 0 0" : 0,
                    color: section.title === "Contact" && j === section.items.length - 1
                      ? "rgba(244,244,245,0.82)"
                      : "rgba(161,161,170,0.75)",
                    fontSize: 15,
                    lineHeight: 1.75,
                    fontWeight: section.title === "Contact" && j === section.items.length - 1 ? 700 : 400,
                  }}>
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, ease: EASE }}
          style={{
            marginTop: 32,
            padding: "26px 28px",
            borderRadius: 20,
            background: "rgba(194,122,92,0.07)",
            border: "1px solid rgba(194,122,92,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p style={{ margin: "0 0 4px", color: "rgba(244,244,245,0.86)", fontSize: 16, fontWeight: 700 }}>
              Questions about your account or billing?
            </p>
            <p style={{ margin: 0, color: "rgba(161,161,170,0.58)", fontSize: 14 }}>
              One message. We'll sort it out.
            </p>
          </div>
          <a
            href="mailto:support@driftlatch.com"
            style={{
              display: "inline-flex", alignItems: "center",
              padding: "12px 22px", borderRadius: 12,
              background: "linear-gradient(170deg, rgba(200,128,96,0.97), rgba(162,96,62,0.97))",
              border: "1px solid rgba(194,122,92,0.28)",
              boxShadow: "0 10px 28px rgba(194,122,92,0.22)",
              color: "#fff", fontSize: 14, fontWeight: 800,
              textDecoration: "none", letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            Email support →
          </a>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            margin: "28px 0 0", textAlign: "center",
            color: "rgba(161,161,170,0.28)", fontSize: 11,
            letterSpacing: "0.10em", textTransform: "uppercase",
          }}
        >
          Driftlatch · Privacy-first · Built for founders
        </motion.p>
      </div>
    </main>
  );
}