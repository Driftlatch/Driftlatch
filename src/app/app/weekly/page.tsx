"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LIBRARY } from "@/lib/toolLibrary";
import type { Tables } from "@/lib/types/supabase";
import type { DriftNeed, DriftSituation, DriftState } from "@/lib/toolLibrary";

type Trend = "improved" | "flat" | "heavier";
type Mode = "checkins" | "recent_fallback" | "empty";
type RangeDays = 7 | 14;

type CheckinRow = {
  created_at: string;
  state: DriftState;
  need: DriftNeed;
  time_minutes: number;
  situation: DriftSituation;
  tool_id: string;
  did_complete: boolean;
};

type RecentRow = {
  tool_id: string;
  used_at: string;
};

type FeedbackRow = Pick<Tables<"user_tool_feedback">, "created_at" | "helpful_score" | "shift" | "tool_id">;

type WorkedSectionMode = "feedback" | "usage" | "empty";
type WorkedToolRow = {
  note: string | null;
  toolId: string;
};

type WorkedSection = {
  emptyCopy: string;
  heading: string;
  mode: WorkedSectionMode;
  subcopy: string | null;
  toolRows: WorkedToolRow[];
};

type WeeklySummary = {
  mode: Mode;
  paragraph: string;
  topTools: string[];
  trend: Trend | null;
};

type DayPoint = {
  key: string;
  label: string;
  tooltipLabel: string;
  topState: DriftState | null;
  topNeed: DriftNeed | null;
  completionRate: number | null;
  severity: number;
  hasData: boolean;
  x: number;
  y: number;
};

const MotionLink = motion(Link);

const STATE_LABEL: Record<DriftState, string> = {
  clear_light: "Clear & light",
  carrying_work: "Carrying work",
  wired: "Wired",
  drained: "Drained",
  overloaded: "Overloaded",
  steady: "Steady",
};

const NEED_LABEL: Record<DriftNeed, string> = {
  regain_clarity: "regain clarity",
  wind_down: "wind down",
  be_here: "be here",
  come_back: "come back",
};

const STATE_SEVERITY: Record<DriftState, number> = {
  clear_light: 0,
  steady: 0,
  carrying_work: 1,
  wired: 2,
  drained: 2,
  overloaded: 3,
};

const PRESSURE_SCORE: Record<DriftState, number> = {
  clear_light: 0,
  steady: 1,
  drained: 2,
  carrying_work: 3,
  wired: 4,
  overloaded: 5,
};

// ── Warm, direct voice — good friend, not a therapist ────────────────────────
const INTERPRETATION: Record<DriftState, string> = {
  clear_light: "That's a window worth using — decisions made here tend to stick.",
  carrying_work: "Open loops don't switch off cleanly, so your system stays on after hours.",
  wired: "Your system stayed alert past the point where it was actually useful.",
  drained: "Energy was going out before connection and recovery had a chance to come in.",
  overloaded: "Sustained pressure with very little slack — the tank was running close to empty.",
  steady: "Better pacing, cleaner transitions. The day had some room in it.",
};

const NEED_SUGGESTION: Record<DriftNeed, string> = {
  regain_clarity: "Keep one short clarity step within reach — not for emergencies, just for the moment things blur.",
  wind_down: "One evening reset, easy to open, does more than you'd expect.",
  be_here: "A simple presence reset at home transitions is the one that actually gets used.",
  come_back: "Keep one repair step close for re-entry — it's the gap most people skip.",
};

const RANGE_DAYS: RangeDays = 7;
const CHART_W = 320;
const CHART_H = 90;
const PAD_X = 20;
const GRAPH_TOP = 12;
const GRAPH_BOTTOM = 62;
const GRAPH_H = GRAPH_BOTTOM - GRAPH_TOP;
const BASELINE_Y = GRAPH_BOTTOM;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function topFromFrequency<T extends string>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function toolTitle(toolId: string) {
  return LIBRARY.tools.find((t) => t.id === toolId)?.title ?? toolId;
}

function formatDayKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function buildTrend(current: CheckinRow[], previous: CheckinRow[]): Trend | null {
  if (!previous.length || !current.length) return null;
  const avgCurrent = current.reduce((sum, row) => sum + STATE_SEVERITY[row.state], 0) / current.length;
  const avgPrevious = previous.reduce((sum, row) => sum + STATE_SEVERITY[row.state], 0) / previous.length;
  const delta = avgCurrent - avgPrevious;
  if (delta <= -0.25) return "improved";
  if (delta >= 0.25) return "heavier";
  return "flat";
}

