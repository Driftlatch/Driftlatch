"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { type CSSProperties, useMemo, useState } from "react";
import {
  LIBRARY,
  getPackName,
  type DriftNeed,
  type DriftState,
  type Pack,
  type Tool,
} from "@/lib/toolLibrary";
import { getPackPurpose as getSupportPurpose } from "@/lib/supportLabels";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

const CLEAR_LIGHT_PACK_IDS = new Set([
  "sharp_pack",
  "warm_pack",
  "expansive_pack",
  "maintain_light_pack",
]);


const PACK_FLAGSHIP_TOOL_IDS: Record<string, string> = {
  clear_head_pack: "CH-01",
  wind_down_pack: "WD-35",
  be_here_pack: "BH-39",
  come_back_pack: "CB-38",
  settle_the_spiral_pack: "SS-01",
  space_not_distance_pack: "SN-22",
  sharp_pack: "SH-08",
  warm_pack: "WA-16",
  expansive_pack: "EX-23",
  maintain_light_pack: "ML-09",
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
  return getSupportPurpose(pack.id, pack.purpose || PURPOSE_FALLBACK[pack.id]);
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

    const timeScore = a.time_min_minutes - b.time_min_minutes;
    if (timeScore !== 0) return timeScore;

    return a.title.localeCompare(b.title);
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

function pickFlagship(pack: Pack, packTools: Tool[], lastState: DriftState | null): Tool | null {
  const flagshipId = PACK_FLAGSHIP_TOOL_IDS[pack.id];
  if (flagshipId) {
    const flagshipTool = packTools.find((tool) => tool.id === flagshipId);
    if (flagshipTool) return flagshipTool;
  }

  return pickFirstMove(packTools, lastState);
}

function pickShuffle(packTools: Tool[], currentId: string, lastState: DriftState | null): Tool | null {
  return pickFirstMove(
    packTools.filter((tool) => tool.id !== currentId),
    lastState
  );
}

function getToolDistribution(packTools: Tool[]) {
  let fast = 0;
  let standard = 0;
  let deep = 0;

  for (const tool of packTools) {
    if (tool.time_max_minutes <= 1) { fast += 1; continue; }
    if (tool.time_min_minutes >= 10) { deep += 1; continue; }
    standard += 1;
  }

  return { fast, standard, deep };
}

function getStateChips(packTools: Tool[]): string[] {
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

function glowForPack(packId: string): string {
  if (packId === "sharp_pack") {
    return "radial-gradient(circle at 80% 20%, rgba(140,190,220,0.18) 0%, rgba(140,190,220,0.04) 54%, transparent 76%)";
  }
  if (packId === "warm_pack") {
    return "radial-gradient(circle at 80% 20%, rgba(140,190,150,0.18) 0%, rgba(140,190,150,0.04) 54%, transparent 76%)";
  }
  if (packId === "expansive_pack") {
    return "radial-gradient(circle at 80% 20%, rgba(160,200,160,0.18) 0%, rgba(160,200,160,0.04) 54%, transparent 76%)";
  }
  if (packId === "maintain_light_pack") {
    return "radial-gradient(circle at 80% 20%, rgba(130,185,155,0.16) 0%, rgba(130,185,155,0.04) 54%, transparent 76%)";
  }
  if (packId.includes("clear")) {
    return "radial-gradient(circle at 80% 20%, rgba(120,150,200,0.18) 0%, rgba(120,150,200,0.04) 54%, transparent 76%)";
  }
  if (packId.includes("wind")) {
    return "radial-gradient(circle at 80% 20%, rgba(220,170,90,0.18) 0%, rgba(220,170,90,0.04) 54%, transparent 76%)";
  }
  if (packId.includes("be_here") || packId.includes("be-here")) {
    return "radial-gradient(circle at 80% 20%, rgba(194,122,92,0.18) 0%, rgba(194,122,92,0.04) 54%, transparent 76%)";
  }
  if (packId.includes("come")) {
    return "radial-gradient(circle at 80% 20%, rgba(180,80,80,0.18) 0%, rgba(180,80,80,0.04) 54%, transparent 76%)";
  }
  if (packId.includes("spiral")) {
    return "radial-gradient(circle at 80% 20%, rgba(196,116,92,0.18) 0%, rgba(196,116,92,0.04) 54%, transparent 76%)";
  }
  if (packId.includes("space")) {
    return "radial-gradient(circle at 80% 20%, rgba(120,150,138,0.16) 0%, rgba(120,150,138,0.04) 54%, transparent 76%)";
  }
  return "radial-gradient(circle at 80% 20%, rgba(194,122,92,0.16) 0%, rgba(194,122,92,0.03) 54%, transparent 76%)";
}

function accentRGBCore(packId: string): string {
  if (packId === "wind_down_pack" || packId === "space_not_distance_pack") return "100,160,200";
  if (packId === "be_here_pack" || packId === "warm_pack" || packId === "maintain_light_pack") return "120,190,150";
  if (packId === "settle_the_spiral_pack") return "180,120,200";
  if (packId === "sharp_pack" || packId === "expansive_pack") return "208,164,92";
  return "194,122,92";
}

function accentForPack(packId: string): string {
  return `rgba(${accentRGBCore(packId)},0.7)`;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(pack: Pack, packTools: Tool[], query: string): boolean {
  if (!query) return true;

  const haystacks = [
    pack.name,
    getPackName(pack.id),
    pack.id,
    pack.purpose,
    getPackPurpose(pack),
    ...packTools.flatMap((tool) => [tool.title, tool.do, tool.why ?? ""]),
  ];

  return haystacks.some((value) => value.toLowerCase().includes(query));
}

function PackCard({
  pack,
  index,
  lastState,
  toolId,
  onShuffle,
}: {
  pack: Pack;
  index: number;
  lastState: DriftState | null;
  toolId: string;
  onShuffle: () => void;
  isClearLight: boolean;
}) {
  const packTools = useMemo(() => LIBRARY.tools.filter((t) => t.pack_id === pack.id), [pack.id]);
  const toolCount = packTools.length;
  const stateChips = useMemo(() => getStateChips(packTools), [packTools]);
  const distribution = useMemo(() => getToolDistribution(packTools), [packTools]);
  const bestForStates = stateChips.slice(0, 2);
  const firstMove = packTools.find((tool) => tool.id === toolId) ?? pickFlagship(pack, packTools, lastState);
  const accent = accentForPack(pack.id);
  const accentCore = accentRGBCore(pack.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 + index * 0.06, ease: EASE }}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "rgba(18,18,22,0.9)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 22,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
        padding: "22px 22px 22px 28px",
      }}
    >
      {/* Rim light */}
      <div aria-hidden style={{
        position: "absolute", top: 0, left: 16, right: 16, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
        pointerEvents: "none",
      }} />

      {/* Left accent bar */}
      <div aria-hidden style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0,
        width: 3,
        borderRadius: "3px 0 0 3px",
        background: accent,
        opacity: 0.85,
      }} />

      <div style={{ display: "grid", gap: 14 }}>
        {/* Heading row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.15rem",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
            color: "rgba(244,244,245,0.95)",
          }}>
            {getPackName(pack.id)}
          </div>
          <div style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(161,161,170,0.55)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            padding: "3px 8px",
            whiteSpace: "nowrap",
            alignSelf: "center",
          }}>
            {toolCount} tools
          </div>
        </div>

        {/* Description */}
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--muted)" }}>
          {getPackPurpose(pack)}
        </p>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {distribution.fast > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "rgba(161,161,170,0.7)",
              background: "rgba(255,255,255,0.05)", borderRadius: 6,
              padding: "2px 7px",
            }}>
              {distribution.fast} fast
            </span>
          )}
          {distribution.standard > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "rgba(161,161,170,0.7)",
              background: "rgba(255,255,255,0.05)", borderRadius: 6,
              padding: "2px 7px",
            }}>
              {distribution.standard} standard
            </span>
          )}
          {distribution.deep > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "rgba(161,161,170,0.7)",
              background: "rgba(255,255,255,0.05)", borderRadius: 6,
              padding: "2px 7px",
            }}>
              {distribution.deep} deep
            </span>
          )}
          {bestForStates.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: accent,
              background: `rgba(${accentCore},0.1)`,
              borderRadius: 6,
              padding: "2px 7px",
            }}>
              {bestForStates.join(", ")}
            </span>
          )}
        </div>

        {/* Start here panel */}
        <div style={{
          background: "rgba(18,18,22,0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "grid",
          gap: 6,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: accent,
          }}>
            Start here
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={firstMove?.id ?? "empty"}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ display: "grid", gap: 4 }}
            >
              <div style={{ fontSize: 15, fontWeight: 650, lineHeight: 1.2, color: "rgba(244,244,245,0.92)" }}>
                {firstMove ? firstMove.title : "No tool available"}
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(161,161,170,0.75)" }}>
                {firstMove
                  ? firstSentence(firstMove.do)
                  : "This support does not have a tool ready yet."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action row */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link
            href={`/app/packs/${pack.id}`}
            className="pack-link-primary"
            style={{ fontSize: 13, fontWeight: 700, color: "rgba(194,122,92,0.9)", textDecoration: "none", letterSpacing: "-0.01em" }}
          >
            Open support →
          </Link>
          {firstMove ? (
            <Link
              href={buildToolHref(firstMove.id, pack, lastState)}
              className="pack-link-secondary"
              style={{ fontSize: 13, fontWeight: 500, color: "rgba(161,161,170,0.6)", textDecoration: "none" }}
            >
              Open first tool →
            </Link>
          ) : null}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onShuffle}
            style={{
              marginLeft: "auto",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              color: "rgba(161,161,170,0.6)",
              fontSize: 12, fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Shuffle
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

function SectionDivider({ label }: { label: string; sub?: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "rgba(161,161,170,0.4)",
      marginTop: 32,
      marginBottom: 4,
    }}>
      {label}
    </div>
  );
}

