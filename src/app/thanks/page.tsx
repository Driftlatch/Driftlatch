"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const trustCards = [
  {
    icon: "🔒",
    title: "Privacy-first",
    sub: "No message reading. No activity tracking.",
  },
  {
    icon: "↩️",
    title: "14-day refund",
    sub: "No questions asked.",
  },
  {
    icon: "⚡",
    title: "Instant access",
    sub: "Your account is ready right after checkout.",
  },
  {
    icon: "🏠",
    title: "Built for real life",
    sub: "Closeness at home. Clarity at work.",
  },
];

export default function ThanksPage() {
  const hasProfile = true; // replace with real profile check
  const primaryHref = hasProfile ? "/app" : "/app/onboarding";
  const primaryLabel = hasProfile ? "Enter Driftlatch" : "Take Pressure Profile";
  const subcopy = hasProfile
    ? "Your access is active. Your Pressure Profile is already saved, so you can go straight into Driftlatch."
    : "Your access is active. Next, take your 2-minute Pressure Profile so Driftlatch can match the right tools to your state.";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px 80px",
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
            top: "18%",
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

      <div style={{ position: "relative", zIndex: 1, width: "min(1040px, 100%)" }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
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
            You’re in
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
            Welcome in.
          </h1>

          <p
            style={{
              margin: "0 0 8px 0",
              maxWidth: 760,
              color: "var(--text)",
              fontSize: 20,
              lineHeight: 1.45,
              fontWeight: 500,
            }}
          >
            Founding access is active.
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
            {subcopy}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 28,
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 18,
                padding: "20px",
              }}
            >
              <div
                style={{
                  color: "var(--accent)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                What happens next
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.75 }}>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>Check-in</span> → mark what’s true right now in seconds.
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.75 }}>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>One grounded action</span> → Driftlatch chooses a tool that fits your state.
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.75 }}>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>Weekly reflection</span> → reduce effort over time.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 18,
                padding: "20px",
              }}
            >
              <div
                style={{
                  color: "var(--accent)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Add Driftlatch to your Home Screen
              </div>

              <p
                style={{
                  margin: "0 0 14px 0",
                  color: "var(--muted)",
                  fontSize: 15,
                  lineHeight: 1.75,
                }}
              >
                Add Driftlatch to your Home Screen to use it like an app — faster to open, easier to find, one tap away.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 14,
                    padding: "14px 14px 12px",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    iPhone / iPad
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      1. Open Driftlatch in <strong style={{ color: "var(--text)" }}>Safari</strong>
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      2. Tap the <strong style={{ color: "var(--text)" }}>Share</strong> button
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      3. Scroll down and tap <strong style={{ color: "var(--text)" }}>Add to Home Screen</strong>
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      4. Tap <strong style={{ color: "var(--text)" }}>Add</strong>
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 14,
                    padding: "14px 14px 12px",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Android
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      1. Open Driftlatch in <strong style={{ color: "var(--text)" }}>Chrome</strong>
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      2. Tap the <strong style={{ color: "var(--text)" }}>three dots</strong> in the top corner
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      3. Tap <strong style={{ color: "var(--text)" }}>Install app</strong> or <strong style={{ color: "var(--text)" }}>Add to Home screen</strong>
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                      4. Tap <strong style={{ color: "var(--text)" }}>Install</strong> or <strong style={{ color: "var(--text)" }}>Add</strong>
                    </p>
                  </div>
                </div>
              </div>

              <p
                style={{
                  margin: "14px 0 0 0",
                  color: "var(--muted)",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                You can remove it anytime. Your account and data stay safe.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <Link
              href={primaryHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 54,
                padding: "0 22px",
                borderRadius: 18,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                border: "1px solid rgba(194,122,92,0.28)",
                background:
                  "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
                color: "#fff",
                boxShadow:
                  "0 14px 36px rgba(194,122,92,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              {primaryLabel}
            </Link>

            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 54,
                padding: "0 18px",
                borderRadius: 18,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)",
              }}
            >
              Back to site
            </Link>
          </div>

          <p style={{ margin: "18px 0 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            Need help? support@driftlatch.com
          </p>

          <p style={{ margin: "8px 0 0 0", color: "var(--muted)", fontSize: 14 }}>
            <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}