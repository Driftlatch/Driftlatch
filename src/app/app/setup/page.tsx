"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUserEmail, loadAuthState, signOut, syncUserProfileIdentity } from "@/lib/auth";

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

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { session, profile } = await loadAuthState();
        if (!active) return;

        if (!session) {
          router.replace("/login");
          return;
        }

        setEmail(getSessionUserEmail(session));
        setDisplayName(profile?.display_name?.trim() ?? "");
        setLoading(false);
      } catch (setupError) {
        console.error("Failed to load setup state:", setupError);
        if (!active) return;
        setError("We could not load your profile right now. Refresh and try again.");
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const { session } = await loadAuthState();

      if (!session) {
        router.replace("/login");
        return;
      }

      await syncUserProfileIdentity(session, { displayName });
      router.replace("/app");
    } catch (saveError) {
      console.error("Failed to save display name:", saveError);
      setError("We could not save that right now. You can skip for now and continue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="container">
        <section className="section" style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="kicker">PROFILE</div>
            <h1 style={{ marginTop: 8, fontSize: 42 }}>Loading your account</h1>
            <p className="small">Just a second.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="section" style={{ maxWidth: 560 }}>
        <div className="kicker">PROFILE</div>
        <h1 style={{ marginTop: 8 }}>Your email is your account identity</h1>
        <p className="small" style={{ maxWidth: 460 }}>
          Add an optional display name if you want Driftlatch to greet you by name. You can skip this anytime.
        </p>

        <div className="card" style={{ marginTop: 18 }}>
          <p className="small">
            Signed in as <span style={{ color: "var(--text)" }}>{email}</span>
          </p>

          <label style={{ display: "grid", marginTop: 14 }}>
            <span className="small" style={{ color: "var(--text)" }}>
              Display name optional
            </span>
            <input
              type="text"
              autoComplete="nickname"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setError(null);
              }}
              placeholder="What should Driftlatch call you?"
              style={inputStyle}
            />
          </label>

          {error ? (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(194,122,92,0.38)",
                background: "rgba(194,122,92,0.14)",
                color: "var(--text)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          ) : (
            <p className="small" style={{ marginTop: 14 }}>
              Driftlatch will show your display name when available, otherwise your email.
            </p>
          )}

          <div className="btnRow" style={{ marginTop: 16 }}>
            <button
              className="btn primary"
              style={{ flex: 1 }}
              onClick={() => void handleSave()}
              disabled={saving || signingOut}
            >
              {saving ? "Saving..." : "Save and continue"}
            </button>

            <button
              className="btn ghost"
              style={{ flex: 1 }}
              onClick={() => router.replace("/app")}
              disabled={saving || signingOut}
            >
              Skip for now
            </button>
          </div>

          <button
            className="btn ghost"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => void handleSignOut()}
            disabled={saving || signingOut}
          >
            {signingOut ? "Signing out..." : "Use another email"}
          </button>
        </div>
      </section>
    </main>
  );
}