function buildCheckinSummary(current: CheckinRow[], previous: CheckinRow[], rangeDays: RangeDays): WeeklySummary {
  if (!current.length) {
    return {
      mode: "empty",
      paragraph: `No check-ins yet from the last ${rangeDays} days. One is enough to start seeing something useful.`,
      topTools: [],
      trend: null,
    };
  }

  const stateFreq = topFromFrequency(current.map((r) => r.state));
  const topState = stateFreq[0]?.[0] ?? null;
  const topStateCount = stateFreq[0]?.[1] ?? 0;
  const secondState = stateFreq[1]?.[0] ?? null;
  const topNeed = topFromFrequency(current.map((r) => r.need))[0]?.[0] ?? null;
  const topTools = topFromFrequency(current.map((r) => r.tool_id)).slice(0, 3).map(([id]) => id);
  const completionRate = current.filter((r) => Boolean(r.did_complete)).length / Math.max(current.length, 1);
  const completionPct = Math.round(completionRate * 100);
  const trend = buildTrend(current, previous);
  const checkinCount = current.length;

  // Observation 1: What the week looked like
  const stateShare = Math.round((topStateCount / checkinCount) * 100);
  const secondStatePart = secondState && secondState !== topState
    ? ` with ${STATE_LABEL[secondState].toLowerCase()} also showing up`
    : "";
  const obs1 = topState
    ? `Across ${checkinCount} check-in${checkinCount === 1 ? "" : "s"}, ${STATE_LABEL[topState].toLowerCase()} was the dominant state — ${stateShare}% of the time${secondStatePart}. ${INTERPRETATION[topState]}`
    : `You logged ${checkinCount} check-in${checkinCount === 1 ? "" : "s"} this period. Pressure was spread across several states without a clear pattern yet.`;

  // Observation 2: What the need signal tells you
  const needCount = current.filter((r) => r.need === topNeed).length;
  const needShare = topNeed ? Math.round((needCount / checkinCount) * 100) : null;
  const obs2 = topNeed && needShare != null
    ? `Your most repeated need was to ${NEED_LABEL[topNeed]} — ${needShare}% of sessions. That's not random. It usually means that specific gear shift is the one your day keeps demanding, and it's worth having a step ready for it rather than deciding in the moment.`
    : `No single need dominated this period. That could mean your context was varied, or that the pattern needs more check-ins to surface clearly.`;

  // Observation 3: What actually worked
  const topToolNames = topTools.slice(0, 2).map(toolTitle);
  const toolsSentence = topToolNames.length === 2
    ? `${topToolNames[0]} and ${topToolNames[1]}`
    : topToolNames[0] ?? "your repeated tools";
  const completionRead =
    completionPct >= 80
      ? "That's a high follow-through rate — this approach is landing."
      : completionPct >= 50
        ? "Roughly half completed. The ones that got finished were probably the right length for where you were."
        : "Completion was lower than usual. That often means the moment passed before the step could land, or the fit wasn't quite right for the state.";
  const obs3 = `What you reached for was ${toolsSentence}, with a ${completionPct}% completion rate. ${completionRead}`;

  // Observation 4: Trend + what to carry forward
  const trendLine =
    trend === "improved"
      ? "Load is tracking lighter than last week — whatever shifted, it's worth noticing."
      : trend === "heavier"
        ? "Load is a bit heavier than last week. That's useful signal, not a verdict — one small intervention at the right moment can change the arc."
        : "Load is broadly similar to last week. Consistency can work for or against you — it depends whether the pattern is one you'd choose.";
  const suggestionLine = topNeed
    ? NEED_SUGGESTION[topNeed]
    : "Keep one simple step ready for your most common moment — the one you can open without deciding anything.";
  const obs4 = `${trendLine} ${suggestionLine}`;

  // Pipe-delimited so the card can render each observation as a separate block
  return {
    mode: "checkins",
    paragraph: [obs1, obs2, obs3, obs4].join("|"),
    topTools,
    trend,
  };
}

function buildRecentFallbackSummary(current: RecentRow[], previous: RecentRow[], rangeDays: RangeDays): WeeklySummary {
  if (!current.length) {
    return {
      mode: "empty",
      paragraph: `No recent activity found in the last ${rangeDays} days. Start one short check-in and this fills in.`,
      topTools: [],
      trend: null,
    };
  }

  const topTools = topFromFrequency(current.map((r) => r.tool_id)).slice(0, 3).map(([id]) => id);
  const topToolNames = topTools.slice(0, 2).map(toolTitle);
  const toolsSentence = topToolNames.length === 2
    ? `${topToolNames[0]} and ${topToolNames[1]}`
    : topToolNames[0] ?? "your core tools";
  const rangeLabel = rangeDays === 7 ? "this week" : "the last two weeks";
  const prevCount = previous.length;
  const currCount = current.length;

  const consistencyRead =
    prevCount === 0
      ? "No prior period to compare against yet — keep going and the trend will fill in."
      : currCount > prevCount
        ? `That's ${currCount - prevCount} more action${currCount - prevCount === 1 ? "" : "s"} than last period. Follow-through is building.`
        : currCount < prevCount
          ? `That's ${prevCount - currCount} fewer than last period. Lighter weeks happen — one session this week keeps the thread.`
          : "Exactly the same rhythm as last period. Consistency is underrated.";

  const obs1 = `${rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)} you returned to ${toolsSentence} — ${currCount} repeat${currCount === 1 ? "" : "s"} total. ${consistencyRead}`;

  const obs2 = topTools.length > 0
    ? `The things you're repeating are a signal in themselves. Returning to the same thing across different moments usually means it's doing real work — not just something you tried once.`
    : `Start one check-in to get a proper read — even a single session gives this page something to reflect back.`;

  const obs3 = `To get fuller pattern data here, add a state check-in next time you open something here. It takes ten seconds and turns this from usage stats into actual signal.`;

  return {
    mode: "recent_fallback",
    paragraph: [obs1, obs2, obs3].join("|"),
    topTools,
    trend: null,
  };
}

