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

const MotionLink = motion(Link);
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

function PackCard({
  pack,
  index,
  lastState,
  toolId,
  onShuffle,
  isClearLight,
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
  const firstMove = packTools.find((tool) => tool.id === toolId) ?? pickFirstMove(packTools, lastState);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 + index * 0.06, ease: EASE }}
      className={isClearLight ? "glass glass-light" : "glass"}
      style={{ position: "relative", overflow: "hidden", padding: 22 }}
    >
      <div aria-hidden className="top-highlight" />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: glowForPack(pack.id),
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 16 }}>
        {/* Title + purpose + chips — full width */}
        <div className="pack-header">
          <div
            className="pack-title"
            style={{
              color: isClearLight ? "rgba(200,235,215,0.95)" : "var(--text)",
              fontSize: "clamp(1.9rem, 4vw, 2.6rem)",
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              fontWeight: 650,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {getPackName(pack.id)}
          </div>

          <p
            className="pack-purpose"
            style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.7 }}
          >
            {getPackPurpose(pack)}
          </p>

          <div className="pack-chips">
            <span
              className={
                isClearLight
                  ? "pack-chip pack-chip-accent pack-chip-accent-light"
                  : "pack-chip pack-chip-accent"
              }
            >
              {toolCount} tools
            </span>
            <span className="pack-chip">Fast {distribution.fast}</span>
            <span className="pack-chip">Standard {distribution.standard}</span>
            <span className="pack-chip">Deep {distribution.deep}</span>
            {stateChips.slice(0, 2).map((chip) => (
              <span
                key={chip}
                className={
                  isClearLight
                    ? "pack-chip pack-chip-state pack-chip-state-light"
                    : "pack-chip pack-chip-state"
                }
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* First move */}
        <div className="glass-row" style={{ padding: 16, display: "grid", gap: 8 }}>
          <div
            style={{
              color: "var(--muted)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            First move
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={firstMove?.id ?? "empty"}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.24, ease: EASE }}
              style={{ display: "grid", gap: 6 }}
            >
              <div style={{ color: "var(--text)", fontSize: 20, lineHeight: 1.08, fontWeight: 650 }}>
                {firstMove ? firstMove.title : "No tool available"}
              </div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.65 }}>
                {firstMove
                  ? firstSentence(firstMove.do)
                  : "This pack does not have a tool ready yet."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div
          className="card-actions"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <MotionLink
            whileTap={{ scale: 0.985 }}
            href={`/app/packs/${pack.id}`}
            className={isClearLight ? "btn-primary btn-primary-light" : "btn-primary"}
          >
            Open pack →
          </MotionLink>
          {firstMove ? (
            <MotionLink
              whileTap={{ scale: 0.985 }}
              href={buildToolHref(firstMove.id, pack, lastState)}
              className="btn-secondary"
            >
              Open first tool →
            </MotionLink>
          ) : (
            <span />
          )}
          <motion.button
            whileTap={{ scale: 0.985 }}
            type="button"
            onClick={onShuffle}
            className="btn-ghost"
          >
            Shuffle
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}

function SectionDivider({ label, sub }: { label: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: EASE }}
      style={{ paddingTop: 10, paddingBottom: 2 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: "none", display: "grid", gap: 2 }}>
          <span
            style={{
              color: "rgba(244,244,245,0.72)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          <span style={{ color: "rgba(161,161,170,0.6)", fontSize: 12, lineHeight: 1.5 }}>
            {sub}
          </span>
        </div>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)",
          }}
        />
      </div>
    </motion.div>
  );
}

