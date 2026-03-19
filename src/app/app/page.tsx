"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildQuickRecommendation,
  formatQuickDefaultsSummary,
  parseStoredProfileDefaults,
  resolveQuickDefaults,
  type QuickRecommendation,
  type StoredProfileDefaults,
} from "@/lib/quickFlow";
import { buildHomePickerLine, buildHomeSetupLine } from "@/lib/personalizedCopy";
import { getSupabase } from "@/lib/supabase";
import { getPackName, LIBRARY } from "@/lib/toolLibrary";
import type { AttachmentStyle, DriftNeed, DriftState } from "@/lib/toolLibrary";

type Slot = "morning" | "afternoon" | "evening";
type CheckinRow = { created_at: string; state: DriftState; need: DriftNeed };
type ProfileRow = {
  attachment_style: AttachmentStyle | null;
  defaults: unknown;
  display_name?: string | null;
  primary_pack_ids?: unknown;
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

const SLOT_LABEL: Record<Slot, string> = { morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening" };
const SLOT_SEVERITY: Record<DriftState, number> = { clear_light: 0, steady: 1, carrying_work: 2, drained: 3, wired: 4, overloaded: 5 };
const DAILY_SEVERITY: Record<DriftState, number> = { clear_light: 0, steady: 1, carrying_work: 2, wired: 3, drained: 3, overloaded: 4 };
const QUICK_STATES: DriftState[] = ["clear_light", "steady", "carrying_work", "wired", "drained", "overloaded"];

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
function averageSeverity(rows: CheckinRow[], severityMap: Record<DriftState, number>) {
  if (!rows.length) return null;
  return rows.reduce((sum, row) => sum + severityMap[row.state], 0) / rows.length;
}
function formatDayKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}
function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cur = points[i], nxt = points[i + 1];
    const midX = (cur.x + nxt.x) / 2;
    path += ` C ${midX} ${cur.y}, ${midX} ${nxt.y}, ${nxt.x} ${nxt.y}`;
  }
  return path;
}
function buildAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (!points.length) return "";
  return `${buildSmoothPath(points)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
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
            aria-label={`Go to pack ${i + 1}`}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, overflow: "hidden" }}>
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
                      <div style={{ color: "rgba(161,161,170,0.75)", fontSize: 12, lineHeight: 1.55 }}>{pack.purpose}</div>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [attachmentStyle, setAttachmentStyle] = useState<AttachmentStyle>("Unknown");
  const [profileDefaults, setProfileDefaults] = useState<StoredProfileDefaults>({});
  const [primaryPack, setPrimaryPack] = useState<string | null>(null);
  const [lastState, setLastState] = useState<DriftState | null>(null);
  const [selectedState, setSelectedState] = useState<DriftState | null>(null);
  const [last14Checkins, setLast14Checkins] = useState<CheckinRow[]>([]);
  const [last7Checkins, setLast7Checkins] = useState<CheckinRow[]>([]);
  const [prev7Checkins, setPrev7Checkins] = useState<CheckinRow[]>([]);
  const [excludedToolIds, setExcludedToolIds] = useState<string[]>([]);
  const [pinning, setPinning] = useState(false);
  const [pinnedMoment, setPinnedMoment] = useState(false);
  const [justPinned, setJustPinned] = useState(false);

  // Tutorial: 0 = not started, 1 = step 1 (state strip), 2 = step 2 (hero), 3 = done
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | 2 | 3>(0);
  const stateStripRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);

  const hour = new Date().getHours();
  const currentSlot = getCurrentSlot(hour);
  const greeting = `${SLOT_LABEL[currentSlot]}, ${displayName || "there"}.`;
  const todayKey = formatDayKey(new Date());

  useEffect(() => {
    const storedState = safeReadJSON<unknown>("driftlatch_last_state", null);
    const validState = isDriftState(storedState) ? storedState : null;
    setLastState(validState);
    setSelectedState(validState);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!authData.user) {
        setDisplayName("");
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      const nowIso = new Date().toISOString();
      const last7Iso = isoDaysAgo(7);
      const last14Iso = isoDaysAgo(14);

      const [profileRes, checkins14Res, checkins7Res, checkinsPrevRes] = await Promise.all([
        getSupabase().from("user_profile").select("attachment_style, defaults, primary_pack_ids, display_name").eq("user_id", authData.user.id).maybeSingle(),
        getSupabase().from("user_checkins").select("created_at,state,need").eq("user_id", authData.user.id).gte("created_at", last14Iso).lt("created_at", nowIso).order("created_at", { ascending: false }),
        getSupabase().from("user_checkins").select("created_at,state,need").eq("user_id", authData.user.id).gte("created_at", last7Iso).lt("created_at", nowIso).order("created_at", { ascending: false }),
        getSupabase().from("user_checkins").select("created_at,state,need").eq("user_id", authData.user.id).gte("created_at", last14Iso).lt("created_at", last7Iso).order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      const profile = (profileRes.data ?? null) as ProfileRow | null;
      const next14 = ((checkins14Res.data ?? []) as CheckinRow[]).filter((r) => isDriftState(r.state) && isDriftNeed(r.need));
      const next7 = ((checkins7Res.data ?? []) as CheckinRow[]).filter((r) => isDriftState(r.state) && isDriftNeed(r.need));
      const nextPrev7 = ((checkinsPrevRes.data ?? []) as CheckinRow[]).filter((r) => isDriftState(r.state) && isDriftNeed(r.need));

      const profileDisplayName = typeof profile?.display_name === "string" ? profile.display_name.trim() : "";
      const storedState2 = safeReadJSON<unknown>("driftlatch_last_state", null);
      const derivedSelectedState = isDriftState(storedState2) ? storedState2 : next7[0]?.state ?? "carrying_work";

      setDisplayName(profileDisplayName);
      setAttachmentStyle(isAttachmentStyle(profile?.attachment_style) ? profile.attachment_style : "Unknown");
      setProfileDefaults(parseDefaults(profile?.defaults));
      setPrimaryPack(parsePrimaryPack(profile?.primary_pack_ids, profile?.defaults));
      setLast14Checkins(next14);
      setLast7Checkins(next7);
      setPrev7Checkins(nextPrev7);
      setCheckedInToday(next7.some((r) => formatDayKey(new Date(r.created_at)) === todayKey));
      setSelectedState((cur) => cur ?? derivedSelectedState);
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [todayKey]);

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

  const isFirstTime = !lastState && last14Checkins.length === 0 && !primaryPack && !profileDefaults.default_need && !profileDefaults.default_situation;
  const activeState = selectedState ?? "carrying_work";
  const isClearLight = activeState === "clear_light";
  const quickDefaults = useMemo(
    () => resolveQuickDefaults(profileDefaults, attachmentStyle),
    [attachmentStyle, profileDefaults],
  );
  const defaultsSummary = useMemo(
    () => formatQuickDefaultsSummary(quickDefaults),
    [quickDefaults],
  );
  const homeSetupLine = useMemo(() => buildHomeSetupLine(defaultsSummary), [defaultsSummary]);
  const homePickerLine = useMemo(() => buildHomePickerLine(defaultsSummary), [defaultsSummary]);

  const quickRecommendation = useMemo<QuickRecommendation | null>(() => {
    if (!selectedState) return null;
    return buildQuickRecommendation({
      attachmentStyle,
      defaults: quickDefaults,
      excludeToolIds: excludedToolIds,
      from: "home",
      mode: "quick",
      preferredPackIds: primaryPack ? [primaryPack] : [],
      state: selectedState,
    });
  }, [attachmentStyle, excludedToolIds, primaryPack, quickDefaults, selectedState]);

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
      return `${matchCount} of your last 7 ${slot}s: ${STATE_LABEL[topState].toLowerCase()}.`;
    };
    return buildSlotInsight(currentSlot) ?? (currentSlot === "evening" ? null : buildSlotInsight("evening"));
  }, [currentSlot, last14Checkins.length, last7Checkins]);

  const readinessLine = useMemo(() => {
    const currentAvg = averageSeverity(last7Checkins, SLOT_SEVERITY);
    if (currentAvg == null) return "No week data yet";
    const morningAvg = averageSeverity(last7Checkins.filter((r) => getSlotFromDate(r.created_at) === "morning"), SLOT_SEVERITY);
    const eveningAvg = averageSeverity(last7Checkins.filter((r) => getSlotFromDate(r.created_at) === "evening"), SLOT_SEVERITY);
    let label = "";
    if (morningAvg != null && eveningAvg != null) {
      if (morningAvg >= 3.2 && eveningAvg <= 2.4) label = "Heavy going in, lighter coming out.";
      else if (morningAvg <= 2.4 && eveningAvg >= 3.2) label = "Light going in, heavier coming out.";
      else if (morningAvg >= 3.2 && eveningAvg >= 3.2) label = "Heavy at both edges of the day.";
      else if (morningAvg <= 2.4 && eveningAvg <= 2.4) label = "Relatively light across the day.";
    }
    if (!label) label = currentAvg < 2.2 ? "Lighter than usual." : currentAvg < 3.2 ? "Holding steady." : "Carrying a lot.";
    const prevAvg = averageSeverity(prev7Checkins, SLOT_SEVERITY);
    if (prevAvg != null) {
      if (currentAvg > prevAvg + 0.4) return `${label} Heavier than last week.`;
      if (currentAvg < prevAvg - 0.4) return `${label} Calmer than last week.`;
    }
    return label;
  }, [last7Checkins, prev7Checkins]);

  const sparklineChart = useMemo(() => {
    const width = 320, height = 90, baseline = 82;
    const dayKeys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - i);
      dayKeys.push(formatDayKey(date));
    }
    const byDay = new Map<string, CheckinRow[]>();
    for (const row of last7Checkins) { const key = formatDayKey(new Date(row.created_at)); byDay.set(key, [...(byDay.get(key) ?? []), row]); }
    const values = dayKeys.map((key) => { const rows = byDay.get(key) ?? []; if (!rows.length) return 1; return rows.reduce((sum, row) => sum + DAILY_SEVERITY[row.state], 0) / rows.length; });
    const points = values.map((v, i) => ({ x: Number((16 + (i / Math.max(values.length - 1, 1)) * (width - 32)).toFixed(2)), y: Number((height - ((v - 1) / 3) * 52 - 18).toFixed(2)) }));
    return { linePath: buildSmoothPath(points), areaPath: buildAreaPath(points, baseline), guides: [28, 54] };
  }, [last7Checkins]);

  const last7Dots = useMemo(() => {
    const filledDays = new Set(last7Checkins.map((r) => formatDayKey(new Date(r.created_at))));
    const items: { key: string; filled: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - i);
      const key = formatDayKey(date); items.push({ key, filled: filledDays.has(key) });
    }
    return items;
  }, [last7Checkins]);

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
    const recommendation = buildQuickRecommendation({
      attachmentStyle,
      defaults: quickDefaults,
      from: "home",
      mode: "quick",
      preferredPackIds: primaryPack ? [primaryPack] : [],
      state: nextState,
    });
    setSelectedState(nextState);
    setExcludedToolIds([]);
    setLastState(nextState);
    safeWriteJSON("driftlatch_last_state", nextState);
    // Tutorial: tapping a state chip advances from step 1 to step 2
    if (tutorialStep === 1) {
      window.setTimeout(() => setTutorialStep(2), 350);
    }
    router.push(recommendation.href);
  }

  function handleAnotherOption() {
    if (!quickRecommendation) return;
    setExcludedToolIds((prev) => (prev.includes(quickRecommendation.primary.id) ? prev : [...prev, quickRecommendation.primary.id]));
  }

  const heroHref = quickRecommendation?.href ?? "/app/checkin";
  const tutorialActive = tutorialStep === 1 || tutorialStep === 2;

  if (loading) return (
    <main style={loadingStyle}>
      <motion.div animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} style={{ color: "rgba(244,244,245,0.88)", fontSize: 14, letterSpacing: "0.22em", fontWeight: 800 }}>
        LOADING
      </motion.div>
    </main>
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
        {/* ── Header ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0, ease: EASE }} style={headerStyle}>
          <div style={{ display: "grid", gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={eyebrowStyle}>Home</span>
              {selectedState && (
                <AnimatePresence mode="wait">
                  <motion.span key={activeState} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.22, ease: EASE }} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <StateDot state={activeState} />
                    <span style={{ color: "rgba(161,161,170,0.65)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>{STATE_LABEL[activeState].toLowerCase()}</span>
                  </motion.span>
                </AnimatePresence>
              )}
            </div>
            <h1 style={titleStyle}>{greeting}</h1>
            <p style={subtitleStyle}>{checkedInToday ? "Your rhythm is already logged. Keep the next move simple." : "Start from the smallest useful move."}</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => router.push("/app/weekly")} style={dotsButtonStyle} aria-label="Open weekly reflection">
            {last7Dots.map((dot, i) => (
              <motion.span key={dot.key} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.1 + i * 0.04, ease: EASE }} style={{ ...dotStyle, background: dot.filled ? "var(--accent)" : "rgba(255,255,255,0.12)", border: dot.filled ? "1px solid rgba(194,122,92,0.34)" : "1px solid rgba(255,255,255,0.08)" }} />
            ))}
          </motion.button>
        </motion.section>

        {/* ── State strip ── */}
        <motion.section
          ref={stateStripRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.08, ease: EASE }}
          style={tutorialStep === 1 ? { position: "relative", zIndex: 52, borderRadius: 16, outline: "2px solid rgba(194,122,92,0.5)", outlineOffset: 8, boxShadow: "0 0 0 8px rgba(194,122,92,0.07)" } : undefined}
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
          </div>
        </motion.section>

        {/* ── Hero ── */}
        <motion.section
          ref={heroSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.14, ease: EASE }}
          style={tutorialStep === 2 ? { position: "relative", zIndex: 52, borderRadius: 22, outline: "2px solid rgba(194,122,92,0.5)", outlineOffset: 4, boxShadow: "0 0 0 8px rgba(194,122,92,0.07)" } : undefined}
        >
          {isFirstTime ? (
            <TiltCard style={{ ...cardStyle }}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 18, padding: 24 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <span style={eyebrowStyle}>Start here</span>
                  <div style={{ ...heroTitleStyle, fontSize: "clamp(2rem, 6vw, 3rem)" }}>No profile yet.</div>
                  <p style={subtitleStyle}>Two minutes. You&apos;ll get a clear starting point, your default packs, and a pressure map.</p>
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
        </motion.section>

        {/* ── This week ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.2, ease: EASE }}>
          <motion.button whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => router.push("/app/weekly")} style={{ ...cardStyle, ...weeklyCardStyle }}>
            <div className="home-top-highlight" />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
              <div style={weeklyHeadStyle}>
                <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={eyebrowStyle}>This week</span>
                  <div style={bodyStyle}>{readinessLine}</div>
                </div>
                <span style={ctaHintStyle}>Open weekly →</span>
              </div>
              <svg viewBox="0 0 320 90" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden>
                <defs>
                  <linearGradient id="homeSpark" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isClearLight ? "rgba(100,170,120,0.22)" : "rgba(194,122,92,0.22)"} />
                    <stop offset="100%" stopColor={isClearLight ? "rgba(100,170,120,0.96)" : "rgba(194,122,92,0.96)"} />
                  </linearGradient>
                  <linearGradient id="homeSparkFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isClearLight ? "rgba(100,170,120,0.22)" : "rgba(194,122,92,0.22)"} />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                  </linearGradient>
                </defs>
                {sparklineChart.guides.map((guide) => (<line key={guide} x1="16" x2="304" y1={guide} y2={guide} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />))}
                <motion.path d={sparklineChart.areaPath} fill="url(#homeSparkFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.26, ease: EASE }} />
                <motion.path d={sparklineChart.linePath} fill="none" stroke="url(#homeSpark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.85, ease: "easeOut" }} />
              </svg>
            </div>
          </motion.button>
        </motion.section>

        {/* ── Packs ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.26, ease: EASE }}>
          <div style={packsHeadStyle}>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={eyebrowStyle}>Packs</span>
              <div style={{ color: "rgba(244,244,245,0.75)", fontSize: 14, lineHeight: 1.5 }}>Choose a system and browse the full library.</div>
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
            <MotionLink key={href} href={href} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} style={{ display: "grid", gap: 4, padding: "16px 18px", background: "rgba(39,39,42,0.52)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
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
const mainStyle: CSSProperties = { minHeight: "100dvh", padding: "44px 18px 120px", background: "var(--bg)", position: "relative", overflow: "hidden" };
const atmosphereWrapStyle: CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const blobStyle: CSSProperties = { position: "absolute", borderRadius: 999, filter: "blur(72px)" };
const pageWrapStyle: CSSProperties = { position: "relative", zIndex: 2, width: "100%", maxWidth: 740, margin: "0 auto", display: "grid", gap: 20 };
const headerStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "nowrap" };
const eyebrowStyle: CSSProperties = { color: "rgba(161,161,170,0.85)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: 0, color: "rgba(244,244,245,0.88)", fontSize: "clamp(2.1rem, 5.5vw, 2.5rem)", lineHeight: 1.05, letterSpacing: "-0.04em", fontWeight: 640 };
const subtitleStyle: CSSProperties = { margin: 0, color: "rgba(161,161,170,0.85)", fontSize: 14, lineHeight: 1.65, maxWidth: 460 };
const dotsButtonStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, minHeight: 44, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer", flexShrink: 0 };
const dotStyle: CSSProperties = { width: 9, height: 9, borderRadius: 999, flexShrink: 0 };
const cardStyle: CSSProperties = { position: "relative", background: "rgba(39,39,42,0.62)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)", overflow: "hidden" };
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
