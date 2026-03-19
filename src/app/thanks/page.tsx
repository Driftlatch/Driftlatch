"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getPostAuthRedirectPath,
  hasAppAccess,
  hasCompletedSetup,
  loadAuthState,
  loadUserEntitlement,
} from "@/lib/auth";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const POLL_INTERVAL_MS = 3000;

type ThanksState = "loading" | "logged-out" | "processing" | "error";

type StatusCard = {
  badge: string;
  heading: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const PHONE_STEPS = {
  iphone: [
    "Open driftlatch.com in Safari",
    "Tap the Share button at the bottom of the screen",
    'Scroll down and tap "Add to Home Screen"',
    'Tap "Add" in the top right corner',
    "Done - Driftlatch is now on your home screen",
  ],
  android: [
    "Open driftlatch.com in Chrome",
    "Tap the three dots in the top right corner",
    'Tap "Install app" or "Add to Home screen"',
    'Tap "Install" or "Add"',
    "Done - Driftlatch is now on your home screen",
  ],
};

export default function ThanksPage() {
  const router = useRouter();
  const [state, setState] = useState<ThanksState>("loading");
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const [phoneTab, setPhoneTab] = useState<"iphone" | "android">("iphone");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;

    const resolveState = async () => {
      try {
        setChecking(true);
        const { session, profile } = await loadAuthState();
        if (!active) return;

        if (!session) {
          setState("logged-out");
          setStatusLabel(null);
          setChecking(false);
          return;
        }

        const entitlement = await loadUserEntitlement(session.user.id);
        if (!active) return;

        if (hasAppAccess(entitlement?.status)) {
          router.replace(
            hasCompletedSetup(profile) ? getPostAuthRedirectPath() : "/app/setup",
          );
          return;
        }

        setStatusLabel(entitlement?.status ?? "waiting");
        setState("processing");
        setChecking(false);
      } catch (error) {
        console.error("Failed to resolve thanks state:", error);
        if (!active) return;
        setState("error");
        setErrorCopy("We could not confirm your access right now. Give it a moment, then check again.");
        setChecking(false);
      }
    };

    void resolveState();
    const interval = window.setInterval(() => {
      void resolveState();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [router]);

  const card = useMemo<StatusCard>(() => {
    if (state === "logged-out") {
      return {
        badge: "ONE MORE STEP",
        body: "Your payment needs to attach to a Driftlatch account before access can turn on. Log in with the email you used for checkout.",
        ctaHref: "/login?next=/thanks",
        ctaLabel: "Log in to continue",
        heading: "Log in to unlock access.",
        secondaryHref: "/pricing",
        secondaryLabel: "Back to pricing",
      };
    }

    if (state === "error") {
      return {
        badge: "CHECKING AGAIN",
        body: errorCopy ?? "We are still waiting for confirmation from checkout.",
        ctaLabel: "Check again",
        heading: "We are still confirming access.",
        secondaryHref: "mailto:support@driftlatch.com",
        secondaryLabel: "Email support",
      };
    }

    return {
      badge: state === "loading" ? "CHECKING ACCESS" : "CONFIRMING ACCESS",
      body:
        state === "loading"
          ? "We are checking your session and looking for the latest entitlement update."
          : "Payment went through. We are waiting for Paddle and Supabase to finish syncing your access.",
      ctaLabel: checking ? "Checking..." : "Check again",
      heading: state === "loading" ? "Just a second." : "We are turning access on.",
      secondaryHref: state === "processing" ? "/buy" : "/",
      secondaryLabel: state === "processing" ? "Back to billing" : "Back to site",
    };
  }, [checking, errorCopy, state]);

  const statusTone =
    state === "logged-out"
      ? "rgba(194,122,92,0.92)"
      : state === "error"
        ? "rgba(224,168,140,0.92)"
        : "rgba(194,122,92,0.92)";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "40px 20px 100px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        animate={{ opacity: [0.14, 0.24, 0.14], scale: [1, 1.06, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed",
          top: "-5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          borderRadius: 999,
          pointerEvents: "none",
          zIndex: 0,
          background: "radial-gradient(circle, rgba(194,122,92,0.22) 0%, transparent 68%)",
          filter: "blur(80px)",
        }}
      />
      <motion.div
        animate={{ opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{
          position: "fixed",
          bottom: "-10%",
          right: "-5%",
          width: 500,
          height: 500,
          borderRadius: 999,
          pointerEvents: "none",
          zIndex: 0,
          background: "radial-gradient(circle, rgba(120,190,150,0.18) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(720px, 100%)",
          margin: "0 auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ textAlign: "center", marginBottom: 42 }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: 999,
              marginBottom: 24,
              border: "1px solid rgba(194,122,92,0.28)",
              background: "rgba(194,122,92,0.09)",
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                display: "inline-block",
                background: statusTone,
                boxShadow: "0 0 10px rgba(194,122,92,0.7)",
              }}
            />
            <span
              style={{
                color: statusTone,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              {card.badge}
            </span>
          </motion.div>

          <h1
            style={{
              margin: "0 0 14px",
              fontSize: "clamp(3rem, 9vw, 5.6rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.055em",
              color: "rgba(244,244,245,0.92)",
              fontWeight: 700,
              fontFamily: "Zodiak, Georgia, serif",
            }}
          >
            {card.heading}
          </h1>

          <p
            style={{
              margin: "0 auto",
              maxWidth: 520,
              color: "rgba(161,161,170,0.72)",
              fontSize: 17,
              lineHeight: 1.75,
            }}
          >
            {card.body}
          </p>

          {statusLabel ? (
            <p
              style={{
                margin: "14px auto 0",
                color: "rgba(161,161,170,0.5)",
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Current access state: {statusLabel}
            </p>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, ease: EASE }}
            style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}
          >
            {card.ctaHref ? (
              <Link
                href={card.ctaHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 58,
                  padding: "0 32px",
                  borderRadius: 18,
                  textDecoration: "none",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  border: "1px solid rgba(194,122,92,0.28)",
                  background: "linear-gradient(170deg, rgba(200,128,96,0.97), rgba(162,96,62,0.97))",
                  color: "#fff",
                  boxShadow: "0 16px 42px rgba(194,122,92,0.28), inset 0 1px 0 rgba(255,255,255,0.14)",
                }}
              >
                {card.ctaLabel}
              </Link>
            ) : (
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 58,
                  padding: "0 32px",
                  borderRadius: 18,
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  border: "1px solid rgba(194,122,92,0.28)",
                  background: "linear-gradient(170deg, rgba(200,128,96,0.97), rgba(162,96,62,0.97))",
                  color: "#fff",
                  boxShadow: "0 16px 42px rgba(194,122,92,0.28), inset 0 1px 0 rgba(255,255,255,0.14)",
                  cursor: "pointer",
                }}
                disabled={checking}
              >
                {card.ctaLabel}
              </button>
            )}

            {card.secondaryHref
              ? card.secondaryHref.startsWith("mailto:")
                ? (
                    <a
                      href={card.secondaryHref}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 58,
                        padding: "0 26px",
                        borderRadius: 18,
                        textDecoration: "none",
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(244,244,245,0.82)",
                      }}
                    >
                      {card.secondaryLabel}
                    </a>
                  )
                : (
                    <Link
                      href={card.secondaryHref}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 58,
                        padding: "0 26px",
                        borderRadius: 18,
                        textDecoration: "none",
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(244,244,245,0.82)",
                      }}
                    >
                      {card.secondaryLabel}
                    </Link>
                  )
              : null}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: EASE }}
          style={{ marginBottom: 16 }}
        >
          <p
            style={{
              margin: "0 0 14px",
              color: "rgba(161,161,170,0.4)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            What happens next
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {[
              {
                body: "Paddle confirms the payment and sends the latest subscription event.",
                num: "1",
                title: "Payment is verified",
              },
              {
                body: "Driftlatch updates your entitlement in Supabase as soon as the webhook lands.",
                num: "2",
                title: "Access syncs",
              },
              {
                body: "Once the status is active, this page sends you straight into the app.",
                num: "3",
                title: "You go straight in",
              },
            ].map((step, index, steps) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + index * 0.08, ease: EASE }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "20px 22px",
                  borderRadius:
                    index === 0
                      ? "18px 18px 6px 6px"
                      : index === steps.length - 1
                        ? "6px 6px 18px 18px"
                        : 6,
                  background: "rgba(24,24,28,0.75)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: "rgba(194,122,92,0.11)",
                    border: "1px solid rgba(194,122,92,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(194,122,92,0.9)",
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  {step.num}
                </div>
                <div>
                  <div
                    style={{
                      color: "rgba(244,244,245,0.88)",
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {step.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(161,161,170,0.68)",
                      fontSize: 14,
                      lineHeight: 1.65,
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, ease: EASE }}
          style={{
            marginBottom: 16,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(24,24,28,0.75)",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "22px 22px 0" }}>
            <p
              style={{
                margin: "0 0 4px",
                color: "rgba(161,161,170,0.4)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Optional, but useful
            </p>
            <h2
              style={{
                margin: "0 0 6px",
                color: "rgba(244,244,245,0.88)",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.025em",
              }}
            >
              Put it on your phone
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                color: "rgba(161,161,170,0.6)",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Add Driftlatch to your home screen so it stays one tap away once access is live.
            </p>

            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {(["iphone", "android"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPhoneTab(tab)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "none",
                    letterSpacing: "-0.01em",
                    background: phoneTab === tab ? "rgba(194,122,92,0.14)" : "rgba(255,255,255,0.04)",
                    color: phoneTab === tab ? "rgba(194,122,92,0.92)" : "rgba(161,161,170,0.55)",
                    outline: phoneTab === tab ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {tab === "iphone" ? "iPhone / iPad" : "Android"}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={phoneTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ padding: "0 22px 22px" }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {PHONE_STEPS[phoneTab].map((step, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "13px 16px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        flexShrink: 0,
                        background: "rgba(194,122,92,0.12)",
                        border: "1px solid rgba(194,122,92,0.20)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(194,122,92,0.85)",
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {index + 1}
                    </span>
                    <p
                      style={{
                        margin: 0,
                        color: "rgba(161,161,170,0.78)",
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              <p
                style={{
                  margin: "16px 0 0",
                  color: "rgba(161,161,170,0.38)",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {phoneTab === "iphone"
                  ? "This works in Safari on iPhone and iPad."
                  : "This usually works best in Chrome on Android."}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48, ease: EASE }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Privacy-first", sub: "No message reading. No activity tracking." },
            { label: "14-day refund", sub: "If it is not useful, email us." },
            { label: "Webhook-backed", sub: "Access turns on from real billing events." },
            { label: "Support", sub: "support@driftlatch.com" },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.055)",
              }}
            >
              <div
                style={{
                  color: "rgba(244,244,245,0.80)",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: "rgba(161,161,170,0.55)",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {item.sub}
              </div>
            </div>
          ))}
        </motion.div>

        <p style={{ margin: 0, color: "rgba(161,161,170,0.3)", fontSize: 12 }}>
          <Link href="/terms" style={{ color: "inherit" }}>
            Terms
          </Link>
          {" - "}
          <Link href="/privacy" style={{ color: "inherit" }}>
            Privacy
          </Link>
          {" - "}
          <a href="mailto:support@driftlatch.com" style={{ color: "inherit" }}>
            support@driftlatch.com
          </a>
        </p>
      </div>
    </main>
  );
}
