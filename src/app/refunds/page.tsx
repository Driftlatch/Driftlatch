"use client";

import { motion } from "framer-motion";

const trustCards = [
  {
    icon: "↩️",
    title: "14-day guarantee",
    sub: "No questions asked.",
  },
  {
    icon: "⚡",
    title: "Fast support",
    sub: "Email us and we’ll sort it out.",
  },
  {
    icon: "🔒",
    title: "Privacy-first",
    sub: "No message reading. No activity tracking.",
  },
  {
    icon: "🧠",
    title: "Built to be useful",
    sub: "If it doesn’t help, you shouldn’t be stuck.",
  },
];

const sections = [
  {
    title: "Our refund policy",
    body: [
      "Driftlatch offers a 14-day full refund guarantee from the date of purchase.",
      "If Driftlatch does not feel useful, contact us within 14 days and we will refund your purchase.",
    ],
  },
  {
    title: "Who can request a refund",
    body: [
      "You can request a refund for a monthly or annual purchase made directly through our checkout flow.",
      "Refund requests should be made from the email address linked to your Driftlatch account where possible.",
    ],
  },
  {
    title: "How to request a refund",
    body: [
      "Email us at support@driftlatch.com.",
      "Include the email address used for your account and a short note that you’d like a refund.",
      "You do not need to write a long explanation.",
    ],
  },
  {
    title: "When refunds may not apply",
    body: [
      "Requests made after the 14-day refund window may be declined unless required by law.",
      "If a payment dispute, chargeback, or fraud review is already in progress, refund timing may be affected.",
    ],
  },
  {
    title: "How long refunds take",
    body: [
      "Once approved, refunds are sent back through the original payment method.",
      "The exact timing depends on your bank or card provider, but it may take several business days to appear.",
    ],
  },
  {
    title: "Cancellation and refunds",
    body: [
      "Cancelling your subscription stops future billing.",
      "Cancellation does not automatically refund a payment already made, except where covered by the 14-day refund guarantee above.",
    ],
  },
  {
    title: "Need help?",
    body: [
      "For refund, billing, or access questions, contact:",
      "support@driftlatch.com",
    ],
  },
];

export default function RefundsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        justifyContent: "center",
        padding: "28px 20px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
      >
        <motion.div
          animate={{ opacity: [0.12, 0.2, 0.12], scale: [1, 1.08, 1] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: "16%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 760,
            height: 760,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(194,122,92,0.22) 0%, transparent 72%)",
            filter: "blur(72px)",
          }}
        />
      </motion.div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(1040px, 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ marginBottom: 24 }}
        >
          <a
            href="/buy"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--muted)",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            ← Back to access
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: "rgba(39,39,42,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: "40px 32px",
            backdropFilter: "blur(16px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.42)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: 999,
              border: "1px solid rgba(194,122,92,0.3)",
              background: "rgba(194,122,92,0.08)",
              color: "var(--accent)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent)",
                display: "inline-block",
              }}
            />
            Refund Policy
          </div>

          <h1
            style={{
              margin: "0 0 10px 0",
              fontSize: "clamp(3.4rem, 9vw, 5.8rem)",
              lineHeight: 0.92,
              letterSpacing: "-0.055em",
              color: "var(--text)",
              fontWeight: 700,
            }}
          >
            Refunds
          </h1>

          <p
            style={{
              margin: "0 0 10px 0",
              maxWidth: 780,
              color: "var(--text)",
              fontSize: 20,
              lineHeight: 1.45,
              fontWeight: 500,
            }}
          >
            Clear, simple, and fair.
          </p>

          <p
            style={{
              margin: "0 0 30px 0",
              maxWidth: 820,
              color: "var(--muted)",
              fontSize: 17,
              lineHeight: 1.7,
            }}
          >
            Driftlatch offers a 14-day full refund guarantee. If it does not feel useful, you should not be stuck with it.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 30,
            }}
          >
            {trustCards.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 + i * 0.05 }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 3,
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.sub}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {sections.map((section, i) => (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + i * 0.04, duration: 0.32 }}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 18,
                  padding: "20px 20px 18px",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: 18,
                    lineHeight: 1.3,
                    color: "var(--text)",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {section.title}
                </h2>

                <div style={{ display: "grid", gap: 10 }}>
                  {section.body.map((line, idx) => (
                    <p
                      key={idx}
                      style={{
                        margin: 0,
                        color:
                          idx === section.body.length - 1 && section.title === "Need help?"
                            ? "var(--text)"
                            : "var(--muted)",
                        fontSize: 15,
                        lineHeight: 1.75,
                        whiteSpace: "pre-wrap",
                        fontWeight:
                          idx === section.body.length - 1 && section.title === "Need help?"
                            ? 600
                            : 400,
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(161,161,170,0.7)",
              fontSize: 12,
              letterSpacing: "0.04em",
            }}
          >
            DRIFTLATCH · Privacy-first · Built for founders
          </div>
        </motion.div>
      </div>
    </main>
  );
}