function buildPersonalCheckinSummary(
  current: CheckinRow[],
  previous: CheckinRow[],
  rangeDays: RangeDays,
): WeeklySummary {
  if (!current.length) {
    return buildCheckinSummary(current, previous, rangeDays);
  }

  const stateFreq = topFromFrequency(current.map((r) => r.state));
  const topState = stateFreq[0]?.[0] ?? null;
  const topStateCount = stateFreq[0]?.[1] ?? 0;
  const secondState = stateFreq[1]?.[0] ?? null;
  const topNeed = topFromFrequency(current.map((r) => r.need))[0]?.[0] ?? null;
  const topTools = topFromFrequency(current.map((r) => r.tool_id)).slice(0, 3).map(([id]) => id);
  const completionRate = current.filter((r) => Boolean(r.did_complete)).length / Math.max(current.length, 1);
  const completionPct = Math.round(completionRate * 100);
  const trend = buildTrend(current, previous);
  const checkinCount = current.length;
  const stateShare = Math.round((topStateCount / checkinCount) * 100);
  const secondStatePart = secondState && secondState !== topState
    ? `, with ${STATE_LABEL[secondState].toLowerCase()} also showing up`
    : "";
  const obs1 = topState
    ? `This week, your pressure mostly showed up as ${STATE_LABEL[topState].toLowerCase()} - ${stateShare}% of the time across ${checkinCount} check-in${checkinCount === 1 ? "" : "s"}${secondStatePart}. ${INTERPRETATION[topState]}`
    : `You logged ${checkinCount} check-in${checkinCount === 1 ? "" : "s"} this period. Pressure was spread across several states without a clear pattern yet.`;

  const needCount = current.filter((r) => r.need === topNeed).length;
  const needShare = topNeed ? Math.round((needCount / checkinCount) * 100) : null;
  const obs2 = topNeed && needShare != null
    ? `The move you needed most was to ${NEED_LABEL[topNeed]} - ${needShare}% of sessions. That's usually the part of the day asking for a little more help, so it makes sense to keep that kind of support close.`
    : `No single need dominated this period. That could mean your context was varied, or that the pattern needs more check-ins to surface clearly.`;

  const topToolNames = topTools.slice(0, 2).map(toolTitle);
  const toolsSentence = topToolNames.length === 2
    ? `${topToolNames[0]} and ${topToolNames[1]}`
    : topToolNames[0] ?? "your repeated tools";
  const completionRead =
    completionPct >= 80
      ? "That follow-through is a good sign. This approach is landing."
      : completionPct >= 50
        ? "About half got finished. The ones that landed were probably the right size for where you were."
        : "Completion was lower. That usually means the moment moved faster than the step, or the fit was a little off.";
  const obs3 = `You responded most to ${toolsSentence}, with a ${completionPct}% completion rate. ${completionRead}`;

  const trendLine =
    trend === "improved"
      ? "Things tracked a little lighter than last week. That's worth noticing."
      : trend === "heavier"
        ? "Things ran a bit heavier than last week. That's useful signal, not a verdict - one small move at the right time can still change the shape of the day."
        : "Things felt broadly similar to last week. That's useful when the pattern is one you want to keep shifting.";
  const suggestionLine = topNeed
    ? NEED_SUGGESTION[topNeed]
    : "Keep one simple step ready for your most common moment - the one you can open without deciding anything.";
  const obs4 = `${trendLine} ${suggestionLine} That's part of emotional intelligence under pressure: noticing the moment early enough to choose your next step.`;

  return {
    mode: "checkins",
    paragraph: [obs1, obs2, obs3, obs4].join("|"),
    topTools,
    trend,
  };
}

function buildPersonalRecentFallbackSummary(
  current: RecentRow[],
  previous: RecentRow[],
  rangeDays: RangeDays,
): WeeklySummary {
  if (!current.length) {
    return buildRecentFallbackSummary(current, previous, rangeDays);
  }

  const topTools = topFromFrequency(current.map((r) => r.tool_id)).slice(0, 3).map(([id]) => id);
  const topToolNames = topTools.slice(0, 2).map(toolTitle);
  const toolsSentence = topToolNames.length === 2
    ? `${topToolNames[0]} and ${topToolNames[1]}`
    : topToolNames[0] ?? "your core tools";
  const rangeLabel = rangeDays === 7 ? "this week" : "the last two weeks";
  const prevCount = previous.length;
  const currCount = current.length;
  const consistencyRead =
    prevCount === 0
      ? "No prior period to compare against yet - keep going and the trend will fill in."
      : currCount > prevCount
        ? `That's ${currCount - prevCount} more action${currCount - prevCount === 1 ? "" : "s"} than last period. Follow-through is building.`
        : currCount < prevCount
          ? `That's ${prevCount - currCount} fewer than last period. Lighter weeks happen - one session this week keeps the thread.`
          : "Exactly the same rhythm as last period. Consistency is underrated.";
  const obs1 = `${rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}, you kept coming back to ${toolsSentence} - ${currCount} repeat${currCount === 1 ? "" : "s"} total. ${consistencyRead}`;
  const obs2 = topTools.length > 0
    ? "That repeat pattern matters. Coming back to the same few things usually means they feel easier to trust in the moment."
    : "Start one check-in to get a proper read - even a single session gives this page something to reflect back.";
  const obs3 = "To make this feel more personal, add a state check-in next time you open a step here. It takes a few seconds and gives the app a better read on what actually helps.";

  return {
    mode: "recent_fallback",
    paragraph: [obs1, obs2, obs3].join("|"),
    topTools,
    trend: null,
  };
}

function getHelpfulRank(score: number) {
  if (score === 3) return 3;
  if (score === 2) return 2;
  if (score === 1) return 1;
  return 0;
}

function getShiftRank(shift: string) {
  if (shift === "lighter") return 3;
  if (shift === "bit_lighter") return 2;
  if (shift === "no_change") return 1;
  return 0;
}

