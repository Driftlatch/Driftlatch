"use client";

import { getRoomToneLabel, isRoomToneForSituation, type RoomTone } from "@/lib/roomTone";
import { getNeedLabel } from "@/lib/supportLabels";
import { LIBRARY, type DriftNeed, type DriftSituation, type DriftState } from "@/lib/toolLibrary";
import type { Tables } from "@/lib/types/supabase";

export type WeeklyMode = "full" | "partial" | "empty";
export type WeeklySignalMode = "explicit" | "implicit" | "recent" | "none";

export type WeeklyCheckinRow = {
  created_at: string;
  did_complete: boolean | null;
  need: DriftNeed | null;
  room_tone?: string | null;
  shift?: string | null;
  situation?: DriftSituation | null;
  source?: string | null;
  state: DriftState | null;
  time_minutes?: number | null;
  tool_id: string | null;
};

export type WeeklyRecentRow = {
  tool_id: string;
  used_at: string;
};

export type WeeklyFeedbackRow = Pick<Tables<"user_tool_feedback">, "created_at" | "helpful_score" | "shift" | "tool_id">;

export type WorkedToolRow = {
  note: string | null;
  toolId: string;
};

export type WorkedSection = {
  intro: string | null;
  mode: "feedback" | "usage" | "empty";
  toolRows: WorkedToolRow[];
};

export type WeeklyDaySummary = {
  checkinCount: number;
  completionRate: number | null;
  firstRoomTone: RoomTone | null;
  firstState: DriftState | null;
  firstStateRank: number | null;
  hasData: boolean;
  highestState: DriftState | null;
  highestStateRank: number | null;
  key: string;
  label: string;
  latestSituation: DriftSituation | null;
  latestRoomTone: RoomTone | null;
  latestState: DriftState | null;
  latestStateRank: number | null;
  mainSupport: DriftNeed | null;
  signalSource: WeeklySignalMode | null;
  tooltipLabel: string;
};

export type WeeklyReflection = {
  accentState: DriftState | null;
  body: string | null;
  days: WeeklyDaySummary[];
  footer: string | null;
  helpedCopy: string | null;
  insights: string[];
  microInsight: string | null;
  mode: WeeklyMode;
  returnLine: string | null;
  roomPatternReads: string[];
  selectedDayIndex: number;
  sessions: number | null;
  signalMode: WeeklySignalMode;
  summarySourceKey: string;
  summaryLine: string;
  title: string | null;
  topTools: string[];
  visibleWeekEnd: string;
  visibleWeekStart: string;
  weekRangeTitle: string;
  workedSection: WorkedSection;
};

export const RANGE_DAYS = 7;
export const STATE_LADDER: DriftState[] = ["clear_light", "steady", "carrying_work", "wired", "drained", "overloaded"];
export const HEAVY_ENDING_THRESHOLD = 3;
export const FULL_SELECT = "created_at,state,need,tool_id,did_complete,time_minutes,situation,room_tone,source,shift";
export const SAFE_SELECT = "created_at,state,need,tool_id,did_complete";

export const STATE_LABEL: Record<DriftState, string> = {
  clear_light: "Clear & light",
  steady: "Steady",
  carrying_work: "Carrying work",
  wired: "Wired",
  drained: "Drained",
  overloaded: "Overloaded",
};

export const STATE_ACCENT: Record<DriftState, string> = {
  clear_light: "#78C896",
  steady: "#7E9AC6",
  carrying_work: "#C27A5C",
  wired: "#DCAA5A",
  drained: "#6EA290",
  overloaded: "#B66660",
};

const ROOM_TONE_WEIGHT: Record<RoomTone, number> = {
  easy: 0,
  settled: 0,
  connected: 0,
  neutral: 1,
  busy: 2,
  unclear: 2,
  tense: 3,
  guarded: 3,
  frayed: 3,
  loud: 3,
  distant: 4,
  clingy: 4,
  far: 4,
};

type ResolvedSignalSource = "explicit" | "implicit";
type ResolvedCheckinRow = WeeklyCheckinRow & {
  effectiveNeed: DriftNeed | null;
  effectiveState: DriftState | null;
  signalSource: ResolvedSignalSource;
};

type ResolvedRecentRow = WeeklyRecentRow & {
  effectiveNeed: DriftNeed | null;
  effectiveState: DriftState | null;
};

export function isDriftState(value: unknown): value is DriftState {
  return value === "clear_light" || value === "steady" || value === "carrying_work" || value === "wired" || value === "drained" || value === "overloaded";
}

export function isDriftNeed(value: unknown): value is DriftNeed {
  return value === "regain_clarity" || value === "wind_down" || value === "be_here" || value === "come_back";
}

