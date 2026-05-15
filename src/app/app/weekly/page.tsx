"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoAnimation from "@/components/LogoAnimation";
import { motion } from "framer-motion";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { loadCurrentUserAppState } from "@/lib/auth";
import { getRoomToneLabel } from "@/lib/roomTone";
import { getNeedLabel } from "@/lib/supportLabels";
import { getSupabase } from "@/lib/supabase";
import {
  EMPTY_WEEKLY_CHECKINS_FETCH_META,
  RANGE_DAYS,
  STATE_LABEL,
  STATE_LADDER,
  accentForState,
  buildDayNote,
  buildWeeklyReflection,
  fetchWeeklyCheckins,
  getWeeklyRangeBounds,
  getStateRank,
  normalizeCheckinRows,
  normalizeRecentRows,
  roomToneAccent,
  toolTitle,
  type WeeklyCheckinRow as CheckinRow,
  type WeeklyCheckinsFetchMeta,
  type WeeklyFeedbackRow as FeedbackRow,
  type WeeklyRecentRow as RecentRow,
} from "@/lib/weeklyReflection";

const MotionLink = motion(Link);
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const LADDER_TOP = 18;
const LADDER_ROW_GAP = 36;
const CHART_HEIGHT = LADDER_TOP * 2 + LADDER_ROW_GAP * (STATE_LADDER.length - 1);

function getLadderTop(rank: number) {
  return LADDER_TOP + rank * LADDER_ROW_GAP;
}

function InnerHighlight() {
  return <div aria-hidden style={innerHighlightStyle} />;
}

function GlassCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="wk-glass" style={style}>
      <InnerHighlight />
      {children}
    </div>
  );
}

// ─── EQ Pulse types & constants ──────────────────────────────────────────────

type EQDomain =
  | "pressure_reading"
  | "repair_instinct"
  | "presence_quality"
  | "boundary_intel"
  | "recovery_aware"
  | "signal_accuracy";

type EQProfileRow = {
  pressure_reading: number;
  repair_instinct: number;
  presence_quality: number;
  boundary_intel: number;
  recovery_aware: number;
  signal_accuracy: number;
  weakest_domain: string;
};

type MoodLog = { created_at: string; state: string };

const EQ_STATE_DELTA: Record<string, number> = {
  clear_light: 8,
  steady: 3,
  carrying_work: -5,
  wired: -12,
  drained: -10,
  overloaded: -18,
};

const EQ_DOMAIN_ORDER: EQDomain[] = [
  "pressure_reading",
  "repair_instinct",
  "presence_quality",
  "boundary_intel",
  "recovery_aware",
  "signal_accuracy",
];

const EQ_DOMAIN_LABELS: Record<EQDomain, string> = {
  pressure_reading: "Pressure Reading",
  repair_instinct: "Repair Instinct",
  presence_quality: "Presence Quality",
  boundary_intel: "Boundary Intel",
  recovery_aware: "Recovery Awareness",
  signal_accuracy: "Signal Accuracy",
};

const EQ_DOMAIN_RGB: Record<EQDomain, string> = {
  pressure_reading: "194,122,92",
  repair_instinct: "120,190,150",
  presence_quality: "120,190,150",
  boundary_intel: "208,164,92",
  recovery_aware: "100,160,200",
  signal_accuracy: "180,120,200",
};

function eqDomainColor(domain: EQDomain, opacity: number): string {
  return `rgba(${EQ_DOMAIN_RGB[domain]},${opacity})`;
}

function getEQDomainScore(profile: EQProfileRow, domain: EQDomain): number {
  const map: Record<EQDomain, number> = {
    pressure_reading: profile.pressure_reading,
    repair_instinct: profile.repair_instinct,
    presence_quality: profile.presence_quality,
    boundary_intel: profile.boundary_intel,
    recovery_aware: profile.recovery_aware,
    signal_accuracy: profile.signal_accuracy,
  };
  return map[domain];
}

// ─── EQ Pulse section component ───────────────────────────────────────────────

