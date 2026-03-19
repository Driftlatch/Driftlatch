"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { notFound, useParams } from "next/navigation";
import { type CSSProperties, useMemo, useRef, useState } from "react";
import {
  LIBRARY,
  getPackName,
  type DriftNeed,
  type DriftState,
  type Pack,
  type Tool,
} from "@/lib/toolLibrary";

const MotionLink = motion(Link);
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type LaneKey = "fast" | "standard" | "deep";

const STATE_LABEL: Record<DriftState, string> = {
  clear_light: "Clear & light",
  carrying_work: "Carrying work",
  wired: "Wired",
  drained: "Drained",
  overloaded: "Overloaded",
  steady: "Steady",
};


const PURPOSE_FALLBACK: Record<string, string> = {
  clear_head_pack: "Work clarity under load",
  "clear-head": "Work clarity under load",
  regain_clarity: "Work clarity under load",
  wind_down_pack: "Nervous system downshift",
  "wind-down": "Nervous system downshift",
  be_here_pack: "Home presence without effort",
  "be-here": "Home presence without effort",
  come_back_pack: "Repair and re-entry after tension",
  "come-back": "Repair and re-entry after tension",
  settle_the_spiral_pack: "Anxious spiral interruption",
  "settle-spiral": "Anxious spiral interruption",
  space_not_distance_pack: "Space without distance",
  "space-not-distance": "Space without distance",
  sharp_pack: "Brain is fast — use it.",
  warm_pack: "Home feels good — pour into it.",
  expansive_pack: "Rare window — don't waste it.",
  maintain_light_pack: "Keep the good state stable.",
};

const BEST_WHEN_BY_PACK: Record<string, string> = {
  clear_head_pack: "Open loops, urgency distortion, context switching",
  wind_down_pack: "Wired evenings, body carry, slow decompression",
  be_here_pack: "Mind elsewhere, logistics mode, short fuse",
  come_back_pack: "Re-entry after friction, repair, distance after pressure",
  settle_the_spiral_pack: "Ambiguous signals, reassurance loops, mind-reading",
  space_not_distance_pack: "Need for space, shutdown, quiet without disconnection",
  sharp_pack: "Decision clarity, ideas queued up, fast brain",
  warm_pack: "Clear, grounded, want to pour into home",
  expansive_pack: "Rare good window, energy available, want to use it right",
  maintain_light_pack: "Want to protect a good state before it slips",
};

const CLEAR_LIGHT_PACK_IDS = new Set([
  "sharp_pack",
  "warm_pack",
  "expansive_pack",
  "maintain_light_pack",
]);

const LANE_META: Record<LaneKey, { label: string; time: string; desc: string }> = {
  fast: { label: "Quick hits", time: "0–1 min", desc: "One action, immediate effect" },
  standard: { label: "Standard", time: "2–5 min", desc: "The core of this pack" },
  deep: { label: "Deep work", time: "10+ min", desc: "When you have more space" },
};

function safeReadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isDriftState(value: unknown): value is DriftState {
  return (
    value === "clear_light" ||
    value === "carrying_work" ||
    value === "wired" ||
    value === "drained" ||
    value === "overloaded" ||
    value === "steady"
  );
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return match?.[0]?.trim() || text;
}

function readLastState(): DriftState | null {
  const value = safeReadJSON<unknown>("driftlatch_last_state", null);
  return isDriftState(value) ? value : null;
}

function getPackPurpose(pack: Pack): string {
  return pack.purpose || PURPOSE_FALLBACK[pack.id] || "Grounded tools for real pressure.";
}

function inferNeedFromPackId(packId: string): DriftNeed {
  if (packId === "sharp_pack" || packId === "expansive_pack" || packId === "maintain_light_pack") return "regain_clarity";
  if (packId === "warm_pack") return "be_here";
  if (packId.includes("clear") || packId.includes("regain_clarity")) return "regain_clarity";
  if (packId.includes("wind")) return "wind_down";
  if (packId.includes("be_here") || packId.includes("be-here")) return "be_here";
  if (packId.includes("settle") || packId.includes("space") || packId.includes("come")) return "come_back";
  return "wind_down";
}