export function isDriftSituation(value: unknown): value is DriftSituation {
  return value === "partner_nearby" || value === "kids_around" || value === "alone" || value === "long_distance";
}

export function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function getWeeklyRangeBounds(rangeDays = RANGE_DAYS) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (rangeDays - 1));

  const visibleEnd = new Date();
  visibleEnd.setHours(0, 0, 0, 0);

  const endExclusive = new Date(visibleEnd);
  endExclusive.setDate(endExclusive.getDate() + 1);

  return {
    endExclusive,
    endIso: endExclusive.toISOString(),
    start,
    startIso: start.toISOString(),
    visibleEnd,
  };
}

function getVisibleWeekDates(rangeDays = RANGE_DAYS) {
  const { start, visibleEnd } = getWeeklyRangeBounds(rangeDays);
  return Array.from({ length: rangeDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    if (date > visibleEnd) return new Date(visibleEnd);
    return date;
  });
}

export function topFromFrequency<T extends string>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function toolTitle(toolId: string) {
  return LIBRARY.tools.find((tool) => tool.id === toolId)?.title ?? toolId;
}

export function inferStateFromTool(toolId: string | null) {
  if (!toolId) return null;
  return LIBRARY.tools.find((tool) => tool.id === toolId)?.best_for_state?.[0] ?? null;
}

export function inferNeedFromTool(toolId: string | null) {
  if (!toolId) return null;
  return LIBRARY.tools.find((tool) => tool.id === toolId)?.need?.[0] ?? null;
}

export function getStateRank(state: DriftState) {
  return STATE_LADDER.indexOf(state);
}

