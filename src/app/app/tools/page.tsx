"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { loadSavedToolIds, unsaveTool } from "@/lib/store";
import { LIBRARY, getPackName, type Tool } from "@/lib/toolLibrary";

const MotionLink = motion(Link);
type PinsMap = Record<string, string>;
type PinnedItem = { contextKey: string; tool: Tool };
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function safeReadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function safeWriteJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function getToolById(id: string): Tool | null {
  return LIBRARY.tools.find((t) => t.id === id) ?? null;
}
function titleCase(value: string) {
  return value.replaceAll("_", " ").split(" ").filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
function formatCtx(contextKey: string) {
  const parts: Record<string, string> = {};
  for (const chunk of contextKey.split("|")) {
    const [k, v] = chunk.split("=");
    if (k && v) parts[k] = v;
  }
  const state = parts.state ? titleCase(parts.state) : "";
  const need = parts.need ? titleCase(parts.need) : "";
  const time = parts.time ? `${parts.time} min` : "";
  const left = [state, need].filter(Boolean).join(" · ");
  if (!left && !time) return "Pinned context";
  if (!left) return time;
  if (!time) return left;
  return `${left} · ${time}`;
}

// ── Tool row ──────────────────────────────────────────────────────────────────
function ToolRow({
  tool, index, contextLine, secondaryLabel, accent,
  onOpen, onSecondary,
}: {
  tool: Tool;
  index: number;
  contextLine?: string;
  secondaryLabel: string;
  accent?: boolean;
  onOpen: (id: string) => void;
  onSecondary: (id: string) => void;
}) {
  const [removing, setRemoving] = useState(false);

  const handleSecondary = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => onSecondary(tool.id), 220);
  };

  return (
    <AnimatePresence>
      {!removing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0, paddingBottom: 0 }}
          transition={{ duration: 0.28, delay: index * 0.04, ease: EASE }}
          style={{ overflow: "hidden" }}
        >
          <motion.div
            whileHover={{ backgroundColor: "rgba(255,255,255,0.022)" }}
            whileTap={{ scale: 0.994 }}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(tool.id)}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(tool.id); }
            }}
            style={rowStyle}
          >
            {/* Left */}
            <div style={{ minWidth: 0, display: "grid", gap: 3 }}>
              {contextLine && (
                <div style={{ color: "rgba(161,161,170,0.65)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.4 }}>
                  {contextLine}
                </div>
              )}
              <div style={{ color: "rgba(244,244,245,0.90)", fontSize: 16, lineHeight: 1.18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {tool.title}
              </div>
              <div style={{ color: "rgba(161,161,170,0.68)", fontSize: 13, lineHeight: 1.45 }}>
                {getPackName(tool.pack_id)}
              </div>
            </div>

            {/* Right */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{
                color: accent ? "rgba(120,200,150,0.88)" : "rgba(194,122,92,0.88)",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.01em",
              }}>
                Open →
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleSecondary}
                style={secondaryBtnStyle}
              >
                {secondaryLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({
  label, count, tone, delay, right, accent, children,
}: {
  label: string;
  count: number;
  tone: "pinned" | "saved" | "recent";
  delay: number;
  right?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const accentLine =
    tone === "pinned"
      ? accent
        ? "linear-gradient(90deg, transparent, rgba(120,200,150,0.7), transparent)"
        : "linear-gradient(90deg, transparent, rgba(194,122,92,0.7), transparent)"
      : tone === "saved"
        ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)"
        : "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.44, delay, ease: EASE }}
      style={{ position: "relative", background: "rgba(39,39,42,0.62)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 24px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)", overflow: "hidden" }}
    >
      {/* Top accent line */}
      <div aria-hidden style={{ position: "absolute", top: 0, left: 16, right: 16, height: 1, background: accentLine, pointerEvents: "none" }} />

      {/* Section header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "20px 20px 16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "rgba(244,244,245,0.88)", fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {label}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 26, height: 26, padding: "0 7px", borderRadius: 999,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(161,161,170,0.72)", fontSize: 12, fontWeight: 800,
          }}>
            {count}
          </span>
        </div>
        {right}
      </div>

      {children}
    </motion.section>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyBlock({ message }: { message: string }) {
  return (
    <div style={{
      margin: "0 16px 16px",
      padding: "14px 16px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(255,255,255,0.02)",
    }}>
      <p style={{ margin: 0, color: "rgba(161,161,170,0.60)", fontSize: 14, lineHeight: 1.65 }}>{message}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ToolsPage() {
  const router = useRouter();
  const [savedIds, setSavedIds] = useState<string[]>(() => safeReadJSON<string[]>("driftlatch_saved_tools", []));
  const [recentIds, setRecentIds] = useState<string[]>(() => safeReadJSON<string[]>("driftlatch_recent_tools", []));
  const [pins, setPins] = useState<PinsMap>(() => safeReadJSON<PinsMap>("driftlatch_pins", {}));

  const savedTools = useMemo(() => savedIds.map(getToolById).filter((t): t is Tool => Boolean(t)), [savedIds]);
  const recentTools = useMemo(() => recentIds.map(getToolById).filter((t): t is Tool => Boolean(t)), [recentIds]);
  const pinnedItems = useMemo(() =>
    Object.entries(pins).map(([contextKey, toolId]) => {
      const tool = getToolById(toolId);
      return tool ? { contextKey, tool } : null;
    }).filter((item): item is PinnedItem => Boolean(item)),
    [pins]
  );

  const allEmpty = pinnedItems.length === 0 && savedTools.length === 0 && recentTools.length === 0;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await loadSavedToolIds();
        if (!cancelled) setSavedIds(next);
      } catch {}
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  function openTool(id: string) { router.push(`/app/tool/${id}`); }

  async function removeSaved(id: string) {
    const prev = savedIds;
    setSavedIds(savedIds.filter((s) => s !== id));
    try { await unsaveTool(id); } catch { setSavedIds(prev); }
  }

  function removeRecent(id: string) {
    const next = recentIds.filter((r) => r !== id);
    setRecentIds(next);
    safeWriteJSON("driftlatch_recent_tools", next);
  }

  function removePin(contextKey: string) {
    const next = { ...pins };
    delete next[contextKey];
    setPins(next);
    safeWriteJSON("driftlatch_pins", next);
  }

  function clearRecent() {
    setRecentIds([]);
    safeWriteJSON("driftlatch_recent_tools", []);
  }

  return (
    <main style={mainStyle}>
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        style={ambientGlowStyle}
        animate={{ opacity: [0.10, 0.22, 0.10], scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div style={shellStyle}>
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: EASE }}
          style={{ display: "grid", gap: 10 }}
        >
          <span style={eyebrowStyle}>TOOL LIBRARY</span>
          <h1 style={titleStyle}>Your tools</h1>
          <p style={subtextStyle}>Pinned first. Saved next. Recent last.</p>
        </motion.header>

        {/* ── All empty ── */}
        {allEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.06, ease: EASE }}
            style={{ position: "relative", background: "rgba(39,39,42,0.62)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 24px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)", overflow: "hidden", padding: 24 }}
          >
            <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 82% 18%, rgba(194,122,92,0.16) 0%, rgba(194,122,92,0.04) 54%, transparent 76%)" }} />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
              <h2 style={heroTitleStyle}>Nothing saved yet.</h2>
              <p style={heroCopyStyle}>Run a check-in to build your library.</p>
              <MotionLink
                whileTap={{ scale: 0.97 }}
                href="/app/checkin"
                style={primaryBtnStyle}
              >
                Start a check-in →
              </MotionLink>
            </div>
          </motion.div>
        )}

        {/* ── Pinned ── */}
        {!allEmpty && (
          <Section label="Pinned" count={pinnedItems.length} tone="pinned" delay={0.10}>
            {pinnedItems.length ? (
              <div style={{ paddingBottom: 8 }}>
                {pinnedItems.map((item, i) => (
                  <ToolRow
                    key={`${item.contextKey}:${item.tool.id}`}
                    tool={item.tool}
                    index={i}
                    contextLine={formatCtx(item.contextKey)}
                    secondaryLabel="Unpin"
                    onOpen={openTool}
                    onSecondary={() => removePin(item.contextKey)}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock message="Pin a tool when a specific moment needs the same move again." />
            )}
          </Section>
        )}

        {/* ── Saved ── */}
        {!allEmpty && (
          <Section label="Saved" count={savedTools.length} tone="saved" delay={0.16}>
            {savedTools.length ? (
              <div style={{ paddingBottom: 8 }}>
                {savedTools.map((tool, i) => (
                  <ToolRow
                    key={tool.id}
                    tool={tool}
                    index={i}
                    secondaryLabel="Remove"
                    onOpen={openTool}
                    onSecondary={removeSaved}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock message="Save the tools you want available without searching again." />
            )}
          </Section>
        )}

        {/* ── Recent ── */}
        {!allEmpty && (
          <Section
            label="Recent"
            count={recentTools.length}
            tone="recent"
            delay={0.22}
            right={
              recentTools.length > 0 ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={clearRecent}
                  style={clearBtnStyle}
                >
                  Clear all
                </motion.button>
              ) : undefined
            }
          >
            {recentTools.length ? (
              <div style={{ paddingBottom: 8 }}>
                {recentTools.map((tool, i) => (
                  <ToolRow
                    key={`${tool.id}:${i}`}
                    tool={tool}
                    index={i}
                    secondaryLabel="Remove"
                    onOpen={openTool}
                    onSecondary={removeRecent}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock message="Recent tools show up here after you complete them once." />
            )}
          </Section>
        )}

        {/* ── Quick nav ── */}
        {!allEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.3, ease: EASE }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {([
              { href: "/app/checkin", label: "Check in", sub: "Get a new tool" },
              { href: "/app/packs", label: "Packs", sub: "Browse the library" },
            ] as const).map(({ href, label, sub }) => (
              <MotionLink
                key={href}
                href={href}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "grid", gap: 3, padding: "16px 18px",
                  background: "rgba(39,39,42,0.50)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18,
                  backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
                  textDecoration: "none",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <span style={{ color: "rgba(244,244,245,0.86)", fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{label}</span>
                <span style={{ color: "rgba(161,161,170,0.60)", fontSize: 12, lineHeight: 1.4 }}>{sub}</span>
              </MotionLink>
            ))}
          </motion.div>
        )}
      </div>

      <style jsx>{`
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const mainStyle: CSSProperties = {
  minHeight: "100dvh",
  background: "var(--bg)",
  padding: "56px 20px 120px",
  position: "relative",
  overflowX: "hidden",
};

const shellStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: 680,
  margin: "0 auto",
  display: "grid",
  gap: 14,
};

const ambientGlowStyle: CSSProperties = {
  position: "fixed", top: -72, right: -48, width: 260, height: 260,
  borderRadius: 999,
  background: "radial-gradient(circle, rgba(194,122,92,0.22) 0%, rgba(194,122,92,0.06) 48%, rgba(24,24,27,0) 78%)",
  filter: "blur(50px)", pointerEvents: "none", zIndex: 0,
};

const eyebrowStyle: CSSProperties = {
  color: "rgba(161,161,170,0.85)", fontSize: 11, fontWeight: 800,
  letterSpacing: "0.16em", textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "rgba(244,244,245,0.88)",
  fontSize: "clamp(2rem, 5vw, 2.4rem)",
  lineHeight: 1.02,
  letterSpacing: "-0.04em",
  fontWeight: 650,
  fontFamily: "Zodiak, Georgia, serif",
};

const subtextStyle: CSSProperties = {
  margin: 0, color: "rgba(161,161,170,0.72)", fontSize: 14, lineHeight: 1.65,
};

const heroTitleStyle: CSSProperties = {
  margin: 0, color: "rgba(244,244,245,0.88)",
  fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
  lineHeight: 1.02, letterSpacing: "-0.04em", fontWeight: 650,
  fontFamily: "Zodiak, Georgia, serif",
};

const heroCopyStyle: CSSProperties = {
  margin: 0, color: "rgba(161,161,170,0.80)", fontSize: 15, lineHeight: 1.7,
};

const primaryBtnStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  minHeight: 52, padding: "14px 20px", borderRadius: 16, textDecoration: "none",
  fontSize: 14, fontWeight: 900, color: "#fff",
  background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
  border: "1px solid rgba(194,122,92,0.28)",
  boxShadow: "0 14px 36px rgba(194,122,92,0.20)",
};

const rowStyle: CSSProperties = {
  minHeight: 68,
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) auto",
  alignItems: "center",
  gap: 14,
  padding: "14px 20px",
  cursor: "pointer",
  borderBottom: "1px solid rgba(255,255,255,0.045)",
  transition: "background 0.15s ease",
};

const secondaryBtnStyle: CSSProperties = {
  minHeight: 36, padding: "0 12px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.03)",
  color: "rgba(161,161,170,0.72)", fontSize: 12, fontWeight: 800, cursor: "pointer",
};

const clearBtnStyle: CSSProperties = {
  minHeight: 36, padding: "0 12px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "transparent",
  color: "rgba(161,161,170,0.72)", fontSize: 12, fontWeight: 800, cursor: "pointer",
};