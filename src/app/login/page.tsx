"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { getPostAuthRedirectPath, loadAuthState, syncUserProfileIdentity } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

type Phase = "email" | "code";
type BusyAction = "send" | "verify" | "resend" | null;
type NoticeTone = "success" | "error" | "neutral";
type Notice = { tone: NoticeTone; text: string } | null;

const RESEND_COOLDOWN_SECONDS = 30;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Rotating statements — the emotional anchor of the left panel
const STATEMENTS = [
  { top: "Where ambition", bottom: "comes home." },
  { top: "Love and drive,", bottom: "finally aligned." },
  { top: "Carry less.", bottom: "Give more." },
  { top: "The gap between", bottom: "work and warmth." },
  { top: "You don't have", bottom: "to choose." },
];

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function formatCooldown(s: number) {
  return `0:${s.toString().padStart(2, "0")}`;
}
function mapOtpError(msg: string) {
  const n = msg.toLowerCase();
  if (n.includes("expired")) return "That code has expired. Request a new one.";
  if (n.includes("invalid") || n.includes("token")) return "Invalid or expired. Try a fresh code.";
  if (n.includes("rate limit") || n.includes("security purposes")) return "Too many attempts. Give it a moment.";
  return msg;
}

function readNextPath() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statementIdx, setStatementIdx] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Mouse parallax for left panel
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  // Rotate statements
  useEffect(() => {
    const t = setInterval(() => setStatementIdx(i => (i + 1) % STATEMENTS.length), 3800);
    return () => clearInterval(t);
  }, []);

  // Auth check
  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    void (async () => {
      const { session } = await loadAuthState();
      if (!active || !session) return;
      router.replace(getPostAuthRedirectPath(readNextPath()));
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session || !active) return;
      void syncUserProfileIdentity(session).then(() => {
        if (!active) return;
        router.replace(getPostAuthRedirectPath(readNextPath()));
      });
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [router]);

  // Cooldown tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-focus first digit
  useEffect(() => {
    if (phase === "code") window.setTimeout(() => digitRefs.current[0]?.focus(), 320);
  }, [phase]);

  function handleMouseMove(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 18);
    mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * 18);
  }

  async function requestOtp(mode: "send" | "resend") {
    const norm = email.trim().toLowerCase();
    if (!isValidEmail(norm)) { setNotice({ tone: "error", text: "Enter a valid email address." }); return; }
    setBusyAction(mode); setNotice(null);
    const { error } = await getSupabase().auth.signInWithOtp({ email: norm, options: { shouldCreateUser: true } });
    setBusyAction(null);
    if (error) { setNotice({ tone: "error", text: mapOtpError(error.message) }); return; }
    setEmail(norm); setPhase("code"); setDigits(["","","","","",""]); setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice({ tone: "success", text: mode === "resend" ? `Fresh code sent to ${norm}.` : `Code sent to ${norm}.` });
  }

  async function verifyCode() {
    const code = digits.join("");
    if (code.length !== 6) { setNotice({ tone: "error", text: "Enter all 6 digits." }); return; }
    setBusyAction("verify"); setNotice(null);
    const { data, error } = await getSupabase().auth.verifyOtp({ email, token: code, type: "email" });
    setBusyAction(null);
    if (error) { setNotice({ tone: "error", text: mapOtpError(error.message) }); return; }
    if (!data.session) { setNotice({ tone: "error", text: "Could not sign you in. Try again." }); return; }
    await syncUserProfileIdentity(data.session);
    router.replace(getPostAuthRedirectPath(readNextPath()));
  }

  function handleDigitInput(i: number, val: string) {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = char; setDigits(next); setNotice(null);
    if (char && i < 5) digitRefs.current[i + 1]?.focus();
    if (next.every(d => d) && char) void verifyCode();
  }

  function handleDigitKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) { const n = [...digits]; n[i] = ""; setDigits(n); }
      else if (i > 0) digitRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) digitRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) digitRefs.current[i + 1]?.focus();
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

  const codeComplete = digits.every(d => d !== "");
  const stmt = STATEMENTS[statementIdx];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", background: "#0B0B0E", position: "relative", overflow: "hidden" }}>

      {/* ── Film grain ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.038,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "160px",
        mixBlendMode: "overlay",
      }} />

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <motion.div
        className="login-left"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
        style={{
          display: "none",
          position: "relative",
          width: "52%",
          flexShrink: 0,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 64px 52px 60px",
          borderRight: "1px solid rgba(255,255,255,0.045)",
          overflow: "hidden",
          background: "linear-gradient(145deg, #0E0E12 0%, #0A0A0D 100%)",
        }}
      >
        {/* Large decorative circle — parallax */}
        <motion.div style={{
          position: "absolute", top: "18%", right: "-22%",
          width: 560, height: 560, borderRadius: 999,
          border: "1px solid rgba(194,122,92,0.07)",
          x: springX, y: springY,
          pointerEvents: "none",
        }} />
        <motion.div style={{
          position: "absolute", top: "28%", right: "-14%",
          width: 360, height: 360, borderRadius: 999,
          border: "1px solid rgba(194,122,92,0.11)",
          x: useSpring(mouseX, { stiffness: 40, damping: 18 }),
          y: useSpring(mouseY, { stiffness: 40, damping: 18 }),
          pointerEvents: "none",
        }} />

        {/* Warm light pool */}
        <motion.div
          animate={{ opacity: [0.14, 0.22, 0.14], scale: [1, 1.07, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", top: "30%", left: "40%",
            width: 500, height: 500, borderRadius: 999,
            background: "radial-gradient(circle, rgba(194,122,92,0.28) 0%, transparent 68%)",
            filter: "blur(80px)", pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ display: "flex", alignItems: "center", gap: 11, position: "relative", zIndex: 2 }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: "linear-gradient(140deg, rgba(194,122,92,0.95), rgba(155,88,55,0.95))",
            boxShadow: "0 0 28px rgba(194,122,92,0.4), inset 0 1px 0 rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 9, height: 9, borderRadius: 999, background: "rgba(255,255,255,0.95)" }} />
          </div>
          <span style={{ color: "rgba(244,244,245,0.88)", fontSize: 16, fontWeight: 700, letterSpacing: "-0.025em", fontFamily: "Zodiak, Georgia, serif" }}>
            Driftlatch
          </span>
        </motion.div>

        {/* Central rotating statement */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={statementIdx}
              initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
              transition={{ duration: 0.72, ease: EASE }}
            >
              <p style={{
                margin: 0,
                color: "rgba(244,244,245,0.22)",
                fontSize: "clamp(2.8rem, 4.2vw, 5rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.05em",
                fontFamily: "Zodiak, Georgia, serif",
                fontWeight: 400,
              }}>
                {stmt.top}
              </p>
              <p style={{
                margin: 0,
                color: "rgba(244,244,245,0.88)",
                fontSize: "clamp(2.8rem, 4.2vw, 5rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.05em",
                fontFamily: "Zodiak, Georgia, serif",
                fontWeight: 400,
              }}>
                {stmt.bottom}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Statement dots */}
          <div style={{ display: "flex", gap: 6, marginTop: 32 }}>
            {STATEMENTS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setStatementIdx(i)}
                animate={{
                  width: i === statementIdx ? 22 : 6,
                  background: i === statementIdx ? "rgba(194,122,92,0.9)" : "rgba(255,255,255,0.18)",
                }}
                transition={{ duration: 0.38, ease: EASE }}
                style={{ height: 6, borderRadius: 999, border: "none", cursor: "pointer", padding: 0 }}
              />
            ))}
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
            style={{
              marginTop: 36, height: 1, width: 56, transformOrigin: "left",
              background: "linear-gradient(90deg, rgba(194,122,92,0.7), transparent)",
            }}
          />

          {/* Sub-line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            style={{ margin: "18px 0 0", color: "rgba(161,161,170,0.45)", fontSize: 14, lineHeight: 1.7, letterSpacing: "0.005em" }}
          >
            One right step for how you feel right now.<br />
            Not tomorrow. Not in theory.
          </motion.p>
        </div>

        {/* Bottom credit */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          style={{ margin: 0, color: "rgba(161,161,170,0.28)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", position: "relative", zIndex: 2 }}
        >
          Privacy-first · No tracking · Built for founders
        </motion.p>
      </motion.div>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px", position: "relative", zIndex: 1,
      }}>

        {/* Subtle right-side glow */}
        <motion.div
          animate={{ opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{
            position: "fixed", bottom: "-10%", right: "-10%",
            width: 400, height: 400, borderRadius: 999,
            background: "radial-gradient(circle, rgba(120,190,150,0.22) 0%, transparent 70%)",
            filter: "blur(70px)", pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
          style={{ width: "100%", maxWidth: 400 }}
        >
          {/* Mobile brand */}
          <div className="login-mobile-brand" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: "linear-gradient(140deg, rgba(194,122,92,0.95), rgba(155,88,55,0.95))",
              boxShadow: "0 0 20px rgba(194,122,92,0.32)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.95)" }} />
            </div>
            <span style={{ color: "rgba(244,244,245,0.86)", fontSize: 15, fontWeight: 700, letterSpacing: "-0.025em", fontFamily: "Zodiak, Georgia, serif" }}>
              Driftlatch
            </span>
          </div>

          {/* Step progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            {[0, 1].map(i => (
              <motion.div
                key={i}
                animate={{
                  background: i < (phase === "email" ? 1 : 2)
                    ? "linear-gradient(90deg, rgba(194,122,92,0.9), rgba(194,122,92,0.6))"
                    : "rgba(255,255,255,0.07)",
                  flex: i === (phase === "email" ? 0 : 1) ? 1.6 : 1,
                }}
                transition={{ duration: 0.5, ease: EASE }}
                style={{ height: 3, borderRadius: 999 }}
              />
            ))}
            <span style={{ color: "rgba(161,161,170,0.4)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", whiteSpace: "nowrap" }}>
              {phase === "email" ? "1 / 2" : "2 / 2"}
            </span>
          </div>

          {/* Heading — animated between phases */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase + "-head"}
              initial={{ opacity: 0, x: phase === "email" ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: phase === "email" ? 16 : -16 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ marginBottom: 28 }}
            >
              <h1 style={{
                margin: 0,
                color: "rgba(244,244,245,0.92)",
                fontSize: "clamp(2rem, 5vw, 2.6rem)",
                lineHeight: 1.04,
                letterSpacing: "-0.05em",
                fontFamily: "Zodiak, Georgia, serif",
                fontWeight: 400,
              }}>
                {phase === "email" ? (
                  <>"Welcome<br />back."</>
                ) : (
                  <>Check your<br />inbox.</>
                )}
              </h1>
              <p style={{ margin: "10px 0 0", color: "rgba(161,161,170,0.60)", fontSize: 14, lineHeight: 1.7 }}>
                {phase === "email"
                  ? "Enter your email. We'll send a code — no password, no friction."
                  : <>Code sent to <span style={{ color: "rgba(244,244,245,0.72)" }}>{email}</span>. Enter it below.</>
                }
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Form card */}
          <div style={{
            background: "rgba(18,18,22,0.78)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 22,
            padding: 24,
            backdropFilter: "blur(36px)",
            WebkitBackdropFilter: "blur(36px)",
            boxShadow: "0 28px 72px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.055)",
            position: "relative",
          }}>
            <AnimatePresence mode="wait">
              {phase === "email" ? (
                <motion.div
                  key="email-phase"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.26, ease: EASE }}
                >
                  <label style={{
                    display: "block",
                    color: emailFocused ? "rgba(194,122,92,0.88)" : "rgba(161,161,170,0.5)",
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase",
                    marginBottom: 9, transition: "color 0.2s ease",
                  }}>
                    Email address
                  </label>
                  <input
                    type="email" inputMode="email" autoComplete="email" autoFocus
                    value={email}
                    onChange={e => { setEmail(e.target.value); setNotice(null); }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    onKeyDown={e => { if (e.key === "Enter" && email.trim()) void requestOtp("send"); }}
                    placeholder="you@domain.com"
                    style={{
                      width: "100%", minHeight: 52, padding: "14px 16px",
                      borderRadius: 14,
                      border: emailFocused ? "1px solid rgba(194,122,92,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      background: emailFocused ? "rgba(194,122,92,0.05)" : "rgba(255,255,255,0.035)",
                      color: "rgba(244,244,245,0.9)", fontSize: 15, outline: "none",
                      boxShadow: emailFocused ? "0 0 0 3px rgba(194,122,92,0.10)" : "none",
                      transition: "all 0.22s ease", boxSizing: "border-box",
                    }}
                  />

                  <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void requestOtp("send")}
                    disabled={busyAction !== null || !email.trim()}
                    style={{
                      marginTop: 13, width: "100%", minHeight: 54, borderRadius: 16,
                      border: "1px solid rgba(194,122,92,0.28)",
                      background: "linear-gradient(170deg, rgba(200,128,96,0.97) 0%, rgba(162,96,62,0.97) 100%)",
                      boxShadow: email.trim() ? "0 14px 38px rgba(194,122,92,0.28), inset 0 1px 0 rgba(255,255,255,0.16)" : "none",
                      color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
                      cursor: !email.trim() || busyAction ? "not-allowed" : "pointer",
                      opacity: !email.trim() ? 0.45 : 1,
                      transition: "opacity 0.22s ease, box-shadow 0.22s ease",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {busyAction === "send" ? <><Spinner /> Sending…</> : "Send code →"}
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="code-phase"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.26, ease: EASE }}
                >
                  <label style={{
                    display: "block",
                    color: "rgba(161,161,170,0.5)",
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase",
                    marginBottom: 12,
                  }}>
                    6-digit code
                  </label>

                  <div style={{ display: "flex", gap: 7 }} onPaste={handleDigitPaste}>
                    {digits.map((d, i) => (
                      <motion.input
                        key={i}
                        ref={el => { digitRefs.current[i] = el; }}
                        type="text" inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        maxLength={1} value={d}
                        onChange={e => handleDigitInput(i, e.target.value)}
                        onKeyDown={e => handleDigitKeyDown(i, e)}
                        whileFocus={{ scale: 1.06, transition: { duration: 0.15 } }}
                        style={{
                          flex: 1, minWidth: 0, height: 58,
                          textAlign: "center", fontSize: 22, fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          borderRadius: 13,
                          border: d
                            ? "1px solid rgba(194,122,92,0.6)"
                            : "1px solid rgba(255,255,255,0.08)",
                          background: d ? "rgba(194,122,92,0.11)" : "rgba(255,255,255,0.04)",
                          color: "rgba(244,244,245,0.95)", outline: "none",
                          caretColor: "transparent",
                          boxShadow: d ? "0 0 0 3px rgba(194,122,92,0.09)" : "none",
                          transition: "all 0.18s ease",
                        }}
                      />
                    ))}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void verifyCode()}
                    disabled={busyAction !== null || !codeComplete}
                    style={{
                      marginTop: 13, width: "100%", minHeight: 54, borderRadius: 16,
                      border: "1px solid rgba(194,122,92,0.28)",
                      background: "linear-gradient(170deg, rgba(200,128,96,0.97) 0%, rgba(162,96,62,0.97) 100%)",
                      boxShadow: codeComplete ? "0 14px 38px rgba(194,122,92,0.28), inset 0 1px 0 rgba(255,255,255,0.16)" : "none",
                      color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
                      cursor: !codeComplete || busyAction ? "not-allowed" : "pointer",
                      opacity: !codeComplete ? 0.42 : 1,
                      transition: "opacity 0.22s ease, box-shadow 0.22s ease",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {busyAction === "verify" ? <><Spinner /> Verifying…</> : "Continue →"}
                  </motion.button>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {[
                      { label: "← Change email", action: () => { setPhase("email"); setDigits(["","","","","",""]); setNotice(null); } },
                      { label: resendCooldown > 0 ? `Resend ${formatCooldown(resendCooldown)}` : busyAction === "resend" ? "Resending…" : "Resend code", action: () => void requestOtp("resend") },
                    ].map(btn => (
                      <button
                        key={btn.label}
                        onClick={btn.action}
                        disabled={busyAction !== null || (btn.label.startsWith("Resend") && resendCooldown > 0)}
                        style={{
                          flex: 1, minHeight: 42, borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.07)",
                          background: "rgba(255,255,255,0.03)",
                          color: "rgba(161,161,170,0.65)", fontSize: 12, fontWeight: 700,
                          cursor: "pointer", letterSpacing: "-0.005em",
                          opacity: resendCooldown > 0 && btn.label.startsWith("Resend") ? 0.5 : 1,
                          transition: "opacity 0.18s ease",
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
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
                  transition={{ duration: 0.22, ease: EASE }}
                  style={{
                    marginTop: 12, padding: "11px 14px", borderRadius: 12,
                    fontSize: 13, lineHeight: 1.55, overflow: "hidden",
                    ...(notice.tone === "success"
                      ? { border: "1px solid rgba(120,190,150,0.28)", background: "rgba(120,190,150,0.09)", color: "rgba(170,220,190,0.88)" }
                      : notice.tone === "error"
                        ? { border: "1px solid rgba(194,122,92,0.32)", background: "rgba(194,122,92,0.10)", color: "rgba(224,168,140,0.88)" }
                        : { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "rgba(161,161,170,0.6)" }
                    ),
                  }}
                >
                  {notice.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <p style={{ margin: "20px 0 0", color: "rgba(161,161,170,0.3)", fontSize: 12, lineHeight: 1.65, textAlign: "center" }}>
            No password stored. No tracking. Just one clear next step.
          </p>
        </motion.div>
      </div>

      <style jsx global>{`
        @media (min-width: 860px) {
          .login-left { display: flex !important; }
          .login-mobile-brand { display: none !important; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input::placeholder { color: rgba(161,161,170,0.3); }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      style={{
        display: "inline-block", width: 14, height: 14, borderRadius: 999,
        border: "2px solid rgba(255,255,255,0.22)", borderTopColor: "rgba(255,255,255,0.9)",
      }}
    />
  );
}
