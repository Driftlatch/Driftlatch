"use client";

import Link from "next/link";
import Script from "next/script";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { hasAppAccess, loadUserEntitlement } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

declare global {
  interface Window {
    Paddle?: {
      Checkout: {
        open: (options: {
          customer?: { email?: string };
          customData?: Record<string, unknown>;
          items: Array<{ priceId: string; quantity: number }>;
          settings?: {
            allowLogout?: boolean;
            displayMode?: "overlay";
            successUrl?: string;
            theme?: "dark";
          };
        }) => void;
      };
      Environment?: {
        set: (environment: "sandbox") => void;
      };
      Initialize: (options: {
        eventCallback?: (event: { name?: string }) => void;
        token: string;
      }) => void;
    };
  }
}

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
const PADDLE_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID ?? "";
const PADDLE_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID ?? "";
const PADDLE_ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "";

const trustLines = [
  "14-day refund guarantee - no questions asked.",
  "No message reading. No activity tracking.",
  "Privacy-first. Your data stays yours.",
  "Checkout runs securely through Paddle.",
];

type CheckoutState = "checking" | "needs-login" | "ready" | "opening" | "error";

let paddleInitialized = false;

function BuyInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = sp.get("plan");
  const isMonthly = plan === "monthly";
  const resolvedPlan = isMonthly ? "monthly" : "annual";
  const priceId = useMemo(
    () => (isMonthly ? PADDLE_MONTHLY_PRICE_ID : PADDLE_ANNUAL_PRICE_ID),
    [isMonthly],
  );
  const loginHref = `/login?next=${encodeURIComponent(`/buy?plan=${resolvedPlan}`)}`;

  const [trustIndex, setTrustIndex] = useState(0);
  const [progress, setProgress] = useState(12);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("checking");
  const [scriptReady, setScriptReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [statusCopy, setStatusCopy] = useState("Checking your access.");
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    const trustTimer = setInterval(() => {
      setTrustIndex((index) => (index + 1) % trustLines.length);
    }, 1200);

    return () => clearInterval(trustTimer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const supabase = getSupabase();
        const { data: authData, error } = await supabase.auth.getUser();
        if (cancelled) return;

        if (error) {
          throw error;
        }

        if (!authData.user) {
          setCheckoutState("needs-login");
          setStatusCopy("Log in first so your purchase lands on the right Driftlatch account.");
          setProgress(24);
          return;
        }

        setUserId(authData.user.id);
        setUserEmail(authData.user.email?.trim().toLowerCase() ?? "");

        const entitlement = await loadUserEntitlement(authData.user.id);
        if (cancelled) return;

        if (hasAppAccess(entitlement?.status)) {
          router.replace("/app");
          return;
        }

        if (!PADDLE_CLIENT_TOKEN || !priceId) {
          setCheckoutState("error");
          setErrorCopy("Checkout is not configured yet. Add the Paddle client token and price IDs, then try again.");
          setProgress(20);
          return;
        }

        setCheckoutState("ready");
        setStatusCopy("Opening secure checkout.");
        setProgress(scriptReady ? 68 : 42);
      } catch (error) {
        console.error("Failed to prepare checkout:", error);
        if (cancelled) return;
        setCheckoutState("error");
        setErrorCopy("We could not prepare checkout right now. Refresh and try again.");
        setProgress(16);
      }
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [priceId, router, scriptReady]);

  useEffect(() => {
    if (checkoutState !== "opening") return;

    const progressTimer = setInterval(() => {
      setProgress((value) => Math.min(value + 3, 96));
    }, 120);

    return () => clearInterval(progressTimer);
  }, [checkoutState]);

  function handlePaddleEvent(event: { name?: string }) {
    switch (event.name) {
      case "checkout.loaded":
        setProgress(78);
        break;
      case "checkout.closed":
        setCheckoutState("ready");
        setStatusCopy("Checkout closed. Reopen it whenever you're ready.");
        hasOpenedRef.current = true;
        break;
      case "checkout.completed":
        setCheckoutState("opening");
        setStatusCopy("Payment received. Confirming your access.");
        setProgress(96);
        router.replace("/thanks");
        break;
      default:
        break;
    }
  }

  function openCheckout() {
    if (!window.Paddle || !priceId || !userEmail || !userId) {
      setCheckoutState("error");
      setErrorCopy("Checkout is not ready yet. Refresh and try again.");
      return;
    }

    if (!paddleInitialized) {
      if (PADDLE_ENVIRONMENT === "sandbox") {
        window.Paddle.Environment?.set("sandbox");
      }

      window.Paddle.Initialize({
        eventCallback: handlePaddleEvent,
        token: PADDLE_CLIENT_TOKEN,
      });
      paddleInitialized = true;
    }

    setCheckoutState("opening");
    setStatusCopy("Opening secure checkout.");
    setProgress(72);

    window.Paddle.Checkout.open({
      customer: { email: userEmail },
      customData: {
        driftlatch_plan: resolvedPlan,
        driftlatch_user_email: userEmail,
        driftlatch_user_id: userId,
      },
      items: [{ priceId, quantity: 1 }],
      settings: {
        allowLogout: false,
        displayMode: "overlay",
        successUrl: `${window.location.origin}/thanks`,
        theme: "dark",
      },
    });
  }

  useEffect(() => {
    if (!scriptReady || checkoutState !== "ready" || hasOpenedRef.current || !userEmail || !userId) {
      return;
    }

    hasOpenedRef.current = true;
    openCheckout();
  }, [checkoutState, scriptReady, userEmail, userId]);

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptReady(true);
          setProgress((value) => Math.max(value, 56));
        }}
      />
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
              {isMonthly ? "Monthly plan - $9.99/mo" : "Annual plan - $59/year"}
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
              {checkoutState === "needs-login" ? "Log in to continue." : "Taking you to checkout."}
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
              {checkoutState === "needs-login"
                ? "We need your account first so Paddle can connect this purchase to the right Driftlatch access."
                : "You'll complete checkout securely via Paddle. We'll turn access on as soon as payment is confirmed."}
            </motion.p>

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

            <div style={{ minHeight: 24, overflow: "hidden", marginBottom: 28 }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${checkoutState}-${trustIndex}-${statusCopy}`}
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
                  {checkoutState === "opening" || checkoutState === "checking"
                    ? trustLines[trustIndex]
                    : statusCopy}
                </motion.p>
              </AnimatePresence>
            </div>

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
                { icon: "⚡", label: "Access sync", sub: "Turns on after confirmation." },
                { icon: "🛡️", label: "Secure payment", sub: "Powered by Paddle." },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.08 }}
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

            {errorCopy ? (
              <div
                style={{
                  marginBottom: 18,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(194,122,92,0.28)",
                  background: "rgba(194,122,92,0.09)",
                  color: "var(--text)",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {errorCopy}
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {checkoutState === "needs-login" ? (
                <Link
                  href={loginHref}
                  className="btn primary"
                  style={{ minWidth: 220, justifyContent: "center" }}
                >
                  Log in to continue
                </Link>
              ) : (
                <button
                  className="btn primary"
                  style={{ minWidth: 220, justifyContent: "center" }}
                  onClick={() => openCheckout()}
                  disabled={checkoutState === "checking" || checkoutState === "opening"}
                >
                  {checkoutState === "opening" ? "Opening checkout..." : "Continue to checkout"}
                </button>
              )}

              <Link href="/pricing" className="btn ghost">
                Back to pricing
              </Link>
            </div>

            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: "18px 0 0" }}>
              If checkout does not open, refresh this page and try again.
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
            DRIFTLATCH - Privacy-first - Built for founders
          </motion.p>
        </motion.div>
      </main>
    </>
  );
}

export default function BuyPage() {
  return (
    <Suspense>
      <BuyInner />
    </Suspense>
  );
}
