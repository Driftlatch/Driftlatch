"use client";

import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { type EQDomain } from "@/lib/eqQuestions";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import EQHexagon from "@/components/EQHexagon";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Domain metadata ────────────────────────────────────────

const DOMAIN_LABELS: Record<EQDomain, string> = {
  pressure_reading: "Pressure Reading",
  repair_instinct: "Repair Instinct",
  presence_quality: "Presence Quality",
  boundary_intel: "Boundary Intelligence",
  recovery_aware: "Recovery Awareness",
  signal_accuracy: "Signal Accuracy",
};

const DOMAIN_RGB: Record<EQDomain, string> = {
  pressure_reading: "194,122,92",
  repair_instinct: "120,190,150",
  presence_quality: "120,190,150",
  boundary_intel: "208,164,92",
  recovery_aware: "100,160,200",
  signal_accuracy: "180,120,200",
};

function domainColor(domain: EQDomain, opacity: number): string {
  return `rgba(${DOMAIN_RGB[domain]},${opacity})`;
}

const DOMAIN_ORDER: EQDomain[] = [
  "pressure_reading",
  "repair_instinct",
  "presence_quality",
  "boundary_intel",
  "recovery_aware",
  "signal_accuracy",
];

function getDomainObservation(domain: EQDomain, score: number): string {
  const high = score >= 65;
  const medium = score >= 40;

  const table: Record<EQDomain, [string, string, string]> = {
    pressure_reading: [
      "Strong. You stay tuned in even when you are tired.",
      "Good when you are at your best. Narrows under load.",
      "This is your biggest growth edge under pressure.",
    ],
    repair_instinct: [
      "You move toward things. That is rare.",
      "You get there. The window between knowing and doing costs you.",
      "The longer you wait the harder repair becomes.",
    ],
    presence_quality: [
      "When you are there, people feel it.",
      "You show up. Landing fully is the next step.",
      "The people closest to you feel the absence.",
    ],
    boundary_intel: [
      "You can actually close the day. That is harder than it sounds.",
      "The background channel stays open longer than you would choose.",
      "Work follows you home most days.",
    ],
    recovery_aware: [
      "You know what works and you reach for it.",
      "The gap between what helps and what you do is worth closing.",
      "Recovery still mostly happens to you rather than by you.",
    ],
    signal_accuracy: [
      "You close the gap between feeling and reality faster than most.",
      "You catch it after. In the moment is the next step.",
      "What you feel and what is happening get tangled under pressure.",
    ],
  };

  const [h, m, l] = table[domain];
  return high ? h : medium ? m : l;
}

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  "The Carrier": "You stay functional. The cost shows up elsewhere.",
  "The Avoider": "You care. Starting the repair is the hard part.",
  "The Ghost": "You are there. Whether you land is another question.",
  "The Open Loop": "Work does not end when the laptop does.",
  "The Runner": "You keep going. Recovery is something that happens later.",
  "The Reactor": "What you feel and what is happening get tangled under pressure.",
};

const STARTING_POINT_ACTIONS: Record<EQDomain, string> = {
  pressure_reading:
    "The next time someone close to you says they are fine but something feels off, name it gently. One sentence. You do not need to solve it. Just let them know you noticed.",
  repair_instinct:
    "Pick one unresolved tension from the last two weeks. Not the biggest one. The smallest one you have been stepping around. Address it today. One sentence is enough to open the door.",
  presence_quality:
    "Tonight, choose one ten minute window with someone you care about. Phone in another room. Nothing to fix or discuss. Just be in the same space without an agenda.",
  boundary_intel:
    "Create one closing ritual for your workday. It does not need to be elaborate. Write tomorrow's first task, close the laptop, say it out loud if that helps. The point is a signal to your brain that today is done.",
  recovery_aware:
    "Write down what actually leaves you feeling better after a hard day. Not what you think should work. What actually does. Then ask yourself how often you actually do it.",
  signal_accuracy:
    "The next time you feel a strong reaction to something small, pause before responding. Ask yourself: is this about this moment or is something else running underneath it.",
};

// ── Types ──────────────────────────────────────────────────

