"use client";

import { motion } from "framer-motion";

const trustCards = [
  {
    icon: "🔒",
    title: "Privacy-first",
    sub: "No message reading. No activity tracking.",
  },
  {
    icon: "🧠",
    title: "Only what you enter",
    sub: "Driftlatch works from what you choose to share.",
  },
  {
    icon: "🛡️",
    title: "Your data stays yours",
    sub: "Export or delete your data anytime.",
  },
  {
    icon: "🏠",
    title: "Built for real life",
    sub: "Closeness at home. Clarity at work.",
  },
];

const sections = [
  {
    title: "What this policy covers",
    body: [
      "This Privacy Policy explains what Driftlatch collects, how it is used, and the choices you have over your data.",
      "Driftlatch is built to be privacy-first. Trust is not a feature. It is the baseline.",
    ],
  },
  {
    title: "What Driftlatch collects",
    body: [
      "Account information, such as your email address and profile details.",
      "Information you choose to enter into Driftlatch, including check-ins, saved tools, profile responses, preferences, and feedback.",
      "Basic billing and subscription information needed to manage access and payments.",
      "Limited technical information needed to keep the product secure and functioning properly.",
    ],
  },
  {
    title: "What Driftlatch does not collect",
    body: [
      "Driftlatch does not read your private messages, emails, or calls.",
      "Driftlatch does not track your phone activity.",
      "Driftlatch does not monitor content outside what you explicitly choose to enter into the product.",
    ],
  },
  {
    title: "How information is used",
    body: [
      "To create and maintain your account.",
      "To personalize your experience, including profile-based and state-based tool selection.",
      "To operate subscriptions, billing, and access control.",
      "To improve product reliability, performance, and core features.",
      "To respond to support, billing, refund, or account requests.",
    ],
  },
  {
  title: "How information is stored",
  body: [
    "Your information is stored using third-party infrastructure and service providers that help us run Driftlatch, including Supabase for authentication, database, and core data storage.",
    "Where third-party providers are used, their own privacy and security terms also apply to the parts of the service they provide.",
    "We take reasonable steps to protect your data, but no system can guarantee absolute security.",
  ],
},
  {
  title: "How information is shared",
  body: [
    "We do not sell your personal data.",
    "We only share information with service providers needed to operate Driftlatch, such as Supabase for authentication and storage, hosting providers, analytics providers, and payment providers.",
    "Where those providers process data on our behalf, their own privacy policies and terms apply to their services.",
    "We may also disclose information if required by law or to protect the security and integrity of the service.",
  ],
},
  {
  title: "Billing and payments",
  body: [
    "Payments are processed by our payment provider, Paddle.",
    "We do not store full payment card details ourselves.",
    "Billing-related information may be shared with Paddle as needed to process subscriptions, renewals, and refunds.",
  ],
},
  {
    title: "Your choices",
    body: [
      "You can request access, correction, export, or deletion of your data.",
      "You can also contact us to cancel your subscription or request a refund in line with our refund policy.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "We keep information for as long as needed to provide the service, maintain account records, meet legal obligations, and resolve disputes.",
      "When data is no longer needed, we will delete or anonymize it where reasonably possible.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time.",
      "Continued use of Driftlatch after changes means you accept the updated policy.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy, account, billing, export, deletion, or support questions, contact:",
      "support@driftlatch.com",
    ],
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
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
            Privacy
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
            Clear, calm, and privacy-first.
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
            Driftlatch is built to help protect closeness at home and clarity at work
            without turning your private life into surveillance. This page explains
            what we collect, what we do not collect, and how your data is handled.
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
                          idx === section.body.length - 1 && section.title === "Contact"
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