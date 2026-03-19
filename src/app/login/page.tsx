"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getPostAuthRedirectPath, loadAuthState, syncUserProfileIdentity } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

type Phase = "email" | "code";
type BusyAction = "send" | "verify" | "resend" | null;
type NoticeTone = "success" | "error" | "neutral";
type Notice = { tone: NoticeTone; text: string } | null;

const RESEND_COOLDOWN_SECONDS = 30;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const LEFT_LINES = [
  "Pressure doesn't stop at the front door.",
  "The work is never really done.",
  "But this moment doesn't have to carry it.",
];

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function formatCooldown(s: number) {
  return `0:${s.toString().padStart(2, "0")}`;
}
function mapOtpError(message: string) {
  const n = message.toLowerCase();
  if (n.includes("expired")) return "That code has expired. Request a new one.";
  if (n.includes("invalid") || n.includes("token")) return "Invalid or expired code. Try a fresh one.";
  if (n.includes("rate limit") || n.includes("security purposes")) return "Too many attempts. Wait a moment.";
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [focusedInput, setFocusedInput] = useState<"email" | number | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in
  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    const syncExistingSession = async () => {
      const { session } = await loadAuthState();
      if (!active || !session) return;
      router.replace(getPostAuthRedirectPath());
    };
    void syncExistingSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || !active) return;
      void syncUserProfileIdentity(session).then(() => {
        if (!active) return;
        router.replace(getPostAuthRedirectPath());
      });
    });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, [router]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  // Auto-focus first digit box when phase changes
  useEffect(() => {
    if (phase === "code") {
      window.setTimeout(() => digitRefs.current[0]?.focus(), 320);
    }
  }, [phase]);

  async function requestOtp(mode: "send" | "resend") {
    const norm = email.trim().toLowerCase();
    if (!isValidEmail(norm)) {
      setNotice({ tone: "error", text: "Enter a valid email address." });
      return;
    }
    setBusyAction(mode);
    setNotice(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({ email: norm, options: { shouldCreateUser: true } });
    setBusyAction(null);
    if (error) { setNotice({ tone: "error", text: mapOtpError(error.message) }); return; }
    setEmail(norm);
    setPhase("code");
    setDigits(["", "", "", "", "", ""]);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice({
      tone: "success",
      text: mode === "resend" ? `Fresh code sent to ${norm}.` : `Code sent to ${norm}.`,
    });
  }

  async function verifyCode() {
    const code = digits.join("");
    if (code.length !== 6) { setNotice({ tone: "error", text: "Enter all 6 digits." }); return; }
    const supabase = getSupabase();
    setBusyAction("verify");
    setNotice(null);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setBusyAction(null);
    if (error) { setNotice({ tone: "error", text: mapOtpError(error.message) }); return; }
    if (!data.session) { setNotice({ tone: "error", text: "Could not sign you in. Try again." }); return; }
    await syncUserProfileIdentity(data.session);
    setNotice({ tone: "success", text: "Signed in. Opening Driftlatch." });
    router.replace(getPostAuthRedirectPath());
  }

  function handleDigitInput(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setNotice(null);
    if (char && index < 5) digitRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== "") && char) void verifyCode();
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]; next[index] = ""; setDigits(next);
      } else if (index > 0) {
        digitRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) digitRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) digitRefs.current[index + 1]?.focus();
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
    setDigits(next);
    digitRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) setTimeout(() => verifyCode(), 80);
  }

  const codeComplete = digits.every((d) => d !== "");

  return (
    <div style={{ minHeight: "100dvh", background: "#0D0D0F", display: "flex", position: "relative", overflow: "hidden" }}>

      {/* ── Grain overlay ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        backgroundSize: "180px 180px",
        opacity: 0.045,
        mixBlendMode: "overlay",
      }} />

      {/* ── Atmosphere blobs ── */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed", top: -180, left: -120, width: 600, height: 600, borderRadius: 999,
          background: "radial-gradient(circle, rgba(194,122,92,0.32) 0%, rgba(194,122,92,0) 70%)",
          filter: "blur(80px)", pointerEvents: "none", zIndex: 0,
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.10, 0.18, 0.10] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{
          position: "fixed", bottom: -160, right: -100, width: 500, height: 500, borderRadius: 999,
          background: "radial-gradient(circle, rgba(120,190,150,0.24) 0%, rgba(120,190,150,0) 70%)",
          filter: "blur(90px)", pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* ── LEFT PANEL ── */}
      <div style={{
        display: "none",
        position: "relative", zIndex: 1,
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 64px",
        width: "45%",
        flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }} className="login-left">

        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(194,122,92,0.9) 0%, rgba(160,95,65,0.9) 100%)",
              boxShadow: "0 0 24px rgba(194,122,92,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.9)" }} />
            </div>
            <span style={{ color: "rgba(244,244,245,0.9)", fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Driftlatch
            </span>
          </div>
        </motion.div>

        {/* Center statement */}
        <div>
          {LEFT_LINES.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: i === LEFT_LINES.length - 1 ? 0.88 : 0.28, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.14, ease: EASE }}
              style={{
                margin: 0,
                marginBottom: i === LEFT_LINES.length - 1 ? 0 : 16,
                color: "rgba(244,244,245,1)",
                fontSize: i === LEFT_LINES.length - 1 ? "clamp(1.9rem, 3vw, 2.8rem)" : "clamp(1rem, 1.5vw, 1.4rem)",
                lineHeight: i === LEFT_LINES.length - 1 ? 1.08 : 1.5,
                letterSpacing: "-0.035em",
                fontFamily: "Zodiak, Georgia, serif",
                fontWeight: i === LEFT_LINES.length - 1 ? 500 : 300,
              }}
            >
              {line}
            </motion.p>
          ))}

          {/* Thin divider line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, delay: 0.7, ease: EASE }}
            style={{
              marginTop: 32,
              height: 1,
              width: 64,
              transformOrigin: "left",
              background: "linear-gradient(90deg, rgba(194,122,92,0.8), rgba(194,122,92,0))",
            }}
          />
        </div>

        {/* Bottom caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0, ease: EASE }}
          style={{ margin: 0, color: "rgba(161,161,170,0.42)", fontSize: 12, lineHeight: 1.7, letterSpacing: "0.01em" }}
        >
          Tools matched to your state.<br />Fewest clicks possible. No noise.
        </motion.p>
      </div>

      {/* ── RIGHT PANEL / FULL ON MOBILE ── */}
      <div style={{
        position: "relative", zIndex: 1,
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, delay: 0.1, ease: EASE }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          {/* Mobile-only brand */}
          <div className="login-mobile-brand" style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 40,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, rgba(194,122,92,0.9) 0%, rgba(160,95,65,0.9) 100%)",
              boxShadow: "0 0 20px rgba(194,122,92,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.9)" }} />
            </div>
            <span style={{ color: "rgba(244,244,245,0.88)", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Driftlatch
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 2, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <motion.div
                animate={{ width: phase === "email" ? "50%" : "100%" }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{ height: "100%", background: "linear-gradient(90deg, rgba(194,122,92,0.6), rgba(194,122,92,1))", borderRadius: 999 }}
              />
            </div>
            <span style={{ color: "rgba(161,161,170,0.5)", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
              {phase === "email" ? "1 / 2" : "2 / 2"}
            </span>
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: EASE }}
              style={{ marginBottom: 32 }}
            >
              <h1 style={{
                margin: 0,
                color: "rgba(244,244,245,0.92)",
                fontSize: "clamp(1.9rem, 5vw, 2.4rem)",
                lineHeight: 1.04,
                letterSpacing: "-0.045em",
                fontFamily: "Zodiak, Georgia, serif",
                fontWeight: 500,
              }}>
                {phase === "email" ? "Enter your email." : "Check your inbox."}
              </h1>
              <p style={{ margin: "10px 0 0", color: "rgba(161,161,170,0.68)", fontSize: 14, lineHeight: 1.65 }}>
                {phase === "email"
                  ? "We'll send a 6-digit code. No password, no friction."
                  : <>Code sent to <span style={{ color: "rgba(244,244,245,0.75)" }}>{email}</span>. Enter it below.</>
                }
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Form card */}
          <div style={{
            background: "rgba(20,20,23,0.72)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 22,
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
            overflow: "hidden",
            padding: 24,
          }}>
            {/* Top inner light */}
            <div style={{
              position: "absolute",
              top: 0, left: 16, right: 16, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)",
              pointerEvents: "none",
            }} />

            <AnimatePresence mode="wait">
              {phase === "email" ? (
                <motion.div
                  key="email-form"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, ease: EASE }}
                >
                  {/* Email input */}
                  <div style={{ position: "relative" }}>
                    <label style={{
                      display: "block",
                      color: focusedInput === "email" ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.6)",
                      fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
                      marginBottom: 8,
                      transition: "color 0.2s ease",
                    }}>
                      Email address
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setNotice(null); }}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput(null)}
                      onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) void requestOtp("send"); }}
                      placeholder="you@domain.com"
                      style={{
                        width: "100%",
                        minHeight: 52,
                        padding: "14px 16px",
                        borderRadius: 14,
                        border: focusedInput === "email"
                          ? "1px solid rgba(194,122,92,0.45)"
                          : "1px solid rgba(255,255,255,0.09)",
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(244,244,245,0.9)",
                        fontSize: 15,
                        outline: "none",
                        transition: "border 0.22s ease, box-shadow 0.22s ease",
                        boxShadow: focusedInput === "email" ? "0 0 0 3px rgba(194,122,92,0.10)" : "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Send button */}
                  <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void requestOtp("send")}
                    disabled={busyAction !== null || !email.trim()}
                    style={{
                      marginTop: 14,
                      width: "100%",
                      minHeight: 54,
                      borderRadius: 16,
                      border: "1px solid rgba(194,122,92,0.30)",
                      background: busyAction === "send"
                        ? "rgba(194,122,92,0.5)"
                        : "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(170,100,68,0.96) 100%)",
                      boxShadow: "0 16px 40px rgba(194,122,92,0.24), inset 0 1px 0 rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      cursor: busyAction !== null || !email.trim() ? "not-allowed" : "pointer",
                      opacity: !email.trim() ? 0.5 : 1,
                      transition: "opacity 0.2s ease, background 0.2s ease",
                    }}
                  >
                    {busyAction === "send" ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <SpinnerDot /> Sending…
                      </span>
                    ) : "Send code →"}
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="code-form"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, ease: EASE }}
                >
                  {/* 6 digit boxes */}
                  <label style={{
                    display: "block",
                    color: "rgba(161,161,170,0.6)",
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
                    marginBottom: 12,
                  }}>
                    6-digit code
                  </label>
                  <div style={{ display: "flex", gap: 8 }} onPaste={handleDigitPaste}>
                    {digits.map((d, i) => (
                      <motion.input
                        key={i}
                        ref={(el) => { digitRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitInput(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        onFocus={() => setFocusedInput(i)}
                        onBlur={() => setFocusedInput(null)}
                        whileFocus={{ scale: 1.04 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: 60,
                          textAlign: "center",
                          fontSize: 22,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: 0,
                          borderRadius: 14,
                          border: d
                            ? "1px solid rgba(194,122,92,0.55)"
                            : focusedInput === i
                              ? "1px solid rgba(194,122,92,0.38)"
                              : "1px solid rgba(255,255,255,0.09)",
                          background: d
                            ? "rgba(194,122,92,0.10)"
                            : "rgba(255,255,255,0.04)",
                          color: "rgba(244,244,245,0.95)",
                          outline: "none",
                          boxShadow: focusedInput === i ? "0 0 0 3px rgba(194,122,92,0.10)" : "none",
                          transition: "border 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
                          caretColor: "transparent",
                        }}
                      />
                    ))}
                  </div>

                  {/* Verify button */}
                  <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void verifyCode()}
                    disabled={busyAction !== null || !codeComplete}
                    style={{
                      marginTop: 14,
                      width: "100%",
                      minHeight: 54,
                      borderRadius: 16,
                      border: "1px solid rgba(194,122,92,0.30)",
                      background: busyAction === "verify"
                        ? "rgba(194,122,92,0.5)"
                        : "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(170,100,68,0.96) 100%)",
                      boxShadow: codeComplete ? "0 16px 40px rgba(194,122,92,0.24), inset 0 1px 0 rgba(255,255,255,0.14)" : "none",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      cursor: busyAction !== null || !codeComplete ? "not-allowed" : "pointer",
                      opacity: !codeComplete ? 0.45 : 1,
                      transition: "opacity 0.22s ease, box-shadow 0.22s ease",
                    }}
                  >
                    {busyAction === "verify" ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <SpinnerDot /> Verifying…
                      </span>
                    ) : "Verify →"}
                  </motion.button>

                  {/* Secondary actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => { setPhase("email"); setDigits(["","","","","",""]); setNotice(null); }}
                      disabled={busyAction !== null}
                      style={ghostBtn}
                    >
                      ← Change email
                    </button>
                    <button
                      onClick={() => void requestOtp("resend")}
                      disabled={busyAction !== null || resendCooldown > 0}
                      style={{ ...ghostBtn, opacity: resendCooldown > 0 ? 0.5 : 1 }}
                    >
                      {busyAction === "resend" ? "Resending…" : resendCooldown > 0 ? `Resend ${formatCooldown(resendCooldown)}` : "Resend code"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notice */}
            <AnimatePresence>
              {notice && (
                <motion.div
                  initial={{ opacity: 0, y: 6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  style={{
                    marginTop: 12,
                    padding: "11px 14px",
                    borderRadius: 12,
                    fontSize: 13,
                    lineHeight: 1.55,
                    overflow: "hidden",
                    ...(notice.tone === "success"
                      ? { border: "1px solid rgba(120,190,150,0.3)", background: "rgba(120,190,150,0.10)", color: "rgba(180,230,200,0.9)" }
                      : notice.tone === "error"
                        ? { border: "1px solid rgba(194,122,92,0.35)", background: "rgba(194,122,92,0.12)", color: "rgba(230,180,155,0.9)" }
                        : { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "rgba(161,161,170,0.7)" }
                    ),
                  }}
                >
                  {notice.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
            style={{ margin: "20px 0 0", color: "rgba(161,161,170,0.35)", fontSize: 12, lineHeight: 1.65, textAlign: "center" }}
          >
            No password stored. No tracking. Just you and your tools.
          </motion.p>
        </motion.div>
      </div>

      <style jsx global>{`
        @media (min-width: 820px) {
          .login-left { display: flex !important; }
          .login-mobile-brand { display: none !important; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input::placeholder { color: rgba(161,161,170,0.35); }
      `}</style>
    </div>
  );
}

function SpinnerDot() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      style={{
        display: "inline-block",
        width: 14, height: 14,
        borderRadius: 999,
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "rgba(255,255,255,0.9)",
      }}
    />
  );
}

const ghostBtn: React.CSSProperties = {
  flex: 1,
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "rgba(161,161,170,0.72)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  transition: "opacity 0.18s ease",
  letterSpacing: "-0.005em",
};