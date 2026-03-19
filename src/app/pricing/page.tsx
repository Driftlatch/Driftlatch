"use client";

import { motion } from "framer-motion";

const plans = [
  {
    name: "Annual",
    price: "$59",
    cadence: "/ year",
    href: "/buy?plan=annual",
    badge: "Best value",
    sub: "Full access. Best for building consistency under pressure.",
    cta: "Start annual",
    featured: true,
  },
  {
    name: "Monthly",
    price: "$9.99",
    cadence: "/ month",
    href: "/buy?plan=monthly",
    badge: "Flexible",
    sub: "Same system, billed monthly. Switch to annual anytime.",
    cta: "Start monthly",
    featured: false,
  },
];

const trustPoints = [
  "14-day refund guarantee",
  "No message reading",
  "No activity tracking",
  "Privacy-first by design",
];

export default function PricingPage() {
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

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(1080px, 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            background: "rgba(39,39,42,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: "40px 28px 32px",
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
            Founding Access
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
            Pricing
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
            No free tier. Driftlatch is built to be a system you keep.
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
            Choose annual or monthly. Same core system. Same privacy-first standard.
            Pick the version that fits how you want to build consistency under pressure.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
              marginBottom: 22,
            }}
          >
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 + i * 0.08, duration: 0.35 }}
                style={{
                  position: "relative",
                  background: plan.featured
                    ? "linear-gradient(180deg, rgba(194,122,92,0.12) 0%, rgba(255,255,255,0.03) 100%)"
                    : "rgba(255,255,255,0.03)",
                  border: plan.featured
                    ? "1px solid rgba(194,122,92,0.26)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 22,
                  padding: "22px 20px 20px",
                  boxShadow: plan.featured
                    ? "0 18px 40px rgba(194,122,92,0.12)"
                    : "none",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: plan.featured
                      ? "rgba(194,122,92,0.14)"
                      : "rgba(255,255,255,0.05)",
                    border: plan.featured
                      ? "1px solid rgba(194,122,92,0.24)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: plan.featured ? "var(--accent)" : "var(--muted)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  {plan.badge}
                </div>

                <h2
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: 26,
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                    color: "var(--text)",
                    fontWeight: 700,
                  }}
                >
                  {plan.name}
                </h2>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 42,
                      lineHeight: 1,
                      fontWeight: 750,
                      letterSpacing: "-0.05em",
                      color: "var(--text)",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    {plan.cadence}
                  </span>
                </div>

                <p
                  style={{
                    margin: "0 0 20px 0",
                    color: "var(--muted)",
                    fontSize: 15,
                    lineHeight: 1.7,
                    minHeight: 52,
                  }}
                >
                  {plan.sub}
                </p>

                <a
                  href={plan.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    minHeight: 54,
                    borderRadius: 18,
                    textDecoration: "none",
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    border: plan.featured
                      ? "1px solid rgba(194,122,92,0.28)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: plan.featured
                      ? "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: plan.featured ? "#fff" : "var(--text)",
                    boxShadow: plan.featured
                      ? "0 14px 36px rgba(194,122,92,0.22), inset 0 1px 0 rgba(255,255,255,0.12)"
                      : "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  {plan.cta}
                </a>
              </motion.div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 18,
            }}
          >
            {trustPoints.map((item) => (
              <div
                key={item}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "var(--muted)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {item}
              </div>
            ))}
          </div>

          <p
            style={{
              margin: 0,
              color: "var(--muted)",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            14-day refund guarantee. If it does not feel useful, we will refund you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
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