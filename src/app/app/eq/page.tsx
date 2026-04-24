"use client";

import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { type EQDomain, type EQProfileSnapshot } from "@/lib/userContext";
import EQHexagon from "@/components/EQHexagon";
import LogoAnimation from "@/components/LogoAnimation";

// ─── Types ────────────────────────────────────────────────────────────────────

type EQProfileRow = EQProfileSnapshot & {
  completed_at: string;
  version: number;
};

type MomentReview = {
  id: string;
  created_at: string;
  who_involved: string;
  moment_type: string;
};

type MoodLog = {
  created_at: string;
  state: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const DOMAIN_ORDER: EQDomain[] = [
  "pressure_reading",
  "repair_instinct",
  "presence_quality",
  "boundary_intel",
  "recovery_aware",
  "signal_accuracy",
];

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

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  "The Carrier":
    "You absorb pressure well but need prompts to actually set it down. Your instinct is to hold on and handle it.",
  "The Avoider":
    "You manage work pressure by keeping it separate, but connection quality can slip when you are carrying a lot.",
  "The Ghost":
    "Under pressure you withdraw. You are physically there but mentally elsewhere, and close people notice.",
  "The Open Loop":
    "You leave repair conversations unfinished. The tension does not escalate, but it does not resolve either.",
  "The Runner":
    "Your default under pressure is movement. You push through rather than pause, which works until it does not.",
  "The Reactor":
    "Your signal is strong but fast. You read the room and respond immediately, sometimes before you have the full picture.",
};

const FOCUS_COPY: Record<EQDomain, { title: string; body: string }> = {
  pressure_reading: {
    title: "Reading others when you are running low",
    body: "When your own pressure is high, it is harder to accurately read what others need. This week try one moment of reading before reacting.",
  },
  repair_instinct: {
    title: "Moving toward instead of away",
    body: "Repair feels risky when you are already stretched. A single acknowledgement, not a full conversation, is enough to keep the connection alive.",
  },
  presence_quality: {
    title: "Actually landing in moments",
    body: "Your body can be in the room while your mind is still at work. One clear transition ritual at the end of the day can shift this.",
  },
  boundary_intel: {
    title: "Closing the workday fully",
    body: "Work problems that cannot be solved tonight will still be there tomorrow. The goal is not ignoring them, it is parking them until you can actually act.",
  },
  recovery_aware: {
    title: "Knowing what actually restores you",
    body: "Reaching for distraction is not the same as recovering. Notice what you feel after, not just during, and use that signal to guide the next choice.",
  },
  signal_accuracy: {
    title: "Separating feeling from fact",
    body: "A flash of irritation is often not about what just happened. Catching the lag between trigger and interpretation is the whole skill here.",
  },
};

const STATE_EQ_DELTA: Record<string, number> = {
  clear_light: 8,
  steady: 3,
  carrying_work: -5,
  wired: -12,
  drained: -10,
  overloaded: -18,
};

const WHO_LABELS: Record<string, string> = {
  partner: "Partner",
  child: "Child",
  colleague: "Colleague",
  friend: "Friend",
  parent: "Parent",
  other: "Other",
};