type EQResult = {
  scores: Record<EQDomain, number>;
  weakestDomain: EQDomain;
  archetype: string;
  openingParagraph: string;
  hasPartnerContext: boolean;
  hasKidsContext: boolean;
};

// ── Domain bar ─────────────────────────────────────────────

function DomainBar({
  domain,
  score,
  index,
}: {
  domain: EQDomain;
  score: number;
  index: number;
}) {
  const delay = index * 0.08;
  const fillColor = domainColor(domain, 0.7);
  const scoreColor = domainColor(domain, 0.9);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(244,244,245,0.82)",
          }}
        >
          {DOMAIN_LABELS[domain]}
        </span>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 700,
            color: scoreColor,
            letterSpacing: "-0.04em",
          }}
        >
          {score}
        </span>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: "0%" }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE, delay }}
          style={{
            height: "100%",
            borderRadius: 999,
            background: fillColor,
          }}
        />
      </div>

      <div
        style={{
          fontSize: 12,
          color: "rgba(161,161,170,0.45)",
          marginTop: 7,
          lineHeight: 1.5,
        }}
      >
        {getDomainObservation(domain, score)}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────

export default function PressureEQResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<EQResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("driftlatch_eq_result");
      if (raw) {
        const parsed = JSON.parse(raw) as EQResult;
        setResult(parsed);

        // Attempt DB upsert if user is logged in
        void (async () => {
          try {
            const supabase = supabaseBrowser();
            const {
              data: { session },
            } = await supabase.auth.getSession();
            setIsLoggedIn(Boolean(session?.user?.id));
            if (session?.user?.id) {
              const { scores } = parsed;
              const { data: existing } = await supabase
                .from("user_eq_profile")
                .select("version")
                .eq("user_id", session.user.id)
                .maybeSingle();

              const nextVersion = (existing?.version ?? 0) + 1;

              await supabase.from("user_eq_profile").upsert(
                {
                  user_id: session.user.id,
                  pressure_reading: scores.pressure_reading,
                  repair_instinct: scores.repair_instinct,
                  presence_quality: scores.presence_quality,
                  boundary_intel: scores.boundary_intel,
                  recovery_aware: scores.recovery_aware,
                  signal_accuracy: scores.signal_accuracy,
                  weakest_domain: parsed.weakestDomain,
                  archetype: parsed.archetype,
                  has_kids_context: parsed.hasKidsContext,
                  has_partner_context: parsed.hasPartnerContext,
                  opening_paragraph: parsed.openingParagraph,
                  version: nextVersion,
                },
                { onConflict: "user_id" },
              );
            }
          } catch {
            // ignore DB errors silently
          }
        })();
      }
    } catch {
      // ignore parse errors
    } finally {
      setLoading(false);
    }
  }, []);

  const basePageStyle: CSSProperties = {
    minHeight: "100dvh",
    background: "#0B0B0E",
  };

  if (loading) {
    return (
      <div
        style={{
          ...basePageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "rgba(161,161,170,0.4)", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        style={{
          ...basePageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
        }}
      >
        <div
          style={{ color: "rgba(161,161,170,0.5)", fontSize: 15, textAlign: "center" }}
        >
          No result found.{" "}
          <Link href="/pressure-eq" style={{ color: "var(--accent)" }}>
            Take the assessment
          </Link>
        </div>
      </div>
    );
  }

  const archetypeDesc = ARCHETYPE_DESCRIPTIONS[result.archetype] ?? "";
  const glowColor = domainColor(result.weakestDomain, 0.15);
  const cardBorderColor = domainColor(result.weakestDomain, 0.2);

  return (
    <div style={basePageStyle}>
      {/* Ambient glow — fixed, derived from weakest domain */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: -100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "60px 24px 100px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* 1. Archetype reveal */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0, ease: EASE }}
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(194,122,92,0.7)",
              marginBottom: 20,
            }}
          >
            Your Pressure EQ
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.8rem,7vw,4.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.05em",
              color: "var(--text)",
              lineHeight: 1,
              marginBottom: 12,
              margin: "0 0 12px",
            }}
          >
            {result.archetype}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASE }}
            style={{
              fontSize: 16,
              color: "rgba(161,161,170,0.6)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {archetypeDesc}
          </motion.p>
        </div>

        {/* 2. Opening paragraph */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
          style={{
            position: "relative",
            overflow: "hidden",
            background: "rgba(18,18,22,0.85)",
            border: `1px solid ${cardBorderColor}`,
            borderRadius: 22,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
            padding: "32px 28px",
            marginBottom: 40,
          }}
        >
          {/* Rim light */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 16,
              right: 16,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
              pointerEvents: "none",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 17,
              color: "rgba(244,244,245,0.88)",
              lineHeight: 1.8,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {result.openingParagraph}
          </p>
        </motion.div>

        {/* 3. EQ Hexagon */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
          style={{ display: "flex", justifyContent: "center", marginBottom: 40, marginTop: 8 }}
        >
          <div style={{ background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "40px 24px", position: "relative", overflow: "hidden", width: "100%" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, left: 16, right: 16, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", pointerEvents: "none" }} />
            <EQHexagon scores={result.scores} weakestDomain={result.weakestDomain} />
          </div>
        </motion.div>

        {/* 4. Six domain bars */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(161,161,170,0.4)",
              marginBottom: 28,
            }}
          >
            Your six domains
          </div>

          {DOMAIN_ORDER.map((domain, i) => (
            <DomainBar
              key={domain}
              domain={domain}
              score={result.scores[domain]}
              index={i}
            />
          ))}
        </motion.div>

        {/* 4. Starting point card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65, ease: EASE }}
          style={{
            position: "relative",
            overflow: "hidden",
            background: "rgba(18,18,22,0.9)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 22,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
            padding: "24px 26px 24px 30px",
            marginTop: 32,
          }}
        >
          {/* Rim light */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 16,
              right: 16,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
              pointerEvents: "none",
            }}
          />
          {/* Clay accent bar */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              borderRadius: "3px 0 0 3px",
              background: "rgba(194,122,92,0.6)",
            }}
          />

          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(194,122,92,0.6)",
              marginBottom: 8,
            }}
          >
            Where to start
          </div>

          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "rgba(244,244,245,0.9)",
              marginBottom: 8,
            }}
          >
            {DOMAIN_LABELS[result.weakestDomain]}
          </div>

          <p
            style={{
              fontSize: 15,
              color: "rgba(244,244,245,0.75)",
              lineHeight: 1.7,
              margin: 0,
              fontWeight: 400,
            }}
          >
            {STARTING_POINT_ACTIONS[result.weakestDomain]}
          </p>
        </motion.div>

        {/* 5. CTA row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8, ease: EASE }}
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => router.push("/app")}
              style={{
                width: "100%",
                maxWidth: 320,
                display: "block",
                textAlign: "center",
                padding: "16px 0",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                background:
                  "linear-gradient(170deg, rgba(206,132,98,0.97), rgba(162,96,62,0.97))",
                border: "1px solid rgba(194,122,92,0.3)",
                color: "white",
                boxShadow: "0 8px 32px rgba(194,122,92,0.25)",
                cursor: "pointer",
              }}
            >
              Back to the app
            </button>
          ) : (
            <>
              <Link
                href="/pressure-profile"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  display: "block",
                  textAlign: "center",
                  padding: "16px 0",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  background:
                    "linear-gradient(170deg, rgba(206,132,98,0.97), rgba(162,96,62,0.97))",
                  border: "1px solid rgba(194,122,92,0.3)",
                  color: "white",
                  boxShadow: "0 8px 32px rgba(194,122,92,0.25)",
                  textDecoration: "none",
                }}
              >
                Take the Pressure Profile
              </Link>

              <Link
                href="/login"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  display: "block",
                  textAlign: "center",
                  padding: "14px 0",
                  borderRadius: 12,
                  fontSize: 14,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(161,161,170,0.6)",
                  textDecoration: "none",
                }}
              >
                Log in to save your fingerprint
              </Link>
            </>
          )}
        </motion.div>

        {/* 6. Share line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.95, ease: EASE }}
          style={{
            fontSize: 13,
            color: "rgba(161,161,170,0.3)",
            fontStyle: "italic",
            marginTop: 24,
            textAlign: "center",
          }}
        >
          Your friends will read this and recognise you.
        </motion.div>
      </div>
    </div>
  );
}
