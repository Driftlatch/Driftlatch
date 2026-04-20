"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildToolContextKey,
  buildRecommendedToolHref,
  buildQuickRecommendation,
  formatQuickDefaultsSummary,
  parseStoredProfileDefaults,
  resolveQuickDefaults,
  type ResolvedQuickDefaults,
  type QuickRecommendation,
  type StoredProfileDefaults,
} from "@/lib/quickFlow";
import { buildHomePickerLine, buildHomeSetupLine } from "@/lib/personalizedCopy";
import { getUserMetadataDisplayName, loadCurrentUserAppState, resolveUserDisplayName, type AuthStateDiagnostic, type UserProfile } from "@/lib/auth";
import { getPackPurpose as getSupportPurpose } from "@/lib/supportLabels";
import { getSupabase } from "@/lib/supabase";
import { getPackName, LIBRARY } from "@/lib/toolLibrary";
import { selectTool } from "@/lib/selectTool";
import {
  EMPTY_WEEKLY_CHECKINS_FETCH_META,
  RANGE_DAYS as WEEKLY_RANGE_DAYS,
  STATE_LADDER as WEEKLY_STATE_LADDER,
  accentForState as weeklyAccentForState,
  buildWeeklyReflection,
  fetchWeeklyCheckins,
  getWeeklyRangeBounds,
  getStateRank as getWeeklyStateRank,
  normalizeCheckinRows,
  normalizeRecentRows,
  roomToneAccent,
  type WeeklyCheckinRow,
  type WeeklyCheckinsFetchMeta,
  type WeeklyDaySummary,
  type WeeklyFeedbackRow,
  type WeeklyRecentRow,
} from "@/lib/weeklyReflection";
import type { AttachmentStyle, DriftNeed, DriftState } from "@/lib/toolLibrary";
import { buildUserMomentContext, generateHomeGreeting, type UserMomentContext } from "@/lib/userContext";
import LogoAnimation from "@/components/LogoAnimation";

type Slot = "morning" | "afternoon" | "evening";
type EQProfileData = {
  pressure_reading: number;
  repair_instinct: number;
  presence_quality: number;
  boundary_intel: number;
  recovery_aware: number;
  signal_accuracy: number;
  weakest_domain: string;
  archetype: string;
};
type CheckinRow = { created_at: string; state: DriftState; need: DriftNeed };
type HomeProfileIdentity = {
  attachmentStyle: AttachmentStyle;
  metadataDisplayName: string;
  primaryPack: string | null;
  profileDisplayName: string;
  rawProfile: UserProfile | null;
  resolvedDisplayName: string;
  userId: string;
};
type HomeSourceState = {
  currentMomentOverrides: Partial<Pick<ResolvedQuickDefaults, "need" | "time" | "situation">> | null;
  diagnostics: AuthStateDiagnostic[];
  profileIdentity: HomeProfileIdentity | null;
  profileStatus: "available" | "missing" | "unavailable";
  savedDefaults: StoredProfileDefaults;
};

const MotionLink = motion(Link);
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SPRING = { stiffness: 340, damping: 28, mass: 0.9 };

const CLEAR_LIGHT_PACK_IDS = new Set([
  "sharp_pack", "warm_pack", "expansive_pack", "maintain_light_pack",
]);

const STATE_LABEL: Record<DriftState, string> = {
  clear_light: "Clear & light",
  carrying_work: "Carrying work",
  wired: "Wired",
  drained: "Drained",
  overloaded: "Overloaded",
  steady: "Steady",
};

const STATE_ATMOSPHERE: Record<DriftState, string> = {
  clear_light: "rgba(120,190,150,0.15)",
  steady: "rgba(122,142,172,0.15)",
  carrying_work: "rgba(182,118,92,0.17)",
  wired: "rgba(208,164,92,0.18)",
  drained: "rgba(104,128,118,0.14)",
  overloaded: "rgba(146,78,72,0.18)",
};

const STATE_DOT_COLOR: Record<DriftState, { bg: string; glow: string }> = {
  clear_light:   { bg: "rgba(120,190,150,0.85)", glow: "0 0 8px rgba(120,190,150,0.5)" },
  steady:        { bg: "rgba(100,160,200,0.85)", glow: "0 0 8px rgba(100,160,200,0.5)" },
  carrying_work: { bg: "rgba(194,122,92,0.85)",  glow: "0 0 8px rgba(194,122,92,0.5)" },
  wired:         { bg: "rgba(208,164,92,0.85)",  glow: "0 0 8px rgba(208,164,92,0.5)" },
  drained:       { bg: "rgba(110,162,144,0.85)", glow: "0 0 8px rgba(110,162,144,0.5)" },
  overloaded:    { bg: "rgba(182,102,96,0.85)",  glow: "0 0 8px rgba(182,102,96,0.5)" },
};

const SLOT_LABEL: Record<Slot, string> = { morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening" };
const QUICK_STATES: DriftState[] = ["clear_light", "steady", "carrying_work", "wired", "drained", "overloaded"];
const HOME_RECOMMENDATION_HISTORY_KEY = "driftlatch_home_recommendation_history";
const HOME_RECOMMENDATION_HISTORY_LIMIT = 12;
const HOME_ROUTE_REPEAT_AVOID_LIMIT = 3;
const HOME_WEEKLY_LADDER_TOP = 12;
const HOME_WEEKLY_ROW_GAP = 11;
const HOME_WEEKLY_CHART_HEIGHT = HOME_WEEKLY_LADDER_TOP * 2 + HOME_WEEKLY_ROW_GAP * (WEEKLY_STATE_LADDER.length - 1);

type HomeRecommendationHistoryEntry = {
  dayKey: string;
  shownAt: string;
  toolId: string;
};

type HomeRecommendationHistory = Record<string, HomeRecommendationHistoryEntry[]>;

function isHardState(s: string) {
  return ["carrying_work", "wired", "drained", "overloaded"].includes(s);
}
function isDriftState(value: unknown): value is DriftState {
  return value === "clear_light" || value === "carrying_work" || value === "wired" || value === "drained" || value === "overloaded" || value === "steady";
}
function isDriftNeed(value: unknown): value is DriftNeed {
  return value === "regain_clarity" || value === "wind_down" || value === "be_here" || value === "come_back";
}
function isAttachmentStyle(value: unknown): value is AttachmentStyle {
  return value === "Anxious" || value === "Avoidant" || value === "Mixed" || value === "Unknown";
}
function safeReadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function safeWriteJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function isHomeRecommendationHistoryEntry(value: unknown): value is HomeRecommendationHistoryEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.toolId === "string" && typeof record.dayKey === "string" && typeof record.shownAt === "string";
}

function readHomeRecommendationHistory() {
  const raw = safeReadJSON<unknown>(HOME_RECOMMENDATION_HISTORY_KEY, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const normalized: HomeRecommendationHistory = {};
  for (const [contextKey, entries] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(entries)) {
      normalized[contextKey] = [];
      continue;
    }
    normalized[contextKey] = entries.filter(isHomeRecommendationHistoryEntry);
  }
  return normalized;
}
function writeHomeRecommendationHistory(history: HomeRecommendationHistory) {
  safeWriteJSON(HOME_RECOMMENDATION_HISTORY_KEY, history);
}
function rememberHomeRecommendation(contextKey: string, toolId: string, dayKey: string) {
  const history = readHomeRecommendationHistory();
  const nextEntry: HomeRecommendationHistoryEntry = { dayKey, shownAt: new Date().toISOString(), toolId };
  const nextEntries = [
    nextEntry,
    ...(history[contextKey] ?? []).filter((entry) => !(entry.toolId === toolId && entry.dayKey === dayKey)),
  ].slice(0, HOME_RECOMMENDATION_HISTORY_LIMIT);
  history[contextKey] = nextEntries;
  writeHomeRecommendationHistory(history);
  return nextEntries;
}