const MOMENT_LABELS: Record<string, string> = {
  arrived_home: "Arriving home",
  dinner: "Dinner",
  bedtime: "Bedtime",
  morning: "Morning",
  weekend: "Weekend moment",
  conversation: "A conversation",
  argument: "Tension or argument",
  other: "A moment",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function domainColor(domain: EQDomain, opacity: number): string {
  return `rgba(${DOMAIN_RGB[domain]},${opacity})`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}

function getBaseline(profile: EQProfileRow): number {
  return Math.round(
    (profile.pressure_reading +
      profile.repair_instinct +
      profile.presence_quality +
      profile.boundary_intel +
      profile.recovery_aware +
      profile.signal_accuracy) /
      6,
  );
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getDomainScore(profile: EQProfileRow, domain: EQDomain): number {
  const map: Record<EQDomain, number> = {
    pressure_reading: profile.pressure_reading,
    repair_instinct: profile.repair_instinct,
    presence_quality: profile.presence_quality,
    boundary_intel: profile.boundary_intel,
    recovery_aware: profile.recovery_aware,
    signal_accuracy: profile.signal_accuracy,
  };
  return map[domain] ?? 50;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlassRimLight() {
  return (
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
  );
}

function DomainBar({
  domain,
  score,
  index,
}: {
  domain: EQDomain;
  score: number;
  index: number;
}) {
  const color = domainColor(domain, 1);
  const bgColor = domainColor(domain, 0.12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: 0.08 + index * 0.055 }}
      style={{ display: "grid", gap: 6 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(244,244,245,0.75)" }}>
          {DOMAIN_LABELS[domain]}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {score}
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.12 + index * 0.055 }}
          style={{
            height: "100%",
            borderRadius: 3,
            background: `linear-gradient(90deg, ${bgColor}, ${color})`,
          }}
        />
      </div>
      {score === 0 && (
        <div
          style={{
            fontSize: 11,
            color: "rgba(161,161,170,0.35)",
            fontStyle: "italic",
            marginTop: 2,
          }}
        >
          Not enough data yet
        </div>
      )}
    </motion.div>
  );
}

function EQMiniGraph({
  baseline,
  moodLogs,
}: {
  baseline: number;
  moodLogs: MoodLog[];
}) {
  const days = getLast7Days();
  const logsByDay: Record<string, string> = {};
  for (const log of moodLogs) {
    const day = log.created_at.slice(0, 10);
    if (days.includes(day) && !logsByDay[day]) {
      logsByDay[day] = log.state;
    }
  }

  const scores = days.map((day) => {
    const state = logsByDay[day];
    if (!state) return null;
    const delta = STATE_EQ_DELTA[state] ?? 0;
    return Math.max(10, Math.min(100, baseline + delta));
  });

  const W = 280;
  const H = 64;
  const padX = 8;
  const padY = 8;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const nonNull = scores.filter((s): s is number => s !== null);
  const minS = nonNull.length > 0 ? Math.min(...nonNull) - 5 : 30;
  const maxS = nonNull.length > 0 ? Math.max(...nonNull) + 5 : 90;
  const range = maxS - minS || 1;

  function toX(i: number) {
    return padX + (i / (days.length - 1)) * innerW;
  }
  function toY(v: number) {
    return padY + innerH - ((v - minS) / range) * innerH;
  }

  // Build path from non-null segments
  const segments: string[] = [];
  let current = "";
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    if (s === null) {
      if (current) {
        segments.push(current);
        current = "";
      }
      continue;
    }
    const x = toX(i);
    const y = toY(s);
    if (!current) {
      current = `M ${x} ${y}`;
    } else {
      current += ` L ${x} ${y}`;
    }
  }
  if (current) segments.push(current);

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIndex = new Date().getDay(); // 0=Sun
  const startDayOfWeek = (todayIndex - 6 + 7) % 7;
  const labels = days.map((_, i) => {
    const dow = (startDayOfWeek + i) % 7;
    return ["M", "T", "W", "T", "F", "S", "S"][dow] ?? dayLabels[i % 7];
  });

  return (
    <svg
      width={W}
      height={H + 16}
      viewBox={`0 0 ${W} ${H + 16}`}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <linearGradient id="eqDashGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(194,122,92,0.25)" />
          <stop offset="100%" stopColor="rgba(194,122,92,0)" />
        </linearGradient>
      </defs>

      {/* Area fill for first full segment */}
      {segments[0] && (() => {
        const firstIdx = scores.findIndex((s) => s !== null);
        const lastIdx = scores.length - 1 - [...scores].reverse().findIndex((s) => s !== null);
        if (firstIdx < 0) return null;
        const areaPath =
          segments[0] +
          ` L ${toX(lastIdx)} ${padY + innerH} L ${toX(firstIdx)} ${padY + innerH} Z`;
        return <path d={areaPath} fill="url(#eqDashGrad)" />;
      })()}

      {/* Line segments */}
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(194,122,92,0.7)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Dots */}
      {scores.map((s, i) =>
        s !== null ? (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(s)}
            r={2.5}
            fill="rgba(194,122,92,0.9)"
          />
        ) : null,
      )}

      {/* Day labels */}
      {labels.map((label, i) => (
        <text
          key={i}
          x={toX(i)}
          y={H + 14}
          textAnchor="middle"
          fontSize={9}
          fill="rgba(161,161,170,0.45)"
          fontFamily="var(--font-sans)"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EQDashboardPage() {
  const router = useRouter();
  const [eqProfile, setEqProfile] = useState<EQProfileRow | null>(null);
  const [momentReviews, setMomentReviews] = useState<MomentReview[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const userId = session.user.id;

      const [profileRes, logsRes] = await Promise.all([
        (supabase as any)
          .from("user_eq_profile")
          .select(
            "pressure_reading,repair_instinct,presence_quality,boundary_intel,recovery_aware,signal_accuracy,weakest_domain,archetype,completed_at,version",
          )
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("user_checkins")
          .select("created_at,state")
          .eq("user_id", userId)
          .eq("source", "home")
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("created_at", { ascending: true }),
      ]);

      const { data: reviewsData, error: reviewsError } = await (supabase as any)
        .from("user_moment_reviews")
        .select("id, who_involved, moment_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!active) return;

      if (profileRes.error) console.error("EQ profile fetch error:", profileRes.error);
      if (reviewsError) {
        console.error(
          "Moment reviews fetch error:",
          reviewsError.message,
          reviewsError.code,
          reviewsError.details,
        );
      }
      if (logsRes.error) console.error("Mood logs fetch error:", logsRes.error);

      setEqProfile((profileRes.data as EQProfileRow) ?? null);
      setMomentReviews((reviewsData as MomentReview[]) ?? []);
      setMoodLogs((logsRes.data as MoodLog[]) ?? []);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoAnimation variant="splash" />
      </div>
    );
  }

  // ── No profile state ──────────────────────────────────────────────────────

  if (!eqProfile) {
    return (
      <main
        style={{
          background: "var(--bg)",
          minHeight: "100dvh",
          padding: "44px 18px 100px",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            style={{
              background: "rgba(18,18,22,0.9)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 22,
              padding: "36px 28px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <GlassRimLight />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: "rgba(194,122,92,0.7)",
                }}
              >
                Pressure EQ
              </div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.6rem,4vw,2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                Your fingerprint starts here.
              </h1>
              <p
                style={{
                  margin: 0,
                  color: "rgba(161,161,170,0.65)",
                  fontSize: 14,
                  lineHeight: 1.65,
                }}
              >
                The EQ snapshot is 12 questions about how you handle pressure, presence, and repair.
                It takes about 3 minutes and gives you a personalised fingerprint across 6 domains.
              </p>
              <button
                type="button"
                onClick={() => router.push("/pressure-eq")}
                style={{
                  marginTop: 4,
                  padding: "13px 22px",
                  borderRadius: 12,
                  background: "var(--accent)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                  letterSpacing: "-0.01em",
                }}
              >
                Take the snapshot
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  // ── Full dashboard ────────────────────────────────────────────────────────

  const baseline = getBaseline(eqProfile);
  const weakest = eqProfile.weakest_domain as EQDomain;
  const archetype = eqProfile.archetype;
  const archetypeDesc = ARCHETYPE_DESCRIPTIONS[archetype] ?? "Your pattern under pressure is distinct and worth knowing.";
  const focusCopy = FOCUS_COPY[weakest];

  const daysSinceCompleted = Math.floor(
    (Date.now() - new Date(eqProfile.completed_at).getTime()) / 86400000,
  );
  const showReassessment = eqProfile.version === 1 && daysSinceCompleted > 30;

  const glassCard: CSSProperties = {
    background: "rgba(18,18,22,0.9)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 22,
    position: "relative",
    overflow: "hidden",
  };

  return (
    <main
      style={{
        background: "var(--bg)",
        minHeight: "100dvh",
        padding: "44px 18px 100px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ display: "grid", gap: 6, paddingBottom: 4 }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "rgba(194,122,92,0.7)",
            }}
          >
            Pressure EQ
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.8rem,5vw,2.2rem)",
              fontWeight: 700,
              letterSpacing: "-0.05em",
              color: "var(--text)",
              lineHeight: 1.05,
            }}
          >
            {archetype}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(161,161,170,0.6)", lineHeight: 1.5 }}>
            {archetypeDesc}
          </p>
        </motion.header>

        {/* ── Fingerprint card ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: EASE, delay: 0.06 }}
          style={{ ...glassCard, padding: "24px 22px 22px" }}
        >
          <GlassRimLight />
          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(244,244,245,0.55)", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
                Your fingerprint
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(194,122,92,0.9)",
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {baseline}
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(161,161,170,0.5)", marginLeft: 2 }}>/100</span>
              </div>
            </div>

            {/* Hexagon */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <EQHexagon
                scores={{
                  pressure_reading: getDomainScore(eqProfile, "pressure_reading"),
                  repair_instinct: getDomainScore(eqProfile, "repair_instinct"),
                  presence_quality: getDomainScore(eqProfile, "presence_quality"),
                  boundary_intel: getDomainScore(eqProfile, "boundary_intel"),
                  recovery_aware: getDomainScore(eqProfile, "recovery_aware"),
                  signal_accuracy: getDomainScore(eqProfile, "signal_accuracy"),
                }}
                weakestDomain={weakest}
              />
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, marginTop: 20 }}>
              <div style={{ display: "grid", gap: 12 }}>
                {DOMAIN_ORDER.map((domain, i) => (
                  <DomainBar
                    key={domain}
                    domain={domain}
                    score={getDomainScore(eqProfile, domain)}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Persistent retake link ─────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            background: "rgba(18,18,22,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            marginTop: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(244,244,245,0.65)",
                marginBottom: 3,
              }}
            >
              Your Pressure EQ fingerprint
            </div>
            <div style={{ fontSize: 12, color: "rgba(161,161,170,0.4)" }}>
              Retake anytime to track how your EQ shifts over time.
            </div>
          </div>
          <Link
            href="/pressure-eq"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(194,122,92,0.7)",
              textDecoration: "none",
              flexShrink: 0,
              paddingLeft: 16,
            }}
          >
            Retake →
          </Link>
        </div>

        {/* ── This week EQ graph ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: EASE, delay: 0.12 }}
          style={{ ...glassCard, padding: "22px 22px 16px" }}
        >
          <GlassRimLight />
          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(244,244,245,0.55)", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              This week
            </div>
            {moodLogs.length > 0 ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <EQMiniGraph baseline={baseline} moodLogs={moodLogs} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "rgba(161,161,170,0.45)", lineHeight: 1.55 }}>
                Check in from Home each day to see your EQ arc across the week.
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Focus card ─────────────────────────────────────────────── */}
        {focusCopy && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE, delay: 0.18 }}
            style={{ ...glassCard, padding: "22px 22px 22px 26px" }}
          >
            <GlassRimLight />
            {/* Clay left bar */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: 3,
                background: "rgba(194,122,92,0.5)",
                borderRadius: "22px 0 0 22px",
              }}
            />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: domainColor(weakest, 0.7),
                }}
              >
                Focus area: {DOMAIN_LABELS[weakest]}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.35,
                  letterSpacing: "-0.02em",
                }}
              >
                {focusCopy.title}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(161,161,170,0.65)", lineHeight: 1.6 }}>
                {focusCopy.body}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Moment reviews ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: EASE, delay: 0.24 }}
          style={{ ...glassCard, padding: "20px 22px" }}
        >
          <GlassRimLight />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(244,244,245,0.55)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                }}
              >
                Recent reviews
              </div>
              <button
                type="button"
                onClick={() => router.push("/app/eq/moment")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "rgba(194,122,92,0.75)",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                Review a moment
              </button>
            </div>

            {momentReviews.length > 0 ? (
              <div>
                {momentReviews.map((review, i) => (
                  <div
                    key={review.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom:
                        i < momentReviews.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "rgba(244,244,245,0.7)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {MOMENT_LABELS[review.moment_type] ?? review.moment_type}
                      {" · "}
                      {WHO_LABELS[review.who_involved] ?? review.who_involved}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(161,161,170,0.4)",
                        flexShrink: 0,
                      }}
                    >
                      {timeAgo(review.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(161,161,170,0.4)",
                  fontStyle: "italic",
                }}
              >
                No moments reviewed yet.
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Reassessment prompt ────────────────────────────────────── */}
        {showReassessment && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE, delay: 0.3 }}
            style={{
              ...glassCard,
              padding: "20px 22px",
              border: "1px solid rgba(194,122,92,0.15)",
            }}
          >
            <GlassRimLight />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(194,122,92,0.65)", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
                Time to revisit
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(161,161,170,0.65)", lineHeight: 1.6 }}>
                It has been over a month. Patterns shift. A fresh snapshot takes 3 minutes and will show you what has changed.
              </p>
              <button
                type="button"
                onClick={() => router.push("/pressure-eq")}
                style={{
                  padding: "11px 18px",
                  borderRadius: 10,
                  background: "rgba(194,122,92,0.1)",
                  border: "1px solid rgba(194,122,92,0.2)",
                  color: "rgba(194,122,92,0.85)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                  letterSpacing: "-0.01em",
                }}
              >
                Retake the snapshot
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </main>
  );
}