function EQPulseSection({
  eqProfile,
  moodLogs,
  momentReviewCount,
  onGoMoment,
  onGoEq,
}: {
  eqProfile: EQProfileRow;
  moodLogs: MoodLog[];
  momentReviewCount: number;
  onGoMoment: () => void;
  onGoEq: () => void;
}) {
  const baseline = Math.round(
    (eqProfile.pressure_reading +
      eqProfile.repair_instinct +
      eqProfile.presence_quality +
      eqProfile.boundary_intel +
      eqProfile.recovery_aware +
      eqProfile.signal_accuracy) /
      6,
  );

  const dayEqScores = moodLogs.map((log) => {
    const delta = EQ_STATE_DELTA[log.state] ?? 0;
    return Math.max(15, Math.min(100, baseline + delta));
  });

  const weeklyAvg =
    dayEqScores.length > 0
      ? Math.round(dayEqScores.reduce((a, b) => a + b, 0) / dayEqScores.length)
      : null;

  const weakestLabel =
    EQ_DOMAIN_LABELS[eqProfile.weakest_domain as EQDomain] ?? eqProfile.weakest_domain;

  let observation: string;
  if (moodLogs.length < 3) {
    observation = "Log your mood daily to see your EQ pattern build over time.";
  } else if (weeklyAvg !== null && weeklyAvg >= baseline + 5) {
    observation = "You stayed above your baseline all week. Something is working.";
  } else if (weeklyAvg !== null && weeklyAvg <= baseline - 10) {
    observation = `Pressure pulled your EQ down this week. Your ${weakestLabel} domain felt it most.`;
  } else if (momentReviewCount > 0) {
    const momentWord = momentReviewCount === 1 ? "moment" : "moments";
    observation = `You reflected on ${momentReviewCount} ${momentWord} this week. That awareness is the work.`;
  } else {
    observation = "Your EQ held steady this week relative to your baseline.";
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.46, delay: 0.18, ease: EASE }}
      style={{ marginTop: 24, marginBottom: 12 }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: "rgba(161,161,170,0.4)",
          marginBottom: 16,
        }}
      >
        YOUR EQ THIS WEEK
      </div>

      <GlassCard style={{ padding: "22px 20px" }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            {weeklyAvg !== null ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: "-0.05em",
                    color: "rgba(194,122,92,0.85)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {weeklyAvg}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase" as const,
                    color: "rgba(161,161,170,0.4)",
                    marginTop: 4,
                  }}
                >
                  Weekly average
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "rgba(161,161,170,0.45)",
                  lineHeight: 1.4,
                }}
              >
                No data yet
              </div>
            )}
          </div>

          {weeklyAvg !== null ? (
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                marginTop: 8,
                color:
                  weeklyAvg >= baseline
                    ? "rgba(120,190,150,0.8)"
                    : "rgba(208,164,92,0.7)",
              }}
            >
              {weeklyAvg >= baseline
                ? `+${weeklyAvg - baseline} above baseline`
                : `${baseline - weeklyAvg} below baseline`}
            </div>
          ) : null}
        </div>

        {/* Mini domain bars */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            position: "relative",
            zIndex: 1,
          }}
        >
          {EQ_DOMAIN_ORDER.map((domain) => {
            const score = getEQDomainScore(eqProfile, domain);
            return (
              <div key={domain} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(161,161,170,0.45)",
                    width: 130,
                    flexShrink: 0,
                  }}
                >
                  {EQ_DOMAIN_LABELS[domain]}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${score}%`,
                      height: 4,
                      borderRadius: 999,
                      background: eqDomainColor(domain, 0.6),
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(161,161,170,0.5)",
                    width: 28,
                    textAlign: "right" as const,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {score}
                </span>
              </div>
            );
          })}
        </div>

        {/* Observation */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "rgba(161,161,170,0.5)",
              lineHeight: 1.6,
              fontStyle: "italic",
            }}
          >
            {observation}
          </p>
        </div>
      </GlassCard>

      {/* Link row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 10,
        }}
      >
        <button
          type="button"
          onClick={onGoMoment}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            color: "rgba(194,122,92,0.6)",
          }}
        >
          Review a moment &rarr;
        </button>
        <button
          type="button"
          onClick={onGoEq}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            color: "rgba(161,161,170,0.35)",
          }}
        >
          Full EQ view &rarr;
        </button>
      </div>
    </motion.section>
  );
}

// ─── Sunday EQ micro-question ─────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

type MicroQuestion = {
  question: string;
  options: string[];
  domain: EQDomain;
};

const MICRO_QUESTIONS: Record<string, MicroQuestion> = {
  heavy_work: {
    question: "How present were you with the people at home this week?",
    options: [
      "Genuinely there most of the time",
      "There but not fully landing",
      "Going through the motions mostly",
      "Barely present if honest",
    ],
    domain: "presence_quality",
  },
  depleted: {
    question: "What did recovery look like for you this week?",
    options: [
      "I found real rest at some point",
      "I rested on the surface but did not reset",
      "I pushed through without recovering",
      "I am not sure I know what recovery feels like for me anymore",
    ],
    domain: "recovery_aware",
  },
  good: {
    question: "Was there a moment this week you wish you had handled differently?",
    options: [
      "Not really. The week was solid.",
      "One small thing but nothing major",
      "Yes. I want to reflect on it.",
      "A few things. It was harder than the overall pattern suggests.",
    ],
    domain: "repair_instinct",
  },
  mixed: {
    question:
      "How accurately did you read what the people closest to you needed this week?",
    options: [
      "Pretty well. I stayed tuned in.",
      "Okay when I was at my best. Missed things when tired.",
      "I think I missed more than I caught.",
      "Honestly I was too in my own head to notice much.",
    ],
    domain: "pressure_reading",
  },
};

function getMostFrequentState(logs: MoodLog[]): string | null {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    counts[log.state] = (counts[log.state] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function getMicroQuestion(dominantState: string | null): MicroQuestion {
  if (dominantState === "carrying_work" || dominantState === "wired") {
    return MICRO_QUESTIONS.heavy_work!;
  }
  if (dominantState === "drained" || dominantState === "overloaded") {
    return MICRO_QUESTIONS.depleted!;
  }
  if (dominantState === "clear_light" || dominantState === "steady") {
    return MICRO_QUESTIONS.good!;
  }
  return MICRO_QUESTIONS.mixed!;
}

function SundayMicroQuestion({ moodLogs }: { moodLogs: MoodLog[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const today = new Date();
  const storageKey = `driftlatch_eq_micro_${today.getFullYear()}_${getISOWeek(today)}`;

  const dominantState = getMostFrequentState(moodLogs);
  const microQ = getMicroQuestion(dominantState);

  const handleSelect = (optionIndex: number) => {
    if (selectedIdx !== null || done) return;
    setSelectedIdx(optionIndex);

    setTimeout(() => {
      void (async () => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, String(optionIndex));
        }
        try {
          const supabase = getSupabase();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            await (supabase as any).from("user_eq_checkins").insert({
              user_id: session.user.id,
              micro_question: microQ.question,
              response: optionIndex + 1,
              domain: microQ.domain,
              state_at_checkin: dominantState,
            });
          }
        } catch {
          // silent
        }
        setDone(true);
      })();
    }, 300);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.46, delay: 0.3, ease: EASE }}
      style={{ marginTop: 24 }}
    >
      <div
        className="wk-glass"
        style={{ padding: "28px 24px", position: "relative", overflow: "hidden" }}
      >
        {/* Clay top gradient */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              "linear-gradient(90deg, transparent, rgba(194,122,92,0.5), transparent)",
            borderRadius: "22px 22px 0 0",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "rgba(194,122,92,0.6)",
              marginBottom: 16,
            }}
          >
            SUNDAY CHECK
          </div>

          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "rgba(244,244,245,0.9)",
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            {microQ.question}
          </div>

          {done ? (
            <div
              style={{
                fontSize: 14,
                color: "rgba(161,161,170,0.45)",
                fontStyle: "italic",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              Noted. See you next Sunday.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {microQ.options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isHovered = hoveredIdx === idx && selectedIdx === null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(idx)}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      padding: "13px 16px",
                      borderRadius: 12,
                      border: isSelected
                        ? "1px solid rgba(194,122,92,0.32)"
                        : isHovered
                          ? "1px solid rgba(194,122,92,0.18)"
                          : "1px solid rgba(255,255,255,0.07)",
                      background: isSelected
                        ? "rgba(194,122,92,0.12)"
                        : isHovered
                          ? "rgba(194,122,92,0.06)"
                          : "rgba(255,255,255,0.03)",
                      fontSize: 13,
                      color: "rgba(244,244,245,0.72)",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      textAlign: "left" as const,
                      width: "100%",
                      transition: "all 0.18s ease",
                      display: "block",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ─── Weekly Page ──────────────────────────────────────────────────────────────

export default function WeeklyPage() {
  const router = useRouter();
  const [currentCheckins, setCurrentCheckins] = useState<CheckinRow[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackRow[]>([]);
  const [currentRecentTools, setCurrentRecentTools] = useState<RecentRow[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyFetchError, setWeeklyFetchError] = useState<string | null>(null);
  const [weeklyFetchMeta, setWeeklyFetchMeta] = useState<WeeklyCheckinsFetchMeta>(EMPTY_WEEKLY_CHECKINS_FETCH_META);
  const [weeklyFetchWindow, setWeeklyFetchWindow] = useState<{ endIso: string | null; startIso: string | null }>({ endIso: null, startIso: null });
  const [selectedDayIdx, setSelectedDayIdx] = useState(RANGE_DAYS - 1);
  const [eqProfile, setEqProfile] = useState<EQProfileRow | null>(null);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [momentReviewCount, setMomentReviewCount] = useState(0);
  const [showMicroQuestion, setShowMicroQuestion] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const currentUser = await loadCurrentUserAppState();
        if (cancelled) return;

        if (!currentUser.session || !currentUser.userId) {
          setCurrentCheckins([]);
          setCurrentFeedback([]);
          setCurrentRecentTools([]);
          setIsLoggedIn(false);
          setWeeklyFetchError(null);
          setWeeklyFetchMeta(EMPTY_WEEKLY_CHECKINS_FETCH_META);
          setWeeklyFetchWindow({ endIso: null, startIso: null });
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);

        const userId = currentUser.userId;
        const { endIso: nowIso, startIso: currentStartIso } = getWeeklyRangeBounds(RANGE_DAYS);
        setWeeklyFetchWindow({ endIso: nowIso, startIso: currentStartIso });

        const [currentCheckinsRes, currentFeedbackRes, currentRecentRes] = await Promise.all([
          fetchWeeklyCheckins(supabase, userId, currentStartIso, nowIso),
          supabase.from("user_tool_feedback").select("created_at,helpful_score,shift,tool_id").eq("user_id", userId).gte("created_at", currentStartIso).lt("created_at", nowIso).order("created_at", { ascending: false }),
          supabase.from("user_recent_tools").select("tool_id,used_at").eq("user_id", userId).gte("used_at", currentStartIso).lt("used_at", nowIso).order("used_at", { ascending: false }),
        ]);

        if (cancelled) return;

        // EQ pulse data — failure silently suppresses the EQ section only
        try {
          const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          const [eqRes, moodRes, reviewRes] = await Promise.all([
            (supabase as any)
              .from("user_eq_profile")
              .select("pressure_reading,repair_instinct,presence_quality,boundary_intel,recovery_aware,signal_accuracy,weakest_domain")
              .eq("user_id", userId)
              .order("completed_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("user_checkins")
              .select("created_at,state")
              .eq("user_id", userId)
              .eq("source", "home")
              .gte("created_at", sevenDaysAgo)
              .lt("created_at", nowIso)
              .order("created_at", { ascending: true }),
            (supabase as any)
              .from("user_moment_reviews")
              .select("id")
              .eq("user_id", userId)
              .gte("created_at", sevenDaysAgo)
              .lt("created_at", nowIso),
          ]);
          if (!cancelled) {
            if (!eqRes.error) {
              const nextEqProfile = (eqRes.data as EQProfileRow) ?? null;
              setEqProfile(nextEqProfile);
              // Check Sunday micro-question conditions
              if (nextEqProfile && typeof window !== "undefined") {
                const now = new Date();
                if (now.getDay() === 0) {
                  const key = `driftlatch_eq_micro_${now.getFullYear()}_${getISOWeek(now)}`;
                  if (!window.localStorage.getItem(key)) {
                    setShowMicroQuestion(true);
                  }
                }
              }
            }
            if (!moodRes.error) setMoodLogs((moodRes.data as MoodLog[]) ?? []);
            if (!reviewRes.error) setMomentReviewCount(((reviewRes.data as unknown[]) ?? []).length);
          }
        } catch {
          // EQ section silently not rendered
        }

        setCurrentFeedback((currentFeedbackRes.data ?? []) as FeedbackRow[]);
        const nextRecent = normalizeRecentRows((currentRecentRes.data ?? []) as RecentRow[]);
        setCurrentRecentTools(nextRecent);
        setWeeklyFetchMeta(currentCheckinsRes.meta);

        if (currentCheckinsRes.error) {
          const errorMessage = currentCheckinsRes.error.message ?? "Weekly check-ins failed to load.";
          setWeeklyFetchError(errorMessage);
          if (process.env.NODE_ENV !== "production") {
            console.error("[weekly-fetch-error]", {
              endIso: nowIso,
              error: currentCheckinsRes.error,
              fullSelectFailed: currentCheckinsRes.meta.fullSelectFailed,
              safeSelectUsed: currentCheckinsRes.meta.safeSelectUsed,
              startIso: currentStartIso,
            });
          }
          setLoading(false);
          return;
        }

        const nextCheckins = normalizeCheckinRows((currentCheckinsRes.data ?? []) as CheckinRow[]);
        const nextReflection = buildWeeklyReflection({ checkins: nextCheckins, feedbackRows: (currentFeedbackRes.data ?? []) as FeedbackRow[], recentRows: nextRecent });
        setWeeklyFetchError(null);

        if (process.env.NODE_ENV !== "production") {
          const explicitCount = nextCheckins.filter((row) => row.source !== "implicit").length;
          const implicitCount = nextCheckins.filter((row) => row.source === "implicit").length;
          const roomToneCount = nextCheckins.filter((row) => typeof row.room_tone === "string" && row.room_tone.length > 0).length;
          const timestamps = nextCheckins.map((row) => row.created_at).filter((value): value is string => typeof value === "string").sort();
          console.info("[weekly-fetch-debug]", {
            explicitWeeklyCheckins: explicitCount,
            fetchedRowCount: nextCheckins.length,
            firstReturnedCreatedAt: timestamps[0] ?? null,
            fullSelectFailed: currentCheckinsRes.meta.fullSelectFailed,
            implicitWeeklyCheckins: implicitCount,
            lastReturnedCreatedAt: timestamps[timestamps.length - 1] ?? null,
            roomToneCheckins: roomToneCount,
            safeSelectUsed: currentCheckinsRes.meta.safeSelectUsed,
            startIso: currentStartIso,
            endIso: nowIso,
            finalSelectedRenderMode: nextReflection.mode,
          });
        }

        setCurrentCheckins(nextCheckins);
        setSelectedDayIdx(nextReflection.selectedDayIndex);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load weekly state:", error);
        setWeeklyFetchError(error instanceof Error ? error.message : String(error));
        setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const currentSummary = useMemo(
    () => buildWeeklyReflection({ checkins: currentCheckins, feedbackRows: currentFeedback, recentRows: currentRecentTools }),
    [currentCheckins, currentFeedback, currentRecentTools],
  );
  const daySummaries = currentSummary.days;
  const selectedDay = daySummaries[selectedDayIdx] ?? daySummaries[daySummaries.length - 1] ?? null;
  const accentColor = accentForState(currentSummary.accentState);
  const detailCountLabel = currentSummary.signalMode === "recent" ? "Sessions" : "Number of check-ins";
  const showFetchErrorState = Boolean(weeklyFetchError) && currentSummary.mode === "empty";

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const explicitCount = currentCheckins.filter((row) => row.source !== "implicit").length;
    const implicitCount = currentCheckins.filter((row) => row.source === "implicit").length;
    const roomToneCount = currentCheckins.filter((row) => typeof row.room_tone === "string" && row.room_tone.length > 0).length;
    const graphableDays = currentSummary.days.filter((day) => day.hasData).length;
    const timestamps = currentCheckins.map((row) => row.created_at).filter((value): value is string => typeof value === "string").sort();
    console.info("[weekly-debug]", {
      endIso: weeklyFetchWindow.endIso,
      explicitWeeklyCheckins: explicitCount,
      firstReturnedTimestamp: timestamps[0] ?? null,
      fullSelectFailed: weeklyFetchMeta.fullSelectFailed,
      graphableDays,
      implicitWeeklyCheckins: implicitCount,
      lastReturnedTimestamp: timestamps[timestamps.length - 1] ?? null,
      fetchedRowCount: currentCheckins.length,
      finalSelectedRenderMode: showFetchErrorState ? "error" : currentSummary.mode,
      roomToneCheckins: roomToneCount,
      safeSelectUsed: weeklyFetchMeta.safeSelectUsed,
      signalMode: currentSummary.signalMode,
      startIso: weeklyFetchWindow.startIso,
      summarySourceKey: currentSummary.summarySourceKey,
      usingSharedWeeklySource: true,
      visibleWeekEnd: currentSummary.visibleWeekEnd,
      visibleWeekStart: currentSummary.visibleWeekStart,
      weeklyFetchError,
    });
  }, [currentCheckins, currentSummary, showFetchErrorState, weeklyFetchError, weeklyFetchMeta, weeklyFetchWindow]);

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoAnimation variant="splash" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="wk-page" style={centeredMainStyle}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: EASE }} style={pageWrapStyle}>
          <GlassCard style={loggedOutCardStyle}>
            <h1 style={serifTitleStyle}>Your reflection lives here</h1>
            <p style={mutedCopyStyle}>Sign in to see the patterns shaping your week.</p>
            <MotionLink whileTap={{ scale: 0.97 }} href="/login" style={primaryButtonStyle}>Sign in -&gt;</MotionLink>
          </GlassCard>
        </motion.div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (showFetchErrorState) {
    return (
      <main className="wk-page" style={mainStyle}>
        <div style={atmosphereWrapStyle}>
          <motion.div aria-hidden style={{ ...blobStyle, width: 260, height: 260, top: -50, right: -40, background: `radial-gradient(circle, ${accentColor}22 0%, rgba(194,122,92,0.04) 54%, transparent 76%)` }} animate={{ opacity: [0.38, 0.68, 0.38], scale: [0.96, 1.04, 0.96] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden style={{ ...blobStyle, width: 220, height: 220, bottom: 90, left: -60, background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 52%, transparent 76%)" }} animate={{ opacity: [0.18, 0.3, 0.18], scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        <div className="film-grain" />
        <div style={pageWrapStyle}>
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }}>
            <div style={headerStyle}>
              <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={eyebrowStyle}>Weekly</span>
                <h1 style={serifTitleStyle}>This week</h1>
                <p style={subtitleStyle}>Weekly data could not load right now.</p>
              </div>
              <span style={quietMetaStyle}>{currentSummary.weekRangeTitle}</span>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>This is a fetch error, not an empty week.</div>
                  </div>
                </div>
                <div style={emptyStateBlockStyle}>
                  <p style={mutedCopyStyle}>{weeklyFetchError}</p>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => window.location.reload()} className="btn-primary">
                  Try again -&gt;
                </motion.button>
              </div>
            </GlassCard>
          </motion.section>
        </div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (currentSummary?.mode === "empty") {
    return (
      <main className="wk-page" style={mainStyle}>
        <div style={atmosphereWrapStyle}>
          <motion.div aria-hidden style={{ ...blobStyle, width: 260, height: 260, top: -50, right: -40, background: `radial-gradient(circle, ${accentColor}22 0%, rgba(194,122,92,0.04) 54%, transparent 76%)` }} animate={{ opacity: [0.38, 0.68, 0.38], scale: [0.96, 1.04, 0.96] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden style={{ ...blobStyle, width: 220, height: 220, bottom: 90, left: -60, background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 52%, transparent 76%)" }} animate={{ opacity: [0.18, 0.3, 0.18], scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        <div className="film-grain" />
        <div style={pageWrapStyle}>
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }}>
            <div style={headerStyle}>
              <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={eyebrowStyle}>Weekly</span>
                <h1 style={serifTitleStyle}>This week</h1>
                <p style={subtitleStyle}>Still getting a read on your week.</p>
              </div>
              <span style={quietMetaStyle}>{currentSummary.weekRangeTitle}</span>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>{currentSummary.title}</div>
                  </div>
                </div>
                <div style={emptyStateBlockStyle}>
                  <p style={mutedCopyStyle}>{currentSummary.body}</p>
                </div>
                <MotionLink whileTap={{ scale: 0.97 }} href="/app/checkin" className="btn-primary">
                  Start a check-in -&gt;
                </MotionLink>
              </div>
            </GlassCard>
          </motion.section>
        </div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  return (
    <main className="wk-page" style={mainStyle}>
      <div style={atmosphereWrapStyle}>
        <motion.div aria-hidden style={{ ...blobStyle, width: 260, height: 260, top: -50, right: -40, background: `radial-gradient(circle, ${accentColor}22 0%, rgba(194,122,92,0.04) 54%, transparent 76%)` }} animate={{ opacity: [0.38, 0.68, 0.38], scale: [0.96, 1.04, 0.96] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden style={{ ...blobStyle, width: 220, height: 220, bottom: 90, left: -60, background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 52%, transparent 76%)" }} animate={{ opacity: [0.18, 0.3, 0.18], scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <div className="film-grain" />
      <div style={pageWrapStyle}>
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }}>
          <div style={headerStyle}>
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={eyebrowStyle}>Weekly</span>
              <h1 style={serifTitleStyle}>This week</h1>
              <p style={subtitleStyle}>{currentSummary.summaryLine}</p>
            </div>
            <span style={quietMetaStyle}>{currentSummary.weekRangeTitle}</span>
          </div>
        </motion.section>

        {currentSummary.mode === "full" ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>{currentSummary.summaryLine}</div>
                  </div>
                </div>

                <div style={movementWrapStyle}>
                  <div style={axisStyle}>
                    {STATE_LADDER.map((state) => (
                      <div key={state} style={{ ...axisLabelStyle, top: getLadderTop(getStateRank(state)) }}>{STATE_LABEL[state]}</div>
                    ))}
                  </div>

                  <div style={chartPanelStyle}>
                    {STATE_LADDER.map((state) => (
                      <div key={state} style={{ ...ladderRuleStyle, top: getLadderTop(getStateRank(state)) }} />
                    ))}

                    <div style={dayColumnsStyle}>
                      {daySummaries.map((day, index) => {
                        const isActive = index === selectedDayIdx;
                        const latestAccent = accentForState(day.latestState);
                        const firstTop = day.firstStateRank !== null ? getLadderTop(day.firstStateRank) : null;
                        const latestTop = day.latestStateRank !== null ? getLadderTop(day.latestStateRank) : null;
                        const lineTop = firstTop !== null && latestTop !== null ? Math.min(firstTop, latestTop) : null;
                        const lineHeight = firstTop !== null && latestTop !== null ? Math.max(Math.abs(latestTop - firstTop), 2) : 0;

                        return (
                          <motion.button
                            key={day.key}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setSelectedDayIdx(index)}
                            onFocus={() => setSelectedDayIdx(index)}
                            style={dayButtonStyle(day.hasData, isActive)}
                          >
                            <div style={dayCanvasStyle}>
                              {day.hasData ? (
                                <>
                                  {lineTop !== null && lineHeight > 2 ? <div style={{ ...movementLineStyle, background: latestAccent, height: lineHeight, opacity: 0.22, top: lineTop }} /> : null}
                                  {firstTop !== null ? <div style={{ ...firstMarkerStyle, borderColor: `${latestAccent}66`, top: firstTop }} /> : null}
                                  {latestTop !== null ? <div style={{ ...latestMarkerStyle, background: latestAccent, boxShadow: isActive ? `0 10px 26px ${latestAccent}36` : `0 6px 18px ${latestAccent}18`, opacity: isActive ? 0.98 : 0.88, top: latestTop }} /> : null}
                                </>
                              ) : (
                                <div style={emptyColumnDotStyle} />
                              )}
                            </div>

                            <div style={dayLabelWrapStyle}>
                              <span style={dayLabelStyle}>{day.label}</span>
                              <span style={{ ...roomIndicatorStyle, background: roomToneAccent(day.latestRoomTone), opacity: day.latestRoomTone ? 1 : 0.16 }} />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {currentSummary.microInsight ? <p style={microInsightStyle}>{currentSummary.microInsight}</p> : null}

                {selectedDay?.hasData ? (
                  <div style={selectedDayCardStyle}>
                    <div style={selectedDayTitleStyle}>{selectedDay.tooltipLabel}</div>
                    <div className="wk-detail-grid">
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Started state</span><span style={detailValueStyle}>{selectedDay.firstState ? STATE_LABEL[selectedDay.firstState] : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Ended state</span><span style={detailValueStyle}>{selectedDay.latestState ? STATE_LABEL[selectedDay.latestState] : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>{detailCountLabel}</span><span style={detailValueStyle}>{selectedDay.checkinCount}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Highest intensity reached</span><span style={detailValueStyle}>{selectedDay.highestState ? STATE_LABEL[selectedDay.highestState] : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Main support used</span><span style={detailValueStyle}>{selectedDay.mainSupport ? getNeedLabel(selectedDay.mainSupport) : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Completion %</span><span style={detailValueStyle}>{selectedDay.completionRate !== null ? `${selectedDay.completionRate}%` : "Not tracked"}</span></div>
                      {selectedDay.firstRoomTone || selectedDay.latestRoomTone ? (
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Room tone change</span><span style={detailValueStyle}>{(getRoomToneLabel(selectedDay.firstRoomTone) ?? "Not tracked")} -&gt; {(getRoomToneLabel(selectedDay.latestRoomTone) ?? "Not tracked")}</span></div>
                      ) : null}
                    </div>
                    {buildDayNote(selectedDay) ? <p style={dayNoteStyle}>{buildDayNote(selectedDay)}</p> : null}
                  </div>
                ) : null}
              </div>
            </GlassCard>
          </motion.section>
        ) : (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>{currentSummary.summaryLine}</div>
                  </div>
                </div>

                <div style={fallbackContentStyle}>
                  <p style={mutedCopyStyle}>{currentSummary.body}</p>
                  <div style={movementWrapStyle}>
                    <div style={axisStyle}>
                      {STATE_LADDER.map((state) => (
                        <div key={state} style={{ ...axisLabelStyle, top: getLadderTop(getStateRank(state)) }}>{STATE_LABEL[state]}</div>
                      ))}
                    </div>

                    <div style={chartPanelStyle}>
                      {STATE_LADDER.map((state) => (
                        <div key={state} style={{ ...ladderRuleStyle, top: getLadderTop(getStateRank(state)) }} />
                      ))}

                      <div style={dayColumnsStyle}>
                        {daySummaries.map((day, index) => {
                          const isActive = index === selectedDayIdx;
                          const latestAccent = accentForState(day.latestState);
                          const firstTop = day.firstStateRank !== null ? getLadderTop(day.firstStateRank) : null;
                          const latestTop = day.latestStateRank !== null ? getLadderTop(day.latestStateRank) : null;
                          const lineTop = firstTop !== null && latestTop !== null ? Math.min(firstTop, latestTop) : null;
                          const lineHeight = firstTop !== null && latestTop !== null ? Math.max(Math.abs(latestTop - firstTop), 2) : 0;

                          return (
                            <motion.button
                              key={day.key}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => setSelectedDayIdx(index)}
                              onFocus={() => setSelectedDayIdx(index)}
                              style={dayButtonStyle(day.hasData, isActive)}
                            >
                              <div style={dayCanvasStyle}>
                                {day.hasData ? (
                                  <>
                                    {lineTop !== null && lineHeight > 2 ? <div style={{ ...movementLineStyle, background: latestAccent, height: lineHeight, opacity: 0.22, top: lineTop }} /> : null}
                                    {firstTop !== null ? <div style={{ ...firstMarkerStyle, borderColor: `${latestAccent}66`, top: firstTop }} /> : null}
                                    {latestTop !== null ? <div style={{ ...latestMarkerStyle, background: latestAccent, boxShadow: isActive ? `0 10px 26px ${latestAccent}36` : `0 6px 18px ${latestAccent}18`, opacity: isActive ? 0.98 : 0.88, top: latestTop }} /> : null}
                                  </>
                                ) : (
                                  <div style={emptyColumnDotStyle} />
                                )}
                              </div>

                              <div style={dayLabelWrapStyle}>
                                <span style={dayLabelStyle}>{day.label}</span>
                                <span style={{ ...roomIndicatorStyle, background: roomToneAccent(day.latestRoomTone), opacity: day.latestRoomTone ? 1 : 0.16 }} />
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {currentSummary.microInsight ? <p style={microInsightStyle}>{currentSummary.microInsight}</p> : null}
                  {selectedDay?.hasData ? (
                    <div style={selectedDayCardStyle}>
                      <div style={selectedDayTitleStyle}>{selectedDay.tooltipLabel}</div>
                      <div className="wk-detail-grid">
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Started state</span><span style={detailValueStyle}>{selectedDay.firstState ? STATE_LABEL[selectedDay.firstState] : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Ended state</span><span style={detailValueStyle}>{selectedDay.latestState ? STATE_LABEL[selectedDay.latestState] : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>{detailCountLabel}</span><span style={detailValueStyle}>{selectedDay.checkinCount}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Highest intensity reached</span><span style={detailValueStyle}>{selectedDay.highestState ? STATE_LABEL[selectedDay.highestState] : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Main support used</span><span style={detailValueStyle}>{selectedDay.mainSupport ? getNeedLabel(selectedDay.mainSupport) : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Completion %</span><span style={detailValueStyle}>{selectedDay.completionRate !== null ? `${selectedDay.completionRate}%` : "Not tracked"}</span></div>
                        {selectedDay.firstRoomTone || selectedDay.latestRoomTone ? (
                          <div style={detailStatStyle}><span style={detailLabelStyle}>Room tone change</span><span style={detailValueStyle}>{(getRoomToneLabel(selectedDay.firstRoomTone) ?? "Not tracked")} -&gt; {(getRoomToneLabel(selectedDay.latestRoomTone) ?? "Not tracked")}</span></div>
                        ) : null}
                      </div>
                      {buildDayNote(selectedDay) ? <p style={dayNoteStyle}>{buildDayNote(selectedDay)}</p> : null}
                    </div>
                  ) : null}
                  <div style={fallbackStatsRowStyle}>
                    <div style={fallbackStatCardStyle}>
                      <span style={fallbackStatLabelStyle}>Sessions</span>
                      <span style={fallbackStatValueStyle}>{currentSummary.sessions ?? 0}</span>
                    </div>
                  </div>
                  {currentSummary.topTools.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={fallbackSectionLabelStyle}>Most used this week</div>
                      {currentSummary.topTools.slice(0, 2).map((toolId, index) => (
                        <motion.button key={toolId} type="button" whileTap={{ scale: 0.99 }} onClick={() => router.push(`/app/tool/${toolId}`)} style={fallbackToolButtonStyle}>
                          <span style={{ ...rankBadgeStyle, ...(index === 0 ? rankBadgeActiveStyle(accentColor) : rankOtherBadgeStyle) }}>{index + 1}</span>
                          <span style={toolCopyStyle}>
                            <span style={toolTitleStyle}>{toolTitle(toolId)}</span>
                          </span>
                          <span style={toolActionStyle}>Open -&gt;</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {currentSummary.returnLine ? <p style={microInsightStyle}>{currentSummary.returnLine}</p> : null}
                {currentSummary.footer ? <p style={fallbackFooterStyle}>{currentSummary.footer}</p> : null}
              </div>
            </GlassCard>
          </motion.section>
        )}

        {currentSummary.insights.length ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.14, ease: EASE }}>
            <GlassCard style={patternCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={eyebrowStyle}>Weekly</span>
                  <div style={sectionTitleStyle}>What&apos;s been happening</div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {currentSummary.insights.map((insight, index) => (
                    <p key={insight} style={{ ...patternTextStyle, borderBottom: index < currentSummary.insights.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", paddingBottom: index < currentSummary.insights.length - 1 ? 10 : 0 }}>{insight}</p>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.section>
        ) : null}

        {currentSummary.pressureDirectionStats.total > 0 ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.18, ease: EASE }}>
            <GlassCard style={patternCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={eyebrowStyle}>Weekly</span>
                  <div style={sectionTitleStyle}>Where pressure landed this week</div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    { label: "Work into home", count: currentSummary.pressureDirectionStats.work_to_home },
                    { label: "Home into work", count: currentSummary.pressureDirectionStats.home_to_work },
                    { label: "Both directions", count: currentSummary.pressureDirectionStats.both },
                    { label: "Not today", count: currentSummary.pressureDirectionStats.none },
                    { label: "Days skipped", count: currentSummary.pressureDirectionStats.skipped },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(244,244,245,0.78)" }}>
                      <span>{row.label}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums", color: row.count > 0 ? "rgba(244,244,245,0.92)" : "rgba(161,161,170,0.4)" }}>{row.count}</span>
                    </div>
                  ))}
                </div>
                {currentSummary.pressureDirectionStats.observation ? (
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(161,161,170,0.55)", lineHeight: 1.55, fontStyle: "italic" }}>
                    {currentSummary.pressureDirectionStats.observation}
                  </p>
                ) : null}
              </div>
            </GlassCard>
          </motion.section>
        ) : null}

        {eqProfile ? (
          <EQPulseSection
            eqProfile={eqProfile}
            moodLogs={moodLogs}
            momentReviewCount={momentReviewCount}
            onGoMoment={() => router.push("/app/eq/moment")}
            onGoEq={() => router.push("/app/eq")}
          />
        ) : null}

        {currentSummary.workedSection.toolRows.length ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.22, ease: EASE }}>
            <GlassCard style={workedCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ ...workedHeaderStyle, position: "relative", zIndex: 1 }}>
                <span style={eyebrowStyle}>Weekly</span>
                <div style={sectionTitleStyle}>What actually helped</div>
                {currentSummary.helpedCopy ? <div style={workedSubcopyStyle}>{currentSummary.helpedCopy}</div> : null}
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                {currentSummary.workedSection.toolRows.map(({ note, toolId }, index) => (
                  <motion.button key={toolId} type="button" className="wk-tool-row" whileTap={{ scale: 0.99 }} onClick={() => router.push(`/app/tool/${toolId}`)} style={toolRowButtonStyle}>
                    <span style={{ ...rankBadgeStyle, ...(index === 0 ? rankBadgeActiveStyle(accentColor) : rankOtherBadgeStyle) }}>{index + 1}</span>
                    <span style={toolCopyStyle}>
                      <span style={toolTitleStyle}>{toolTitle(toolId)}</span>
                      {note ? <span style={toolNoteStyle}>{note}</span> : null}
                    </span>
                    <span style={toolActionStyle}>Open -&gt;</span>
                  </motion.button>
                ))}
              </div>
            </GlassCard>
          </motion.section>
        ) : null}

        {currentSummary.roomPatternReads.length ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.26, ease: EASE }}>
            <GlassCard style={patternCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={eyebrowStyle}>Weekly</span>
                  <div style={sectionTitleStyle}>What the room felt like</div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {currentSummary.roomPatternReads.map((read, index) => (
                    <p key={read} style={{ ...patternTextStyle, borderBottom: index < currentSummary.roomPatternReads.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", margin: 0, paddingBottom: index < currentSummary.roomPatternReads.length - 1 ? 10 : 0 }}>{read}</p>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.section>
        ) : null}

        {showMicroQuestion ? (
          <SundayMicroQuestion moodLogs={moodLogs} />
        ) : null}
      </div>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

const loadingMainStyle: CSSProperties = { minHeight: "100dvh", background: "var(--bg)", display: "grid", placeItems: "center", overflow: "hidden" };
const loadingTextStyle: CSSProperties = { color: "#F4F4F5", fontSize: 13, fontWeight: 800, letterSpacing: "0.28em" };
const mainStyle: CSSProperties = { minHeight: "100dvh", padding: "44px 18px 100px", background: "var(--bg)", position: "relative", overflow: "hidden" };
const centeredMainStyle: CSSProperties = { ...mainStyle, alignItems: "center", display: "flex", justifyContent: "center" };
const atmosphereWrapStyle: CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const blobStyle: CSSProperties = { position: "absolute", borderRadius: 999, filter: "blur(72px)" };
const pageWrapStyle: CSSProperties = { position: "relative", zIndex: 2, width: "100%", maxWidth: 740, margin: "0 auto", display: "grid", gap: 20 };
const innerHighlightStyle: CSSProperties = { background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", height: 1, left: 16, pointerEvents: "none", position: "absolute", right: 16, top: 0 };
const loggedOutCardStyle: CSSProperties = { display: "grid", gap: 14, padding: 24 };
const primaryCardStyle: CSSProperties = { width: "100%", padding: 20, display: "grid", border: "none", textAlign: "left" };
const patternCardStyle: CSSProperties = { padding: 20, display: "grid", gap: 10 };
const workedCardStyle: CSSProperties = { overflow: "hidden", padding: 0 };
const serifTitleStyle: CSSProperties = { color: "#F4F4F5", fontFamily: "Zodiak, Georgia, serif", fontSize: "clamp(30px,7vw,40px)", fontWeight: 700, lineHeight: 1, margin: 0 };
const subtitleStyle: CSSProperties = { margin: 0, color: "rgba(161,161,170,0.85)", fontSize: 14, lineHeight: 1.65, maxWidth: 460 };
const bodyStyle: CSSProperties = { margin: 0, color: "rgba(244,244,245,0.80)", fontSize: 15, lineHeight: 1.68 };
const mutedCopyStyle: CSSProperties = { color: "rgba(161,161,170,0.85)", fontSize: 14, lineHeight: 1.65, margin: 0 };
const headerStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "nowrap" };
const eyebrowStyle: CSSProperties = { color: "rgba(161,161,170,0.85)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };
const quietMetaStyle: CSSProperties = { color: "rgba(161,161,170,0.74)", fontSize: 12, lineHeight: 1.4, whiteSpace: "nowrap", paddingTop: 6 };
const weeklyHeadStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const sectionTitleStyle: CSSProperties = { color: "rgba(244,244,245,0.9)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 };
const movementWrapStyle: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "112px minmax(0, 1fr)" };
const axisStyle: CSSProperties = { height: CHART_HEIGHT, position: "relative", paddingTop: 2 };
const axisLabelStyle: CSSProperties = { color: "rgba(161,161,170,0.7)", fontSize: 11, lineHeight: 1.25, position: "absolute", transform: "translateY(-50%)", width: "100%" };
const chartPanelStyle: CSSProperties = { position: "relative" };
const ladderRuleStyle: CSSProperties = { borderTop: "1px solid rgba(255,255,255,0.05)", left: 0, position: "absolute", right: 0, transform: "translateY(-50%)" };
const dayColumnsStyle: CSSProperties = { display: "grid", gap: 8, gridTemplateColumns: "repeat(7, minmax(0, 1fr))", position: "relative" };
function dayButtonStyle(hasData: boolean, isActive: boolean): CSSProperties { return { background: isActive ? "rgba(255,255,255,0.04)" : "transparent", border: `1px solid ${isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.02)"}`, borderRadius: 18, color: "inherit", cursor: hasData ? "pointer" : "default", display: "grid", gap: 8, gridTemplateRows: `${CHART_HEIGHT}px auto`, padding: "10px 8px 8px", textAlign: "center", transition: "background 0.22s ease, border-color 0.22s ease" }; }
const dayCanvasStyle: CSSProperties = { height: CHART_HEIGHT, position: "relative" };
const movementLineStyle: CSSProperties = { borderRadius: 999, left: "50%", position: "absolute", transform: "translateX(-50%)", width: 2 };
const firstMarkerStyle: CSSProperties = { background: "rgba(24,24,27,0.92)", border: "1.5px solid rgba(255,255,255,0.28)", borderRadius: 999, height: 8, left: "calc(50% - 10px)", position: "absolute", transform: "translateY(-50%)", width: 8 };
const latestMarkerStyle: CSSProperties = { border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, height: 18, left: "calc(50% + 2px)", position: "absolute", transform: "translateY(-50%)", width: 18 };
const emptyColumnDotStyle: CSSProperties = { background: "rgba(255,255,255,0.08)", borderRadius: 999, height: 8, left: "calc(50% - 4px)", position: "absolute", top: getLadderTop(1), width: 8 };
const dayLabelWrapStyle: CSSProperties = { alignItems: "center", display: "grid", gap: 6, justifyItems: "center" };
const dayLabelStyle: CSSProperties = { color: "#F4F4F5", fontSize: 12, fontWeight: 700 };
const roomIndicatorStyle: CSSProperties = { borderRadius: 999, height: 3, width: 18 };
const microInsightStyle: CSSProperties = { color: "rgba(244,244,245,0.76)", fontSize: 14, lineHeight: 1.65, margin: 0 };
const selectedDayCardStyle: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, display: "grid", gap: 14, padding: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" };
const selectedDayTitleStyle: CSSProperties = { color: "#F4F4F5", fontSize: 22, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 };
const detailStatStyle: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, display: "grid", gap: 4, padding: 12 };
const detailLabelStyle: CSSProperties = { color: "#A1A1AA", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" };
const detailValueStyle: CSSProperties = { color: "#F4F4F5", fontSize: 14, lineHeight: 1.5 };
const dayNoteStyle: CSSProperties = { color: "#D4D4D8", fontSize: 14, lineHeight: 1.7, margin: 0 };
const patternTextStyle: CSSProperties = { color: "#D4D4D8", fontSize: 14, lineHeight: 1.75, margin: 0 };
const workedHeaderStyle: CSSProperties = { borderBottom: "1px solid rgba(255,255,255,0.05)", display: "grid", gap: 4, padding: "16px 18px 14px" };
const workedSubcopyStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12 };
const toolRowButtonStyle: CSSProperties = { alignItems: "center", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "inherit", cursor: "pointer", display: "grid", gap: 12, gridTemplateColumns: "auto 1fr auto", padding: "14px 18px", textAlign: "left", width: "100%" };
const rankBadgeStyle: CSSProperties = { alignItems: "center", borderRadius: 999, display: "inline-flex", fontSize: 12, fontWeight: 800, height: 28, justifyContent: "center", width: 28 };
const rankBadgeActiveStyle = (accentColor: string): CSSProperties => ({ background: `${accentColor}26`, color: accentColor });
const rankOtherBadgeStyle: CSSProperties = { background: "rgba(255,255,255,0.06)", color: "#D4D4D8" };
const toolCopyStyle: CSSProperties = { display: "grid", gap: 3 };
const toolTitleStyle: CSSProperties = { color: "#F4F4F5", fontSize: 14, fontWeight: 700, lineHeight: 1.4 };
const toolNoteStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, lineHeight: 1.4 };
const toolActionStyle: CSSProperties = { color: "rgba(194,122,92,0.80)", fontSize: 12, fontWeight: 700, letterSpacing: "0.01em" };
const emptyStateBlockStyle: CSSProperties = { display: "grid", gap: 10 };
const fallbackContentStyle: CSSProperties = { display: "grid", gap: 12 };
const fallbackStatsRowStyle: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 160px)" };
const fallbackStatCardStyle: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, display: "grid", gap: 6, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" };
const fallbackStatLabelStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, fontWeight: 700 };
const fallbackStatValueStyle: CSSProperties = { color: "#F4F4F5", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 };
const fallbackSectionLabelStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, fontWeight: 700 };
const fallbackToolButtonStyle: CSSProperties = { alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, color: "inherit", cursor: "pointer", display: "grid", gap: 12, gridTemplateColumns: "auto 1fr auto", padding: "14px 16px", textAlign: "left", width: "100%" };
const fallbackFooterStyle: CSSProperties = { color: "#A1A1AA", fontSize: 13, lineHeight: 1.6, margin: 0 };
const primaryButtonStyle: CSSProperties = { alignItems: "center", background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)", border: "1px solid rgba(194,122,92,0.28)", borderRadius: 18, color: "#fff", display: "inline-flex", fontSize: 14, fontWeight: 900, justifyContent: "center", minHeight: 52, padding: "14px 18px", textDecoration: "none" };

