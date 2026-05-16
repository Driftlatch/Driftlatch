"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { type EQDomain } from "@/lib/eqQuestions";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { selectTool } from "@/lib/selectTool";
import { getPackName, type DriftNeed, type DriftState } from "@/lib/toolLibrary";
import EQHexagon from "@/components/EQHexagon";
import {
  clearStoredPublicEQResult,
  writeStoredPublicEQResult,
} from "@/lib/publicEQ";

// Map each EQ domain to a default state that the matched-support card uses
// to surface one representative tool for that user's weakest pattern.
const EQ_DOMAIN_TO_STATE: Record<EQDomain, DriftState> = {
  pressure_reading: "carrying_work",
  repair_instinct: "drained",
  presence_quality: "carrying_work",
  boundary_intel: "overloaded",
  recovery_aware: "drained",
  signal_accuracy: "wired",
};

// Default need by state. selectTool requires a need; this picks a reasonable
// one so the surfaced tool makes sense for the implied moment.
const STATE_TO_NEED: Record<DriftState, DriftNeed> = {
  clear_light: "be_here",
  steady: "be_here",
  carrying_work: "regain_clarity",
  wired: "wind_down",
  drained: "wind_down",
  overloaded: "regain_clarity",
};

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return match?.[0]?.trim() || text;
}

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

