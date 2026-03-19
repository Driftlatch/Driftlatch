"use client";

import { motion } from "framer-motion";

const trustCards = [
  {
    icon: "🏠",
    title: "Closeness at home",
    sub: "Protect connection under pressure.",
  },
  {
    icon: "🧠",
    title: "Clarity at work",
    sub: "Reduce cognitive carryover cleanly.",
  },
  {
    icon: "🔒",
    title: "Privacy-first",
    sub: "No message reading. No activity tracking. You choose what you enter.",
  },
  {
    icon: "↩️",
    title: "14-day refund",
    sub: "No questions asked.",
  },
];

const sections = [
  {
    title: "What Driftlatch is",
    body: [
      "Driftlatch is a privacy-first companion for founders and high-drive professionals. It helps protect closeness at home and clarity at work when pressure starts to carry over.",
      "It does this through guided check-ins, pressure profiling, personalized micro-tools, saved tools, and weekly reflection flows designed to lower pressure first and then give one clean next step.",
    ],
  },
  {
    title: "Who it’s for",
    body: [
      "Driftlatch is designed for adults using it for personal reflection, day-to-day regulation, and relationship-aware support under pressure.",
      "It is built for real life, not perfect routines. No streaks. No guilt. Use it when life is busy.",
    ],
  },
  {
    title: "How access works",
    body: [
      "Some parts of Driftlatch require an account and an active paid plan.",
      "You are responsible for maintaining access to your login email and for activity that happens under your account.",
    ],
  },
  {
    title: "Plans, billing, and renewal",
    body: [
      "Driftlatch offers paid monthly and annual access.",
      "Billing is processed securely through our payment provider.",
      "Access to paid features depends on a valid active entitlement.",
    ],
  },
  {
    title: "Refunds",
    body: [
      "Driftlatch offers a 14-day refund guarantee from the date of purchase.",
      "If Driftlatch is not right for you, contact us within 14 days and we will process a full refund.",
      "Requests made after 14 days may be declined unless required by law.",
    ],
  },
  {
    title: "Cancellation",
    body: [
      "You can cancel your subscription at any time.",
      "Cancellation stops future billing but does not undo charges already made, except where covered by the refund policy above.",
    ],
  },
  {
    title: "Privacy-first by design",
    body: [
      "Driftlatch does not read your messages, emails, or calls.",
      "Driftlatch does not track your phone activity.",
      "It works only from what you choose to enter.",
      "Our Privacy Policy explains how account, product, and billing data are handled.",
    ],
  },
  {
    title: "Using Driftlatch responsibly",
    body: [
      "You may not misuse, copy, reverse engineer, scrape, resell, disrupt, or interfere with Driftlatch or its systems.",
      "You agree to use the service lawfully and responsibly.",
    ],
  },
  {
    title: "What Driftlatch is not",
    body: [
      "Driftlatch does not diagnose and is not a replacement for therapy, psychiatric care, emergency services, legal advice, or medical treatment.",
      "It is a digital support tool for reflection, regulation, and day-to-day support.",
    ],
  },
  {
    title: "Changes to the service",
    body: [
      "We may improve, update, pause, or remove parts of Driftlatch as the product evolves.",
      "We aim to keep the service reliable and useful, but we do not guarantee uninterrupted or error-free availability at all times.",
    ],
  },
  {
    title: "Changes to these Terms",
    body: [
      "We may update these Terms from time to time.",
      "Continued use of Driftlatch after changes means you accept the updated Terms.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For support, billing, cancellation, or refund questions, contact:",
      "support@driftlatch.com",
    ],
  },
];

export default function TermsPage() {
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
            Terms of Service
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
            Terms
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
            Clarity on how Driftlatch works.
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
            These Terms explain the rules for using Driftlatch, how billing works,
            and what you can expect from the product. Short, clear, no fluff.
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
                        color: idx === section.body.length - 1 && section.title === "Contact"
                          ? "var(--text)"
                          : "var(--muted)",
                        fontSize: 15,
                        lineHeight: 1.75,
                        whiteSpace: "pre-wrap",
                        fontWeight:
                          idx === section.body.length - 1 && section.title === "Contact"
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