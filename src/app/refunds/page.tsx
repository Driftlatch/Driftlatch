"use client";

import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const guarantees = [
  { label: "14 days", sub: "Full refund window from purchase date" },
  { label: "No form", sub: "One email is all it takes" },
  { label: "No reason needed", sub: "Doesn't feel useful? That's enough" },
  { label: "support@driftlatch.com", sub: "One address. Real response." },
];

const sections: { title: string; items: string[] }[] = [
  {
    title: "What the guarantee covers",
    items: [
      "Any monthly or annual purchase made directly through Driftlatch checkout is covered for 14 days from the date of payment.",
      "If it isn't useful, you get your money back. No explanation required.",
    ],
  },
  {
    title: "How to request one",
    items: [
      "Email support@driftlatch.com from the address linked to your account.",
      "Tell us you'd like a refund. That's the whole message.",
      "We'll confirm and process it — usually within one business day.",
    ],
  },
  {
    title: "Processing time",
    items: [
      "Once approved, refunds are returned via your original payment method.",
      "Most refunds appear within 3–7 business days depending on your bank or card provider.",
    ],
  },
  {
    title: "After 14 days",
    items: [
      "Requests outside the 14-day window may be declined, except where applicable law requires otherwise.",
      "If an active payment dispute or chargeback is already in progress, refund timing may be affected.",
    ],
  },
  {
    title: "Cancellation",
    items: [
      "Cancelling your subscription stops all future billing immediately.",
      "Cancellation alone does not trigger a refund — the 14-day guarantee applies separately to payments already made.",
    ],
  },
];

export default function RefundsPage() {
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
          background: "radial-gradient(circle, rgba(194,122,92,0.20) 0%, transparent 70%)",
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
            transition: "color 0.2s ease",
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
              REFUND POLICY
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
            Simple guarantee.
          </h1>

          <p style={{
            margin: 0,
            color: "rgba(161,161,170,0.7)",
            fontSize: 17,
            lineHeight: 1.7,
            maxWidth: 560,
          }}>
            14 days. Full refund. No friction. If Driftlatch isn't earning its place, you shouldn't be paying for it.
          </p>
        </motion.div>

        {/* Guarantee strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10, marginBottom: 48,
          }}
        >
          {guarantees.map((g, i) => (
            <motion.div
              key={g.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 + i * 0.06, ease: EASE }}
              style={{
                background: "rgba(39,39,42,0.55)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "18px 16px",
                backdropFilter: "blur(14px)",
              }}
            >
              <div style={{
                color: "rgba(244,244,245,0.92)",
                fontSize: g.label.includes("@") ? 13 : 22,
                fontWeight: 800,
                letterSpacing: g.label.includes("@") ? "-0.01em" : "-0.03em",
                marginBottom: 5,
                fontFamily: g.label.includes("@") ? "inherit" : "Zodiak, Georgia, serif",
              }}>
                {g.label}
              </div>
              <div style={{ color: "rgba(161,161,170,0.6)", fontSize: 12, lineHeight: 1.55 }}>
                {g.sub}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Policy sections */}
        <div style={{ display: "grid", gap: 3 }}>
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05, ease: EASE }}
              style={{
                borderRadius: i === 0 ? "18px 18px 6px 6px"
                  : i === sections.length - 1 ? "6px 6px 18px 18px"
                  : 6,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(28,28,32,0.72)",
                backdropFilter: "blur(12px)",
                overflow: "hidden",
              }}
            >
              {/* Section header bar */}
              <div style={{
                padding: "18px 22px 0",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 3, height: 16, borderRadius: 999,
                  background: "linear-gradient(180deg, rgba(194,122,92,0.9), rgba(194,122,92,0.3))",
                  flexShrink: 0,
                }} />
                <h2 style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: "rgba(244,244,245,0.78)",
                  textTransform: "uppercase",
                }}>
                  {section.title}
                </h2>
              </div>

              <div style={{ padding: "14px 22px 20px" }}>
                {section.items.map((line, j) => (
                  <p key={j} style={{
                    margin: j > 0 ? "10px 0 0" : 0,
                    color: "rgba(161,161,170,0.78)",
                    fontSize: 15,
                    lineHeight: 1.75,
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
            padding: "28px 28px",
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
            <p style={{ margin: "0 0 4px", color: "rgba(244,244,245,0.88)", fontSize: 16, fontWeight: 700 }}>
              Need a refund or have a billing question?
            </p>
            <p style={{ margin: 0, color: "rgba(161,161,170,0.6)", fontSize: 14 }}>
              One message is all it takes. We'll sort it out.
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