function sortFirstMoveTools(tools: Tool[], lastState: DriftState | null): Tool[] {
  return [...tools].sort((a, b) => {
    const fastScore = Number(b.time_max_minutes <= 3) - Number(a.time_max_minutes <= 3);
    if (fastScore !== 0) return fastScore;
    const stateScore =
      Number(Boolean(lastState && b.best_for_state.includes(lastState))) -
      Number(Boolean(lastState && a.best_for_state.includes(lastState)));
    if (stateScore !== 0) return stateScore;
    const utilityScore = b.best_for_state.length - a.best_for_state.length;
    if (utilityScore !== 0) return utilityScore;
    return a.time_min_minutes - b.time_min_minutes;
  });
}

function pickFirstMove(packTools: Tool[], lastState: DriftState | null): Tool | null {
  const fastState = packTools.filter(
    (tool) => tool.time_max_minutes <= 3 && (!lastState || tool.best_for_state.includes(lastState))
  );
  if (fastState.length > 0) return sortFirstMoveTools(fastState, lastState)[0] ?? null;
  const fastBroad = packTools.filter((tool) => tool.time_max_minutes <= 3);
  if (fastBroad.length > 0) return sortFirstMoveTools(fastBroad, lastState)[0] ?? null;
  return sortFirstMoveTools(packTools, lastState)[0] ?? null;
}

function pickShuffle(packTools: Tool[], currentId: string, lastState: DriftState | null): Tool | null {
  return pickFirstMove(packTools.filter((tool) => tool.id !== currentId), lastState);
}