export default function PacksPage() {
  const [lastState] = useState<DriftState | null>(() => readLastState());
  const [startToolByPack, setStartToolByPack] = useState<Record<string, string>>(() =>
    LIBRARY.packs.reduce<Record<string, string>>((acc, pack) => {
      const packTools = LIBRARY.tools.filter((t) => t.pack_id === pack.id);
      acc[pack.id] = pickFirstMove(packTools, readLastState())?.id ?? "";
      return acc;
    }, {})
  );

  const hardPacks = LIBRARY.packs.filter((p) => !CLEAR_LIGHT_PACK_IDS.has(p.id));
  const lightPacks = LIBRARY.packs.filter((p) => CLEAR_LIGHT_PACK_IDS.has(p.id));

  function renderPackCard(pack: Pack, index: number, isClearLight: boolean) {
    const packTools = LIBRARY.tools.filter((t) => t.pack_id === pack.id);
    const selectedToolId = startToolByPack[pack.id];
    const fallbackTool = pickFirstMove(packTools, lastState);
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
      <div className="px-wrap">
        <motion.div
          aria-hidden
          animate={{ opacity: [0.42, 0.68, 0.42], scale: [1, 1.04, 1] }}
          transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
          style={heroGlowStyle}
        />

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.02, ease: EASE }}
          className="glass-hero"
          style={{ position: "relative", padding: 24, marginBottom: 18, overflow: "hidden" }}
        >
          <div className="top-highlight" />
          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
            <div
              style={{
                color: "rgba(244,244,245,0.88)",
                fontSize: "clamp(2.8rem, 8vw, 4.8rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.06em",
                fontWeight: 700,
              }}
            >
              Packs
            </div>
            <p style={{ margin: 0, color: "rgba(161,161,170,0.85)", fontSize: 17, lineHeight: 1.68 }}>
              Choose the system you need.
            </p>
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.72, delay: 0.14, ease: EASE }}
              style={dividerStyle}
            />
          </div>
        </motion.section>

        {/* Hard-state packs */}
        <div style={{ display: "grid", gap: 16, marginBottom: 10 }}>
          <SectionDivider label="When things are hard" sub="Reduce load, come back, settle down" />
          {hardPacks.map((pack, i) => renderPackCard(pack, i, false))}
        </div>

        {/* Clear-light packs */}
        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          <SectionDivider label="When things are clear" sub="Use the window before it closes" />
          {lightPacks.map((pack, i) => renderPackCard(pack, i + hardPacks.length, true))}
        </div>
      </div>

      <style jsx>{`
        * {
          -webkit-tap-highlight-color: transparent;
        }

        .px-wrap {
          width: min(980px, calc(100vw - 40px));
          margin: 0 auto;
        }

        .glass-hero {
          background: rgba(39, 39, 42, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
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

        .glass-row {
          background: rgba(39, 39, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.04);
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

        .pack-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0;
          min-width: 0;
          padding-top: 8px;
        }

        .pack-title {
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
          margin-bottom: 10px;
        }

        .pack-purpose {
          min-width: 0;
        }

        .pack-chips {
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 8px;
          margin-top: 12px;
          max-width: 100%;
          min-width: 0;
        }

        .pack-chip {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          white-space: normal;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--muted);
          max-width: 100%;
          word-break: break-word;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .pack-chip-accent {
          color: rgba(244, 244, 245, 0.92);
          border-color: rgba(194, 122, 92, 0.26);
          background: linear-gradient(
            180deg,
            rgba(194, 122, 92, 0.2) 0%,
            rgba(194, 122, 92, 0.1) 100%
          );
          box-shadow: 0 10px 24px rgba(194, 122, 92, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .pack-chip-accent-light {
          border-color: rgba(120, 190, 150, 0.3);
          background: linear-gradient(
            180deg,
            rgba(120, 190, 150, 0.22) 0%,
            rgba(120, 190, 150, 0.1) 100%
          );
          box-shadow: 0 10px 24px rgba(120, 190, 150, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .pack-chip-state {
          border-color: rgba(194, 122, 92, 0.14);
          background: rgba(194, 122, 92, 0.06);
          color: rgba(244, 244, 245, 0.84);
        }

        .pack-chip-state-light {
          border-color: rgba(120, 190, 150, 0.16);
          background: rgba(120, 190, 150, 0.07);
          color: rgba(200, 235, 215, 0.84);
        }

        .btn-primary,
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 52px;
          padding: 14px 16px;
          border-radius: 16px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
        }

        .btn-primary {
          color: #fff;
          background: linear-gradient(
            180deg,
            rgba(194, 122, 92, 0.96) 0%,
            rgba(173, 103, 77, 0.96) 100%
          );
          border: 1px solid rgba(194, 122, 92, 0.28);
          box-shadow: 0 18px 42px rgba(194, 122, 92, 0.18);
        }

        .btn-primary-light {
          background: linear-gradient(
            180deg,
            rgba(100, 170, 120, 0.92) 0%,
            rgba(80, 148, 100, 0.92) 100%
          );
          border-color: rgba(100, 170, 120, 0.28);
          box-shadow: 0 18px 42px rgba(100, 170, 120, 0.16);
        }

        .btn-secondary {
          color: var(--text);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-ghost {
          min-height: 52px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          color: rgba(161, 161, 170, 0.9);
          font-size: 13px;
          font-weight: 800;
          padding: 0 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .px-wrap {
            width: min(560px, calc(100vw - 32px));
          }

          .card-actions {
            grid-template-columns: 1fr !important;
          }

          .btn-ghost {
            width: 100%;
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

const heroGlowStyle: CSSProperties = {
  position: "absolute",
  top: -40,
  right: "8%",
  width: 280,
  height: 280,
  borderRadius: 999,
  background:
    "radial-gradient(circle, rgba(194,122,92,0.22) 0%, rgba(194,122,92,0.08) 48%, rgba(24,24,27,0) 78%)",
  filter: "blur(46px)",
  pointerEvents: "none",
};

const dividerStyle: CSSProperties = {
  width: "100%",
  height: 1,
  transformOrigin: "left",
  background:
    "linear-gradient(90deg, rgba(194,122,92,0.55), rgba(194,122,92,0.08), transparent)",
};