function getRouteRecentShownToolIds(contextKey: string, dayKey: string) {
  const history = readHomeRecommendationHistory()[contextKey] ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of history) {
    if (entry.dayKey === dayKey) continue;
    if (seen.has(entry.toolId)) continue;
    seen.add(entry.toolId);
    result.push(entry.toolId);
    if (result.length >= HOME_ROUTE_REPEAT_AVOID_LIMIT) break;
  }
  return result;
}
function logHomeDebug(label: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[home-state] ${label}`, details);
  }
}
function firstSentence(text: string) {
  const match = text.match(/^[^.!?]+[.!?]?/); return match?.[0]?.trim() || text;
}
function isoDaysAgo(days: number) { return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(); }
function getSlotFromDate(value: string): Slot | null {
  const hour = new Date(value).getHours();
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if ((hour >= 17 && hour <= 23) || (hour >= 0 && hour <= 4)) return "evening";
  return null;
}
function getCurrentSlot(hour: number): Slot {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  return "evening";
}
function topByFrequency<T extends string>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
function formatDayKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}
function getHomeWeeklyTop(rank: number) {
  return HOME_WEEKLY_LADDER_TOP + rank * HOME_WEEKLY_ROW_GAP;
}
function parseDefaults(value: unknown): StoredProfileDefaults {
  return parseStoredProfileDefaults(value);
}
function parsePrimaryPack(value: unknown, defaults: unknown) {
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  if (defaults && typeof defaults === "object" && !Array.isArray(defaults)) {
    const maybe = (defaults as Record<string, unknown>).primary_pack_ids;
    if (Array.isArray(maybe) && typeof maybe[0] === "string") return maybe[0];
  }
  return null;
}

// ─── Tutorial tooltip ─────────────────────────────────────────────────────────
type TutorialStepMeta = { headline: string; body: string; arrow: "up" | "down" };
const TUTORIAL_COPY: Record<1 | 2, TutorialStepMeta> = {
  1: {
    headline: "Start here — pick your state",
    body: "Tap the one that's closest to how you feel right now. Everything below updates to match.",
    arrow: "down",
  },
  2: {
    headline: "This is your step",
    body: "Picked for your state. Open it, do it, close the app. That's the whole loop.",
    arrow: "up",
  },
};

function TutorialTooltip({
  step,
  targetRef,
  onNext,
  onDismiss,
  isFinal,
}: {
  step: 1 | 2;
  targetRef: React.RefObject<HTMLElement | null>;
  onNext: () => void;
  onDismiss: () => void;
  isFinal: boolean;
}) {
  const meta = TUTORIAL_COPY[step];
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      if (!targetRef.current) return;
      const rect = targetRef.current.getBoundingClientRect();
      if (meta.arrow === "down") {
        setPos({ top: rect.top - 12, left: rect.left + rect.width / 2 });
      } else {
        setPos({ top: rect.bottom + 12, left: rect.left + rect.width / 2 });
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update); };
  }, [targetRef, meta.arrow, step]);

  if (!pos) return null;

  return (
    <motion.div
      key={`tut-tip-${step}`}
      initial={{ opacity: 0, y: meta.arrow === "down" ? -6 : 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.26, ease: EASE }}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: meta.arrow === "down" ? "translate(-50%, -100%)" : "translate(-50%, 0%)",
        zIndex: 102,
        width: "min(300px, calc(100vw - 48px))",
        background: "rgba(24,24,27,0.98)",
        border: "1px solid rgba(255,255,255,0.13)",
        borderRadius: 18,
        padding: "16px 18px 14px",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow: "0 28px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
        pointerEvents: "auto",
      }}
    >
      {/* Arrow nub */}
      <div style={{
        position: "absolute",
        [meta.arrow === "down" ? "bottom" : "top"]: -6,
        left: "50%",
        transform: "translateX(-50%) rotate(45deg)",
        width: 10, height: 10,
        background: "rgba(24,24,27,0.98)",
        border: meta.arrow === "down"
          ? "0 none transparent; border-right: 1px solid rgba(255,255,255,0.13); border-bottom: 1px solid rgba(255,255,255,0.13)"
          : "1px solid rgba(255,255,255,0.13)",
        borderTop: meta.arrow === "down" ? "none" : "1px solid rgba(255,255,255,0.13)",
        borderLeft: meta.arrow === "down" ? "none" : "1px solid rgba(255,255,255,0.13)",
        borderRight: "1px solid rgba(255,255,255,0.13)",
        borderBottom: "1px solid rgba(255,255,255,0.13)",
      }} />

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ color: "rgba(194,122,92,0.85)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {step} of 2
        </span>
        <div style={{ flex: 1, height: 2, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <motion.div
            animate={{ width: step === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{ height: "100%", background: "rgba(194,122,92,0.75)", borderRadius: 999 }}
          />
        </div>
      </div>

      <div style={{ color: "rgba(244,244,245,0.94)", fontSize: 15, fontWeight: 700, lineHeight: 1.2, marginBottom: 6, letterSpacing: "-0.015em" }}>
        {meta.headline}
      </div>
      <p style={{ margin: "0 0 14px", color: "rgba(161,161,170,0.78)", fontSize: 13, lineHeight: 1.62 }}>
        {meta.body}
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onNext}
          style={{
            flex: 1, minHeight: 38, borderRadius: 12,
            border: "1px solid rgba(194,122,92,0.28)",
            background: "linear-gradient(180deg, rgba(194,122,92,0.92) 0%, rgba(173,103,77,0.92) 100%)",
            color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
          }}
        >
          {isFinal ? "Got it" : "Next →"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onDismiss}
          style={{
            minHeight: 38, padding: "0 14px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "rgba(161,161,170,0.60)", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
        >
          Skip
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Tilt card wrapper ────────────────────────────────────────────────────────
function TiltCard({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRotX = useSpring(rotX, SPRING);
  const sRotY = useSpring(rotY, SPRING);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rotX.set(-((e.clientY - cy) / (rect.height / 2)) * 3.5);
    rotY.set(((e.clientX - cx) / (rect.width / 2)) * 3.5);
  };

  const reset = () => { rotX.set(0); rotY.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ ...style, rotateX: sRotX, rotateY: sRotY, transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Packs Carousel ───────────────────────────────────────────────────────────
function PacksCarousel({ activeState }: { activeState: DriftState }) {
  const packs = LIBRARY.packs;
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accentIsSage = activeState === "clear_light";
  const VISIBLE = 3;

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setActiveIndex((p) => (p + 1) % packs.length), 3200);
  }, [packs.length]);

  useEffect(() => {
    if (!isPaused) startInterval();
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, startInterval]);

  const visiblePacks = useMemo(() =>
    Array.from({ length: VISIBLE }, (_, i) => {
      const idx = (activeIndex + i) % packs.length;
      return { pack: packs[idx], originalIdx: idx, slotIdx: i };
    }), [activeIndex, packs]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => { setIsPaused(false); setHoveredIndex(null); }}
      style={{ position: "relative" }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "flex-end" }}>
        {packs.map((_, i) => (
          <motion.button
            key={i} type="button"
            onClick={() => { setActiveIndex(i); startInterval(); }}
            animate={{ width: activeIndex === i ? 18 : 6, background: activeIndex === i ? (accentIsSage ? "rgb(100,170,120)" : "var(--accent)") : "rgba(255,255,255,0.14)" }}
            transition={{ duration: 0.42, ease: EASE }}
            style={{ height: 6, borderRadius: 999, border: "none", cursor: "pointer", padding: 0 }}
            aria-label={`Go to support ${i + 1}`}
          />
        ))}
      </div>

      <div className="packs-carousel-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, overflow: "hidden" }}>
        {visiblePacks.map(({ pack, originalIdx, slotIdx }) => {
          const toolCount = LIBRARY.tools.filter((t) => t.pack_id === pack.id).length;
          const isHovered = hoveredIndex === originalIdx;
          const isPackLight = CLEAR_LIGHT_PACK_IDS.has(pack.id);
          return (
            <div key={`slot-${slotIdx}`} onMouseEnter={() => setHoveredIndex(originalIdx)} onMouseLeave={() => setHoveredIndex(null)} style={{ position: "relative" }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={pack.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.62, ease: EASE }}>
                  <MotionLink href="/app/packs" whileTap={{ scale: 0.97 }} style={{
                    display: "block", textDecoration: "none", position: "relative",
                    background: isHovered ? (isPackLight ? "rgba(100,170,120,0.10)" : "rgba(194,122,92,0.10)") : slotIdx === 0 ? "rgba(39,39,42,0.80)" : "rgba(39,39,42,0.52)",
                    border: isHovered ? (isPackLight ? "1px solid rgba(100,170,120,0.36)" : "1px solid rgba(194,122,92,0.38)") : slotIdx === 0 ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 18, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                    boxShadow: isHovered ? (isPackLight ? "0 8px 32px rgba(100,170,120,0.18), inset 0 1px 0 rgba(255,255,255,0.08)" : "0 8px 32px rgba(194,122,92,0.18), inset 0 1px 0 rgba(255,255,255,0.08)") : slotIdx === 0 ? "0 16px 48px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 4px 16px rgba(0,0,0,0.22)",
                    padding: "20px 18px", minHeight: 148, overflow: "hidden",
                    transition: "background 0.28s ease, border 0.28s ease, box-shadow 0.28s ease",
                    opacity: slotIdx === VISIBLE - 1 ? 0.52 : 1,
                  }}>
                    {isHovered && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: isPackLight ? "linear-gradient(90deg, transparent, rgba(100,170,120,0.52), transparent)" : "linear-gradient(90deg, transparent, rgba(194,122,92,0.52), transparent)", pointerEvents: "none" }} />}
                    <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 8 }}>
                      <div style={{ color: isHovered ? "rgba(244,244,245,1)" : "rgba(244,244,245,0.88)", fontSize: 17, lineHeight: 1.1, fontWeight: 650, transition: "color 0.2s ease" }}>{getPackName(pack.id)}</div>
                      <div style={{ color: "rgba(161,161,170,0.75)", fontSize: 12, lineHeight: 1.55 }}>
                        {getSupportPurpose(pack.id, pack.purpose)}
                      </div>
                      <div style={{ color: isPackLight ? (isHovered ? "rgba(120,200,155,1)" : "rgba(120,200,155,0.7)") : (isHovered ? "rgba(194,122,92,1)" : "rgba(194,122,92,0.72)"), fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", marginTop: 4, transition: "color 0.2s ease" }}>{toolCount} tools</div>
                    </div>
                  </MotionLink>
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── State dot ────────────────────────────────────────────────────────────────
function StateDot({ state }: { state: DriftState }) {
  const color = state === "clear_light" ? "rgb(120,200,150)" : state === "steady" ? "rgb(122,162,202)" : "rgb(208,130,92)";
  return (
    <span style={{ position: "relative", display: "inline-block", width: 8, height: 8, flexShrink: 0 }}>
      <motion.span animate={{ scale: [1, 1.9, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }} style={{ position: "absolute", inset: 0, borderRadius: 999, background: color }} />
      <span style={{ position: "absolute", inset: 1, borderRadius: 999, background: color }} />
    </span>
  );
}

function CompactWeeklyMovement({ days }: { days: WeeklyDaySummary[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ position: "relative", height: HOME_WEEKLY_CHART_HEIGHT }}>
        {WEEKLY_STATE_LADDER.map((state) => (
          <div key={state} style={{ position: "absolute", top: getHomeWeeklyTop(getWeeklyStateRank(state)), left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,0.05)", transform: "translateY(-50%)" }} />
        ))}
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(7, minmax(0, 1fr))", height: "100%", position: "relative" }}>
          {days.map((day) => {
            const latestAccent = weeklyAccentForState(day.latestState);
            const firstTop = day.firstStateRank !== null ? getHomeWeeklyTop(day.firstStateRank) : null;
            const latestTop = day.latestStateRank !== null ? getHomeWeeklyTop(day.latestStateRank) : null;
            const lineTop = firstTop !== null && latestTop !== null ? Math.min(firstTop, latestTop) : null;
            const lineHeight = firstTop !== null && latestTop !== null ? Math.max(Math.abs(latestTop - firstTop), 2) : 0;

            return (
              <div key={day.key} style={{ display: "grid", gap: 7, gridTemplateRows: `${HOME_WEEKLY_CHART_HEIGHT}px auto` }}>
                <div style={{ position: "relative", height: HOME_WEEKLY_CHART_HEIGHT }}>
                  {day.hasData ? (
                    <>
                      {lineTop !== null && lineHeight > 2 ? <div style={{ position: "absolute", top: lineTop, left: "50%", width: 2, height: lineHeight, transform: "translateX(-50%)", borderRadius: 999, background: latestAccent, opacity: 0.2 }} /> : null}
                      {firstTop !== null ? <div style={{ position: "absolute", top: firstTop, left: "calc(50% - 4px)", width: 8, height: 8, transform: "translateY(-50%)", borderRadius: 999, background: "rgba(24,24,27,0.92)", border: `1px solid ${latestAccent}66` }} /> : null}
                      {latestTop !== null ? <div style={{ position: "absolute", top: latestTop, left: "calc(50% - 7px)", width: 14, height: 14, transform: "translateY(-50%)", borderRadius: 999, background: latestAccent, border: "1px solid rgba(255,255,255,0.16)", boxShadow: `0 8px 20px ${latestAccent}22` }} /> : null}
                    </>
                  ) : (
                    <div style={{ position: "absolute", top: getHomeWeeklyTop(1), left: "calc(50% - 3px)", width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)" }} />
                  )}
                </div>
                <div style={{ display: "grid", justifyItems: "center", gap: 5 }}>
                  <span style={{ color: "rgba(244,244,245,0.76)", fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em" }}>{day.label.slice(0, 1)}</span>
                  <span style={{ width: 16, height: 3, borderRadius: 999, background: roomToneAccent(day.latestRoomTone), opacity: day.latestRoomTone ? 1 : 0.14 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const STATE_EQ_DELTA: Record<DriftState, number> = {
  clear_light: 8,
  steady: 3,
  carrying_work: -5,
  wired: -12,
  drained: -10,
  overloaded: -18,
};

function CompactEQGraph({ days, eqProfile }: { days: WeeklyDaySummary[]; eqProfile: EQProfileData }) {
  const domains = [eqProfile.pressure_reading, eqProfile.repair_instinct, eqProfile.presence_quality, eqProfile.boundary_intel, eqProfile.recovery_aware, eqProfile.signal_accuracy];
  const baseline = Math.round(domains.reduce((a, b) => a + b, 0) / domains.length);
  const W = 700;
  const H = HOME_WEEKLY_CHART_HEIGHT;
  const xStep = W / 6;
  const scoreToY = (score: number) => H - (score / 100) * H;
  const baselineY = scoreToY(baseline);

  const scores: (number | null)[] = days.map((day) => {
    if (!day.hasData || !day.latestState) return null;
    const delta = STATE_EQ_DELTA[day.latestState] ?? 0;
    return Math.max(15, Math.min(100, baseline + delta));
  });
  const points: { x: number; y: number; idx: number }[] = [];
  scores.forEach((score, i) => {
    if (score !== null) points.push({ x: i * xStep + xStep / 2, y: scoreToY(score), idx: i });
  });

  const areaPath = points.length >= 2
    ? `M ${points[0].x} ${H} L ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${points[points.length - 1].x} ${H} Z`
    : "";
  const polylinePts = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Insight line
  const loggedScores = scores.filter((s): s is number => s !== null);
  let insightLine = "Log your mood daily to see your EQ pattern.";
  if (loggedScores.length >= 3) {
    const avg = loggedScores.reduce((a, b) => a + b, 0) / loggedScores.length;
    const allAbove = loggedScores.every((s) => s > baseline);
    const avgBelowByMore10 = avg < baseline - 10;
    const hasRecovery = loggedScores.some((s, i) => i > 0 && loggedScores[i - 1] < baseline && s >= baseline);
    if (allAbove) insightLine = "Above your baseline all week.";
    else if (avgBelowByMore10) insightLine = "Pressure pulled your EQ down this week.";
    else if (hasRecovery) insightLine = "You recovered mid week.";
    else insightLine = "";
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ position: "relative", height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="eqAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(194,122,92,0.15)" />
              <stop offset="100%" stopColor="rgba(194,122,92,0.0)" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((s) => (
            <line key={s} x1={0} y1={scoreToY(s)} x2={W} y2={scoreToY(s)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="2 4" />
          ))}
          <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="rgba(194,122,92,0.20)" strokeWidth={1} strokeDasharray="4 4" />
          <text x={W - 2} y={baselineY - 3} textAnchor="end" fontSize={9} fill="rgba(194,122,92,0.35)">Baseline</text>
          {areaPath && <path d={areaPath} fill="url(#eqAreaGrad)" />}
          {points.length >= 2 && <polyline points={polylinePts} fill="none" stroke="rgba(194,122,92,0.75)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {scores.map((score, i) => {
            const cx = i * xStep + xStep / 2;
            if (score !== null) {
              return <circle key={i} cx={cx} cy={scoreToY(score)} r={4} fill="rgba(194,122,92,0.85)" stroke="rgba(11,11,14,1)" strokeWidth={2} />;
            }
            return <line key={i} x1={cx} y1={H - 5} x2={cx} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />;
          })}
        </svg>
      </div>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {days.map((day) => (
          <div key={day.key} style={{ display: "grid", justifyItems: "center" }}>
            <span style={{ color: "rgba(244,244,245,0.76)", fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em" }}>{day.label.slice(0, 1)}</span>
          </div>
        ))}
      </div>
      {insightLine ? (
        <div style={{ fontSize: 12, color: "rgba(161,161,170,0.40)", fontStyle: "italic", marginTop: 10, textAlign: "center" }}>{insightLine}</div>
      ) : null}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [homeSource, setHomeSource] = useState<HomeSourceState>({
    currentMomentOverrides: null,
    diagnostics: [],
    profileIdentity: null,
    profileStatus: "missing",
    savedDefaults: {},
  });
  const [lastState, setLastState] = useState<DriftState | null>(null);
  const [selectedState, setSelectedState] = useState<DriftState | null>(null);
  const [last14Checkins, setLast14Checkins] = useState<CheckinRow[]>([]);
  const [last7Checkins, setLast7Checkins] = useState<CheckinRow[]>([]);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyCheckinRow[]>([]);
  const [weeklyFeedback, setWeeklyFeedback] = useState<WeeklyFeedbackRow[]>([]);
  const [weeklyRecentTools, setWeeklyRecentTools] = useState<WeeklyRecentRow[]>([]);
  const [weeklyFetchError, setWeeklyFetchError] = useState<string | null>(null);
  const [weeklyFetchMeta, setWeeklyFetchMeta] = useState<WeeklyCheckinsFetchMeta>(EMPTY_WEEKLY_CHECKINS_FETCH_META);
  const [weeklyFetchWindow, setWeeklyFetchWindow] = useState<{ endIso: string | null; startIso: string | null }>({ endIso: null, startIso: null });
  const [excludedToolIds, setExcludedToolIds] = useState<string[]>([]);
  const [quickRecommendation, setQuickRecommendation] = useState<QuickRecommendation | null>(null);
  const [pinning, setPinning] = useState(false);
  const [pinnedMoment, setPinnedMoment] = useState(false);
  const [justPinned, setJustPinned] = useState(false);
  const [selectedTime, setSelectedTime] = useState<1 | 3 | 5 | 10 | null>(null);
  const [graphView, setGraphView] = useState<"state" | "eq">("state");
  const [eqProfile, setEqProfile] = useState<EQProfileData | null>(null);
  const [momentContext, setMomentContext] = useState<UserMomentContext | null>(null);
  const [inlineExcludedIds, setInlineExcludedIds] = useState<string[]>([]);

  // Tutorial: 0 = not started, 1 = step 1 (state strip), 2 = step 2 (hero), 3 = done
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | 2 | 3>(0);
  const stateStripRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const latestHomeLoadRef = useRef(0);
  const homeSourceRef = useRef(homeSource);
  const lastRouteKeyRef = useRef<string | null>(null);
  const lastRenderedToolIdRef = useRef<string | null>(null);

  useEffect(() => {
    homeSourceRef.current = homeSource;
  }, [homeSource]);

  const profileIdentity = homeSource.profileIdentity;
  const savedDefaults = homeSource.savedDefaults;
  const currentMomentOverrides = homeSource.currentMomentOverrides;
  const profileStatus = homeSource.profileStatus;
  const profileLoadFailed = profileStatus === "unavailable";
  const displayName = profileIdentity?.resolvedDisplayName ?? "";
  const attachmentStyle = profileIdentity?.attachmentStyle ?? "Unknown";
  const primaryPack = profileIdentity?.primaryPack ?? null;

  const hour = new Date().getHours();
  const currentSlot = getCurrentSlot(hour);
  const greetingText = momentContext
    ? generateHomeGreeting(displayName, momentContext)
    : { headline: displayName ? `${SLOT_LABEL[currentSlot]}, ${displayName}.` : `${SLOT_LABEL[currentSlot]}.`, subline: "Start from the smallest useful move." };
  const greeting = greetingText.headline;
  const greetingTimeOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const greetingLine1 = `Good ${greetingTimeOfDay},`;
  const greetingLine2 = displayName ? `${displayName}.` : null;
  const todayKey = formatDayKey(new Date());

  useEffect(() => {
    const storedState = safeReadJSON<unknown>("driftlatch_last_state", null);
    const validState = isDriftState(storedState) ? storedState : null;
    setLastState(validState);
    setSelectedState(validState);
  }, []);

  const hydrateHomeState = useCallback(async (reason: string) => {
    try {
      const requestId = ++latestHomeLoadRef.current;
      const localPersistedValuesFound = {
        checkinPreferences: safeReadJSON<unknown>("driftlatch_checkin_preferences", null),
        lastCtx: safeReadJSON<unknown>("driftlatch_last_ctx", null),
        lastState: safeReadJSON<unknown>("driftlatch_last_state", null),
      };
      logHomeDebug("hydrate-start", {
        initialHomeState: homeSourceRef.current,
        localPersistedValuesFound,
        reason,
      });

      const currentUser = await loadCurrentUserAppState();
      if (requestId !== latestHomeLoadRef.current) return;

      if (!currentUser.session) {
        logHomeDebug("hydrate-no-session", { reason });
        setIsLoggedIn(false);
        setWeeklyCheckins([]);
        setWeeklyFeedback([]);
        setWeeklyRecentTools([]);
        setWeeklyFetchError(null);
        setWeeklyFetchMeta(EMPTY_WEEKLY_CHECKINS_FETCH_META);
        setWeeklyFetchWindow({ endIso: null, startIso: null });
        setHomeSource((current) => ({
          currentMomentOverrides: current.currentMomentOverrides,
          diagnostics: [],
          profileIdentity: null,
          profileStatus: "missing",
          savedDefaults: {},
        }));
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      const supabase = getSupabase();
      const userId = currentUser.userId!;
      const nowIso = new Date().toISOString();
      const { endIso: weeklyEndIso, startIso: last7Iso } = getWeeklyRangeBounds(WEEKLY_RANGE_DAYS);
      const last14Iso = isoDaysAgo(14);
      setWeeklyFetchWindow({ endIso: weeklyEndIso, startIso: last7Iso });

      const [profile, checkins14Res, checkins7Res, weeklyFeedbackRes, recentWeeklyRes, eqProfileRes] = await Promise.all([
        Promise.resolve(currentUser.profile),
        supabase.from("user_checkins").select("created_at,state,need").eq("user_id", userId).gte("created_at", last14Iso).lt("created_at", nowIso).order("created_at", { ascending: false }),
        fetchWeeklyCheckins(supabase, userId, last7Iso, weeklyEndIso),
        supabase.from("user_tool_feedback").select("created_at,helpful_score,shift,tool_id").eq("user_id", userId).gte("created_at", last7Iso).lt("created_at", weeklyEndIso).order("created_at", { ascending: false }),
        supabase.from("user_recent_tools").select("tool_id,used_at").eq("user_id", userId).gte("used_at", last7Iso).lt("used_at", weeklyEndIso).order("used_at", { ascending: false }),
        supabase.from("user_eq_profile").select("pressure_reading,repair_instinct,presence_quality,boundary_intel,recovery_aware,signal_accuracy,weakest_domain,archetype").eq("user_id", userId).maybeSingle(),
      ]);

      if (requestId !== latestHomeLoadRef.current) return;

      const next14 = ((checkins14Res.data ?? []) as CheckinRow[]).filter((r) => isDriftState(r.state) && isDriftNeed(r.need));
      const normalizedWeeklyCheckins = normalizeCheckinRows((checkins7Res.data ?? []) as WeeklyCheckinRow[]);
      const next7: CheckinRow[] = normalizedWeeklyCheckins
        .filter((r) => isDriftState(r.state) && isDriftNeed(r.need))
        .map((r) => ({ created_at: r.created_at, need: r.need as DriftNeed, state: r.state as DriftState }));
      const nextWeeklyFeedback = (weeklyFeedbackRes.data ?? []) as WeeklyFeedbackRow[];
      const nextWeeklyRecent = normalizeRecentRows((recentWeeklyRes.data ?? []) as WeeklyRecentRow[]);
      setWeeklyFetchMeta(checkins7Res.meta);

      const storedState2 = safeReadJSON<unknown>("driftlatch_last_state", null);
      const derivedSelectedState = isDriftState(storedState2) ? storedState2 : next7[0]?.state ?? "carrying_work";
      const profileDefaultsFromAccount = parseDefaults(profile?.defaults);
      const profileDisplayName = typeof profile?.display_name === "string" ? profile.display_name.trim() : "";
      const metadataDisplayName = getUserMetadataDisplayName(currentUser.session.user);
      const resolvedDisplayName = resolveUserDisplayName(profileDisplayName, currentUser.session.user);
      const nextAttachmentStyle = isAttachmentStyle(profile?.attachment_style) ? profile.attachment_style : "Unknown";
      const nextPrimaryPack = parsePrimaryPack(undefined, profile?.defaults);
      const nextProfileStatus = currentUser.diagnostics.some((item) => item.stage === "profile_load" || item.stage === "profile_reload")
        ? "unavailable"
        : profile
          ? "available"
          : "missing";
      const nextProfileIdentity: HomeProfileIdentity = {
        attachmentStyle: nextAttachmentStyle,
        metadataDisplayName,
        primaryPack: nextPrimaryPack,
        profileDisplayName,
        rawProfile: profile,
        resolvedDisplayName,
        userId,
      };

      logHomeDebug("raw-profile-loaded", {
        diagnostics: currentUser.diagnostics,
        displayNameUsedByHome: resolvedDisplayName || null,
        localPersistedValuesFound,
        profileDefaults: profileDefaultsFromAccount,
        snapshotProfileStatus: nextProfileStatus,
        rawProfileRow: profile,
        reason,
      });

      setHomeSource((current) => {
        const nextState: HomeSourceState = {
          currentMomentOverrides: current.currentMomentOverrides,
          diagnostics: currentUser.diagnostics,
          profileIdentity: nextProfileIdentity,
          profileStatus: nextProfileStatus,
          savedDefaults: profileDefaultsFromAccount,
        };
        logHomeDebug("home-source-update", {
          nextState,
          previousState: current,
          reason,
        });
        return nextState;
      });

      if (checkins7Res.error) {
        const errorMessage = checkins7Res.error.message ?? "Weekly check-ins failed to load.";
        setWeeklyFetchError(errorMessage);
        setLast14Checkins(next14);
        setWeeklyFeedback(nextWeeklyFeedback);
        setWeeklyRecentTools(nextWeeklyRecent);
        if (process.env.NODE_ENV !== "production") {
          console.error("[home-weekly-fetch-error]", {
            endIso: weeklyEndIso,
            error: checkins7Res.error,
            fullSelectFailed: checkins7Res.meta.fullSelectFailed,
            safeSelectUsed: checkins7Res.meta.safeSelectUsed,
            startIso: last7Iso,
          });
        }
        setLoading(false);
        return;
      }

      setWeeklyFetchError(null);

      if (process.env.NODE_ENV !== "production") {
        const explicitCount = normalizedWeeklyCheckins.filter((row) => row.source !== "implicit").length;
        const implicitCount = normalizedWeeklyCheckins.filter((row) => row.source === "implicit").length;
        const roomToneCount = normalizedWeeklyCheckins.filter((row) => typeof row.room_tone === "string" && row.room_tone.length > 0).length;
        const timestamps = normalizedWeeklyCheckins.map((row) => row.created_at).filter((value): value is string => typeof value === "string").sort();
        const nextWeeklySummary = buildWeeklyReflection({ checkins: normalizedWeeklyCheckins, feedbackRows: nextWeeklyFeedback, recentRows: nextWeeklyRecent, rangeDays: WEEKLY_RANGE_DAYS });
        console.info("[home-weekly-fetch-debug]", {
          endIso: weeklyEndIso,
          explicitWeeklyCheckins: explicitCount,
          fetchedRowCount: normalizedWeeklyCheckins.length,
          firstReturnedCreatedAt: timestamps[0] ?? null,
          fullSelectFailed: checkins7Res.meta.fullSelectFailed,
          implicitWeeklyCheckins: implicitCount,
          lastReturnedCreatedAt: timestamps[timestamps.length - 1] ?? null,
          roomToneCheckins: roomToneCount,
          safeSelectUsed: checkins7Res.meta.safeSelectUsed,
          startIso: last7Iso,
          finalSelectedRenderMode: nextWeeklySummary.mode,
        });
      }
      setLast14Checkins(next14);
      setLast7Checkins(next7);
      setWeeklyCheckins(normalizedWeeklyCheckins);
      setWeeklyFeedback(nextWeeklyFeedback);
      setWeeklyRecentTools(nextWeeklyRecent);
      setCheckedInToday(next7.some((r) => formatDayKey(new Date(r.created_at)) === todayKey));
      setSelectedState((cur) => cur ?? derivedSelectedState);
      const nextEqProfile = !eqProfileRes.error && eqProfileRes.data ? (eqProfileRes.data as EQProfileData) : null;
      setEqProfile(nextEqProfile);
      const rawWeekCheckins = (checkins7Res.data ?? []) as Array<{ state: string; source: string | null; created_at: string }>;
      setMomentContext(buildUserMomentContext({
        currentState: derivedSelectedState,
        timeAvailable: null,
        attachmentStyle: nextAttachmentStyle,
        eqProfile: nextEqProfile,
        weekCheckins: rawWeekCheckins
          .filter((c) => typeof c.state === "string" && typeof c.source === "string")
          .map((c) => ({ state: c.state, source: c.source as string, created_at: c.created_at })),
      }));
      setLoading(false);
    } catch (error) {
      console.error("Failed to hydrate home state:", error);
      logHomeDebug("hydrate-error", {
        error: error instanceof Error ? error.message : String(error),
        reason,
      });
      setWeeklyFetchError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => {
    void hydrateHomeState("mount");
  }, [hydrateHomeState]);

  useEffect(() => {
    const handleFocus = () => {
      void hydrateHomeState("window-focus");
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void hydrateHomeState("document-visible");
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hydrateHomeState]);

  // Start tutorial for first-time users
  useEffect(() => {
    if (loading || !isLoggedIn) return;
    const done = safeReadJSON<number>("driftlatch_tutorial_done", 0);
    if (done < 3) {
      // Small delay so page finishes rendering before tooltip appears
      const t = window.setTimeout(() => setTutorialStep(1), 800);
      return () => window.clearTimeout(t);
    }
  }, [loading, isLoggedIn]);

  const hasSavedDefaults =
    typeof savedDefaults.default_need === "string" ||
    typeof savedDefaults.default_time === "number" ||
    typeof savedDefaults.default_situation === "string";
  const isFirstTime = !profileLoadFailed && !lastState && last14Checkins.length === 0 && !primaryPack && !savedDefaults.default_need && !savedDefaults.default_situation;
  const activeState = selectedState ?? "carrying_work";
  const isClearLight = activeState === "clear_light";
  const savedQuickDefaults = useMemo(
    () => resolveQuickDefaults(savedDefaults, attachmentStyle),
    [attachmentStyle, savedDefaults],
  );
  const recommendationDefaults = useMemo<ResolvedQuickDefaults>(
    () => ({
      ...savedQuickDefaults,
      need: currentMomentOverrides?.need ?? savedQuickDefaults.need,
      time: currentMomentOverrides?.time ?? savedQuickDefaults.time,
      situation: currentMomentOverrides?.situation ?? savedQuickDefaults.situation,
    }),
    [currentMomentOverrides, savedQuickDefaults],
  );
  const savedDefaultsSummary = useMemo(
    () => formatQuickDefaultsSummary(savedQuickDefaults),
    [savedQuickDefaults],
  );
  const recommendationDefaultsSummary = useMemo(
    () => formatQuickDefaultsSummary(recommendationDefaults),
    [recommendationDefaults],
  );
  const recommendationSource = profileLoadFailed
    ? "fallback-profile-unavailable"
    : hasSavedDefaults
      ? "profile-backed"
      : "fallback-no-saved-defaults";
  const homeSetupLine = useMemo(() => {
    if (profileLoadFailed) return "Saved setup unavailable right now.";
    return buildHomeSetupLine(savedDefaultsSummary);
  }, [profileLoadFailed, savedDefaultsSummary]);
  const homePickerLine = useMemo(() => {
    if (profileLoadFailed) return `Temporary setup: ${recommendationDefaultsSummary}`;
    return buildHomePickerLine(recommendationDefaultsSummary);
  }, [profileLoadFailed, recommendationDefaultsSummary]);
  const homeProfileNotice = profileLoadFailed
    ? "Saved profile data is temporarily unavailable. Suggestions below are using a temporary setup for now."
    : null;

  useEffect(() => {
    logHomeDebug("rendered-home-state", {
      finalRecommendationContextValues: recommendationDefaults,
      finalRenderedGreetingName: displayName || null,
      finalRenderedGreetingText: greeting,
      finalRenderedSetupLabel: homeSetupLine,
      finalRenderedUsualSetupValues: savedQuickDefaults,
      labelSource: profileLoadFailed ? "profile-unavailable" : "saved-defaults",
      localPersistedValuesFound: {
        checkinPreferences: safeReadJSON<unknown>("driftlatch_checkin_preferences", null),
        lastCtx: safeReadJSON<unknown>("driftlatch_last_ctx", null),
        lastState: safeReadJSON<unknown>("driftlatch_last_state", null),
      },
      profileDefaultsLoaded: savedDefaults,
      recommendationSource,
      rawProfileRowUsedByHome: profileIdentity?.rawProfile ?? null,
      snapshotProfileStatus: profileStatus,
    });
  }, [displayName, greeting, homeSetupLine, profileIdentity, profileLoadFailed, profileStatus, recommendationDefaults, recommendationSource, savedDefaults, savedQuickDefaults]);

  const getHomeRecommendation = useCallback((
    state: DriftState,
    options?: {
      applyRouteRepeatAvoidance?: boolean;
      extraExcludeToolIds?: string[];
      sessionExcludeToolIds?: string[];
    },
  ) => {
    const contextKey = buildToolContextKey({
      need: recommendationDefaults.need,
      situation: recommendationDefaults.situation,
        state,
        time: recommendationDefaults.time,
      });
    const sessionExcludeIds = options?.sessionExcludeToolIds ?? [];
    const extraExcludeToolIds = options?.extraExcludeToolIds ?? [];
    const baseExcludeToolIds = [...new Set([...sessionExcludeIds, ...extraExcludeToolIds])];
    const baseRecommendation = buildQuickRecommendation({
      attachmentStyle,
      defaults: recommendationDefaults,
      excludeToolIds: baseExcludeToolIds,
      from: "home",
      mode: "quick",
      preferredPackIds: primaryPack ? [primaryPack] : [],
      state,
    });
    const recentShownToolsForRoute =
      options?.applyRouteRepeatAvoidance === false ? [] : getRouteRecentShownToolIds(contextKey, todayKey);
    const maxRepeatExclusions = Math.max((baseRecommendation.selectorDebug?.poolSize ?? 0) - 1, 0);
    const excludedRepeatedToolIds = recentShownToolsForRoute
      .filter((toolId) => !baseExcludeToolIds.includes(toolId))
      .slice(0, maxRepeatExclusions);
    const recommendation =
      excludedRepeatedToolIds.length > 0
        ? buildQuickRecommendation({
            attachmentStyle,
            defaults: recommendationDefaults,
            excludeToolIds: [...new Set([...baseExcludeToolIds, ...excludedRepeatedToolIds])],
            from: "home",
            mode: "quick",
            preferredPackIds: primaryPack ? [primaryPack] : [],
            state,
          })
        : baseRecommendation;
    logHomeDebug("home-selector-built", {
      currentDayBucket: todayKey,
      excludedRepeatedToolIds,
      excludedToolIdsUsedByHome: [...new Set([...baseExcludeToolIds, ...excludedRepeatedToolIds])],
      finalSelectedToolId: recommendation.primary.id,
      candidatePoolSizeAfterRepeatAvoidance: Math.max((baseRecommendation.selectorDebug?.poolSize ?? 0) - excludedRepeatedToolIds.length, 0),
      recentShownToolsForRoute,
      routeKey: contextKey,
      selectorPool: recommendation.selectorDebug?.pool ?? null,
      strictCandidateCountUsedByHome: recommendation.selectorDebug?.poolSize ?? null,
    });
    return recommendation;
  }, [attachmentStyle, primaryPack, recommendationDefaults, todayKey]);

  const activeRouteKey = useMemo(
    () =>
      selectedState
        ? buildToolContextKey({
            need: recommendationDefaults.need,
            situation: recommendationDefaults.situation,
            state: selectedState,
            time: recommendationDefaults.time,
          })
        : null,
    [recommendationDefaults.need, recommendationDefaults.situation, recommendationDefaults.time, selectedState],
  );

  useEffect(() => {
    if (!activeRouteKey) return;
    if (lastRouteKeyRef.current === activeRouteKey) return;
    logHomeDebug("route-key-reset-home-rotation", {
      nextRouteKey: activeRouteKey,
      previousRouteKey: lastRouteKeyRef.current,
      clearedExcludedToolIds: excludedToolIds,
    });
    lastRouteKeyRef.current = activeRouteKey;
    setExcludedToolIds([]);
  }, [activeRouteKey, excludedToolIds]);

  useEffect(() => {
    if (!selectedState) {
      setQuickRecommendation(null);
      return;
    }
    const nextRecommendation = getHomeRecommendation(selectedState, {
      applyRouteRepeatAvoidance: true,
      sessionExcludeToolIds: [],
    });
    setQuickRecommendation(nextRecommendation);
  }, [activeRouteKey, getHomeRecommendation, selectedState]);

  const ensureDifferentRecommendation = useCallback((recommendation: QuickRecommendation, currentToolId: string) => {
    if (recommendation.primary.id !== currentToolId) return recommendation;
    const alternate = recommendation.alternates.find((tool) => tool.id !== currentToolId);
    if (!alternate) return recommendation;
    logHomeDebug("reshuffle-used-home-alternate-guard", {
      alternateToolId: alternate.id,
      currentToolId,
      routeKey: recommendation.contextKey,
    });
    return {
      ...recommendation,
      alternates: recommendation.alternates.filter((tool) => tool.id !== alternate.id),
      href: buildRecommendedToolHref(alternate.id, recommendation.ctx, {
        attachmentStyle,
        from: "home",
        mode: "quick",
        preferredPackIds: primaryPack ? [primaryPack] : [],
      }),
      primary: alternate,
    };
  }, [attachmentStyle, primaryPack]);

  useEffect(() => {
    if (!quickRecommendation) return;
    rememberHomeRecommendation(quickRecommendation.contextKey, quickRecommendation.primary.id, todayKey);
    if (process.env.NODE_ENV !== "production") {
      console.info("[home-recommendation-debug]", {
        currentDayBucket: todayKey,
        contextKey: quickRecommendation.contextKey,
        excludedToolIds,
        primary: quickRecommendation.primary.id,
        recentShownToolsForRoute: getRouteRecentShownToolIds(quickRecommendation.contextKey, todayKey),
        selectorPool: quickRecommendation.selectorDebug?.pool ?? null,
        selectorPoolSize: quickRecommendation.selectorDebug?.poolSize ?? null,
        storedHistory: readHomeRecommendationHistory()[quickRecommendation.contextKey] ?? [],
      });
    }
  }, [excludedToolIds, quickRecommendation, todayKey]);

  useEffect(() => {
    if (!quickRecommendation) return;
    const previousRenderedToolId = lastRenderedToolIdRef.current;
    lastRenderedToolIdRef.current = quickRecommendation.primary.id;
    logHomeDebug("home-recommendation-rendered", {
      currentDisplayedToolId: quickRecommendation.primary.id,
      finalRenderedToolId: quickRecommendation.primary.id,
      openAgainActive: checkedInToday,
      previousRenderedToolId,
      routeKey: quickRecommendation.contextKey,
      strictCandidateCountUsedByHome: quickRecommendation.selectorDebug?.poolSize ?? null,
    });
  }, [checkedInToday, quickRecommendation]);

  const suggestedTool = quickRecommendation?.primary ?? null;

  useEffect(() => {
    let cancelled = false;
    const loadPinnedState = async () => {
      if (!quickRecommendation) { if (!cancelled) { setPinnedMoment(false); setJustPinned(false); } return; }
      if (isLoggedIn) {
        const supabase = getSupabase();
        const { data: authData } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!authData.user) { if (!cancelled) setPinnedMoment(false); return; }
        const { data } = await supabase.from("user_pins").select("tool_id").eq("user_id", authData.user.id).eq("context_key", quickRecommendation.contextKey).maybeSingle();
        if (cancelled) return;
        const isPinned = data?.tool_id === quickRecommendation.primary.id;
        setPinnedMoment(isPinned);
        if (!isPinned) setJustPinned(false);
        return;
      }
      const localPins = safeReadJSON<Record<string, string>>("driftlatch_pins", {});
      if (cancelled) return;
      const isPinned = localPins[quickRecommendation.contextKey] === quickRecommendation.primary.id;
      setPinnedMoment(isPinned);
      if (!isPinned) setJustPinned(false);
    };
    void loadPinnedState();
    return () => { cancelled = true; };
  }, [isLoggedIn, quickRecommendation]);

  const patternLine = useMemo(() => {
    if (!last14Checkins.length) return null;
    const buildSlotInsight = (slot: Slot) => {
      const slotRows = last7Checkins.filter((r) => getSlotFromDate(r.created_at) === slot);
      const topState = topByFrequency(slotRows.map((r) => r.state))[0]?.[0];
      if (!topState) return null;
      const matchCount = slotRows.filter((r) => r.state === topState).length;
      if (matchCount < 3) return null;
      return `${STATE_LABEL[topState]} showed up in ${matchCount} of your last 7 ${slot}s.`;
    };
    return buildSlotInsight(currentSlot) ?? (currentSlot === "evening" ? null : buildSlotInsight("evening"));
  }, [currentSlot, last14Checkins.length, last7Checkins]);

  const weeklyReflection = useMemo(
    () => buildWeeklyReflection({ checkins: weeklyCheckins, feedbackRows: weeklyFeedback, recentRows: weeklyRecentTools, rangeDays: WEEKLY_RANGE_DAYS }),
    [weeklyCheckins, weeklyFeedback, weeklyRecentTools],
  );
  const showHomeWeeklyFetchErrorCard = Boolean(weeklyFetchError) && weeklyReflection.mode === "empty";

  // Reset inline excluded ids when state or time changes
  useEffect(() => {
    setInlineExcludedIds([]);
  }, [selectedState, selectedTime]);

  const inlineRecommendation = useMemo(() => {
    if (!selectedState || !isHardState(selectedState) || !selectedTime) return null;
    return selectTool({
      state: selectedState,
      need: savedDefaults.default_need ?? "regain_clarity",
      situation: "alone",
      timeMinutes: selectedTime,
      attachmentStyle,
      preferredPackIds: primaryPack ? [primaryPack] : [],
      mode: "quick",
      excludeToolIds: inlineExcludedIds,
      weakestEQDomain: momentContext?.weakestDomainUnderPressure ?? null,
    });
  }, [selectedState, selectedTime, inlineExcludedIds, savedDefaults.default_need, attachmentStyle, primaryPack, momentContext]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const explicitCount = weeklyCheckins.filter((row) => row.source !== "implicit").length;
    const implicitCount = weeklyCheckins.filter((row) => row.source === "implicit").length;
    const roomToneCount = weeklyCheckins.filter((row) => typeof row.room_tone === "string" && row.room_tone.length > 0).length;
    const graphableDays = weeklyReflection.days.filter((day) => day.hasData).length;
    const timestamps = weeklyCheckins.map((row) => row.created_at).filter((value): value is string => typeof value === "string").sort();
    console.info("[home-weekly-debug]", {
      endIso: weeklyFetchWindow.endIso,
      explicitWeeklyCheckins: explicitCount,
      firstReturnedTimestamp: timestamps[0] ?? null,
      fullSelectFailed: weeklyFetchMeta.fullSelectFailed,
      graphableDays,
      implicitWeeklyCheckins: implicitCount,
      lastReturnedTimestamp: timestamps[timestamps.length - 1] ?? null,
      fetchedRowCount: weeklyCheckins.length,
      finalSelectedRenderMode: showHomeWeeklyFetchErrorCard ? "error" : weeklyReflection.mode,
      roomToneCheckins: roomToneCount,
      safeSelectUsed: weeklyFetchMeta.safeSelectUsed,
      signalMode: weeklyReflection.signalMode,
      startIso: weeklyFetchWindow.startIso,
      summarySourceKey: weeklyReflection.summarySourceKey,
      usingSharedWeeklySource: true,
      visibleWeekEnd: weeklyReflection.visibleWeekEnd,
      visibleWeekStart: weeklyReflection.visibleWeekStart,
      weeklyFetchError,
    });
  }, [showHomeWeeklyFetchErrorCard, weeklyCheckins, weeklyFetchError, weeklyFetchMeta, weeklyFetchWindow, weeklyReflection]);

  const last7Dots = useMemo(() => {
    return weeklyReflection.days.map((day) => ({ filled: day.hasData, key: day.key }));
  }, [weeklyReflection.days]);

  // Tutorial helpers
  function advanceTutorial() {
    if (tutorialStep === 1) { setTutorialStep(2); return; }
    dismissTutorial();
  }
  function dismissTutorial() {
    setTutorialStep(3);
    safeWriteJSON("driftlatch_tutorial_done", 3);
  }

  async function handlePinMoment() {
    if (!quickRecommendation || pinning) return;
    setPinning(true);
    try {
      const showPinnedLabel = () => { setJustPinned(true); window.setTimeout(() => setJustPinned(false), 1200); };
      if (isLoggedIn) {
        const supabase = getSupabase();
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          if (pinnedMoment) { await supabase.from("user_pins").delete().eq("user_id", authData.user.id).eq("context_key", quickRecommendation.contextKey); setPinnedMoment(false); setJustPinned(false); return; }
          await supabase.from("user_pins").upsert({ user_id: authData.user.id, context_key: quickRecommendation.contextKey, tool_id: quickRecommendation.primary.id });
          setPinnedMoment(true); showPinnedLabel(); return;
        }
      }
      const localPins = safeReadJSON<Record<string, string>>("driftlatch_pins", {});
      const nextPins = { ...localPins };
      if (pinnedMoment) { delete nextPins[quickRecommendation.contextKey]; safeWriteJSON("driftlatch_pins", nextPins); setPinnedMoment(false); setJustPinned(false); return; }
      nextPins[quickRecommendation.contextKey] = quickRecommendation.primary.id;
      safeWriteJSON("driftlatch_pins", nextPins); setPinnedMoment(true); showPinnedLabel();
    } finally { setPinning(false); }
  }

  function handleQuickStateTap(nextState: DriftState) {
    const recommendation = getHomeRecommendation(nextState, { sessionExcludeToolIds: [] });
    setSelectedState(nextState);
    setExcludedToolIds([]);
    setQuickRecommendation(recommendation);
    setLastState(nextState);
    setSelectedTime(null);
    setInlineExcludedIds([]);
    safeWriteJSON("driftlatch_last_state", nextState);
    // Tutorial: tapping a state chip advances from step 1 to step 2
    if (tutorialStep === 1) {
      window.setTimeout(() => setTutorialStep(2), 350);
    }
  }

  function handleAnotherOption() {
    if (!quickRecommendation || !selectedState) return;
    const nextExcludedToolIds = [...new Set([...excludedToolIds, quickRecommendation.primary.id])];
    const selectorRecommendation = getHomeRecommendation(selectedState, {
      applyRouteRepeatAvoidance: false,
      sessionExcludeToolIds: nextExcludedToolIds,
    });
    const reshuffledRecommendation = ensureDifferentRecommendation(
      selectorRecommendation,
      quickRecommendation.primary.id,
    );
    logHomeDebug("reshuffle-clicked", {
      currentDisplayedToolId: quickRecommendation.primary.id,
      exclusionListBeforeReshuffle: excludedToolIds,
      exclusionListSentToSelection: nextExcludedToolIds,
      openAgainActive: checkedInToday,
      routeKey: quickRecommendation.contextKey,
      selectorResultAfterReshuffle: {
        alternates: selectorRecommendation.alternates.slice(0, 4).map((tool) => tool.id),
        primaryId: selectorRecommendation.primary.id,
        selectorPool: selectorRecommendation.selectorDebug?.pool ?? null,
        strictCandidateCountUsedByHome: selectorRecommendation.selectorDebug?.poolSize ?? null,
      },
      finalRecommendationAfterStateUpdate: {
        primaryId: reshuffledRecommendation.primary.id,
        href: reshuffledRecommendation.href,
      },
    });
    setExcludedToolIds(nextExcludedToolIds);
    setQuickRecommendation(reshuffledRecommendation);
  }

  async function handleInlineOpen(toolId: string) {
    try {
      if (profileIdentity?.userId && selectedState && selectedTime) {
        const supabase = getSupabase();
        await supabase.from("user_checkins").insert({
          user_id: profileIdentity.userId,
          state: selectedState,
          tool_id: toolId,
          time_minutes: selectedTime,
          source: "home",
          did_complete: null,
          need: null,
          situation: null,
          room_tone: null,
        });
      }
    } catch {
      // ignore DB errors
    }
    router.push(`/app/tool/${toolId}?from=home&state=${selectedState}&time=${selectedTime}`);
  }

  const heroHref = quickRecommendation?.href ?? "/app/checkin";
  const tutorialActive = tutorialStep === 1 || tutorialStep === 2;

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <LogoAnimation variant="splash" />
    </div>
  );

  if (!isLoggedIn) return (
    <main style={{ ...loadingStyle, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(520px, calc(100vw - 40px))", position: "relative", zIndex: 2 }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <div className="home-top-highlight" />
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ color: "rgba(244,244,245,0.88)", fontSize: 34, lineHeight: 1.02, letterSpacing: "-0.04em", fontWeight: 650 }}>Continue</div>
            <MotionLink whileTap={{ scale: 0.97 }} href="/login" className="btn-primary">Sign in →</MotionLink>
          </div>
        </div>
      </div>
      <style jsx>{scopedStyles}</style>
    </main>
  );

  return (
    <main style={mainStyle}>
      {/* ── Atmosphere ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeState}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.68, 0.84, 0.68] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          style={atmosphereWrapStyle}
        >
          <div style={{ ...blobStyle, width: 820, height: 480, top: -140, left: "50%", transform: "translateX(-50%)", background: `radial-gradient(circle, ${STATE_ATMOSPHERE[activeState]} 0%, rgba(24,24,27,0) 70%)` }} />
          <div style={{ ...blobStyle, width: 500, height: 500, top: 60, right: -140, opacity: 0.82, background: `radial-gradient(circle, ${STATE_ATMOSPHERE[activeState]} 0%, rgba(24,24,27,0) 72%)` }} />
          <div style={{ ...blobStyle, width: 380, height: 380, bottom: 30, left: -100, opacity: 0.55, background: `radial-gradient(circle, ${STATE_ATMOSPHERE[activeState]} 0%, rgba(24,24,27,0) 74%)` }} />
          <div style={{ ...blobStyle, width: 260, height: 260, top: "38%", left: "50%", transform: "translateX(-50%)", opacity: 0.38, background: `radial-gradient(circle, ${STATE_ATMOSPHERE[activeState]} 0%, rgba(24,24,27,0) 68%)` }} />
        </motion.div>
      </AnimatePresence>

      <div className="film-grain" />

      {/* ── Tutorial backdrop + tooltips ── */}
      <AnimatePresence>
        {tutorialActive && (
          <motion.div
            key="tut-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={dismissTutorial}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          />
        )}
        {tutorialStep === 1 && (
          <TutorialTooltip
            key="tut-1"
            step={1}
            targetRef={stateStripRef}
            onNext={advanceTutorial}
            onDismiss={dismissTutorial}
            isFinal={false}
          />
        )}
        {tutorialStep === 2 && (
          <TutorialTooltip
            key="tut-2"
            step={2}
            targetRef={heroSectionRef}
            onNext={dismissTutorial}
            onDismiss={dismissTutorial}
            isFinal={true}
          />
        )}
      </AnimatePresence>

      <div style={pageWrapStyle}>
        {/* ── Weekly dots (above greeting card) ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0, ease: EASE }} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => router.push("/app/weekly")} style={dotsButtonStyle} aria-label="Open weekly reflection">
            {last7Dots.map((dot, i) => (
              <motion.span key={dot.key} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.1 + i * 0.04, ease: EASE }} style={{ ...dotStyle, background: dot.filled ? "var(--accent)" : "rgba(255,255,255,0.12)", border: dot.filled ? "1px solid rgba(194,122,92,0.34)" : "1px solid rgba(255,255,255,0.08)" }} />
            ))}
          </motion.button>
        </motion.div>

        {/* ── Greeting card ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0, ease: EASE }} style={{ background: "rgba(18,18,22,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 24px 24px", position: "relative", overflow: "hidden", marginBottom: 20 }}>
          {/* Warm ambient glow */}
          <div aria-hidden style={{ position: "absolute", top: -40, left: -20, width: 280, height: 180, background: "radial-gradient(ellipse, rgba(194,122,92,0.13) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" as const }} />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
            {/* Breadcrumb with state dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={eyebrowStyle}>Home</span>
              {selectedState && (
                <AnimatePresence mode="wait">
                  <motion.span key={activeState} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.22, ease: EASE }} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATE_DOT_COLOR[activeState].bg, boxShadow: STATE_DOT_COLOR[activeState].glow, flexShrink: 0 }} />
                    <span style={{ color: STATE_DOT_COLOR[activeState].bg.replace("0.85)", "0.7)"), fontSize: 10, fontWeight: 500, letterSpacing: "0.02em" }}>{STATE_LABEL[activeState].toLowerCase()}</span>
                  </motion.span>
                </AnimatePresence>
              )}
            </div>

            {/* Heading — split onto two lines */}
            <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif)", fontSize: "clamp(2rem,5vw,2.8rem)", fontWeight: 700, letterSpacing: "-0.05em", color: "rgba(244,244,245,0.95)", lineHeight: 1.0 }}>
              {greetingLine1}
              {greetingLine2 && (<><br /><span style={{ color: "rgba(244,244,245,0.92)", textShadow: "0 0 40px rgba(194,122,92,0.15)" }}>{greetingLine2}</span></>)}
            </h1>

            {/* Subline */}
            <p style={{ margin: 0, fontSize: 14, color: "rgba(161,161,170,0.55)", fontWeight: 400, lineHeight: 1.5 }}>{checkedInToday ? "Your rhythm is already logged. Keep the next move simple." : greetingText.subline}</p>

            {/* EQ fingerprint line */}
            {!loading && eqProfile === null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.0, ease: EASE }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: "rgba(161,161,170,0.35)" }}>Your EQ fingerprint is not set.</span>
                  <Link href="/pressure-eq" className="eq-greeting-link" style={{ fontSize: 12, fontWeight: 600, color: "rgba(194,122,92,0.75)", cursor: "pointer", textDecoration: "none" }}>Take 4 minutes →</Link>
                </span>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* ── State strip ── */}
        <motion.section
          ref={stateStripRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.08, ease: EASE }}
          style={tutorialStep === 1 ? { marginTop: 16, position: "relative", zIndex: 52, borderRadius: 16, outline: "2px solid rgba(194,122,92,0.5)", outlineOffset: 8, boxShadow: "0 0 0 8px rgba(194,122,92,0.07)" } : { marginTop: 16 }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              {QUICK_STATES.map((state, i) => {
                const isActive = state === activeState;
                const isSage = state === "clear_light";
                return (
                  <motion.button
                    key={state}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.1 + i * 0.04, ease: EASE }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => handleQuickStateTap(state)}
                    style={{
                      position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minHeight: 44, padding: "0 15px", borderRadius: 999,
                      border: isActive ? (isSage ? "1px solid rgba(100,170,120,0.44)" : "1px solid rgba(194,122,92,0.40)") : "1px solid rgba(255,255,255,0.08)",
                      background: isActive ? (isSage ? "rgba(100,170,120,0.18)" : "rgba(194,122,92,0.18)") : "rgba(255,255,255,0.04)",
                      color: isActive ? "rgba(244,244,245,0.96)" : "rgba(161,161,170,0.75)",
                      fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", cursor: "pointer", overflow: "hidden", flexShrink: 0,
                      boxShadow: isActive ? (isSage ? "0 0 16px rgba(100,170,120,0.22), inset 0 -2px 0 rgba(100,170,120,0.44)" : "0 0 16px rgba(194,122,92,0.22), inset 0 -2px 0 rgba(194,122,92,0.44)") : "none",
                      transition: "background 0.22s ease, border 0.22s ease, color 0.22s ease, box-shadow 0.22s ease",
                    }}
                  >
                    <span style={{ position: "relative", zIndex: 1 }}>{STATE_LABEL[state]}</span>
                    {isActive && (
                      <motion.span
                        layoutId="chip-glow"
                        style={{
                          position: "absolute", left: 12, right: 12, bottom: -8, height: 20, borderRadius: 999,
                          background: isSage ? "radial-gradient(circle, rgba(100,170,120,0.34) 0%, rgba(100,170,120,0) 74%)" : "radial-gradient(circle, rgba(194,122,92,0.34) 0%, rgba(194,122,92,0) 74%)",
                          filter: "blur(10px)", pointerEvents: "none",
                        }}
                        transition={{ duration: 0.32, ease: EASE }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div style={{ color: "rgba(161,161,170,0.74)", fontSize: 12, lineHeight: 1.5 }}>
              {homeSetupLine}
            </div>
            {homeProfileNotice ? (
              <div
                style={{
                  border: "1px solid rgba(194,122,92,0.2)",
                  background: "rgba(194,122,92,0.08)",
                  borderRadius: 14,
                  color: "rgba(244,244,245,0.8)",
                  fontSize: 12,
                  lineHeight: 1.55,
                  padding: "10px 12px",
                }}
              >
                {homeProfileNotice}
              </div>
            ) : null}
          </div>
        </motion.section>

        {/* ── Time selector / Quick acknowledgment ── */}
        <AnimatePresence mode="wait">
          {selectedState && (
            <motion.div
              key={`time-sel-${selectedState}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {!isHardState(selectedState) ? (
                <div style={{ fontSize: 13, color: "rgba(161,161,170,0.45)", textAlign: "center", paddingTop: 12 }}>
                  Good. Noted for today.
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(161,161,170,0.45)", marginBottom: 10, textAlign: "center" }}>
                    How much time do you have?
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    {([1, 3, 5, 10] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSelectedTime(mins)}
                        style={{
                          padding: "9px 18px", borderRadius: 999, minHeight: 44,
                          border: selectedTime === mins ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.08)",
                          background: selectedTime === mins ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.04)",
                          fontSize: 13, fontWeight: 500,
                          color: selectedTime === mins ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.55)",
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                        }}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Inline recommendation ── */}
        <AnimatePresence>
          {inlineRecommendation && (
            <motion.div
              key={`inline-${inlineRecommendation.primary.id}`}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div style={{ background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "20px 18px", marginTop: 12, position: "relative", overflow: "hidden" }}>
                <div className="home-top-highlight" />
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(161,161,170,0.35)", marginBottom: 8 }}>
                  {getPackName(inlineRecommendation.primary.pack_id)}
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.025em", color: "rgba(244,244,245,0.92)", marginBottom: 6 }}>
                  {inlineRecommendation.primary.title}
                </div>
                <div style={{ fontSize: 13, color: "rgba(161,161,170,0.6)", lineHeight: 1.55, marginBottom: 18 }}>
                  {firstSentence(inlineRecommendation.primary.do)}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleInlineOpen(inlineRecommendation.primary.id)}
                    style={{ background: "var(--accent)", color: "white", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", minHeight: 44 }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setInlineExcludedIds((prev) => [...prev, inlineRecommendation.primary.id])}
                    style={{ border: "1px solid rgba(255,255,255,0.09)", background: "transparent", padding: "10px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "rgba(161,161,170,0.5)", minHeight: 44 }}
                  >
                    Another option
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/app/checkin?state=${selectedState}&from=home`)}
                    style={{ fontSize: 12, color: "rgba(161,161,170,0.3)", marginLeft: "auto", cursor: "pointer", textDecoration: "none", alignSelf: "center", background: "none", border: "none" }}
                  >
                    More options
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Moment entry ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
          className="moment-card"
          onClick={() => router.push("/app/eq/moment")}
          style={{
            marginTop: 12,
            padding: "14px 18px",
            background: "rgba(18,18,22,0.7)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            position: "relative",
            overflow: "hidden",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* Subtle left accent */}
          <div style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: 3,
            borderRadius: "16px 0 0 16px",
            background: "rgba(194,122,92,0.35)",
          }} />

          <div style={{ paddingLeft: 10 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(244,244,245,0.75)",
              marginBottom: 3,
            }}>
              Something happened?
            </div>
            <div style={{
              fontSize: 12,
              color: "rgba(161,161,170,0.45)",
              lineHeight: 1.4,
            }}>
              Reflect on it. Understand it. Get one clear next move.
            </div>
          </div>

          <div style={{
            fontSize: 13,
            color: "rgba(194,122,92,0.6)",
            fontWeight: 500,
            flexShrink: 0,
            paddingRight: 2,
          }}>
            Reflect →
          </div>
        </motion.div>

        {/* ── Hero ── */}
        <motion.section
          ref={heroSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.14, ease: EASE }}
          style={tutorialStep === 2 ? { position: "relative", zIndex: 52, borderRadius: 22, outline: "2px solid rgba(194,122,92,0.5)", outlineOffset: 4, boxShadow: "0 0 0 8px rgba(194,122,92,0.07)" } : undefined}
        >
        {selectedTime === null ? (<>
          {profileLoadFailed ? (
            <TiltCard style={{ ...cardStyle }}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 18, padding: 24 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <span style={eyebrowStyle}>Temporary mode</span>
                  <div style={{ ...heroTitleStyle, fontSize: "clamp(2rem, 6vw, 3rem)" }}>Saved setup unavailable right now.</div>
                  <p style={subtitleStyle}>We can still offer a temporary step, but we are not using your saved profile defaults until that profile data loads again.</p>
                </div>
                {suggestedTool ? (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ color: "rgba(244,244,245,0.92)", fontSize: 18, lineHeight: 1.2, fontWeight: 700 }}>
                      {suggestedTool.title}
                    </div>
                    <p style={bodyStyle}>{firstSentence(suggestedTool.do)}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="hero-chip">{getPackName(suggestedTool.pack_id)}</span>
                      <span style={{ ...metaStyle, fontSize: 12 }}>{homePickerLine}</span>
                    </div>
                    <div className="home-actions" style={actionGridStyle}>
                      <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => router.push(heroHref)} className="btn-primary">
                        Open temporary step →
                      </motion.button>
                      <MotionLink whileTap={{ scale: 0.97 }} href="/app/account" className="btn-secondary">Open Account →</MotionLink>
                    </div>
                  </div>
                ) : (
                  <div className="home-actions" style={actionGridStyle}>
                    <MotionLink whileTap={{ scale: 0.97 }} href="/app/account" className="btn-primary">Open Account →</MotionLink>
                    <MotionLink whileTap={{ scale: 0.97 }} href="/app/checkin" className="btn-secondary">Open Check-in →</MotionLink>
                  </div>
                )}
              </div>
            </TiltCard>
          ) : isFirstTime ? (
            <TiltCard style={{ ...cardStyle }}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 18, padding: 24 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <span style={eyebrowStyle}>Start here</span>
                  <div style={{ ...heroTitleStyle, fontSize: "clamp(2rem, 6vw, 3rem)" }}>No profile yet.</div>
                  <p style={subtitleStyle}>Two minutes. You&apos;ll get a clear starting point, your default supports, and a pressure map.</p>
                </div>
                <div className="home-actions" style={actionGridStyle}>
                  <MotionLink whileTap={{ scale: 0.97 }} href="/app/onboarding" className="btn-primary">Take the Pressure Profile →</MotionLink>
                  <MotionLink whileTap={{ scale: 0.97 }} href="/app/checkin" className="btn-secondary">Get one step →</MotionLink>
                </div>
              </div>
            </TiltCard>
          ) : suggestedTool ? (
            <AnimatePresence mode="wait">
              <motion.div key={suggestedTool.id} initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(4px)" }} transition={{ duration: 0.36, ease: EASE }}>
                <TiltCard style={{ ...cardStyle, position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => router.push(heroHref)}
                    aria-label={`Open ${suggestedTool.title}`}
                    style={{ position: "absolute", inset: 0, zIndex: 1, border: "none", background: "transparent", cursor: "pointer", borderRadius: 22 }}
                  />
                  <div className="home-top-highlight" />
                  <motion.div aria-hidden key={`rim-${activeState}`} animate={{ opacity: [0.52, 0.72, 0.52] }} transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", top: 0, left: 10, right: 10, height: 12, borderRadius: 18, background: isClearLight ? "linear-gradient(90deg, transparent, rgba(100,170,120,0.42), rgba(100,170,120,0.16), transparent)" : "linear-gradient(90deg, transparent, rgba(194,122,92,0.42), rgba(194,122,92,0.16), transparent)", filter: "blur(6px)", pointerEvents: "none", zIndex: 0 }} />
                  <motion.div aria-hidden key={`pool-${activeState}`} animate={{ opacity: [0.46, 0.62, 0.46] }} transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", top: -28, left: "12%", right: "12%", height: 120, borderRadius: "50%", background: isClearLight ? "radial-gradient(ellipse at 50% 0%, rgba(100,170,120,0.34) 0%, rgba(100,170,120,0.10) 44%, rgba(24,24,27,0) 74%)" : "radial-gradient(ellipse at 50% 0%, rgba(194,122,92,0.34) 0%, rgba(194,122,92,0.10) 44%, rgba(24,24,27,0) 74%)", filter: "blur(18px)", pointerEvents: "none", zIndex: 0 }} />
                  <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.35) 100%)", opacity: 0.35, pointerEvents: "none", zIndex: 0 }} />

                  <div style={{ position: "relative", zIndex: 2, padding: 24, display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gap: 14, pointerEvents: "none" }}>
                      <span style={eyebrowStyle}>Suggested for this moment</span>
                      <motion.div key={suggestedTool.id + "-title"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE }} style={heroTitleStyle}>
                        {suggestedTool.title}
                      </motion.div>
                      <motion.p key={suggestedTool.id + "-do"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.38, delay: 0.06, ease: EASE }} style={bodyStyle}>
                        {firstSentence(suggestedTool.do)}
                      </motion.p>
                    </div>

                    {/* Pack chip + pattern line */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", pointerEvents: "none" }}>
                      <span className="hero-chip">{getPackName(suggestedTool.pack_id)}</span>
                      <span style={{ ...metaStyle, fontSize: 12 }}>{homePickerLine}</span>
                      {patternLine && <span style={{ ...metaStyle, fontSize: 12 }}>{patternLine}</span>}
                    </div>

                    {/* Full-width state-matched Open button */}
                    <div style={{ position: "relative", zIndex: 3 }}>
                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        whileHover={{ scale: 1.008 }}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(heroHref); }}
                        style={{
                          width: "100%",
                          minHeight: 58,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          borderRadius: 18,
                          border: `1px solid ${isClearLight ? "rgba(100,170,120,0.32)" : "rgba(194,122,92,0.30)"}`,
                          background: isClearLight
                            ? "linear-gradient(180deg, rgba(80,155,105,0.92) 0%, rgba(62,135,88,0.92) 100%)"
                            : "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
                          boxShadow: isClearLight
                            ? "0 16px 40px rgba(80,155,105,0.28), inset 0 1px 0 rgba(255,255,255,0.16)"
                            : "0 16px 40px rgba(194,122,92,0.28), inset 0 1px 0 rgba(255,255,255,0.14)",
                          color: "#fff",
                          fontSize: 15,
                          fontWeight: 900,
                          letterSpacing: "-0.01em",
                          cursor: "pointer",
                        }}
                      >
                        {checkedInToday ? "Open again" : "Open"}
                        <span style={{ opacity: 0.72, fontSize: 16 }}>→</span>
                      </motion.button>
                    </div>

                    {/* Secondary actions */}
                    <div className="home-actions" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, position: "relative", zIndex: 3 }}>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleAnotherOption(); }}
                        style={{
                          minHeight: 46, borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.09)",
                          background: "rgba(255,255,255,0.05)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                          color: "rgba(244,244,245,0.75)", fontSize: 13, fontWeight: 800, cursor: "pointer",
                        }}
                      >
                        Another option
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handlePinMoment(); }}
                        disabled={pinning}
                        style={{
                          minHeight: 46, borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.07)",
                          background: "rgba(255,255,255,0.02)",
                          color: "rgba(161,161,170,0.72)", fontSize: 13, fontWeight: 800, cursor: "pointer",
                        }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.span key={justPinned ? "pinned" : pinnedMoment ? "unpin" : "pin"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }}>
                            {justPinned ? "Pinned ✓" : pinnedMoment ? "Unpin" : "Pin this moment"}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            </AnimatePresence>
          ) : null}
        </>) : null}
        </motion.section>

        {/* ── This week ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.2, ease: EASE }}>
          <motion.button whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => router.push(showHomeWeeklyFetchErrorCard ? "/app/weekly" : weeklyReflection.mode === "empty" ? "/app/checkin" : "/app/weekly")} style={{ ...cardStyle, ...weeklyCardStyle }}>
            <div className="home-top-highlight" />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
              <div style={weeklyHeadStyle}>
                <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={eyebrowStyle}>This week</span>
                  <div style={bodyStyle}>{showHomeWeeklyFetchErrorCard ? "Weekly data could not load right now." : weeklyReflection.mode === "empty" ? (weeklyReflection.title ?? weeklyReflection.summaryLine) : weeklyReflection.summaryLine}</div>
                </div>
                <span style={ctaHintStyle}>{showHomeWeeklyFetchErrorCard ? "Open weekly →" : weeklyReflection.mode === "empty" ? "Start a check-in →" : "Open weekly →"}</span>
              </div>
              {showHomeWeeklyFetchErrorCard ? (
                <div style={{ color: "rgba(161,161,170,0.82)", fontSize: 13, lineHeight: 1.6, maxWidth: 430 }}>
                  {weeklyFetchError}
                </div>
              ) : weeklyReflection.mode === "empty" ? (
                <div style={{ color: "rgba(161,161,170,0.82)", fontSize: 13, lineHeight: 1.6, maxWidth: 430 }}>
                  {weeklyReflection.body}
                </div>
              ) : (
                <>
                  {eqProfile && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }} onClick={(e) => e.stopPropagation()}>
                      {(["state", "eq"] as const).map((view) => (
                        <button
                          key={view}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setGraphView(view); }}
                          style={{
                            padding: "9px 18px", borderRadius: 999, minHeight: 44,
                            border: graphView === view ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.08)",
                            background: graphView === view ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.04)",
                            fontSize: 13, fontWeight: 500,
                            color: graphView === view ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.55)",
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                          }}
                        >
                          {view === "state" ? "State" : "EQ this week"}
                        </button>
                      ))}
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    {graphView === "eq" && eqProfile ? (
                      <motion.div key="eq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                        <CompactEQGraph days={weeklyReflection.days} eqProfile={eqProfile} />
                      </motion.div>
                    ) : (
                      <motion.div key="state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                        <CompactWeeklyMovement days={weeklyReflection.days} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {graphView === "state" && weeklyReflection.microInsight ? <div style={{ ...metaStyle, fontSize: 12, marginTop: 8 }}>{weeklyReflection.microInsight}</div> : null}
                  {graphView === "state" && !weeklyReflection.microInsight && weeklyReflection.roomPatternReads[0] ? <div style={{ ...metaStyle, fontSize: 12, marginTop: 8 }}>{weeklyReflection.roomPatternReads[0]}</div> : null}
                  {graphView === "state" && weeklyReflection.mode === "partial" && (weeklyReflection.returnLine || weeklyReflection.footer) ? (
                    <div style={{ color: "rgba(161,161,170,0.72)", fontSize: 12, lineHeight: 1.55 }}>
                      {weeklyReflection.returnLine ?? weeklyReflection.footer}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </motion.button>
        </motion.section>

        {/* ── Supports ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.26, ease: EASE }}>
          <div style={packsHeadStyle}>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={eyebrowStyle}>Supports</span>
              <div style={{ color: "rgba(244,244,245,0.75)", fontSize: 14, lineHeight: 1.5 }}>Choose a support and browse the full library.</div>
            </div>
            <MotionLink whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} href="/app/packs" style={{ color: isClearLight ? "rgba(120,200,150,0.85)" : "rgba(194,122,92,0.85)", textDecoration: "none", fontSize: 13, fontWeight: 800, letterSpacing: "0.02em", whiteSpace: "nowrap", transition: "color 0.22s ease" }}>
              Open library →
            </MotionLink>
          </div>
          <PacksCarousel activeState={activeState} />
        </motion.section>

        {/* ── Quick actions ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.32, ease: EASE }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {([{ href: "/app/checkin", label: "Check in", sub: "Log your state" }, { href: "/app/weekly", label: "This week", sub: "Patterns & rhythm" }] as const).map(({ href, label, sub }) => (
            <MotionLink key={href} href={href} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} style={{ display: "grid", gap: 4, padding: "16px 18px", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", textDecoration: "none", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", position: "relative", overflow: "hidden" }}>
              <span style={{ color: "rgba(244,244,245,0.86)", fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{label}</span>
              <span style={{ color: "rgba(161,161,170,0.68)", fontSize: 12, lineHeight: 1.4 }}>{sub}</span>
            </MotionLink>
          ))}
        </motion.section>
      </div>

      <style jsx>{scopedStyles}</style>
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const loadingStyle: CSSProperties = { minHeight: "100dvh", background: "var(--bg)", display: "grid", placeItems: "center", overflow: "hidden" };
const mainStyle: CSSProperties = { minHeight: "100dvh", padding: "44px 18px 100px", background: "var(--bg)", position: "relative", overflow: "hidden" };
const atmosphereWrapStyle: CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const blobStyle: CSSProperties = { position: "absolute", borderRadius: 999, filter: "blur(72px)" };
const pageWrapStyle: CSSProperties = { position: "relative", zIndex: 2, width: "100%", maxWidth: 640, margin: "0 auto", display: "grid", gap: 20 };
const headerStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "nowrap" };
const eyebrowStyle: CSSProperties = { color: "rgba(161,161,170,0.85)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: 0, color: "rgba(244,244,245,0.88)", fontFamily: "Zodiak, Georgia, serif", fontSize: "clamp(1.8rem, 5vw, 2.4rem)", lineHeight: 1.05, letterSpacing: "-0.04em", fontWeight: 700 };
const subtitleStyle: CSSProperties = { margin: 0, color: "rgba(161,161,170,0.65)", fontSize: 14, lineHeight: 1.65, maxWidth: 460 };
const dotsButtonStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, minHeight: 44, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 };
const dotStyle: CSSProperties = { width: 9, height: 9, borderRadius: 999, flexShrink: 0 };
const cardStyle: CSSProperties = { position: "relative", background: "rgba(18,18,22,0.9)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", overflow: "hidden" };
const actionGridStyle: CSSProperties = { position: "relative", zIndex: 3, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 8 };
const heroTitleStyle: CSSProperties = { color: "rgba(244,244,245,0.94)", fontSize: "clamp(2.1rem, 6.5vw, 3.2rem)", lineHeight: 1.0, letterSpacing: "-0.055em", fontWeight: 680, fontFamily: "Zodiak, Georgia, serif", maxWidth: 600 };
const bodyStyle: CSSProperties = { margin: 0, color: "rgba(244,244,245,0.80)", fontSize: 15, lineHeight: 1.68 };
const metaStyle: CSSProperties = { color: "rgba(161,161,170,0.80)", fontSize: 13, lineHeight: 1.6 };
const ctaHintStyle: CSSProperties = { color: "rgba(194,122,92,0.80)", fontSize: 13, fontWeight: 700, letterSpacing: "0.01em", whiteSpace: "nowrap" };
const weeklyCardStyle: CSSProperties = { width: "100%", padding: 20, display: "grid", border: "none", textAlign: "left", cursor: "pointer" };
const weeklyHeadStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const packsHeadStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 12, flexWrap: "wrap" };

const scopedStyles = `
  * { -webkit-tap-highlight-color: transparent; }
  .home-top-highlight { position: absolute; top: 0; left: 16px; right: 16px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent); pointer-events: none; z-index: 10; }
  .film-grain { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.07; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 3px 3px, 4px 4px; mix-blend-mode: soft-light; }
  .hero-chip { display: inline-flex; align-items: center; width: fit-content; min-height: 28px; padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: rgba(161,161,170,0.85); font-size: 11px; font-weight: 800; line-height: 1; }
  .btn-primary, .btn-secondary, .btn-tertiary { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; width: 100%; padding: 13px 16px; border-radius: 14px; font-size: 13px; font-weight: 900; text-decoration: none; border: 1px solid transparent; cursor: pointer; }
  .btn-primary { color: #fff; background: linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%); border-color: rgba(194,122,92,0.28); box-shadow: 0 14px 36px rgba(194,122,92,0.20); }
  .btn-secondary { color: rgba(244,244,245,0.88); background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.10); }
  .btn-secondary-fill { background: rgba(255,255,255,0.07); border-color: rgba(194,122,92,0.28); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 0 rgba(194,122,92,0.18); }
  .btn-tertiary { color: rgba(161,161,170,0.85); background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.08); }
  @media (max-width: 640px) { .home-actions { grid-template-columns: 1fr !important; } }
`;