export default function PacksPage() {
  const [lastState] = useState<DriftState | null>(() => readLastState());
  const [searchQuery, setSearchQuery] = useState("");
  const [startToolByPack, setStartToolByPack] = useState<Record<string, string>>(() =>
    LIBRARY.packs.reduce<Record<string, string>>((acc, pack) => {
      const packTools = LIBRARY.tools.filter((t) => t.pack_id === pack.id);
      acc[pack.id] = pickFlagship(pack, packTools, readLastState())?.id ?? "";
      return acc;
    }, {})
  );
  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const packToolsById = useMemo(
    () =>
      LIBRARY.packs.reduce<Record<string, Tool[]>>((acc, pack) => {
        acc[pack.id] = LIBRARY.tools.filter((tool) => tool.pack_id === pack.id);
        return acc;
      }, {}),
    []
  );
  const filteredPacks = useMemo(
    () =>
      LIBRARY.packs.filter((pack) => matchesSearch(pack, packToolsById[pack.id] ?? [], normalizedSearchQuery)),
    [normalizedSearchQuery, packToolsById]
  );
  const hasActiveSearch = normalizedSearchQuery.length > 0;
  const matchCount = filteredPacks.length;

  const hardPacks = filteredPacks.filter((p) => !CLEAR_LIGHT_PACK_IDS.has(p.id));
  const lightPacks = filteredPacks.filter((p) => CLEAR_LIGHT_PACK_IDS.has(p.id));

  function renderPackCard(pack: Pack, index: number, isClearLight: boolean) {
    const packTools = packToolsById[pack.id] ?? [];
    const selectedToolId = startToolByPack[pack.id];
    const fallbackTool = pickFlagship(pack, packTools, lastState);
    const activeToolId = selectedToolId || fallbackTool?.id || "";

    return (
      <PackCard
        key={pack.id}
        pack={pack}
        index={index}
        lastState={lastState}
        toolId={activeToolId}
        isClearLight={isClearLight}
        onShuffle={() => {
          const currentTool = packTools.find((t) => t.id === activeToolId) ?? fallbackTool;
          if (!currentTool) return;
          const nextTool = pickShuffle(packTools, currentTool.id, lastState);
          if (!nextTool) return;
          setStartToolByPack((current) => ({ ...current, [pack.id]: nextTool.id }));
        }}
      />
    );
  }

  return (
    <main style={mainStyle}>
      <div style={{ width: "min(640px, calc(100vw - 40px))", margin: "0 auto" }}>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: EASE }}
          style={{ marginBottom: 28 }}
        >
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--muted)",
            marginBottom: 8,
          }}>
            Tool Library
          </div>
          <h1 style={{
            margin: "0 0 8px",
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "rgba(244,244,245,0.95)",
          }}>
            Supports
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "rgba(161,161,170,0.7)" }}>
            Choose where to start.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.06, ease: EASE }}
          style={{ marginBottom: 20 }}
        >
          <div style={{ position: "relative" }}>
            <span aria-hidden style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: "rgba(161,161,170,0.55)",
              display: "flex", alignItems: "center",
              pointerEvents: "none",
            }}>
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                <path
                  d="M13.75 13.75L17 17M15.5 9.125C15.5 12.6468 12.6468 15.5 9.125 15.5C5.60318 15.5 2.75 12.6468 2.75 9.125C2.75 5.60318 5.60318 2.75 9.125 2.75C12.6468 2.75 15.5 5.60318 15.5 9.125Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search packs or steps"
              aria-label="Search supports or steps"
              className="packs-search"
              style={{
                display: "block",
                width: "100%",
                minHeight: 48,
                padding: "0 44px",
                background: "rgba(18,18,22,0.7)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                color: "rgba(244,244,245,0.9)",
                fontSize: 14,
                letterSpacing: "0.01em",
                boxSizing: "border-box",
              }}
            />
            {hasActiveSearch ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "transparent",
                  color: "rgba(194,122,92,0.84)",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                  cursor: "pointer", padding: 0,
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          {hasActiveSearch ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(161,161,170,0.6)" }}>
              {matchCount === 0 ? "No supports match yet." : `${matchCount} support${matchCount === 1 ? "" : "s"} matched`}
            </div>
          ) : null}
        </motion.div>

        {/* Pack list */}
        {matchCount === 0 ? (
          <div style={{
            position: "relative", overflow: "hidden",
            background: "rgba(18,18,22,0.9)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 22,
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
            padding: "24px 22px",
          }}>
            <div aria-hidden style={{
              position: "absolute", top: 0, left: 16, right: 16, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
              pointerEvents: "none",
            }} />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 650, color: "rgba(244,244,245,0.9)" }}>
                No supports matched that search.
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "rgba(161,161,170,0.75)" }}>
                Try a support name, a step title, or a short phrase from the step you remember.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  alignSelf: "start",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  background: "transparent",
                  color: "rgba(161,161,170,0.8)",
                  fontSize: 13, fontWeight: 600,
                  padding: "7px 16px",
                  cursor: "pointer",
                }}
              >
                Clear search
              </button>
            </div>
          </div>
        ) : (
          <>
            {hardPacks.length > 0 ? (
              <div style={{ display: "grid", gap: 14, marginBottom: lightPacks.length > 0 ? 8 : 0 }}>
                <SectionDivider label="When things are hard" />
                {hardPacks.map((pack, i) => renderPackCard(pack, i, false))}
              </div>
            ) : null}

            {lightPacks.length > 0 ? (
              <div style={{ display: "grid", gap: 14 }}>
                <SectionDivider label="When things are clear" />
                {lightPacks.map((pack, i) => renderPackCard(pack, i + hardPacks.length, true))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

const mainStyle: CSSProperties = {
  minHeight: "100dvh",
  background: "var(--bg)",
  padding: "44px 0 100px",
  WebkitTapHighlightColor: "transparent",
  overflowX: "hidden",
};