export function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatTooltipLabel(date: Date) {
  return `${date.toLocaleDateString(undefined, { weekday: "short" })} - ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function formatRangeTitle(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function accentForState(state: DriftState | null) {
  return state ? STATE_ACCENT[state] : "#A1A1AA";
}

export function roomToneWeight(roomTone: RoomTone | null) {
  return roomTone ? ROOM_TONE_WEIGHT[roomTone] : null;
}

export function roomToneAccent(roomTone: RoomTone | null) {
  const weight = roomToneWeight(roomTone);
  if (weight === null) return "rgba(255,255,255,0.14)";
  if (weight <= 1) return "#78C896";
  if (weight === 2) return "#DCAA5A";
  if (weight === 3) return "#C27A5C";
  return "#B66660";
}

function normalizeRoomTone(situation: DriftSituation | null, value: string | null): RoomTone | null {
  return situation && isRoomToneForSituation(situation, value) ? value : null;
}

function resolveCheckinSignalSource(row: WeeklyCheckinRow): ResolvedSignalSource {
  return row.source === "implicit" ? "implicit" : "explicit";
}

function resolveCheckinRow(row: WeeklyCheckinRow): ResolvedCheckinRow {
  return {
    ...row,
    effectiveNeed: isDriftNeed(row.need) ? row.need : inferNeedFromTool(row.tool_id),
    effectiveState: isDriftState(row.state) ? row.state : inferStateFromTool(row.tool_id),
    signalSource: resolveCheckinSignalSource(row),
  };
}

function resolveRecentRow(row: WeeklyRecentRow): ResolvedRecentRow {
  return {
    ...row,
    effectiveNeed: inferNeedFromTool(row.tool_id),
    effectiveState: inferStateFromTool(row.tool_id),
  };
}

export function normalizeCheckinRows(rows: WeeklyCheckinRow[]) {
  return rows
    .filter((row) => typeof row.created_at === "string")
    .map((row) => ({
      created_at: row.created_at,
      did_complete: Boolean(row.did_complete),
      need: isDriftNeed(row.need) ? row.need : null,
      room_tone: typeof row.room_tone === "string" ? row.room_tone : null,
      shift: typeof row.shift === "string" ? row.shift : null,
      situation: isDriftSituation(row.situation) ? row.situation : null,
      source: row.source === "implicit" ? "implicit" : "explicit",
      state: isDriftState(row.state) ? row.state : null,
      time_minutes: typeof row.time_minutes === "number" ? row.time_minutes : null,
      tool_id: typeof row.tool_id === "string" ? row.tool_id : null,
    }));
}

export function normalizeRecentRows(rows: WeeklyRecentRow[]) {
  return rows.filter((row) => typeof row.tool_id === "string" && typeof row.used_at === "string");
}

type QueryErrorLike = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

type WeeklyCheckinsQueryResult = PromiseLike<{
  data: WeeklyCheckinRow[] | null;
  error: QueryErrorLike | null;
}>;

export type WeeklyCheckinsFetchMeta = {
  fullSelectFailed: boolean;
  fullSelectMissingColumn: boolean;
  safeSelectAttempted: boolean;
  safeSelectUsed: boolean;
};

export const EMPTY_WEEKLY_CHECKINS_FETCH_META: WeeklyCheckinsFetchMeta = {
  fullSelectFailed: false,
  fullSelectMissingColumn: false,
  safeSelectAttempted: false,
  safeSelectUsed: false,
};

export type WeeklyCheckinsFetchResult = {
  data: WeeklyCheckinRow[] | null;
  error: QueryErrorLike | null;
  meta: WeeklyCheckinsFetchMeta;
};

type WeeklyCheckinsLtQuery = {
  order: (column: string, options: { ascending: boolean }) => WeeklyCheckinsQueryResult;
};

type WeeklyCheckinsGteQuery = {
  lt: (column: string, value: string) => WeeklyCheckinsLtQuery;
};

type WeeklyCheckinsEqQuery = {
  gte: (column: string, value: string) => WeeklyCheckinsGteQuery;
};

type WeeklyCheckinsSelectQuery = {
  eq: (column: string, value: string) => WeeklyCheckinsEqQuery;
};

type WeeklyCheckinsSupabaseClient = {
  from: (table: string) => unknown;
};

export function isMissingColumnError(error: QueryErrorLike | null | undefined) {
  if (!error) return false;
  const haystack = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    error.code === "42703" ||
    (haystack.includes("column") && haystack.includes("does not exist")) ||
    (haystack.includes("column") && haystack.includes("could not find")) ||
    (haystack.includes("column") && haystack.includes("schema cache"))
  );
}

async function runWeeklyCheckinsQuery(
  supabase: WeeklyCheckinsSupabaseClient,
  columns: string,
  userId: string,
  startIso: string,
  endIso: string,
) {
  const fromQuery = supabase.from("user_checkins") as { select: (selectedColumns: string) => WeeklyCheckinsSelectQuery };
  return await fromQuery.select(columns).eq("user_id", userId).gte("created_at", startIso).lt("created_at", endIso).order("created_at", { ascending: false });
}

export async function fetchWeeklyCheckins(
  supabase: WeeklyCheckinsSupabaseClient,
  userId: string,
  startIso: string,
  endIso: string,
): Promise<WeeklyCheckinsFetchResult> {
  const fullResult = await runWeeklyCheckinsQuery(supabase, FULL_SELECT, userId, startIso, endIso);

  if (!fullResult.error) {
    return {
      data: fullResult.data,
      error: null,
      meta: EMPTY_WEEKLY_CHECKINS_FETCH_META,
    };
  }

  if (!isMissingColumnError(fullResult.error)) {
    return {
      data: fullResult.data,
      error: fullResult.error,
      meta: {
        ...EMPTY_WEEKLY_CHECKINS_FETCH_META,
        fullSelectFailed: true,
      },
    };
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[weekly-fetch] FULL_SELECT failed with a missing-column schema error, retrying SAFE_SELECT.", {
      endIso,
      error: fullResult.error,
      startIso,
      userId,
    });
  }

  const safeResult = await runWeeklyCheckinsQuery(supabase, SAFE_SELECT, userId, startIso, endIso);

  if (safeResult.error) {
    return {
      data: safeResult.data,
      error: safeResult.error,
      meta: {
        fullSelectFailed: true,
        fullSelectMissingColumn: true,
        safeSelectAttempted: true,
        safeSelectUsed: false,
      },
    };
  }

  return {
    data: safeResult.data,
    error: null,
    meta: {
      fullSelectFailed: true,
      fullSelectMissingColumn: true,
      safeSelectAttempted: true,
      safeSelectUsed: true,
    },
  };
}

function makeEmptyDaySummary(date: Date, key: string): WeeklyDaySummary {
  return {
    checkinCount: 0,
    completionRate: null,
    firstRoomTone: null,
    firstState: null,
    firstStateRank: null,
    hasData: false,
    highestState: null,
    highestStateRank: null,
    key,
    label: formatDayLabel(date),
    latestSituation: null,
    latestRoomTone: null,
    latestState: null,
    latestStateRank: null,
    mainSupport: null,
    signalSource: null,
    tooltipLabel: formatTooltipLabel(date),
  };
}

function buildDaySummariesFromCheckins(checkins: WeeklyCheckinRow[], rangeDays: number) {
  const byDay = new Map<string, ResolvedCheckinRow[]>();

  for (const row of checkins.map(resolveCheckinRow)) {
    const key = formatDayKey(new Date(row.created_at));
    byDay.set(key, [...(byDay.get(key) ?? []), row]);
  }

  return getVisibleWeekDates(rangeDays).map((date) => {
    const key = formatDayKey(date);
    const rows = [...(byDay.get(key) ?? [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

    if (rows.length === 0) {
      return makeEmptyDaySummary(date, key);
    }

    const stateRows = rows.filter((row): row is ResolvedCheckinRow & { effectiveState: DriftState } => row.effectiveState !== null);
    if (stateRows.length === 0) {
      const fallbackState: DriftState = "steady";
      const mainSupport = topFromFrequency(rows.map((row) => row.effectiveNeed).filter((value): value is DriftNeed => value !== null))[0]?.[0] ?? null;
      const signalSource: WeeklySignalMode = rows.some((row) => row.signalSource === "explicit") ? "explicit" : "implicit";
      return {
        checkinCount: rows.length,
        completionRate: Math.round((rows.filter((row) => row.did_complete).length / rows.length) * 100),
        firstRoomTone: null,
        firstState: fallbackState,
        firstStateRank: getStateRank(fallbackState),
        hasData: true,
        highestState: fallbackState,
        highestStateRank: getStateRank(fallbackState),
        key,
        label: formatDayLabel(date),
        latestSituation: rows[rows.length - 1]?.situation ?? null,
        latestRoomTone: null,
        latestState: fallbackState,
        latestStateRank: getStateRank(fallbackState),
        mainSupport,
        signalSource,
        tooltipLabel: formatTooltipLabel(date),
      } satisfies WeeklyDaySummary;
    }

    const first = stateRows[0];
    const latest = stateRows[stateRows.length - 1];
    const highest = stateRows.reduce((currentHighest, row) =>
      getStateRank(row.effectiveState) > getStateRank(currentHighest.effectiveState) ? row : currentHighest,
    );
    const firstRoomRow = rows.find((row) => normalizeRoomTone(row.situation ?? null, row.room_tone ?? null) !== null) ?? null;
    const latestRoomRow = [...rows].reverse().find((row) => normalizeRoomTone(row.situation ?? null, row.room_tone ?? null) !== null) ?? null;
    const mainSupport = topFromFrequency(rows.map((row) => row.effectiveNeed).filter((value): value is DriftNeed => value !== null))[0]?.[0] ?? null;
    const signalSource: WeeklySignalMode = rows.some((row) => row.signalSource === "explicit") ? "explicit" : "implicit";

    return {
      checkinCount: rows.length,
      completionRate: Math.round((rows.filter((row) => row.did_complete).length / rows.length) * 100),
      firstRoomTone: firstRoomRow ? normalizeRoomTone(firstRoomRow.situation ?? null, firstRoomRow.room_tone ?? null) : null,
      firstState: first.effectiveState,
      firstStateRank: getStateRank(first.effectiveState),
      hasData: true,
      highestState: highest.effectiveState,
      highestStateRank: getStateRank(highest.effectiveState),
      key,
      label: formatDayLabel(date),
      latestSituation: latestRoomRow?.situation ?? latest.situation ?? null,
      latestRoomTone: latestRoomRow ? normalizeRoomTone(latestRoomRow.situation ?? null, latestRoomRow.room_tone ?? null) : null,
      latestState: latest.effectiveState,
      latestStateRank: getStateRank(latest.effectiveState),
      mainSupport,
      signalSource,
      tooltipLabel: formatTooltipLabel(date),
    } satisfies WeeklyDaySummary;
  });
}

function buildDaySummariesFromRecent(recentRows: WeeklyRecentRow[], rangeDays: number) {
  const byDay = new Map<string, ResolvedRecentRow[]>();

  for (const row of recentRows.map(resolveRecentRow)) {
    const key = formatDayKey(new Date(row.used_at));
    byDay.set(key, [...(byDay.get(key) ?? []), row]);
  }

  return getVisibleWeekDates(rangeDays).map((date) => {
    const key = formatDayKey(date);
    const rows = [...(byDay.get(key) ?? [])].sort((a, b) => Date.parse(a.used_at) - Date.parse(b.used_at));

    if (rows.length === 0) {
      return makeEmptyDaySummary(date, key);
    }

    const stateRows = rows.filter((row): row is ResolvedRecentRow & { effectiveState: DriftState } => row.effectiveState !== null);
    if (stateRows.length === 0) {
      const fallbackState: DriftState = "steady";
      const mainSupport = topFromFrequency(rows.map((row) => row.effectiveNeed).filter((value): value is DriftNeed => value !== null))[0]?.[0] ?? null;
      return {
        checkinCount: rows.length,
        completionRate: null,
        firstRoomTone: null,
        firstState: fallbackState,
        firstStateRank: getStateRank(fallbackState),
        hasData: true,
        highestState: fallbackState,
        highestStateRank: getStateRank(fallbackState),
        key,
        label: formatDayLabel(date),
        latestSituation: null,
        latestRoomTone: null,
        latestState: fallbackState,
        latestStateRank: getStateRank(fallbackState),
        mainSupport,
        signalSource: "recent",
        tooltipLabel: formatTooltipLabel(date),
      } satisfies WeeklyDaySummary;
    }

    const first = stateRows[0];
    const latest = stateRows[stateRows.length - 1];
    const highest = stateRows.reduce((currentHighest, row) =>
      getStateRank(row.effectiveState) > getStateRank(currentHighest.effectiveState) ? row : currentHighest,
    );
    const mainSupport = topFromFrequency(rows.map((row) => row.effectiveNeed).filter((value): value is DriftNeed => value !== null))[0]?.[0] ?? null;

    return {
      checkinCount: rows.length,
      completionRate: null,
      firstRoomTone: null,
      firstState: first.effectiveState,
      firstStateRank: getStateRank(first.effectiveState),
      hasData: true,
      highestState: highest.effectiveState,
      highestStateRank: getStateRank(highest.effectiveState),
      key,
      label: formatDayLabel(date),
      latestSituation: null,
      latestRoomTone: null,
      latestState: latest.effectiveState,
      latestStateRank: getStateRank(latest.effectiveState),
      mainSupport,
      signalSource: "recent",
      tooltipLabel: formatTooltipLabel(date),
    } satisfies WeeklyDaySummary;
  });
}

export function getDefaultDayIndex(days: WeeklyDaySummary[]) {
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index]?.hasData) return index;
  }
  return days.length - 1;
}

function buildInsights(days: WeeklyDaySummary[]) {
  const daysWithData = days.filter((day) => day.hasData && day.latestStateRank !== null);
  if (daysWithData.length === 0) return [] as string[];

  if (daysWithData.length === 1) {
    const [day] = daysWithData;
    const insights = [buildDayNote(day) ?? "Your week has started to take shape."];
    if (day.mainSupport) insights.push(`${getNeedLabel(day.mainSupport)} was the first support you reached for.`);
    if (day.latestRoomTone) insights.push(`The room felt ${getRoomToneLabel(day.latestRoomTone)?.toLowerCase()}.`);
    return insights.slice(0, 2);
  }

  const improvedDays = daysWithData.filter(
    (day) => day.firstStateRank !== null && day.latestStateRank !== null && day.latestStateRank < day.firstStateRank,
  );
  const escalatedDays = daysWithData.filter(
    (day) => day.firstStateRank !== null && day.latestStateRank !== null && day.latestStateRank > day.firstStateRank,
  );
  const steadyDays = daysWithData.length - improvedDays.length - escalatedDays.length;
  const tenseEvenings = daysWithData.filter((day) => (roomToneWeight(day.latestRoomTone) ?? -1) >= 3).length;
  const calmerDays = daysWithData.filter((day) => (roomToneWeight(day.latestRoomTone) ?? 99) <= 1 && (day.latestStateRank ?? 99) <= 1).length;
  const heavierMidweekDays = daysWithData.filter((day) => ["Tue", "Wed", "Thu"].includes(day.label) && (day.latestStateRank ?? -1) >= HEAVY_ENDING_THRESHOLD).length;
  const supportLeader = topFromFrequency(daysWithData.map((day) => day.mainSupport).filter((value): value is DriftNeed => value !== null))[0]?.[0] ?? null;
  const insights: string[] = [];

  if (improvedDays.length >= Math.max(escalatedDays.length, steadyDays) && improvedDays.length >= 2) {
    insights.push("You often landed a little lighter than you started.");
  } else if (escalatedDays.length >= Math.max(improvedDays.length, steadyDays) && escalatedDays.length >= 2) {
    insights.push("The day got heavier later more than once.");
  } else {
    insights.push("You mostly held steady this week.");
  }

  if (heavierMidweekDays >= 2) {
    insights.push("Work followed you home a bit mid-week.");
  } else if (tenseEvenings >= 2) {
    insights.push(`Room felt tense on ${tenseEvenings} evenings.`);
  } else if (calmerDays >= 2) {
    insights.push("Felt easier on calmer days.");
  }

  if (supportLeader) {
    insights.push(`${getNeedLabel(supportLeader)} was the support you came back to most.`);
  }

  return insights.slice(0, 3);
}

function buildMicroInsight(days: WeeklyDaySummary[], checkins: WeeklyCheckinRow[], recentRows: WeeklyRecentRow[], signalMode: WeeklySignalMode) {
  const daysWithData = days.filter((day) => day.hasData);
  if (daysWithData.length === 0) return null;

  if (daysWithData.length === 1) {
    const [day] = daysWithData;
    if (day.firstStateRank !== null && day.latestStateRank !== null && day.latestStateRank < day.firstStateRank) return "Recovery started to show.";
    if (day.latestRoomTone) return `The room felt ${getRoomToneLabel(day.latestRoomTone)?.toLowerCase()}.`;
    if (signalMode === "explicit" && day.checkinCount === 1) return "First check-in logged.";
    if (signalMode === "implicit") return "You've started building your weekly picture.";
    if (signalMode === "recent" && recentRows.length > 0) return "A pattern is starting to form.";
    if (day.mainSupport) return `${getNeedLabel(day.mainSupport)} was the first thing you reached for.`;
    return "Your week has started to take shape.";
  }

  const multiCheckinRecoveryDays = daysWithData.filter(
    (day) => day.checkinCount >= 2 && day.firstStateRank !== null && day.latestStateRank !== null && day.latestStateRank < day.firstStateRank,
  ).length;
  const heavierMidweekDays = daysWithData.filter((day) => ["Tue", "Wed", "Thu"].includes(day.label) && (day.latestStateRank ?? -1) >= HEAVY_ENDING_THRESHOLD).length;
  const quickSupportRecoveryDays = daysWithData.filter((day) => {
    if (day.firstStateRank === null || day.latestStateRank === null || day.latestStateRank >= day.firstStateRank) return false;
    return checkins.some((row) => formatDayKey(new Date(row.created_at)) === day.key && typeof row.time_minutes === "number" && row.time_minutes <= 3);
  }).length;
  const calmerDays = daysWithData.filter((day) => (roomToneWeight(day.latestRoomTone) ?? 99) <= 1 && (day.latestStateRank ?? 99) <= 1).length;

  if (multiCheckinRecoveryDays >= 2) return "You recovered more on days you checked in twice.";
  if (heavierMidweekDays >= 2) return "Heavier days showed up mid-week.";
  if (quickSupportRecoveryDays >= 2) return "Short supports helped you reset faster.";
  if (calmerDays >= 2) return "The room felt easier on calmer days.";
  return "Still getting a read on your week.";
}

function buildModeSummary(mode: WeeklyMode, signalMode: WeeklySignalMode, sessions: number | null, topTools: string[]) {
  if (mode === "empty") {
    return {
      body: "Add a couple of check-ins and this will start showing how your days move.",
      footer: null,
      returnLine: null,
      sessions: null,
      title: "Still getting your pattern",
      topTools: [] as string[],
    };
  }

  if (mode === "partial") {
    const leadTool = topTools[0] ?? null;
    return {
      body: "You've started using Driftlatch. Here's what's showing so far.",
      footer: "Add a check-in next time and this becomes much sharper.",
      returnLine: leadTool ? `You returned most to ${toolTitle(leadTool)}.` : signalMode === "implicit" ? "The week has already started to take shape." : null,
      sessions,
      title: "Getting your pattern",
      topTools: topTools.slice(0, 2),
    };
  }

  return {
    body: null,
    footer: null,
    returnLine: null,
    sessions: null,
    title: null,
    topTools: topTools.slice(0, 3),
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

function buildWorkedToolNote({ helpfulAverage, repeatCount, shiftAverage }: { helpfulAverage: number; repeatCount: number; shiftAverage: number }) {
  if (shiftAverage >= 2.5) return "Often left things lighter";
  if (helpfulAverage >= 2.5 && repeatCount > 1) return "You came back to this and it usually landed";
  if (helpfulAverage >= 2) return "Helped this week";
  if (repeatCount > 1) return `You returned to this ${repeatCount} times`;
  return null;
}

function buildWorkedSection(feedbackRows: WeeklyFeedbackRow[], currentCheckins: WeeklyCheckinRow[], currentRecent: WeeklyRecentRow[]): WorkedSection {
  const completionByTool = new Map<string, number>();
  for (const row of currentCheckins) {
    if (!row.did_complete || !row.tool_id) continue;
    completionByTool.set(row.tool_id, (completionByTool.get(row.tool_id) ?? 0) + 1);
  }

  if (feedbackRows.length > 0) {
    const feedbackByTool = new Map<string, WeeklyFeedbackRow[]>();
    for (const row of feedbackRows) feedbackByTool.set(row.tool_id, [...(feedbackByTool.get(row.tool_id) ?? []), row]);

    const toolRows = [...feedbackByTool.entries()]
      .map(([toolId, rows]) => {
        const helpfulAverage = rows.reduce((sum, row) => sum + getHelpfulRank(row.helpful_score), 0) / rows.length;
        const shiftAverage = rows.reduce((sum, row) => sum + getShiftRank(row.shift), 0) / rows.length;
        const latestAt = rows.reduce((latest, row) => Math.max(latest, Date.parse(row.created_at)), 0);
        return { completionCount: completionByTool.get(toolId) ?? 0, helpfulAverage, latestAt, note: buildWorkedToolNote({ helpfulAverage, repeatCount: rows.length, shiftAverage }), repeatCount: rows.length, shiftAverage, toolId };
      })
      .sort((a, b) => b.helpfulAverage - a.helpfulAverage || b.shiftAverage - a.shiftAverage || b.latestAt - a.latestAt || b.repeatCount - a.repeatCount || b.completionCount - a.completionCount)
      .slice(0, 3)
      .map((entry) => ({ note: entry.note, toolId: entry.toolId }));

    if (toolRows.length > 0) {
      return { intro: "These were the ones that seemed to land.", mode: "feedback", toolRows };
    }
  }

  const checkinUsage = topFromFrequency(currentCheckins.map((row) => row.tool_id).filter((value): value is string => value !== null))
    .slice(0, 3)
    .map(([toolId, count], index) => ({ note: index === 0 ? `You came back to this ${pluralize(count, "time")}` : count > 1 ? `${pluralize(count, "time")} this week` : null, toolId }));
  if (checkinUsage.length > 0) {
    return { intro: "These were the steps you returned to most.", mode: "usage", toolRows: checkinUsage };
  }

  const recentUsage = topFromFrequency(currentRecent.map((row) => row.tool_id))
    .slice(0, 3)
    .map(([toolId], index) => ({ note: index === 0 ? "You returned to this most" : null, toolId }));
  if (recentUsage.length > 0) {
    return { intro: "These were the steps you opened most.", mode: "usage", toolRows: recentUsage };
  }

  return { intro: null, mode: "empty", toolRows: [] };
}

export function buildHelpedCopy(workedSection: WorkedSection) {
  if (workedSection.mode === "feedback") return "These were the ones that seemed to land.";
  if (workedSection.mode === "usage") return "These were the steps you returned to most.";
  return null;
}

function buildHeaderSummaryLine(days: WeeklyDaySummary[], mode: WeeklyMode, signalMode: WeeklySignalMode) {
  const daysWithData = days.filter((day) => day.hasData);
  if (daysWithData.length === 0) return "Still getting a read on your week.";

  if (daysWithData.length === 1) {
    const [day] = daysWithData;
    if (day.firstStateRank !== null && day.latestStateRank !== null && day.latestStateRank < day.firstStateRank) return "Recovery started to show.";
    if (signalMode === "explicit" && day.checkinCount === 1) return "First check-in logged.";
    if (signalMode === "implicit") return "Your week has started to take shape.";
    if (signalMode === "recent") return "A pattern is starting to form.";
    if ((day.latestStateRank ?? 99) <= 1) return "A lighter start is showing.";
    if ((day.latestStateRank ?? -1) >= HEAVY_ENDING_THRESHOLD) return "The week started on a heavier note.";
    return "Your week has started to take shape.";
  }

  const recoveredDays = daysWithData.filter(
    (day) => day.firstStateRank !== null && day.latestStateRank !== null && day.latestStateRank < day.firstStateRank,
  ).length;
  const escalatedDays = daysWithData.filter(
    (day) => day.firstStateRank !== null && day.latestStateRank !== null && day.latestStateRank > day.firstStateRank,
  ).length;
  const stableDays = daysWithData.length - recoveredDays - escalatedDays;
  const heavierMidweekDays = daysWithData.filter((day) => ["Tue", "Wed", "Thu"].includes(day.label) && (day.latestStateRank ?? -1) >= HEAVY_ENDING_THRESHOLD).length;
  const carryingWorkEndings = daysWithData.filter((day) => day.latestState === "carrying_work").length;

  if (heavierMidweekDays >= 2) return "Work followed you home a bit mid-week.";
  if (recoveredDays >= Math.max(escalatedDays, stableDays) && recoveredDays >= 2) return "You mostly softened as the day went on.";
  if (stableDays >= Math.max(recoveredDays, escalatedDays)) return "You mostly held steady this week.";
  if (escalatedDays >= 2) return "The day got heavier later.";
  if (carryingWorkEndings >= 2) return "Work followed you home a bit this week.";
  if (mode === "partial") return "A pattern is starting to form.";
  return "Still getting a read on your week.";
}

export function buildDayNote(day: WeeklyDaySummary) {
  if (!day.hasData || !day.latestState || day.firstStateRank === null || day.latestStateRank === null) return null;

  const firstRoomWeight = roomToneWeight(day.firstRoomTone);
  const latestRoomWeight = roomToneWeight(day.latestRoomTone);

  if (day.latestStateRank < day.firstStateRank) {
    return day.checkinCount > 1 ? "You softened after checking in again." : "You ended a little lighter than you started.";
  }
  if (day.latestStateRank > day.firstStateRank) {
    return day.latestState === "carrying_work" ? "Work stayed with you later." : "The day got heavier later.";
  }
  if (firstRoomWeight !== null && latestRoomWeight !== null && latestRoomWeight < firstRoomWeight) {
    return "The room eased as you settled.";
  }
  if (day.firstState === day.latestState && (day.latestState === "wired" || day.latestState === "drained" || day.latestState === "overloaded")) {
    return "It stayed heavy through the day.";
  }

  return "You stayed pretty steady.";
}

function buildRoomPatternReads(days: WeeklyDaySummary[]) {
  const roomDays = days.filter(
    (day) => day.latestRoomTone !== null && day.latestSituation !== null && day.latestState !== null,
  );
  if (roomDays.length === 0) return [] as string[];

  if (roomDays.length === 1) {
    const [day] = roomDays;
    return [`The room felt ${getRoomToneLabel(day.latestRoomTone)?.toLowerCase()}.`];
  }

  const reads: string[] = [];
  const tenseEvenings = roomDays.filter((day) => (roomToneWeight(day.latestRoomTone) ?? -1) >= 3).length;
  const calmerDays = roomDays.filter((day) => (roomToneWeight(day.latestRoomTone) ?? 99) <= 1 && (day.latestStateRank ?? 99) <= 1).length;
  const roomSoftenedDays = roomDays.filter((day) => {
    const firstWeight = roomToneWeight(day.firstRoomTone);
    const latestWeight = roomToneWeight(day.latestRoomTone);
    return firstWeight !== null && latestWeight !== null && latestWeight < firstWeight;
  }).length;

  if (tenseEvenings >= 2) reads.push(`Room felt tense on ${tenseEvenings} evenings.`);
  if (calmerDays >= 2) reads.push("Felt easier on calmer days.");
  if (reads.length < 2 && roomSoftenedDays >= 2) reads.push("The room eased on the days you eased too.");

  return reads.slice(0, 2);
}

function buildWeekRangeTitle(rangeDays: number) {
  const { start, visibleEnd } = getWeeklyRangeBounds(rangeDays);
  return formatRangeTitle(start, visibleEnd);
}

export function buildWeeklyReflection({
  checkins,
  feedbackRows,
  rangeDays = RANGE_DAYS,
  recentRows,
}: {
  checkins: WeeklyCheckinRow[];
  feedbackRows: WeeklyFeedbackRow[];
  rangeDays?: number;
  recentRows: WeeklyRecentRow[];
}): WeeklyReflection {
  const { start, visibleEnd } = getWeeklyRangeBounds(rangeDays);
  const explicitCheckins = checkins.filter((row) => row.source !== "implicit");
  const signalMode: WeeklySignalMode = explicitCheckins.length > 0 ? "explicit" : checkins.length > 0 ? "implicit" : recentRows.length > 0 ? "recent" : "none";
  const mode: WeeklyMode = signalMode === "explicit" ? "full" : signalMode === "none" ? "empty" : "partial";
  const days = signalMode === "recent" ? buildDaySummariesFromRecent(recentRows, rangeDays) : buildDaySummariesFromCheckins(checkins, rangeDays);
  const topTools = topFromFrequency(
    (signalMode === "recent" ? recentRows.map((row) => row.tool_id) : checkins.map((row) => row.tool_id)).filter((value): value is string => value !== null),
  ).map(([toolId]) => toolId);
  const sessions = mode === "partial" ? (signalMode === "recent" ? recentRows.length : checkins.length) : null;
  const modeSummary = buildModeSummary(mode, signalMode, sessions, topTools);
  const workedSection = buildWorkedSection(feedbackRows, checkins, recentRows);
  const helpedCopy = buildHelpedCopy(workedSection);
  const summaryLine = buildHeaderSummaryLine(days, mode, signalMode);
  const accentState = topFromFrequency(days.filter((day) => day.latestState !== null).map((day) => day.latestState!))[0]?.[0] ?? null;
  const summarySourceKey = [
    signalMode,
    mode,
    summaryLine,
    days.map((day) => `${day.key}:${day.latestState ?? "none"}:${day.checkinCount}:${day.latestRoomTone ?? "none"}`).join("|"),
  ].join("::");

  return {
    accentState,
    body: modeSummary.body,
    days,
    footer: modeSummary.footer,
    helpedCopy,
    insights: mode === "empty" ? [] : buildInsights(days),
    microInsight: mode === "empty" ? null : buildMicroInsight(days, checkins, recentRows, signalMode),
    mode,
    returnLine: modeSummary.returnLine,
    roomPatternReads: buildRoomPatternReads(days),
    selectedDayIndex: getDefaultDayIndex(days),
    sessions: modeSummary.sessions,
    signalMode,
    summarySourceKey,
    summaryLine,
    title: modeSummary.title,
    topTools: modeSummary.topTools,
    visibleWeekEnd: visibleEnd.toISOString(),
    visibleWeekStart: start.toISOString(),
    weekRangeTitle: buildWeekRangeTitle(rangeDays),
    workedSection,
  };
}