function topStateChips(packTools: Tool[]): string[] {
  const counts = new Map<DriftState, number>();
  for (const tool of packTools) {
    for (const state of tool.best_for_state) {
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || STATE_LABEL[a[0]].localeCompare(STATE_LABEL[b[0]]))
    .slice(0, 3)
    .map(([state]) => STATE_LABEL[state]);
}

function buildToolHref(toolId: string, pack: Pack, lastState: DriftState | null): string {
  const params = new URLSearchParams({
    from: "packs",
    need: inferNeedFromPackId(pack.id),
    situation: "alone",
    time: "3",
  });
  if (lastState) params.set("state", lastState);
  return `/app/tool/${toolId}?${params.toString()}`;
}

function getLaneForTool(tool: Tool): LaneKey {
  if (tool.time_max_minutes <= 1) return "fast";
  if (tool.time_min_minutes >= 10) return "deep";
  return "standard";
}

function sortLaneTools(tools: Tool[], lastState: DriftState | null): Tool[] {
  return [...tools].sort((a, b) => {
    const stateScore =
      Number(Boolean(lastState && b.best_for_state.includes(lastState))) -
      Number(Boolean(lastState && a.best_for_state.includes(lastState)));
    if (stateScore !== 0) return stateScore;
    const timeScore = a.time_min_minutes - b.time_min_minutes;
    if (timeScore !== 0) return timeScore;
    return a.title.localeCompare(b.title);
  });
}

function toolTimeLabel(tool: Tool): string {
  if (tool.time_min_minutes === 0 && tool.time_max_minutes === 0) return "< 1 min";
  if (tool.time_min_minutes === tool.time_max_minutes) return `${tool.time_min_minutes} min`;
  if (tool.time_min_minutes === 0) return `< ${tool.time_max_minutes} min`;
  return `${tool.time_min_minutes}–${tool.time_max_minutes} min`;
}

function glowForPack(packId: string): string {
  if (packId === "sharp_pack") return "radial-gradient(circle at 80% 18%, rgba(140,190,220,0.2) 0%, rgba(140,190,220,0.05) 54%, transparent 76%)";
  if (packId === "warm_pack") return "radial-gradient(circle at 80% 18%, rgba(140,190,150,0.2) 0%, rgba(140,190,150,0.05) 54%, transparent 76%)";
  if (packId === "expansive_pack") return "radial-gradient(circle at 80% 18%, rgba(160,200,160,0.2) 0%, rgba(160,200,160,0.05) 54%, transparent 76%)";
  if (packId === "maintain_light_pack") return "radial-gradient(circle at 80% 18%, rgba(130,185,155,0.18) 0%, rgba(130,185,155,0.04) 54%, transparent 76%)";
  if (packId.includes("clear")) return "radial-gradient(circle at 80% 18%, rgba(120,150,200,0.18) 0%, rgba(120,150,200,0.04) 54%, transparent 76%)";
  if (packId.includes("wind")) return "radial-gradient(circle at 80% 18%, rgba(220,170,90,0.18) 0%, rgba(220,170,90,0.04) 54%, transparent 76%)";
  if (packId.includes("be_here") || packId.includes("be-here")) return "radial-gradient(circle at 80% 18%, rgba(194,122,92,0.18) 0%, rgba(194,122,92,0.04) 54%, transparent 76%)";
  if (packId.includes("come")) return "radial-gradient(circle at 80% 18%, rgba(180,80,80,0.18) 0%, rgba(180,80,80,0.04) 54%, transparent 76%)";
  if (packId.includes("spiral")) return "radial-gradient(circle at 80% 18%, rgba(196,116,92,0.18) 0%, rgba(196,116,92,0.04) 54%, transparent 76%)";
  if (packId.includes("space")) return "radial-gradient(circle at 80% 18%, rgba(120,150,138,0.16) 0%, rgba(120,150,138,0.04) 54%, transparent 76%)";
  return "radial-gradient(circle at 80% 18%, rgba(194,122,92,0.16) 0%, rgba(194,122,92,0.03) 54%, transparent 76%)";
}

function accentColorForPack(packId: string): string {
  if (CLEAR_LIGHT_PACK_IDS.has(packId)) return "rgba(100,170,120,0.96)";
  return "rgba(194,122,92,0.96)";
}

function accentGlowForPack(packId: string): string {
  if (CLEAR_LIGHT_PACK_IDS.has(packId)) return "0 18px 42px rgba(100,170,120,0.18)";
  return "0 18px 42px rgba(194,122,92,0.18)";
}

function accentBorderForPack(packId: string): string {
  if (CLEAR_LIGHT_PACK_IDS.has(packId)) return "rgba(100,170,120,0.28)";
  return "rgba(194,122,92,0.28)";
}

function titleColorForPack(packId: string): string {
  if (CLEAR_LIGHT_PACK_IDS.has(packId)) return "rgba(200,235,215,0.95)";
  return "var(--text)";
}

export default function PackDetailPage() {
  const params = useParams<{ id: string }>();
  const laneRef = useRef<HTMLDivElement | null>(null);
  const packId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";
  const pack = LIBRARY.packs.find((item) => item.id === packId);

  if (!pack) notFound();

  const isClearLight = CLEAR_LIGHT_PACK_IDS.has(pack.id);
  const packTools = useMemo(() => LIBRARY.tools.filter((t) => t.pack_id === pack.id), [pack.id]);
  const [lastState] = useState<DriftState | null>(() => readLastState());
  const [firstMoveId, setFirstMoveId] = useState<string>(
    () => pickFirstMove(packTools, readLastState())?.id ?? ""
  );
  // All lanes open by default
  const [openLane, setOpenLane] = useState<Record<LaneKey, boolean>>({
    fast: true,
    standard: true,
    deep: true,
  });

  const firstMove = packTools.find((tool) => tool.id === firstMoveId) ?? pickFirstMove(packTools, lastState);
  const topChips = topStateChips(packTools);

  const lanes = useMemo<Record<LaneKey, Tool[]>>(() => {
    const grouped: Record<LaneKey, Tool[]> = { fast: [], standard: [], deep: [] };
    for (const tool of packTools) {
      grouped[getLaneForTool(tool)].push(tool);
    }
    return {
      fast: sortLaneTools(grouped.fast, lastState),
      standard: sortLaneTools(grouped.standard, lastState),
      deep: sortLaneTools(grouped.deep, lastState),
    };
  }, [lastState, packTools]);

  const accentColor = accentColorForPack(pack.id);
  const accentGlow = accentGlowForPack(pack.id);
  const accentBorder = accentBorderForPack(pack.id);
  const titleColor = titleColorForPack(pack.id);

  return (
    <main style={mainStyle}>
      <div className="px-wrap">

        {/* ── HERO HEADER ── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.02, ease: EASE }}
          className={isClearLight ? "glass glass-light" : "glass"}
          style={{ position: "relative", overflow: "hidden", padding: 24, marginBottom: 14 }}
        >
          <div aria-hidden className="top-highlight" />
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: glowForPack(pack.id) }} />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 18 }}>
            <MotionLink whileTap={{ scale: 0.985 }} href="/app/packs" style={backLinkStyle}>
              ← Back to packs
            </MotionLink>

            {/* Title + purpose */}
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  color: titleColor,
                  fontSize: "clamp(2.4rem, 7vw, 4.2rem)",
                  lineHeight: 0.96,
                  letterSpacing: "-0.055em",
                  fontWeight: 720,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {getPackName(pack.id)}
              </div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 16, lineHeight: 1.72 }}>
                {getPackPurpose(pack)}
              </p>
            </div>

            {/* Chips row */}
            <div className="pack-chips">
              <span
                className="pack-chip"
                style={
                  isClearLight
                    ? { color: "rgba(200,235,215,0.92)", borderColor: "rgba(120,190,150,0.28)", background: "rgba(120,190,150,0.12)" }
                    : { color: "var(--text)", borderColor: "rgba(194,122,92,0.2)", background: "rgba(194,122,92,0.1)" }
                }
              >
                {packTools.length} tools
              </span>
              {lastState && (
                <span className="pack-chip" style={{ color: "rgba(244,244,245,0.72)" }}>
                  Showing best for: {STATE_LABEL[lastState].toLowerCase()}
                </span>
              )}
              {topChips.slice(0, 2).map((chip) => (
                <span key={chip} className="pack-chip">{chip}</span>
              ))}
            </div>

            {/* Best when */}
            {BEST_WHEN_BY_PACK[pack.id] && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 3,
                }}
              >
                <span style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Best when
                </span>
                <span style={{ color: "rgba(244,244,245,0.72)", fontSize: 14, lineHeight: 1.55 }}>
                  {BEST_WHEN_BY_PACK[pack.id]}
                </span>
              </div>
            )}
          </div>
        </motion.section>

        {/* ── FIRST MOVE CARD ── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.08, ease: EASE }}
          className={isClearLight ? "glass glass-light" : "glass"}
          style={{ position: "relative", overflow: "hidden", padding: 24, marginBottom: 14 }}
        >
          <div aria-hidden className="top-highlight" />
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: glowForPack(pack.id) }} />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                First move
              </span>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => {
                  if (!firstMove) return;
                  const next = pickShuffle(packTools, firstMove.id, lastState);
                  if (next) setFirstMoveId(next.id);
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 999,
                  color: "var(--muted)",
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "5px 12px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                Shuffle
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={firstMove?.id ?? "empty"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: EASE }}
                style={{ display: "grid", gap: 10 }}
              >
                <div
                  style={{
                    color: "var(--text)",
                    fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                    lineHeight: 1.04,
                    letterSpacing: "-0.04em",
                    fontWeight: 700,
                  }}
                >
                  {firstMove ? firstMove.title : "No tool available"}
                </div>

                {firstMove && (
                  <>
                    <p style={{ margin: 0, color: "var(--text)", fontSize: 16, lineHeight: 1.7, opacity: 0.82 }}>
                      {firstMove.do}
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.62 }}>
                      {firstMove.why}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                      <span className="meta-pill">{toolTimeLabel(firstMove)}</span>
                      {firstMove.best_for_state.slice(0, 2).map((s) => (
                        <span key={s} className="meta-pill">{STATE_LABEL[s]}</span>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {firstMove && (
              <MotionLink
                whileTap={{ scale: 0.985 }}
                href={buildToolHref(firstMove.id, pack, lastState)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 52,
                  borderRadius: 16,
                  background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor.replace("0.96", "0.88")} 100%)`,
                  border: `1px solid ${accentBorder}`,
                  boxShadow: accentGlow,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                Start this tool →
              </MotionLink>
            )}
          </div>
        </motion.section>

        {/* ── TOOL LANES ── */}
        <div ref={laneRef} style={{ display: "grid", gap: 12 }}>
          {(["fast", "standard", "deep"] as LaneKey[]).map((lane, laneIndex) => {
            const laneTools = lanes[lane];
            if (laneTools.length === 0) return null;
            const meta = LANE_META[lane];
            const isOpen = openLane[lane];

            return (
              <motion.section
                key={lane}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.16 + laneIndex * 0.06, ease: EASE }}
                className="glass"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <div aria-hidden className="top-highlight" />

                {/* Lane toggle header */}
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={() => setOpenLane((cur) => ({ ...cur, [lane]: !cur[lane] }))}
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 20px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "grid", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "var(--text)", fontSize: 18, lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.025em" }}>
                        {meta.label}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 9px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "var(--muted)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {meta.time}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 9px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "rgba(161,161,170,0.55)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {laneTools.length}
                      </span>
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                      {meta.desc}
                    </span>
                  </div>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 20,
                      lineHeight: 1,
                      fontWeight: 300,
                      transition: "transform 0.22s ease",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      display: "block",
                    }}
                  >
                    ↓
                  </span>
                </motion.button>

                {/* Lane tools */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: EASE }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          display: "grid",
                          gap: 1,
                          padding: "8px 12px 12px",
                        }}
                      >
                        {laneTools.map((tool, toolIndex) => {
                          const isMatched = Boolean(lastState && tool.best_for_state.includes(lastState));
                          return (
                            <MotionLink
                              key={tool.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.22, delay: toolIndex * 0.03, ease: EASE }}
                              whileTap={{ scale: 0.99 }}
                              href={buildToolHref(tool.id, pack, lastState)}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0,1fr) auto",
                                gap: 14,
                                alignItems: "center",
                                padding: "14px 12px",
                                borderRadius: 14,
                                textDecoration: "none",
                                background: isMatched ? "rgba(255,255,255,0.035)" : "transparent",
                                border: isMatched ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
                                transition: "background 0.15s ease",
                              }}
                            >
                              <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ color: "var(--text)", fontSize: 16, lineHeight: 1.15, fontWeight: 650 }}>
                                    {tool.title}
                                  </span>
                                  {isMatched && (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "2px 7px",
                                        borderRadius: 999,
                                        background: isClearLight
                                          ? "rgba(120,190,150,0.15)"
                                          : "rgba(194,122,92,0.15)",
                                        border: isClearLight
                                          ? "1px solid rgba(120,190,150,0.2)"
                                          : "1px solid rgba(194,122,92,0.2)",
                                        color: isClearLight
                                          ? "rgba(160,220,180,0.9)"
                                          : "rgba(220,160,130,0.9)",
                                        fontSize: 10,
                                        fontWeight: 800,
                                        letterSpacing: "0.04em",
                                      }}
                                    >
                                      matched
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
                                  {firstSentence(tool.do)}
                                </p>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                                  <span className="meta-pill-sm">{toolTimeLabel(tool)}</span>
                                  {tool.best_for_state.slice(0, 2).map((s) => (
                                    <span key={s} className="meta-pill-sm">{STATE_LABEL[s]}</span>
                                  ))}
                                </div>
                              </div>
                              <span
                                style={{
                                  color: "rgba(161,161,170,0.5)",
                                  fontSize: 18,
                                  fontWeight: 300,
                                  flexShrink: 0,
                                }}
                              >
                                →
                              </span>
                            </MotionLink>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        * {
          -webkit-tap-highlight-color: transparent;
        }

        .px-wrap {
          width: min(720px, calc(100vw - 40px));
          margin: 0 auto;
        }

        .glass {
          background: rgba(39, 39, 42, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .glass-light {
          border-color: rgba(140, 190, 150, 0.14);
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.38),
            0 0 0 1px rgba(140, 190, 150, 0.06),
            inset 0 1px 0 rgba(140, 190, 150, 0.08);
        }

        .top-highlight {
          position: absolute;
          top: 0;
          left: 16px;
          right: 16px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          pointer-events: none;
        }

        .pack-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }

        .pack-chip {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--muted);
          white-space: normal;
          word-break: break-word;
        }

        .meta-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.04);
          color: var(--muted);
          white-space: nowrap;
        }

        .meta-pill-sm {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(161, 161, 170, 0.65);
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .px-wrap {
            width: min(560px, calc(100vw - 32px));
          }
        }
      `}</style>
    </main>
  );
}

const mainStyle: CSSProperties = {
  minHeight: "100dvh",
  background: "var(--bg)",
  padding: "40px 0 104px",
  WebkitTapHighlightColor: "transparent",
  overflowX: "hidden",
};

const backLinkStyle: CSSProperties = {
  width: "fit-content",
  display: "inline-flex",
  alignItems: "center",
  color: "var(--muted)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 800,
  minHeight: 40,
};