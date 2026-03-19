"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { hasAppAccess, loadUserEntitlement } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const PADDLE_ANNUAL_URL = "PADDLE_ANNUAL_URL";
const PADDLE_MONTHLY_URL = "PADDLE_MONTHLY_URL";

const trustLines = [
  "14-day refund guarantee — no questions asked.",
  "No message reading. No activity tracking.",
  "Privacy-first. Your data stays yours.",
  "Redirecting you securely via Paddle.",
];

// Inner component uses useSearchParams — must be inside Suspense
function BuyInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = sp.get("plan"); // "monthly" | "annual" | null

  const isMonthly = plan === "monthly";
  const url = useMemo(
    () => (isMonthly ? PADDLE_MONTHLY_URL : PADDLE_ANNUAL_URL),
    [isMonthly]
  );

  const [trustIndex, setTrustIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [canCheckout, setCanCheckout] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!authData.user) {
        setCanCheckout(true);
        return;
      }

      const entitlement = await loadUserEntitlement(authData.user.id);
      if (cancelled) return;

      if (hasAppAccess(entitlement?.status)) {
        router.replace("/app");
        return;
      }

      setCanCheckout(true);
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!canCheckout) return;

    const trustTimer = setInterval(() => {
      setTrustIndex((i) => (i + 1) % trustLines.length);
    }, 1200);

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 100));
    }, 18);

    const redirectTimer = setTimeout(() => {
      window.location.href = url;
    }, 1800);

    return () => {
      clearInterval(trustTimer);
      clearInterval(progressTimer);
      clearTimeout(redirectTimer);
    };
  }, [canCheckout, url]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Ambient glow */}
      <motion.div
        style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
      >
        <motion.div
          animate={{ opacity: [0.12, 0.2, 0.12], scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            borderRadius: "999px",
            background:
              "radial-gradient(circle, rgba(194,122,92,0.25) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560 }}
      >
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: "center", marginBottom: 32 }}
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
            Secure Checkout
          </div>
        </motion.div>

        {/* Main card */}
        <div
          style={{
            background: "rgba(39,39,42,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            padding: "40px 36px",
            backdropFilter: "blur(16px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
          }}
        >
          {/* Plan badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(194,122,92,0.12)",
              border: "1px solid rgba(194,122,92,0.25)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {isMonthly ? "Monthly Plan · $9.99/mo" : "Annual Plan · $59/year"}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              fontSize: 36,
              fontWeight: 700,
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em",
              color: "var(--text)",
              lineHeight: 1.15,
            }}
          >
            Taking you to checkout.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              fontSize: 16,
              color: "var(--muted)",
              margin: "0 0 32px 0",
              lineHeight: 1.6,
            }}
          >
            You'll complete checkout securely via Paddle. Then start your 2-minute
            Pressure Profile.
          </motion.p>

          {/* Progress bar */}
          <div
            style={{
              height: 3,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 32,
            }}
          >
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
              style={{
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--accent), rgba(194,122,92,0.6))",
                borderRadius: 999,
              }}
            />
          </div>

          {/* Cycling trust line */}
          <div style={{ height: 24, overflow: "hidden", marginBottom: 28 }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={trustIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: 14,
                  color: "var(--muted)",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {trustLines[trustIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Trust grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {[
              { icon: "🔒", label: "Privacy-first", sub: "No tracking. No reading." },
              { icon: "↩️", label: "14-day refund", sub: "No questions asked." },
              { icon: "⚡", label: "Instant access", sub: "Start right after checkout." },
              { icon: "🛡️", label: "Secure payment", sub: "Powered by Paddle." },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.sub}</div>
              </motion.div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0 }}>
            Not redirected?{" "}
            <a
              href={url}
              style={{
                color: "var(--accent)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Click here to continue
            </a>
          </p>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "rgba(161,161,170,0.5)",
            marginTop: 20,
            letterSpacing: "0.04em",
          }}
        >
          DRIFTLATCH · Privacy-first · Built for founders
        </motion.p>
      </motion.div>
    </main>
  );
}

// Outer page wraps inner in Suspense — required for useSearchParams at build time
export default function BuyPage() {
  return (
    <Suspense>
      <BuyInner />
    </Suspense>
  );
}