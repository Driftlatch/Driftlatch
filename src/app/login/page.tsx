"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPostAuthRedirectPath, loadAuthState, syncUserProfileIdentity } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

type Phase = "email" | "code";
type BusyAction = "send" | "verify" | "resend" | null;
type NoticeTone = "success" | "error" | "neutral";
type Notice = { tone: NoticeTone; text: string } | null;

const RESEND_COOLDOWN_SECONDS = 30;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatCooldown(seconds: number) {
  return `0:${seconds.toString().padStart(2, "0")}`;
}

function mapOtpError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("expired")) {
    return "That code has expired. Request a new one and try again.";
  }

  if (normalized.includes("invalid") || normalized.includes("token")) {
    return "That code is invalid or has expired. Double-check it or request a new one.";
  }

  if (normalized.includes("rate limit") || normalized.includes("security purposes")) {
    return "Too many attempts just now. Give it a moment, then try again.";
  }

  return message;
}

function noticeStyle(tone: NoticeTone) {
  if (tone === "success") {
    return {
      border: "1px solid rgba(79,115,101,0.45)",
      background: "rgba(79,115,101,0.16)",
      color: "var(--text)",
    };
  }

  if (tone === "error") {
    return {
      border: "1px solid rgba(194,122,92,0.38)",
      background: "rgba(194,122,92,0.14)",
      color: "var(--text)",
    };
  }

  return {
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--muted)",
  };
}

const inputStyle = {
  width: "100%",
  minHeight: 54,
  marginTop: 10,
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--text)",
  outline: "none",
  fontSize: 16,
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timeoutId = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCooldown]);

  async function requestOtp(mode: "send" | "resend") {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setNotice({ tone: "error", text: "Enter a valid email address to continue." });
      return;
    }

    const supabase = getSupabase();
    setBusyAction(mode);
    setNotice(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    setBusyAction(null);

    if (error) {
      setNotice({ tone: "error", text: mapOtpError(error.message) });
      return;
    }

    setEmail(normalizedEmail);
    setPhase("code");
    setCode("");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice({
      tone: "success",
      text:
        mode === "resend"
          ? `A fresh 6-digit code is on its way to ${normalizedEmail}.`
          : `We sent a 6-digit code to ${normalizedEmail}.`,
    });
  }

  async function verifyCode() {
    const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

    if (normalizedCode.length !== 6) {
      setNotice({ tone: "error", text: "Enter the full 6-digit code." });
      return;
    }

    const supabase = getSupabase();
    setBusyAction("verify");
    setNotice(null);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: normalizedCode,
      type: "email",
    });

    setBusyAction(null);

    if (error) {
      setNotice({ tone: "error", text: mapOtpError(error.message) });
      return;
    }

    if (!data.session) {
      setNotice({ tone: "error", text: "We could not finish signing you in. Try again." });
      return;
    }

    await syncUserProfileIdentity(data.session);
    setNotice({ tone: "success", text: "Signed in. Opening Driftlatch." });
    router.replace(getPostAuthRedirectPath());
  }

  return (
    <main className="container">
      <section className="section" style={{ maxWidth: 560 }}>
        <div className="kicker">LOGIN</div>
        <h1 style={{ marginTop: 8 }}>Continue with email</h1>
        <p className="small" style={{ maxWidth: 460 }}>
          Enter your email, get a 6-digit code, and you&apos;re in.
        </p>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="kicker">{phase === "email" ? "Step 1 of 2" : "Step 2 of 2"}</div>

          {phase === "email" ? (
            <>
              <label style={{ display: "grid", marginTop: 12 }}>
                <span className="small" style={{ color: "var(--text)" }}>
                  Email
                </span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setNotice(null);
                  }}
                  placeholder="you@domain.com"
                  style={inputStyle}
                />
              </label>

              <button
                className="btn primary"
                style={{ marginTop: 16, width: "100%" }}
                onClick={() => void requestOtp("send")}
                disabled={busyAction !== null || !email.trim()}
              >
                {busyAction === "send" ? "Sending code..." : "Send code"}
              </button>
            </>
          ) : (
            <>
              <p className="small" style={{ marginTop: 12 }}>
                Code sent to <span style={{ color: "var(--text)" }}>{email}</span>
              </p>

              <label style={{ display: "grid", marginTop: 8 }}>
                <span className="small" style={{ color: "var(--text)" }}>
                  6-digit code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setNotice(null);
                  }}
                  placeholder="123456"
                  style={{ ...inputStyle, letterSpacing: "0.28em", fontVariantNumeric: "tabular-nums" }}
                />
              </label>

              <button
                className="btn primary"
                style={{ marginTop: 16, width: "100%" }}
                onClick={() => void verifyCode()}
                disabled={busyAction !== null || code.replace(/\D/g, "").length !== 6}
              >
                {busyAction === "verify" ? "Verifying..." : "Verify code"}
              </button>

              <div className="btnRow" style={{ marginTop: 10 }}>
                <button
                  className="btn ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setPhase("email");
                    setCode("");
                    setNotice(null);
                  }}
                  disabled={busyAction !== null}
                >
                  Change email
                </button>

                <button
                  className="btn ghost"
                  style={{ flex: 1 }}
                  onClick={() => void requestOtp("resend")}
                  disabled={busyAction !== null || resendCooldown > 0}
                >
                  {busyAction === "resend"
                    ? "Resending..."
                    : resendCooldown > 0
                      ? `Resend in ${formatCooldown(resendCooldown)}`
                      : "Resend code"}
                </button>
              </div>
            </>
          )}

          {notice ? (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.5,
                ...noticeStyle(notice.tone),
              }}
            >
              {notice.text}
            </div>
          ) : (
            <p className="small" style={{ marginTop: 14 }}>
              {phase === "email"
                ? "We will create your session after you verify the code."
                : "Codes expire quickly. If this one fails, request a fresh code."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
