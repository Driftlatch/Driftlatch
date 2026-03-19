"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const WHAT_YOU_GET = [
  "State-matched tools — picked for how you feel right now",
  "Pressure Profile — 2-minute setup, used every session",
  "6 tool packs across emotional states and home situations",
  "Partner, kids, long-distance, and solo situation support",
  "Weekly pattern read — spots what's building before it costs you",
  "Pinned moments — save the tools that actually work for you",
  "Clear-light mode — tools for when you're good, not just struggling",
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"annual" | "monthly">("annual");

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0B0B0E",
      padding: "52px 20px 120px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Atmosphere ── */}
      <motion.div
        animate={{ opacity: [0.16, 0.26, 0.16], scale: [1, 1.07, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed", top: "-8%", left: "50%", transform: "translateX(-50%)",
          width: 900, height: 900, borderRadius: 999, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(circle, rgba(194,122,92,0.20) 0%, transparent 65%)",
          filter: "blur(90px)",
        }}
      />
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "160px", mixBlendMode: "overlay",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "min(680px, 100%)", margin: "0 auto" }}>

        {/* ── EYEBROW ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "7px 16px", borderRadius: 999, marginBottom: 28,
            border: "1px solid rgba(194,122,92,0.22)",
            background: "rgba(194,122,92,0.07)",
          }}>
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 5, height: 5, borderRadius: 999, display: "inline-block",
                background: "rgba(194,122,92,0.9)",
                boxShadow: "0 0 8px rgba(194,122,92,0.7)",
              }}
            />
            <span style={{ color: "rgba(194,122,92,0.88)", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>
              FOUNDING ACCESS
            </span>
          </div>

          <h1 style={{
            margin: "0 0 18px",
            fontSize: "clamp(3.2rem, 9vw, 6rem)",
            lineHeight: 0.92,
            letterSpacing: "-0.058em",
            color: "rgba(244,244,245,0.93)",
            fontWeight: 700,
            fontFamily: "Zodiak, Georgia, serif",
          }}>
            One system.<br />No compromise.
          </h1>

          <p style={{
            margin: "0 auto",
            maxWidth: 460,
            color: "rgba(161,161,170,0.65)",
            fontSize: 17,
            lineHeight: 1.72,
          }}>
            Tools matched to your state. Simple enough to use when your day is already full. Built for the gap between who you are at work and who you want to be at home.
          </p>
        </motion.div>

        {/* ── BILLING TOGGLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, ease: EASE }}
          style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}
        >
          <div style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: 4, gap: 4,
          }}>
            {(["annual", "monthly"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setBilling(opt)}
                style={{
                  position: "relative", padding: "10px 22px", borderRadius: 10,
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800,
                  letterSpacing: "-0.01em", transition: "color 0.22s ease",
                  background: "transparent",
                  color: billing === opt ? "rgba(244,244,245,0.92)" : "rgba(161,161,170,0.45)",
                  zIndex: 1,
                }}
              >
                {billing === opt && (
                  <motion.div
                    layoutId="billing-pill"
                    style={{
                      position: "absolute", inset: 0, borderRadius: 10, zIndex: -1,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                )}
                {opt === "annual" ? "Annual" : "Monthly"}
                {opt === "annual" && (
                  <span style={{
                    marginLeft: 7, padding: "2px 7px", borderRadius: 999,
                    background: "rgba(194,122,92,0.15)",
                    border: "1px solid rgba(194,122,92,0.25)",
                    color: "rgba(194,122,92,0.9)", fontSize: 10, fontWeight: 900,
                    letterSpacing: "0.05em",
                  }}>
                    SAVE 51%
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── BOTH PLANS CLARITY ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22, ease: EASE }}
          style={{
            margin: "0 0 24px", textAlign: "center",
            color: "rgba(161,161,170,0.40)", fontSize: 13, lineHeight: 1.6,
          }}
        >
          Both plans include full access. Annual just costs less.
        </motion.p>

        {/* ── PRICE CARD ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={billing}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{ marginBottom: 16 }}
          >
            <div style={{
              position: "relative",
              borderRadius: 24,
              background: "linear-gradient(160deg, rgba(30,28,26,0.96) 0%, rgba(20,18,16,0.98) 100%)",
              border: "1px solid rgba(194,122,92,0.20)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 80px rgba(0,0,0,0.55), 0 0 60px rgba(194,122,92,0.07)",
              overflow: "hidden",
            }}>
              {/* Top rim light */}
              <div style={{
                position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
                background: "linear-gradient(90deg, transparent, rgba(194,122,92,0.5), transparent)",
                pointerEvents: "none",
              }} />

              {/* Inner glow */}
              <div style={{
                position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
                width: 400, height: 200, borderRadius: 999, pointerEvents: "none",
                background: "radial-gradient(ellipse at 50% 0%, rgba(194,122,92,0.12) 0%, transparent 70%)",
                filter: "blur(20px)",
              }} />

              <div style={{ padding: "36px 36px 32px", position: "relative", zIndex: 1 }}>

                {/* Plan name + badge row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 10 }}>
                  <span style={{
                    color: "rgba(161,161,170,0.5)", fontSize: 11,
                    fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
                  }}>
                    {billing === "annual" ? "Annual plan" : "Monthly plan"}
                  </span>
                  <span style={{
                    padding: "5px 12px", borderRadius: 999,
                    background: billing === "annual" ? "rgba(194,122,92,0.13)" : "rgba(255,255,255,0.05)",
                    border: billing === "annual" ? "1px solid rgba(194,122,92,0.26)" : "1px solid rgba(255,255,255,0.08)",
                    color: billing === "annual" ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.6)",
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  }}>
                    {billing === "annual" ? "BEST VALUE" : "FLEXIBLE"}
                  </span>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{
                    fontSize: "clamp(4rem, 12vw, 6.5rem)",
                    lineHeight: 0.9,
                    fontWeight: 750,
                    letterSpacing: "-0.06em",
                    color: "rgba(244,244,245,0.94)",
                    fontFamily: "Zodiak, Georgia, serif",
                  }}>
                    {billing === "annual" ? "$59" : "$9.99"}
                  </span>
                  <div>
                    <div style={{ color: "rgba(161,161,170,0.5)", fontSize: 14, fontWeight: 600 }}>
                      {billing === "annual" ? "/ year" : "/ month"}
                    </div>
                    {billing === "annual" && (
                      <div style={{ color: "rgba(161,161,170,0.35)", fontSize: 12, marginTop: 2 }}>
                        ~$4.92 / month
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-message */}
                <p style={{
                  margin: "0 0 32px",
                  color: "rgba(161,161,170,0.6)",
                  fontSize: 15, lineHeight: 1.65,
                }}>
                  {billing === "annual"
                    ? "Best if you already know you want this in your week, not just on your wishlist. One payment, full year."
                    : "Same system. Pay month to month. Switch to annual whenever you're ready."
                  }
                </p>

                {/* What you get */}
                <div style={{ marginBottom: 32 }}>
                  <p style={{
                    margin: "0 0 4px",
                    color: "rgba(161,161,170,0.38)",
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
                  }}>
                    Everything included
                  </p>
                  <p style={{ margin: "0 0 14px", color: "rgba(161,161,170,0.42)", fontSize: 12, lineHeight: 1.55 }}>
                    Not built for endless browsing. One right tool at the right moment.
                  </p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {WHAT_YOU_GET.map((item, i) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.22 + i * 0.05, ease: EASE }}
                        style={{ display: "flex", alignItems: "flex-start", gap: 11 }}
                      >
                        <div style={{
                          width: 5, height: 5, borderRadius: 999, flexShrink: 0, marginTop: 7,
                          background: "linear-gradient(135deg, rgba(194,122,92,0.9), rgba(194,122,92,0.5))",
                          boxShadow: "0 0 6px rgba(194,122,92,0.35)",
                        }} />
                        <span style={{ color: "rgba(161,161,170,0.78)", fontSize: 14, lineHeight: 1.6 }}>
                          {item}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* What happens next */}
                <p style={{
                  margin: "0 0 12px", textAlign: "center",
                  color: "rgba(161,161,170,0.38)", fontSize: 12, lineHeight: 1.6,
                  letterSpacing: "0.005em",
                }}>
                  Next: secure checkout → access active → open Driftlatch
                </p>

                {/* CTA */}
                <a
                  href={billing === "annual" ? "/buy?plan=annual" : "/buy?plan=monthly"}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "100%", minHeight: 60, borderRadius: 18,
                    textDecoration: "none", fontSize: 16, fontWeight: 900,
                    letterSpacing: "-0.015em",
                    border: "1px solid rgba(194,122,92,0.30)",
                    background: "linear-gradient(170deg, rgba(206,132,98,0.98) 0%, rgba(162,96,62,0.98) 100%)",
                    color: "#fff",
                    boxShadow: "0 20px 48px rgba(194,122,92,0.32), inset 0 1px 0 rgba(255,255,255,0.16)",
                    position: "relative", overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
                    pointerEvents: "none",
                  }} />
                  {billing === "annual" ? "Start annual access →" : "Start monthly access →"}
                </a>

                {/* Billing clarity */}
                <div style={{ marginTop: 14, textAlign: "center", display: "grid", gap: 3 }}>
                  <p style={{ margin: 0, color: "rgba(161,161,170,0.35)", fontSize: 12 }}>
                    Secure checkout via Paddle. Access starts right away.
                  </p>
                  <p style={{ margin: 0, color: "rgba(161,161,170,0.35)", fontSize: 12 }}>
                    14-day full refund, no questions asked. Cancel anytime from your account.
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── TRUST STRIP ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, ease: EASE }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 8, marginBottom: 40,
          }}
        >
          {[
            { label: "Privacy-first", sub: "Nothing read. Nothing tracked." },
            { label: "14-day refund", sub: "Full. No explanation." },
            { label: "Cancel anytime", sub: "No lock-in. No friction." },
            { label: "Real support", sub: "support@driftlatch.com" },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "14px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
              textAlign: "center",
            }}>
              <div style={{ color: "rgba(244,244,245,0.78)", fontSize: 12, fontWeight: 800, marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{ color: "rgba(161,161,170,0.45)", fontSize: 11, lineHeight: 1.5 }}>
                {item.sub}
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── HONEST NOTE ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, ease: EASE }}
          style={{
            padding: "28px 30px",
            borderRadius: 20,
            background: "rgba(18,17,15,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 20,
          }}
        >
          <p style={{
            margin: "0 0 10px",
            color: "rgba(161,161,170,0.38)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.16em", textTransform: "uppercase",
          }}>
            Honest note
          </p>
          <p style={{
            margin: "0 0 10px",
            color: "rgba(244,244,245,0.78)", fontSize: 16, fontWeight: 700, lineHeight: 1.4,
            letterSpacing: "-0.02em",
          }}>
            Driftlatch has no free tier. That's intentional.
          </p>
          <p style={{ margin: "0 0 10px", color: "rgba(161,161,170,0.6)", fontSize: 14, lineHeight: 1.72 }}>
            A tool you pay for is a tool you actually use. We'd rather you try it for 14 days and get a refund than scroll through a free version and get nothing from it.
          </p>
          <p style={{ margin: 0, color: "rgba(161,161,170,0.45)", fontSize: 14, lineHeight: 1.72 }}>
            Driftlatch is for founders and high-drive people who want less pressure carryover — not more self-improvement homework.
          </p>
        </motion.div>

        {/* ── FOOTER LINKS ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.58 }}
          style={{ margin: 0, textAlign: "center", color: "rgba(161,161,170,0.3)", fontSize: 12 }}
        >
          <a href="/terms" style={{ color: "inherit" }}>Terms</a>
          {" · "}
          <a href="/privacy" style={{ color: "inherit" }}>Privacy</a>
          {" · "}
          <a href="/refunds" style={{ color: "inherit" }}>Refunds</a>
          {" · "}
          <a href="mailto:support@driftlatch.com" style={{ color: "inherit" }}>support@driftlatch.com</a>
        </motion.p>

      </div>
    </main>
  );
}