"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  drawEQScenarios,
  calculateEQScores,
  getWeakestDomain,
  getArchetype,
  generateOpeningParagraph,
  resolveOptionText,
  resolveScenarioSituation,
  type EQDomain,
  type EQScenario,
} from "@/lib/eqQuestions";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { hasStoredPublicEQResult } from "@/lib/publicEQ";
import {
  isWorkPattern,
  WORK_PATTERN_LABEL,
  WORK_PATTERN_VALUES,
  type WorkPattern,
} from "@/lib/workPattern";
import type { TablesInsert } from "@/lib/types/supabase";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Phase = "intro" | "quiz" | "done";

const DOMAIN_LABELS: Record<EQDomain, string> = {
  pressure_reading: "Pressure Reading",
  repair_instinct: "Repair Instinct",
  presence_quality: "Presence Quality",
  boundary_intel: "Boundary Intelligence",
  recovery_aware: "Recovery Awareness",
  signal_accuracy: "Signal Accuracy",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export default function PressureEQPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicFlow = !pathname.startsWith("/app/");

  const [phase, setPhase] = useState<Phase>("intro");
  const [hasKids, setHasKids] = useState(false);
  const [hasPartner, setHasPartner] = useState(true);
  const [workPattern, setWorkPattern] = useState<WorkPattern>("fixed_hours");
  const [scenarios, setScenarios] = useState<EQScenario[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [shuffledOptions, setShuffledOptions] = useState<number[]>([0, 1, 2, 3]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // If public flow already has a saved result, skip straight to the result page
  useEffect(() => {
    if (!isPublicFlow) return;
    if (hasStoredPublicEQResult()) {
      router.replace("/pressure-eq/result");
    }
  }, [isPublicFlow, router]);

  // Pre-fill toggles for logged-in users from their persisted profile.
  // Reads user_profile.defaults — never PP localStorage (EQ owns its own
  // capture). The previous read looked for hasKidsContext/hasPartnerContext
  // keys that PP never writes (PP writes home_setup), so the read was a
  // silent no-op. Replaced with a typed DB lookup that derives kids/partner
  // from default_situation and pulls work_pattern directly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data } = await supabase
          .from("user_profile")
          .select("defaults")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        const defaults = (data?.defaults ?? null) as Record<string, unknown> | null;
        if (!defaults) return;
        const situation = typeof defaults.default_situation === "string" ? defaults.default_situation : null;
        if (situation === "kids_around") {
          setHasKids(true);
          setHasPartner(false);
        } else if (situation === "partner_nearby" || situation === "long_distance") {
          setHasPartner(true);
          setHasKids(false);
        } else if (situation === "alone") {
          setHasPartner(false);
          setHasKids(false);
        }
        if (isWorkPattern(defaults.work_pattern)) {
          setWorkPattern(defaults.work_pattern);
        }
      } catch {
        // ignore — toggles keep their initial defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Shuffle options whenever the scenario changes
  useEffect(() => {
    setShuffledOptions(shuffle([0, 1, 2, 3]));
    setSelectedOption(null);
  }, [currentIndex]);

  function startQuiz() {
    const drawn = drawEQScenarios({
      hasKidsContext: hasKids,
      hasPartnerContext: hasPartner,
    });
    setScenarios(drawn);
    setCurrentIndex(0);
    setAnswers({});
    setPhase("quiz");
  }

  async function handleOptionSelect(optionIndex: number) {
    if (selectedOption !== null) return;
    const scenario = scenarios[currentIndex];
    if (!scenario) return;

    const option = scenario.options[optionIndex];
    if (!option) return;

    setSelectedOption(optionIndex);
    const newAnswers = { ...answers, [scenario.id]: optionIndex };

    await new Promise<void>((resolve) => setTimeout(resolve, 280));

    if (currentIndex < scenarios.length - 1) {
      setAnswers(newAnswers);
      setCurrentIndex((i) => i + 1);
    } else {
      // Final answer — compute and save
      const scores = calculateEQScores(newAnswers);
      const weakestDomain = getWeakestDomain(scores);
      const archetype = getArchetype(scores);
      const openingParagraph = generateOpeningParagraph(scores, weakestDomain, hasPartner, hasKids);

      const result = {
        scores,
        weakestDomain,
        archetype,
        openingParagraph,
        hasPartnerContext: hasPartner,
        hasKidsContext: hasKids,
      };

      try {
        localStorage.setItem("driftlatch_eq_result", JSON.stringify(result));
        localStorage.setItem("driftlatch_eq_completed_at", new Date().toISOString());
      } catch {
        // ignore storage errors
      }

      // Attempt to save to DB if user is logged in
      try {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          // Intersection adds work_pattern to the generated Insert type. After
          // running `supabase gen types typescript` against the new migration,
          // the field will appear in TablesInsert<"user_eq_profile"> directly
          // and this intersection becomes a no-op (safe to leave or remove).
          const upsertPayload: TablesInsert<"user_eq_profile"> & {
            work_pattern?: WorkPattern | null;
          } = {
            user_id: session.user.id,
            pressure_reading: scores.pressure_reading,
            repair_instinct: scores.repair_instinct,
            presence_quality: scores.presence_quality,
            boundary_intel: scores.boundary_intel,
            recovery_aware: scores.recovery_aware,
            signal_accuracy: scores.signal_accuracy,
            weakest_domain: weakestDomain,
            archetype,
            has_kids_context: hasKids,
            has_partner_context: hasPartner,
            opening_paragraph: openingParagraph,
            completed_at: new Date().toISOString(),
            work_pattern: workPattern,
          };
          const { error: upsertError } = await supabase
            .from("user_eq_profile")
            .upsert(upsertPayload, { onConflict: "user_id" });
          if (upsertError) console.error("EQ profile upsert error:", upsertError);
        }
      } catch (err) {
        console.error("EQ profile save threw:", err);
      }

      router.push("/pressure-eq/result");
    }
  }

  const scenario = scenarios[currentIndex] ?? null;
  const total = scenarios.length || 8;

  // ── INTRO ─────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#0B0B0E",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 500,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(194,122,92,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Kicker pill */}
          <div
            style={{
              display: "inline-flex",
              padding: "5px 14px",
              borderRadius: 999,
              border: "1px solid rgba(194,122,92,0.2)",
              background: "rgba(194,122,92,0.07)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(194,122,92,0.85)",
              marginBottom: 24,
            }}
          >
            Pressure EQ
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2rem,5vw,3.2rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "var(--text)",
              lineHeight: 1.08,
              maxWidth: 600,
              textAlign: "center",
              marginBottom: 16,
              margin: "0 0 16px",
            }}
          >
            How does your emotional intelligence hold up when it matters most?
          </h1>

          <p
            style={{
              fontSize: 15,
              color: "rgba(161,161,170,0.65)",
              lineHeight: 1.7,
              maxWidth: 420,
              textAlign: "center",
              marginBottom: 48,
              margin: "0 0 48px",
            }}
          >
            8 real situations. No right answers. A clear picture of how you actually show up under pressure.
          </p>

          {/* Context questions */}
          <div
            style={{
              fontSize: 13,
              color: "rgba(161,161,170,0.45)",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            A few quick things so your questions fit your life.
          </div>

          <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Kids at home */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: "rgba(161,161,170,0.55)", textAlign: "center" }}>
                Kids at home
              </span>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {(["Yes", "Not right now"] as const).map((label) => {
                  const active = label === "Yes" ? hasKids : !hasKids;
                  return (
                    <button
                      key={label}
                      onClick={() => setHasKids(label === "Yes")}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        minHeight: 44,
                        border: active
                          ? "1px solid rgba(194,122,92,0.3)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: active
                          ? "rgba(194,122,92,0.12)"
                          : "rgba(255,255,255,0.04)",
                        color: active
                          ? "rgba(194,122,92,0.9)"
                          : "rgba(161,161,170,0.55)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In a relationship */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: "rgba(161,161,170,0.55)", textAlign: "center" }}>
                In a relationship
              </span>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {(["Yes", "Not right now"] as const).map((label) => {
                  const active = label === "Yes" ? hasPartner : !hasPartner;
                  return (
                    <button
                      key={label}
                      onClick={() => setHasPartner(label === "Yes")}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        minHeight: 44,
                        border: active
                          ? "1px solid rgba(194,122,92,0.3)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: active
                          ? "rgba(194,122,92,0.12)"
                          : "rgba(255,255,255,0.04)",
                        color: active
                          ? "rgba(194,122,92,0.9)"
                          : "rgba(161,161,170,0.55)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Your work — 2x2 grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: "rgba(161,161,170,0.55)", textAlign: "center" }}>
                Your work
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {WORK_PATTERN_VALUES.map((v) => {
                  const active = workPattern === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setWorkPattern(v)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        minHeight: 44,
                        border: active
                          ? "1px solid rgba(194,122,92,0.3)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: active
                          ? "rgba(194,122,92,0.12)"
                          : "rgba(255,255,255,0.04)",
                        color: active
                          ? "rgba(194,122,92,0.9)"
                          : "rgba(161,161,170,0.55)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {WORK_PATTERN_LABEL[v]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            className="eq-cta-btn"
            onClick={startQuiz}
            style={{
              marginTop: 36,
              padding: "15px 40px",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              background:
                "linear-gradient(170deg, rgba(206,132,98,0.97), rgba(162,96,62,0.97))",
              border: "1px solid rgba(194,122,92,0.3)",
              color: "white",
              boxShadow: "0 8px 32px rgba(194,122,92,0.25)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Start. Takes about 4 minutes.
          </button>

          <div
            style={{
              fontSize: 12,
              color: "rgba(161,161,170,0.35)",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            No account needed. Nothing stored unless you choose.
          </div>
        </motion.div>
      </div>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────

  if (phase === "quiz" && scenario) {
    const domainLabel = DOMAIN_LABELS[scenario.primaryDomain];

    return (
      <div
        style={{
          height: "100dvh",
          background: "#0B0B0E",
          display: "flex",
          flexDirection: "column",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            width: "min(600px, calc(100vw - 48px))",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Progress bar area */}
          <div style={{ paddingTop: 48, marginBottom: 8 }}>
            <div
              style={{
                width: "100%",
                height: 2,
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: "rgba(194,122,92,0.6)",
                  width: `${(currentIndex / total) * 100}%`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(161,161,170,0.35)",
                  fontWeight: 500,
                }}
              >
                {currentIndex + 1} of {total}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(161,161,170,0.25)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {domainLabel}
              </span>
            </div>
          </div>

          {/* Scenario area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingBottom: 40,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                <p
                  style={{
                    fontSize: "clamp(1.05rem,2.5vw,1.25rem)",
                    color: "rgba(244,244,245,0.9)",
                    lineHeight: 1.7,
                    fontWeight: 400,
                    marginBottom: 36,
                    margin: "0 0 36px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {resolveScenarioSituation(scenario, workPattern)}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {shuffledOptions.map((optIdx) => {
                    const opt = scenario.options[optIdx];
                    if (!opt) return null;
                    const isSelected = selectedOption === optIdx;
                    return (
                      <EQOptionButton
                        key={optIdx}
                        text={resolveOptionText(opt, workPattern)}
                        isSelected={isSelected}
                        onClick={() => handleOptionSelect(optIdx)}
                      />
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // "done" phase — router.push already called
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0B0B0E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ color: "rgba(161,161,170,0.5)", fontSize: 14 }}
      >
        Calculating...
      </motion.div>
    </div>
  );
}

// ── Option button ──────────────────────────────────────────

function EQOptionButton({
  text,
  isSelected,
  onClick,
}: {
  text: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const btnStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    padding: "18px 20px",
    background: isSelected
      ? "rgba(194,122,92,0.12)"
      : hovered
        ? "rgba(194,122,92,0.06)"
        : "rgba(255,255,255,0.04)",
    border: isSelected
      ? "1px solid rgba(194,122,92,0.35)"
      : hovered
        ? "1px solid rgba(194,122,92,0.18)"
        : "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    textAlign: "left",
    fontSize: 14,
    color: isSelected
      ? "rgba(244,244,245,0.95)"
      : hovered
        ? "rgba(244,244,245,0.9)"
        : "rgba(244,244,245,0.7)",
    lineHeight: 1.6,
    fontWeight: 400,
    cursor: "pointer",
    transition: "all 0.18s ease",
  };

  const accentBarStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: "16px 0 0 16px",
    background: isSelected
      ? "rgba(194,122,92,0.8)"
      : hovered
        ? "rgba(194,122,92,0.4)"
        : "rgba(194,122,92,0)",
    transition: "background 0.18s ease",
  };

  return (
    <motion.button
      animate={isSelected ? { scale: [1, 1.005, 1] } : { scale: 1 }}
      transition={isSelected ? { duration: 0.28 } : {}}
      style={btnStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div aria-hidden style={accentBarStyle} />
      {text}
    </motion.button>
  );
}
