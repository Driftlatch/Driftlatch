"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
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

type ThanksState = "loading" | "logged-out" | "processing" | "ready" | "error";
type StepStatus = "waiting" | "active" | "done";

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

const FLOW_STEPS = [
  { title: "Payment verified", desc: "Paddle confirmed your payment." },
  { title: "Access syncing", desc: "Your account is being unlocked." },
  { title: "You are in", desc: "Driftlatch is ready for you." },
];

export default function ThanksPage() {
  const router = useRouter();
  const [state, setState] = useState<ThanksState>("loading");
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const [phoneTab, setPhoneTab] = useState<"iphone" | "android">("iphone");
  const [checking, setChecking] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
          setState("ready");
          setTimeout(() => {
            if (active) {
              router.replace(
                hasCompletedSetup(profile, session) ? getPostAuthRedirectPath() : "/app/setup",
              );
            }
          }, 1200);
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

    if (state === "ready") {
      return {
        badge: "ACCESS CONFIRMED",
        body: "Taking you in now.",
        heading: "You are in.",
        secondaryHref: getPostAuthRedirectPath(),
        secondaryLabel: "Go to app",
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

  const activeStepIndex =
    state === "loading" ? 0 :
    state === "ready" ? 2 :
    1;

  function getStepStatus(stepIndex: number): StepStatus {
    if (stepIndex < activeStepIndex) return "done";
    if (stepIndex === activeStepIndex) return "active";
    return "waiting";
  }

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
      {/* Background glows */}
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
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ textAlign: "center", marginBottom: 32 }}
        >
          <Image
            src="/icon.png"
            alt="Driftlatch"
            width={60}
            height={60}
            priority
            style={{ borderRadius: 16, display: "block", margin: "0 auto" }}
          />
        </motion.div>

        {/* STATUS CARD */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{
            background: "rgba(18,18,22,0.9)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 24,
            padding: "40px 32px",
            position: "relative",
            overflow: "hidden",
            maxWidth: 520,
            margin: "0 auto 48px",
            textAlign: "center",
          }}
        >
          {/* Top rim light */}
          <div aria-hidden style={{
            position: "absolute", top: 0, left: 16, right: 16, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
            pointerEvents: "none",
          }} />
          {/* Ambient warm glow */}
          <div aria-hidden style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
            height: 200,
            background: "radial-gradient(ellipse, rgba(194,122,92,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          {/* Badge */}
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
              position: "relative",
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
            <span style={{ color: statusTone, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>
              {card.badge}
            </span>
          </motion.div>

          {/* Success state */}
          <AnimatePresence>
            {state === "ready" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
                style={{ marginBottom: 20 }}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(120,190,150,0.12)",
                  border: "1px solid rgba(120,190,150,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <svg viewBox="0 0 48 48" width={32} height={32} fill="none">
                    <path
                      d="M 10,24 L 20,34 L 38,16"
                      stroke="rgba(120,190,150,0.9)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <p style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(244,244,245,0.92)",
                  textAlign: "center",
                  margin: "0 0 8px",
                }}>
                  Access confirmed.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <h1 style={{
            margin: "0 0 14px",
            fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.04em",
            color: "rgba(244,244,245,0.95)",
            fontWeight: 700,
            fontFamily: "var(--font-serif)",
          }}>
            {card.heading}
          </h1>

          <p style={{
            margin: "0 auto",
            maxWidth: 400,
            color: "rgba(161,161,170,0.72)",
            fontSize: 17,
            lineHeight: 1.75,
          }}>
            {card.body}
          </p>

          {statusLabel ? (
            <p style={{
              margin: "14px auto 0",
              color: "rgba(161,161,170,0.5)",
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
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
            ) : state !== "ready" ? (
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
            ) : null}

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

        {/* ANIMATED FLOW STEPS */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: EASE }}
          style={{ marginBottom: 32 }}
        >
          <p style={{
            margin: "0 0 28px",
            color: "rgba(161,161,170,0.4)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textAlign: "center",
          }}>
            What happens next
          </p>

          <div style={{
            display: "flex",
            flexDirection: isDesktop ? "row" : "column",
            alignItems: isDesktop ? "flex-start" : "center",
            justifyContent: isDesktop ? "center" : undefined,
          }}>
            {FLOW_STEPS.map((step, index) => {
              const status = getStepStatus(index);
              const isLast = index === FLOW_STEPS.length - 1;
              const isDone = status === "done";
              const isActive = status === "active";

              return (
                <React.Fragment key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15, ease: EASE }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flexShrink: 0,
                      width: isDesktop ? 160 : "100%",
                      maxWidth: isDesktop ? 160 : 320,
                    }}
                  >
                    {/* Circle */}
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "background 0.4s ease, border-color 0.4s ease",
                      ...(isDone
                        ? {
                            background: "rgba(120,190,150,0.15)",
                            border: "1px solid rgba(120,190,150,0.4)",
                          }
                        : isActive
                          ? {
                              background: "rgba(194,122,92,0.15)",
                              border: "1px solid rgba(194,122,92,0.4)",
                              animation: "dlStepPulse 1.5s ease-out infinite",
                            }
                          : {
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }),
                    }}>
                      {isDone ? (
                        <svg viewBox="0 0 48 48" width={24} height={24} fill="none">
                          <path
                            d="M 14,24 L 20,30 L 34,18"
                            stroke="rgba(120,190,150,0.9)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            fill="none"
                          />
                        </svg>
                      ) : (
                        <span style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: isActive ? "rgba(194,122,92,0.9)" : "rgba(255,255,255,0.2)",
                        }}>
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <div style={{ textAlign: "center", marginTop: 12, paddingBottom: isDesktop ? 0 : 4 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 4,
                        transition: "color 0.4s ease",
                        color: status === "waiting" ? "rgba(255,255,255,0.25)" : "rgba(244,244,245,0.88)",
                      }}>
                        {step.title}
                      </div>
                      <div style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        transition: "color 0.4s ease",
                        color: status === "waiting" ? "rgba(161,161,170,0.3)" : "rgba(161,161,170,0.6)",
                      }}>
                        {step.desc}
                      </div>
                    </div>
                  </motion.div>

                  {/* Connector */}
                  {!isLast && (
                    <div style={{
                      position: "relative",
                      flexShrink: 0,
                      overflow: "hidden",
                      borderRadius: 1,
                      background: "rgba(255,255,255,0.06)",
                      ...(isDesktop
                        ? { flex: 1, height: 2, marginTop: 23 }
                        : { width: 2, height: 40 }),
                    }}>
                      <motion.div
                        animate={isDesktop
                          ? { width: isDone ? "100%" : "0%" }
                          : { height: isDone ? "100%" : "0%" }
                        }
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          background: "rgba(120,190,150,0.4)",
                          ...(isDesktop ? { height: "100%", width: "0%" } : { width: "100%", height: "0%" }),
                        }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        {/* PWA SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, ease: EASE }}
          style={{
            marginBottom: 16,
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(18,18,22,0.9)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Top rim light */}
          <div aria-hidden style={{
            position: "absolute", top: 0, left: 16, right: 16, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
            pointerEvents: "none",
          }} />

          <div style={{ padding: "28px 28px 0" }}>
            {/* Phone SVG */}
            <svg
              viewBox="0 0 40 64"
              width={28}
              height={44}
              fill="none"
              style={{ display: "block", margin: "0 0 16px" }}
            >
              <rect x={2} y={2} width={36} height={60} rx={6}
                stroke="rgba(194,122,92,0.5)" strokeWidth={2} />
              <rect x={14} y={8} width={12} height={3} rx={1.5}
                fill="rgba(194,122,92,0.3)" />
              <circle cx={20} cy={54} r={3}
                fill="rgba(194,122,92,0.4)" />
            </svg>

            <h2 style={{
              margin: "0 0 8px",
              color: "rgba(244,244,245,0.85)",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              fontFamily: "var(--font-serif)",
            }}>
              Add to your phone
            </h2>
            <p style={{
              margin: "0 0 20px",
              color: "rgba(161,161,170,0.6)",
              fontSize: 14,
              lineHeight: 1.7,
            }}>
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
              style={{ padding: "0 28px 28px" }}
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
                    <span style={{
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
                    }}>
                      {index + 1}
                    </span>
                    <p style={{
                      margin: 0,
                      color: "rgba(161,161,170,0.78)",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              <p style={{
                margin: "16px 0 0",
                color: "rgba(161,161,170,0.38)",
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {phoneTab === "iphone"
                  ? "This works in Safari on iPhone and iPad."
                  : "This usually works best in Chrome on Android."}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* TRUST BADGES */}
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
              <div style={{ color: "rgba(244,244,245,0.80)", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{ color: "rgba(161,161,170,0.55)", fontSize: 12, lineHeight: 1.5 }}>
                {item.sub}
              </div>
            </div>
          ))}
        </motion.div>

        <p style={{ margin: 0, color: "rgba(161,161,170,0.3)", fontSize: 12 }}>
          <Link href="/terms" style={{ color: "inherit" }}>Terms</Link>
          {" - "}
          <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
          {" - "}
          <a href="mailto:support@driftlatch.com" style={{ color: "inherit" }}>
            support@driftlatch.com
          </a>
        </p>
      </div>
    </main>
  );
}