// Sentence-case labels for share copy (reads more natural inline)
const SHARE_DOMAIN_LABELS: Record<EQDomain, string> = {
  pressure_reading: "Pressure reading",
  repair_instinct: "Repair instinct",
  presence_quality: "Presence quality",
  boundary_intel: "Boundary intelligence",
  recovery_aware: "Recovery awareness",
  signal_accuracy: "Signal accuracy",
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
  const pathname = usePathname();
  const isPublicFlow = !pathname.startsWith("/app/");
  const [result, setResult] = useState<EQResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
            const loggedIn = Boolean(session?.user?.id);
            setIsLoggedIn(loggedIn);

            // Persist a save-for-later copy in public flow only
            if (!loggedIn && isPublicFlow) {
              writeStoredPublicEQResult(parsed);
            }

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
  }, [isPublicFlow]);

  // Matched support teaser: compute one tool to show as a paid-product preview.
  // Only meaningful in public flow; the in-app dashboard has its own paths.
  const matchedSupport = useMemo(() => {
    if (!result) return null;
    const state = EQ_DOMAIN_TO_STATE[result.weakestDomain];
    const need = STATE_TO_NEED[state];
    const selection = selectTool({
      state,
      need,
      situation: "alone",
      timeMinutes: 5,
      mode: "quick",
      pressureDirection: null,
    });
    return selection.primary;
  }, [result]);

  function handleRetake() {
    try {
      localStorage.removeItem("driftlatch_eq_result");
      localStorage.removeItem("driftlatch_eq_completed_at");
    } catch {
      // ignore
    }
    clearStoredPublicEQResult();
    router.push("/pressure-eq");
  }

  function buildShareMessage(weakest: EQDomain) {
    const label = SHARE_DOMAIN_LABELS[weakest];
    return `Just took this 4-min test on how I handle pressure. My weakest domain: ${label}.\n\nIf you're a founder, it's worth 4 minutes. driftlatch.com/pressure-eq`;
  }

  function handleShareX() {
    if (!result) return;
    const msg = buildShareMessage(result.weakestDomain);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    console.info("[eq-share]", { type: "x", weakest_domain: result.weakestDomain });
  }

  async function handleCopyLink() {
    if (!result) return;
    const msg = buildShareMessage(result.weakestDomain);
    try {
      await navigator.clipboard.writeText(msg);
      setCopyState("copied");
      console.info("[eq-share]", { type: "copy", weakest_domain: result.weakestDomain });
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

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

        {/* Share your result — public flow only */}
        {isPublicFlow && !isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.7, ease: EASE }}
            style={{
              marginTop: 32,
              borderRadius: 18,
              background: "rgba(18,18,22,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(161,161,170,0.4)",
              }}
            >
              Share your result
            </div>
            <p
              style={{
                fontSize: 13,
                color: "rgba(244,244,245,0.7)",
                margin: "4px 0 14px",
                lineHeight: 1.5,
              }}
            >
              A line about your pattern helps others find this.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={handleShareX}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(194,122,92,0.28)",
                  background: "rgba(194,122,92,0.12)",
                  color: "rgba(194,122,92,0.95)",
                  cursor: "pointer",
                }}
              >
                Share on X
              </button>
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(244,244,245,0.85)",
                  cursor: "pointer",
                }}
              >
                {copyState === "copied"
                  ? "Copied ✓"
                  : copyState === "error"
                    ? "Copy failed"
                    : "Copy link"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Matched support teaser — public flow only */}
        {isPublicFlow && !isLoggedIn && matchedSupport ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.75, ease: EASE }}
            style={{ marginTop: 36 }}
          >
            <div style={{ display: "grid", gap: 4, marginBottom: 14, textAlign: "center" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(194,122,92,0.7)",
                }}
              >
                A first move for you
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "rgba(161,161,170,0.6)",
                  lineHeight: 1.55,
                  maxWidth: 420,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                Based on your weakest domain. The paid product surfaces matches like this for every state you are in.
              </p>
            </div>

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "28px 24px",
                borderRadius: 20,
                background: "rgba(18,18,22,0.6)",
                border: "1px solid rgba(255,255,255,0.07)",
                display: "grid",
                gap: 14,
              }}
            >
              {/* Clay top accent — paid product visual signal */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 16,
                  right: 16,
                  height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(194,122,92,0.34), transparent)",
                  pointerEvents: "none",
                }}
              />

              <span
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  border: "1px solid rgba(194,122,92,0.28)",
                  background: "rgba(194,122,92,0.10)",
                  color: "rgba(214,154,124,0.92)",
                }}
              >
                {getPackName(matchedSupport.pack_id)}
              </span>

              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.4rem, 3.4vw, 1.8rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  color: "rgba(244,244,245,0.95)",
                }}
              >
                {matchedSupport.title}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(161,161,170,0.85)",
                }}
              >
                {firstSentence(matchedSupport.do)}
              </p>

              <Link
                href={`/pricing?teasedTool=${matchedSupport.id}`}
                style={{
                  width: "100%",
                  minHeight: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: 14,
                  border: "1px solid rgba(194,122,92,0.30)",
                  background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
                  boxShadow: "0 14px 36px rgba(194,122,92,0.26), inset 0 1px 0 rgba(255,255,255,0.14)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  textDecoration: "none",
                  marginTop: 4,
                }}
              >
                Open
                <span style={{ opacity: 0.72, fontSize: 16 }}>→</span>
              </Link>
            </div>
          </motion.div>
        ) : null}

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
          {isPublicFlow && !isLoggedIn ? (
            <>
              <Link
                href="/pricing"
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
                See pricing →
              </Link>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                <Link
                  href="/buy?plan=annual"
                  style={{
                    flex: 1,
                    display: "block",
                    textAlign: "center",
                    padding: "13px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1px solid rgba(194,122,92,0.22)",
                    background: "rgba(194,122,92,0.08)",
                    color: "rgba(244,244,245,0.85)",
                    textDecoration: "none",
                  }}
                >
                  Start annual
                </Link>
                <Link
                  href="/buy?plan=monthly"
                  style={{
                    flex: 1,
                    display: "block",
                    textAlign: "center",
                    padding: "13px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1px solid rgba(194,122,92,0.22)",
                    background: "rgba(194,122,92,0.08)",
                    color: "rgba(244,244,245,0.85)",
                    textDecoration: "none",
                  }}
                >
                  Start monthly
                </Link>
              </div>

              <Link
                href="/pressure-profile"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  display: "block",
                  textAlign: "center",
                  padding: "13px 0",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(244,244,245,0.78)",
                  textDecoration: "none",
                }}
              >
                Take the Pressure Profile
              </Link>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                <button
                  type="button"
                  onClick={handleRetake}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(161,161,170,0.6)",
                    cursor: "pointer",
                  }}
                >
                  Retake
                </button>
                <Link
                  href="/"
                  style={{
                    flex: 1,
                    display: "block",
                    textAlign: "center",
                    padding: "11px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(161,161,170,0.6)",
                    textDecoration: "none",
                  }}
                >
                  Back to site
                </Link>
              </div>

              <p
                style={{
                  marginTop: 8,
                  maxWidth: 360,
                  textAlign: "center",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(161,161,170,0.45)",
                }}
              >
                This result is saved in this browser until you log in or start a plan.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/app/checkin")}
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
                Open your first step →
              </button>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                <button
                  type="button"
                  onClick={handleRetake}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(161,161,170,0.6)",
                    cursor: "pointer",
                  }}
                >
                  Retake
                </button>
                <Link
                  href="/app"
                  style={{
                    flex: 1,
                    display: "block",
                    textAlign: "center",
                    padding: "11px 0",
                    borderRadius: 12,
                    fontSize: 13,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(161,161,170,0.6)",
                    textDecoration: "none",
                  }}
                >
                  Back to home
                </Link>
              </div>
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