const pageStyles = `
  * { -webkit-tap-highlight-color: transparent; }
  .wk-page { color: #F4F4F5; }
  .wk-glass { background: rgba(18,18,22,0.9); border: 1px solid rgba(255,255,255,0.07); border-radius: 22px; box-shadow: 0 24px 70px rgba(0,0,0,0.45); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); position: relative; overflow: hidden; }
  .home-top-highlight { position: absolute; top: 0; left: 16px; right: 16px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent); pointer-events: none; z-index: 10; }
  .film-grain { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.07; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 3px 3px, 4px 4px; mix-blend-mode: soft-light; }
  .btn-primary { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; width: 100%; padding: 13px 16px; border-radius: 14px; font-size: 13px; font-weight: 900; text-decoration: none; border: 1px solid rgba(194,122,92,0.28); cursor: pointer; color: #fff; background: linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%); box-shadow: 0 14px 36px rgba(194,122,92,0.20); }
  .wk-tool-row:last-child { border-bottom: none; }
  .wk-detail-grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 720px) { .wk-glass { border-radius: 22px; } }
  @media (max-width: 640px) {
    .film-grain { opacity: 0.05; }
    .wk-detail-grid { grid-template-columns: 1fr; }
    .wk-page header { gap: 12px; }
  }
`;