function buildWorkedToolNote({
  helpfulAverage,
  repeatCount,
  shiftAverage,
}: {
  helpfulAverage: number;
  repeatCount: number;
  shiftAverage: number;
}) {
  if (shiftAverage >= 2.5) return "Usually left you lighter";
  if (helpfulAverage >= 2.5 && repeatCount > 1) return "Often marked useful";
  if (helpfulAverage >= 2) return "Helped this week";
  return null;
}

function buildWorkedSection(
  feedbackRows: FeedbackRow[],
  currentCheckins: CheckinRow[],
  currentRecent: RecentRow[],
): WorkedSection {
  const completionByTool = new Map<string, number>();
  for (const row of currentCheckins) {
    if (!row.tool_id || !row.did_complete) continue;
    completionByTool.set(row.tool_id, (completionByTool.get(row.tool_id) ?? 0) + 1);
  }

  if (feedbackRows.length > 0) {
    const feedbackByTool = new Map<string, FeedbackRow[]>();
    for (const row of feedbackRows) {
      if (!row.tool_id) continue;
      feedbackByTool.set(row.tool_id, [...(feedbackByTool.get(row.tool_id) ?? []), row]);
    }

    const toolIds = [...feedbackByTool.entries()]
      .map(([toolId, rows]) => {
        const helpfulAverage = rows.reduce((sum, row) => sum + getHelpfulRank(row.helpful_score), 0) / rows.length;
        const shiftAverage = rows.reduce((sum, row) => sum + getShiftRank(row.shift), 0) / rows.length;
        const latestAt = rows.reduce((latest, row) => {
          const nextTime = Date.parse(row.created_at);
          return Number.isNaN(nextTime) ? latest : Math.max(latest, nextTime);
        }, 0);

        return {
          completionCount: completionByTool.get(toolId) ?? 0,
          helpfulAverage,
          latestAt,
          note: buildWorkedToolNote({
            helpfulAverage,
            repeatCount: rows.length,
            shiftAverage,
          }),
          repeatCount: rows.length,
          shiftAverage,
          toolId,
        };
      })
      .sort((a, b) =>
        b.helpfulAverage - a.helpfulAverage ||
        b.shiftAverage - a.shiftAverage ||
        b.latestAt - a.latestAt ||
        b.repeatCount - a.repeatCount ||
        b.completionCount - a.completionCount,
      )
      .slice(0, 3)
      .map((entry) => ({ note: entry.note, toolId: entry.toolId }));

    if (toolIds.length > 0) {
      return {
        emptyCopy: "No feedback-backed tools surfaced this week.",
        heading: "WHAT WORKED",
        mode: "feedback",
        subcopy: "Based on your feedback this week",
        toolRows: toolIds,
      };
    }
  }

  const checkinUsage = topFromFrequency(currentCheckins.map((row) => row.tool_id)).slice(0, 3).map(([toolId]) => toolId);
  if (checkinUsage.length > 0) {
    return {
      emptyCopy: "No repeated tools surfaced this week.",
      heading: "WHAT YOU RETURNED TO",
      mode: "usage",
      subcopy: "Based on what you opened most",
      toolRows: checkinUsage.map((toolId) => ({ note: null, toolId })),
    };
  }

  const recentUsage = topFromFrequency(currentRecent.map((row) => row.tool_id)).slice(0, 3).map(([toolId]) => toolId);
  if (recentUsage.length > 0) {
    return {
      emptyCopy: "No repeated tools surfaced this week.",
      heading: "WHAT YOU RETURNED TO",
      mode: "usage",
      subcopy: "Based on what you opened most",
      toolRows: recentUsage.map((toolId) => ({ note: null, toolId })),
    };
  }

  return {
    emptyCopy: "No tool signal surfaced this week.",
    heading: "WHAT WORKED",
    mode: "empty",
    subcopy: null,
    toolRows: [],
  };
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (!points.length) return "";
  return `${buildSmoothPath(points)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
}

function formatRangeTitle(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function formatTooltipLabel(date: Date) {
  return `${date.toLocaleDateString(undefined, { weekday: "short" })} · ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function getTrendMeta(trend: Trend | null) {
  if (trend === "improved") {
    return {
      label: "Lighter than last week",
      style: {
        color: "#86EFAC",
        background: "rgba(34,197,94,0.12)",
        border: "1px solid rgba(34,197,94,0.18)",
      } satisfies CSSProperties,
    };
  }
  if (trend === "heavier") {
    return {
      label: "Heavier than last week",
      style: {
        color: "#C27A5C",
        background: "rgba(194,122,92,0.14)",
        border: "1px solid rgba(194,122,92,0.2)",
      } satisfies CSSProperties,
    };
  }
  return {
    label: "Consistent",
    style: {
      color: "#A1A1AA",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
    } satisfies CSSProperties,
  };
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

export default function WeeklyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [currentCheckins, setCurrentCheckins] = useState<CheckinRow[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackRow[]>([]);
  const [currentRecentTools, setCurrentRecentTools] = useState<RecentRow[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(6);

  const pathRef = useRef<SVGPathElement | null>(null);
  const dashOffset = useMotionValue(0);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!authData.user) {
        setIsLoggedIn(false);
        setCurrentCheckins([]);
        setCurrentFeedback([]);
        setCurrentRecentTools([]);
        setSummary(null);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      const userId = authData.user.id;
      const nowIso = new Date().toISOString();
      const currentStartIso = isoDaysAgo(RANGE_DAYS);
      const previousStartIso = isoDaysAgo(RANGE_DAYS * 2);

      const [currentCheckinsRes, currentFeedbackRes, currentRecentRes, previousRecentRes] = await Promise.all([
        supabase
          .from("user_checkins")
          .select("created_at,state,need,time_minutes,situation,tool_id,did_complete")
          .eq("user_id", userId)
          .gte("created_at", currentStartIso)
          .lt("created_at", nowIso)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_tool_feedback")
          .select("created_at,helpful_score,shift,tool_id")
          .eq("user_id", userId)
          .gte("created_at", currentStartIso)
          .lt("created_at", nowIso)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_recent_tools")
          .select("tool_id,used_at")
          .eq("user_id", userId)
          .gte("used_at", currentStartIso)
          .lt("used_at", nowIso)
          .order("used_at", { ascending: false }),
        supabase
          .from("user_recent_tools")
          .select("tool_id,used_at")
          .eq("user_id", userId)
          .gte("used_at", previousStartIso)
          .lt("used_at", currentStartIso)
          .order("used_at", { ascending: false }),
      ]);

      if (cancelled) return;

      setCurrentFeedback((currentFeedbackRes.data ?? []) as FeedbackRow[]);
      setCurrentRecentTools((currentRecentRes.data ?? []) as RecentRow[]);

      const relationMissing =
        currentCheckinsRes.error?.code === "42P01" ||
        currentCheckinsRes.error?.message?.toLowerCase().includes("does not exist");

      if (relationMissing) {
        setCurrentCheckins([]);
        setSelectedDayIdx(6);
        setSummary(buildPersonalRecentFallbackSummary((currentRecentRes.data ?? []) as RecentRow[], (previousRecentRes.data ?? []) as RecentRow[], RANGE_DAYS));
        setLoading(false);
        return;
      }

      if (currentCheckinsRes.error) {
        setCurrentCheckins([]);
        setSelectedDayIdx(6);
        setSummary({ mode: "empty", paragraph: "Weekly reflection is temporarily unavailable. Try again shortly.", topTools: [], trend: null });
        setLoading(false);
        return;
      }

      const previousCheckinsRes = await supabase
        .from("user_checkins")
        .select("created_at,state,need,time_minutes,situation,tool_id,did_complete")
        .eq("user_id", userId)
        .gte("created_at", previousStartIso)
        .lt("created_at", currentStartIso)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const nextCheckins = (currentCheckinsRes.data ?? []) as CheckinRow[];
      const byDay = new Map<string, CheckinRow[]>();
      for (const row of nextCheckins) {
        const key = formatDayKey(new Date(row.created_at));
        byDay.set(key, [...(byDay.get(key) ?? []), row]);
      }

      let defaultIdx = 6;
      for (let index = RANGE_DAYS - 1; index >= 0; index -= 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (RANGE_DAYS - 1 - index));
        if ((byDay.get(formatDayKey(date)) ?? []).length > 0) { defaultIdx = index; break; }
      }

      setCurrentCheckins(nextCheckins);
      setSelectedDayIdx(defaultIdx);
      setSummary(buildPersonalCheckinSummary(nextCheckins, (previousCheckinsRes.data ?? []) as CheckinRow[], RANGE_DAYS));
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const dayPoints = useMemo<DayPoint[]>(() => {
    const today = new Date();
    const byDay = new Map<string, CheckinRow[]>();
    for (const row of currentCheckins) {
      const key = formatDayKey(new Date(row.created_at));
      byDay.set(key, [...(byDay.get(key) ?? []), row]);
    }

    return Array.from({ length: RANGE_DAYS }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (RANGE_DAYS - 1 - index));
      const key = formatDayKey(date);
      const rows = byDay.get(key) ?? [];
      const severity = rows.length ? rows.reduce((sum, row) => sum + PRESSURE_SCORE[row.state], 0) / rows.length : 1;
      const topState = rows.length ? topFromFrequency(rows.map((row) => row.state))[0]?.[0] ?? null : null;
      const topNeed = rows.length ? topFromFrequency(rows.map((row) => row.need))[0]?.[0] ?? null : null;
      const completionRate = rows.length ? Math.round((rows.filter((row) => Boolean(row.did_complete)).length / rows.length) * 100) : null;

      return {
        key,
        label: formatDayLabel(date),
        tooltipLabel: formatTooltipLabel(date),
        topState,
        topNeed,
        completionRate,
        severity,
        hasData: rows.length > 0,
        x: PAD_X + (index / Math.max(RANGE_DAYS - 1, 1)) * (CHART_W - PAD_X * 2),
        y: rows.length ? GRAPH_TOP + ((5 - severity) / 4) * GRAPH_H : BASELINE_Y,
      };
    });
  }, [currentCheckins]);

  const selectedDay = dayPoints[selectedDayIdx] ?? dayPoints[6] ?? null;
  const linePath = useMemo(() => buildSmoothPath(dayPoints.map((p) => ({ x: p.x, y: p.y }))), [dayPoints]);
  const areaPath = useMemo(() => buildAreaPath(dayPoints.map((p) => ({ x: p.x, y: p.y })), BASELINE_Y), [dayPoints]);

  useEffect(() => {
    if (!pathRef.current || !linePath) return;
    const totalLength = pathRef.current.getTotalLength();
    setPathLength(totalLength);
    dashOffset.set(totalLength);
    const controls = animate(dashOffset, 0, { duration: 1.8, ease: "easeOut" });
    return () => controls.stop();
  }, [dashOffset, linePath]);

  const weeklyTopState = currentCheckins.length ? topFromFrequency(currentCheckins.map((r) => r.state))[0]?.[0] ?? null : null;
  const weeklyTopNeed = currentCheckins.length ? topFromFrequency(currentCheckins.map((r) => r.need))[0]?.[0] ?? null : null;
  const weeklyCompletionRate = currentCheckins.length
    ? Math.round((currentCheckins.filter((r) => Boolean(r.did_complete)).length / Math.max(currentCheckins.length, 1)) * 100)
    : null;

  const weekRangeTitle = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (RANGE_DAYS - 1));
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    return formatRangeTitle(start, end);
  }, []);

  const trendMeta = getTrendMeta(summary?.trend ?? null);
  const selectedLeftPercent = selectedDay ? (selectedDay.x / CHART_W) * 100 : 50;
  const workedSection = useMemo(
    () => buildWorkedSection(currentFeedback, currentCheckins, currentRecentTools),
    [currentCheckins, currentFeedback, currentRecentTools],
  );
  const workedTools = workedSection.toolRows;

  // ── Is the dominant week state clear_light? Shift accent to sage ──
  const isClearWeek = weeklyTopState === "clear_light";
  const accentColor = isClearWeek ? "rgba(100,170,120,1)" : "rgba(194,122,92,1)";
  const accentFaint = isClearWeek ? "rgba(100,170,120,0.16)" : "rgba(194,122,92,0.16)";
  const accentFill0 = isClearWeek ? "rgba(100,170,120,0.16)" : "rgba(194,122,92,0.16)";
  const topStatePillColor = isClearWeek ? "rgba(120,200,150,0.95)" : "#C27A5C";

  if (loading) {
    return (
      <main style={loadingMainStyle}>
        <motion.div animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} style={loadingTextStyle}>
          LOADING
        </motion.div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="wk-page" style={centeredMainStyle}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: EASE }} style={pageWrapStyle}>
          <GlassCard style={loggedOutCardStyle}>
            <h1 style={serifTitleStyle}>Your reflection lives here</h1>
            <p style={mutedCopyStyle}>Sign in to see the patterns shaping your week.</p>
            <MotionLink whileTap={{ scale: 0.97 }} href="/login" style={primaryButtonStyle}>
              Sign in →
            </MotionLink>
          </GlassCard>
        </motion.div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (summary?.mode === "empty") {
    return (
      <main className="wk-page" style={mainStyle}>
        <motion.div aria-hidden style={ambientGlowStyle} animate={{ opacity: [0.1, 0.22, 0.1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
        <div style={pageWrapStyle}>
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0, ease: EASE }}>
            <GlassCard style={headerCardStyle}>
              <div style={headerTopRowStyle}>
                <span style={labelStyle}>WEEKLY REFLECTION</span>
                <span style={{ ...badgeStyle, ...trendMeta.style }}>{trendMeta.label}</span>
              </div>
              <h1 style={headerTitleStyle}>{weekRangeTitle}</h1>
              <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.7, delay: 0.4, ease: EASE }} style={headerDividerStyle} />
            </GlassCard>
          </motion.section>
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={emptyCardStyle}>
              <h2 style={emptyTitleStyle}>Nothing yet</h2>
              <p style={mutedCopyStyle}>{summary.paragraph}</p>
              <MotionLink whileTap={{ scale: 0.97 }} href="/app/checkin" style={primaryButtonStyle}>
                Start a check-in →
              </MotionLink>
            </GlassCard>
          </motion.section>
        </div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  return (
    <main className="wk-page" style={mainStyle}>
      <motion.div aria-hidden style={ambientGlowStyle} animate={{ opacity: [0.1, 0.22, 0.1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />

      <div style={pageWrapStyle}>
        {/* ── Header ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0, ease: EASE }}>
          <GlassCard style={headerCardStyle}>
            <div style={headerTopRowStyle}>
              <span style={labelStyle}>WEEKLY REFLECTION</span>
              <span style={{ ...badgeStyle, ...trendMeta.style }}>{trendMeta.label}</span>
            </div>
            <h1 style={headerTitleStyle}>{weekRangeTitle}</h1>
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
              style={{ ...headerDividerStyle, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
            />
          </GlassCard>
        </motion.section>

        {/* ── Pressure trace ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
          <GlassCard style={sectionCardStyle}>
            <div style={cardTopRowStyle}>
              <span style={labelStyle}>PRESSURE TRACE</span>
              <span style={hintStyle}>Tap a day</span>
            </div>

            <div style={chartWrapStyle}>
              <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: "100%", display: "block" }} aria-label="Pressure trace over the last seven days">
                <defs>
                  <linearGradient id="weeklyStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={accentFaint} />
                    <stop offset="100%" stopColor={accentColor} />
                  </linearGradient>
                  <linearGradient id="weeklyFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={accentFill0} />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                  </linearGradient>
                </defs>

                {[0.25, 0.5, 0.75].map((ratio) => (
                  <line key={ratio} x1={PAD_X} x2={CHART_W - PAD_X} y1={GRAPH_TOP + GRAPH_H * ratio} y2={GRAPH_TOP + GRAPH_H * ratio} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                ))}

                <motion.path d={areaPath} fill="url(#weeklyFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }} />
                <motion.path
                  ref={pathRef}
                  d={linePath}
                  fill="none"
                  stroke="url(#weeklyStroke)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pathLength}
                  style={{ strokeDashoffset: dashOffset }}
                />

                {dayPoints.map((point, index) => {
                  const isActive = index === selectedDayIdx;
                  const radius = point.hasData ? (isActive ? 6 : 4) : 3;
                  const activeFill = isClearWeek ? "rgb(100,170,120)" : "#C27A5C";
                  const inactiveFill = isClearWeek ? "rgba(100,170,120,0.5)" : "rgba(194,122,92,0.5)";
                  const fill = point.hasData ? (isActive ? activeFill : inactiveFill) : "rgba(255,255,255,0.1)";
                  const pulseStroke = isClearWeek ? "rgba(100,170,120,0.4)" : "rgba(194,122,92,0.4)";
                  const pulseFill = isClearWeek ? "rgba(100,170,120,0.06)" : "rgba(194,122,92,0.06)";

                  return (
                    <motion.g
                      key={point.key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedDayIdx(index)}
                      style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "center" }}
                    >
                      <circle cx={point.x} cy={point.y} r={18} fill="transparent" />
                      {isActive ? (
                        <motion.circle
                          cx={point.x} cy={point.y} r={11}
                          fill={pulseFill}
                          stroke={pulseStroke}
                          strokeWidth="1"
                          animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.16, 0.45] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                          style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        />
                      ) : null}
                      <circle cx={point.x} cy={point.y} r={radius} fill={fill} stroke={isActive ? "#FFF" : "transparent"} strokeWidth={isActive ? 1.2 : 0} />
                      <text x={point.x} y={82} textAnchor="middle" style={chartLabelStyle}>{point.label}</text>
                    </motion.g>
                  );
                })}
              </svg>

              <AnimatePresence>
                {selectedDay?.hasData ? (
                  <motion.div
                    key={selectedDay.key}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.24, ease: EASE }}
                    style={{ ...tooltipStyle, left: `clamp(82px, ${selectedLeftPercent}%, calc(100% - 82px))` }}
                  >
                    <div style={tooltipTitleStyle}>{selectedDay.tooltipLabel}</div>
                    <div style={tooltipMetaStyle}>
                      {selectedDay.topState ? STATE_LABEL[selectedDay.topState] : "No state"} · {selectedDay.topNeed ? NEED_LABEL[selectedDay.topNeed] : "No need"}
                    </div>
                    <div style={tooltipMetaStyle}>Completed: {selectedDay.completionRate ?? 0}%</div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div style={pillRowStyle}>
              <span className="wk-pill" style={{ color: topStatePillColor }}>
                Top state: {weeklyTopState ? STATE_LABEL[weeklyTopState] : "No signal"}
              </span>
              <span className="wk-pill">Top need: {weeklyTopNeed ? NEED_LABEL[weeklyTopNeed] : "No signal"}</span>
              <span className="wk-pill">Completion: {weeklyCompletionRate ?? 0}%</span>
            </div>
          </GlassCard>
        </motion.section>

        {/* ── Pattern read ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.14, ease: EASE }}>
          <GlassCard style={patternCardStyle}>
            <span style={labelStyle}>PATTERN READ</span>
            <div style={{ display: "grid", gap: 0 }}>
              {(summary?.paragraph ?? "").split("|").map((obs, i, arr) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: 0.18 + i * 0.08, ease: EASE }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "0 14px",
                    padding: "14px 0",
                    borderBottom: i < arr.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  }}
                >
                  <span style={{
                    color: isClearWeek ? "rgba(120,200,150,0.38)" : "rgba(194,122,92,0.38)",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    lineHeight: 1.8,
                    userSelect: "none" as const,
                    paddingTop: 1,
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p style={patternTextStyle}>{obs.trim()}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.section>

        {/* ── What worked ── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.2, ease: EASE }}>
          <GlassCard style={workedCardStyle}>
            <div style={workedHeaderStyle}>
              <span style={labelStyle}>{workedSection.heading}</span>
              {workedSection.subcopy ? <div style={workedSubcopyStyle}>{workedSection.subcopy}</div> : null}
            </div>
            {workedTools.length ? (
              <div>
                {workedTools.map(({ note, toolId }, index) => (
                  <motion.button
                    key={toolId}
                    type="button"
                    className="wk-tool-row"
                    whileTap={{ scale: 0.99, backgroundColor: isClearWeek ? "rgba(100,170,120,0.06)" : "rgba(194,122,92,0.06)" }}
                    onClick={() => router.push(`/app/tool/${toolId}`)}
                    style={toolRowButtonStyle}
                  >
                    <span style={{
                      ...rankBadgeStyle,
                      ...(index === 0
                        ? { background: isClearWeek ? "rgba(100,170,120,0.14)" : "rgba(194,122,92,0.14)", color: isClearWeek ? "rgba(120,200,150,0.95)" : "#C27A5C" }
                        : rankOtherBadgeStyle),
                    }}>
                      {index + 1}
                    </span>
                    <span style={toolCopyStyle}>
                      <span style={toolTitleStyle}>{toolTitle(toolId)}</span>
                      {note ? <span style={toolNoteStyle}>{note}</span> : null}
                    </span>
                    <span style={toolActionStyle}>Open →</span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div style={emptyWorkedStyle}>{workedSection.emptyCopy}</div>
            )}
          </GlassCard>
        </motion.section>
      </div>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const loadingMainStyle: CSSProperties = { minHeight: "100dvh", background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center" };
const loadingTextStyle: CSSProperties = { color: "#F4F4F5", fontSize: 13, fontWeight: 800, letterSpacing: "0.28em" };

const mainStyle: CSSProperties = { minHeight: "100dvh", background: "#18181B", padding: "56px 18px 88px", position: "relative", overflow: "hidden" };
const centeredMainStyle: CSSProperties = { ...mainStyle, display: "flex", alignItems: "center", justifyContent: "center" };

const pageWrapStyle: CSSProperties = { position: "relative", zIndex: 1, width: "100%", maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 };

const ambientGlowStyle: CSSProperties = {
  position: "fixed", top: -70, right: -54, width: 230, height: 230, borderRadius: 999, pointerEvents: "none",
  background: "radial-gradient(circle, rgba(194,122,92,0.24) 0%, rgba(194,122,92,0.08) 46%, rgba(194,122,92,0) 74%)",
  filter: "blur(50px)",
};

const innerHighlightStyle: CSSProperties = {
  position: "absolute", top: 0, left: 16, right: 16, height: 1,
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
  pointerEvents: "none",
};

const loggedOutCardStyle: CSSProperties = { padding: 24, display: "grid", gap: 14 };
const headerCardStyle: CSSProperties = { padding: 20 };
const sectionCardStyle: CSSProperties = { padding: 18, display: "grid", gap: 12 };
const patternCardStyle: CSSProperties = { padding: 18, display: "grid", gap: 10 };
const workedCardStyle: CSSProperties = { padding: 0, overflow: "hidden" };
const emptyCardStyle: CSSProperties = { padding: 20, display: "grid", gap: 12 };

const serifTitleStyle: CSSProperties = {
  margin: 0, color: "#F4F4F5", fontFamily: "Zodiak, Georgia, serif",
  fontSize: "clamp(30px,7vw,40px)", fontWeight: 400, lineHeight: 1,
};
const emptyTitleStyle: CSSProperties = { margin: 0, color: "#F4F4F5", fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", fontWeight: 650 };
const mutedCopyStyle: CSSProperties = { margin: 0, color: "#A1A1AA", fontSize: 14, lineHeight: 1.75 };

const headerTopRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 };
const cardTopRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };

const labelStyle: CSSProperties = { color: "#A1A1AA", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };

const headerTitleStyle: CSSProperties = {
  margin: 0, color: "#F4F4F5", fontFamily: "Zodiak, Georgia, serif",
  fontSize: "clamp(30px,7vw,40px)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.03em",
};

const headerDividerStyle: CSSProperties = {
  height: 1, marginTop: 14, transformOrigin: "left",
  background: "linear-gradient(90deg, transparent, #C27A5C, transparent)",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", minHeight: 30, padding: "6px 10px",
  borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
};

const chartWrapStyle: CSSProperties = { position: "relative" };
const hintStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, lineHeight: 1.4 };

const chartLabelStyle: CSSProperties = { fill: "rgba(255,255,255,0.46)", fontSize: 9, letterSpacing: "0.04em" };

const tooltipStyle: CSSProperties = {
  position: "absolute", top: 0, transform: "translateX(-50%)", padding: "10px 12px",
  borderRadius: 16, background: "rgba(39,39,42,0.95)", border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.32)", pointerEvents: "none",
};

const tooltipTitleStyle: CSSProperties = { color: "#F4F4F5", fontSize: 12, fontWeight: 700, lineHeight: 1.4 };
const tooltipMetaStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, lineHeight: 1.45 };
const pillRowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };

const patternTextStyle: CSSProperties = {
  margin: 0,
  color: "rgba(244,244,245,0.78)",
  fontSize: 15,
  lineHeight: 1.8,
  fontWeight: 400,
};

const workedHeaderStyle: CSSProperties = { padding: "18px 18px 10px" };
const workedSubcopyStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, lineHeight: 1.5, marginTop: 4 };

const toolRowButtonStyle: CSSProperties = {
  width: "100%", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto",
  alignItems: "center", gap: 12, padding: "14px 18px", border: "none",
  background: "transparent", color: "#F4F4F5", textAlign: "left", cursor: "pointer",
};

const rankBadgeStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 999, fontSize: 12, fontWeight: 800,
};

const rankOtherBadgeStyle: CSSProperties = { background: "rgba(255,255,255,0.04)", color: "#52525B" };

const toolCopyStyle: CSSProperties = {
  display: "grid",
  gap: 2,
  minWidth: 0,
};

const toolTitleStyle: CSSProperties = {
  color: "#F4F4F5", fontSize: 14, lineHeight: 1.4,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const toolNoteStyle: CSSProperties = {
  color: "#A1A1AA",
  fontSize: 12,
  lineHeight: 1.45,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const toolActionStyle: CSSProperties = { color: "#F4F4F5", fontSize: 13, fontWeight: 700 };
const emptyWorkedStyle: CSSProperties = { color: "#A1A1AA", fontSize: 14, lineHeight: 1.7, padding: "0 18px 18px" };

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  minHeight: 52, padding: "14px 16px", borderRadius: 16,
  border: "1px solid rgba(194,122,92,0.22)",
  background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
  color: "#FFFFFF", textDecoration: "none", fontSize: 14, fontWeight: 800,
};

const pageStyles = `
  .wk-page * { -webkit-tap-highlight-color: transparent; }

  .wk-glass {
    position: relative;
    background: rgba(39,39,42,0.62);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07);
  }

  .wk-pill {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
    color: #A1A1AA;
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
  }

  .wk-tool-row + .wk-tool-row {
    border-top: 1px solid rgba(255,255,255,0.05);
  }
`;
