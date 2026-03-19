"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  buildQuickRecommendation,
  formatQuickDefaultsSummary,
  parseStoredProfileDefaults,
  resolveQuickDefaults,
  toValidToolTime,
  type StoredProfileDefaults,
  type ToolContext,
  type ValidToolTime,
} from "@/lib/quickFlow";
import { getSupabase } from "@/lib/supabase";
import type { AttachmentStyle, DriftNeed, DriftSituation, DriftState } from "@/lib/toolLibrary";

type CheckinMode = "quick" | "standard";
type LastCtx = ToolContext;

type CheckinPreferences = Pick<LastCtx, "need" | "time" | "situation">;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const CHECKIN_MODE_KEY = "driftlatch_checkin_mode";
const CHECKIN_PREFERENCES_KEY = "driftlatch_checkin_preferences";

const STATES: { id: DriftState; label: string; hint: string }[] = [
  { id: "clear_light", label: "Clear & light", hint: "Sharp, warm, rare window" },
  { id: "carrying_work", label: "Carrying work", hint: "Open loops, mental residue" },
  { id: "wired", label: "Wired", hint: "Alert body, restless mind" },
  { id: "drained", label: "Drained", hint: "Low battery, low words" },
  { id: "overloaded", label: "Overloaded", hint: "Everything feels urgent" },
  { id: "steady", label: "Steady", hint: "Baseline is okay" },
];

const TIMES: { minutes: ValidToolTime; label: string; sub: string }[] = [
  { minutes: 1, label: "1 min", sub: "Quick reset" },
  { minutes: 3, label: "3 min", sub: "Short tool" },
  { minutes: 5, label: "5 min", sub: "Full tool" },
  { minutes: 10, label: "10 min", sub: "Deeper reset" },
];

const SITUATIONS: { id: DriftSituation; label: string }[] = [
  { id: "partner_nearby", label: "Partner nearby" },
  { id: "kids_around", label: "Kids around" },
  { id: "alone", label: "Alone" },
  { id: "long_distance", label: "Long distance" },
];

const NEEDS: { id: DriftNeed; label: string; sub: string }[] = [
  { id: "regain_clarity", label: "Regain clarity", sub: "Work focus + cognitive load" },
  { id: "wind_down", label: "Wind down", sub: "Nervous system reset" },
  { id: "be_here", label: "Be here", sub: "Presence at home" },
  { id: "come_back", label: "Come back", sub: "Repair after tension" },
];

const STATE_ATMOSPHERE: Record<DriftState, string> = {
  clear_light: "rgba(120,190,150,0.15)",
  steady: "rgba(120,150,200,0.14)",
  carrying_work: "rgba(194,122,92,0.16)",
  wired: "rgba(220,170,90,0.18)",
  drained: "rgba(90,140,120,0.14)",
  overloaded: "rgba(180,80,80,0.16)",
};

const STATE_ACTION_STYLE: Record<
  DriftState,
  { border: string; background: string; shadow: string; dot: string; dotShadow: string }
> = {
  clear_light: {
    border: "rgba(120,190,150,0.3)",
    background: "linear-gradient(180deg, rgba(108,165,135,0.94) 0%, rgba(90,143,116,0.94) 100%)",
    shadow: "0 14px 36px rgba(108,165,135,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
    dot: "rgba(120,190,150,0.9)",
    dotShadow: "0 0 14px rgba(120,190,150,0.38)",
  },
  wired: {
    border: "rgba(220,170,90,0.3)",
    background: "linear-gradient(180deg, rgba(201,156,82,0.95) 0%, rgba(177,134,64,0.95) 100%)",
    shadow: "0 14px 36px rgba(201,156,82,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
    dot: "rgba(220,170,90,0.88)",
    dotShadow: "0 0 14px rgba(220,170,90,0.36)",
  },
  overloaded: {
    border: "rgba(180,96,88,0.3)",
    background: "linear-gradient(180deg, rgba(170,92,84,0.95) 0%, rgba(146,74,68,0.95) 100%)",
    shadow: "0 14px 36px rgba(170,92,84,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
    dot: "rgba(186,102,96,0.88)",
    dotShadow: "0 0 14px rgba(186,102,96,0.34)",
  },
  drained: {
    border: "rgba(96,146,130,0.28)",
    background: "linear-gradient(180deg, rgba(92,136,122,0.95) 0%, rgba(78,116,105,0.95) 100%)",
    shadow: "0 14px 36px rgba(92,136,122,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
    dot: "rgba(110,162,144,0.84)",
    dotShadow: "0 0 14px rgba(110,162,144,0.3)",
  },
  carrying_work: {
    border: "rgba(194,122,92,0.28)",
    background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
    shadow: "0 14px 36px rgba(194,122,92,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
    dot: "rgba(194,122,92,0.9)",
    dotShadow: "0 0 14px rgba(194,122,92,0.38)",
  },
  steady: {
    border: "rgba(116,142,182,0.28)",
    background: "linear-gradient(180deg, rgba(108,132,169,0.94) 0%, rgba(89,110,144,0.94) 100%)",
    shadow: "0 14px 36px rgba(108,132,169,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
    dot: "rgba(126,154,198,0.84)",
    dotShadow: "0 0 14px rgba(126,154,198,0.3)",
  },
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

function safeWriteJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function isAttachmentStyle(value: unknown): value is AttachmentStyle {
  return value === "Anxious" || value === "Avoidant" || value === "Mixed" || value === "Unknown";
}

function isDriftNeed(value: unknown): value is DriftNeed {
  return value === "regain_clarity" || value === "wind_down" || value === "be_here" || value === "come_back";
}

function isDriftSituation(value: unknown): value is DriftSituation {
  return value === "partner_nearby" || value === "kids_around" || value === "alone" || value === "long_distance";
}

function isDriftState(value: unknown): value is DriftState {
  return (
    value === "carrying_work" ||
    value === "wired" ||
    value === "drained" ||
    value === "overloaded" ||
    value === "steady" ||
    value === "clear_light"
  );
}

function readAttachmentStyle(): AttachmentStyle {
  if (typeof window === "undefined") return "Unknown";
  const value = window.localStorage.getItem("driftlatch_attachment_style");
  if (value === "Anxious" || value === "Avoidant" || value === "Mixed") return value;
  return "Unknown";
}

function readPreferredPackIds() {
  return safeReadJSON<string[]>("driftlatch_preferred_pack_ids", []).filter((value) => typeof value === "string");
}

function readLastState(): DriftState | null {
  const raw = safeReadJSON<unknown>("driftlatch_last_state", null);
  return isDriftState(raw) ? raw : null;
}

function readLastCtx(): LastCtx | null {
  const raw = safeReadJSON<unknown>("driftlatch_last_ctx", null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const time = toValidToolTime(obj.time);
  if (!isDriftState(obj.state) || !isDriftNeed(obj.need) || !isDriftSituation(obj.situation) || !time) return null;
  return { state: obj.state, need: obj.need, time, situation: obj.situation };
}

function readCheckinMode() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CHECKIN_MODE_KEY) !== "adjust";
}

function readCheckinPreferences(): CheckinPreferences | null {
  const raw = safeReadJSON<unknown>(CHECKIN_PREFERENCES_KEY, null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const time = toValidToolTime(obj.time);
  if (!time || !isDriftSituation(obj.situation) || !isDriftNeed(obj.need)) return null;
  return { time, situation: obj.situation, need: obj.need };
}

function writeCheckinPreferences(value: CheckinPreferences) {
  safeWriteJSON(CHECKIN_PREFERENCES_KEY, value);
}

function labelForState(state: DriftState): string {
  return STATES.find((item) => item.id === state)?.label ?? "Unknown";
}

function getStateActionStyle(state: DriftState) {
  return STATE_ACTION_STYLE[state];
}

function atmosphereBlob(color: string, style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    position: "absolute",
    borderRadius: 999,
    background: `radial-gradient(circle, ${color} 0%, rgba(24,24,27,0) 74%)`,
    filter: "blur(72px)",
  };
}

function optionButtonStyle(active: boolean, isClearLight?: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 72,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "center",
    padding: "18px 18px",
    borderRadius: 18,
    border: active
      ? isClearLight
        ? "1px solid rgba(120,190,150,0.38)"
        : "1px solid rgba(194,122,92,0.28)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? isClearLight
        ? "rgba(120,190,150,0.10)"
        : "rgba(194,122,92,0.12)"
      : "rgba(255,255,255,0.04)",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
  };
}

function compactButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "14px 14px",
    borderRadius: 16,
    border: `1px solid ${active ? "rgba(194,122,92,0.28)" : "rgba(255,255,255,0.08)"}`,
    background: active ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.03)",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
  };
}

function gridChoiceStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: 64,
    padding: "14px 14px",
    borderRadius: 16,
    border: `1px solid ${active ? "rgba(194,122,92,0.28)" : "rgba(255,255,255,0.08)"}`,
    background: active ? "rgba(194,122,92,0.12)" : "rgba(255,255,255,0.03)",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
  };
}

export default function CheckinPage() {
  const router = useRouter();
  const initialPreferences = readCheckinPreferences();
  const hasLocalPreferencesRef = useRef(initialPreferences !== null);
  const [quickMode, setQuickMode] = useState(readCheckinMode);
  const [selectedState, setSelectedState] = useState<DriftState>(readLastState() ?? "carrying_work");
  const [profileDefaults, setProfileDefaults] = useState<StoredProfileDefaults>({});
  const [timeVal, setTimeVal] = useState<ValidToolTime>(initialPreferences?.time ?? 3);
  const [situationVal, setSituationVal] = useState<DriftSituation>(initialPreferences?.situation ?? "alone");
  const [needVal, setNeedVal] = useState<DriftNeed>(initialPreferences?.need ?? "wind_down");
  const [attachmentStyle, setAttachmentStyle] = useState<AttachmentStyle>(readAttachmentStyle());
  const [preferredPackIds, setPreferredPackIds] = useState<string[]>(readPreferredPackIds);
  const [lastState, setLastState] = useState<DriftState | null>(readLastState());
  const [lastCtx, setLastCtx] = useState<LastCtx | null>(readLastCtx());
  const activeActionStyle = getStateActionStyle(selectedState);
  const quickDefaults = resolveQuickDefaults(profileDefaults, attachmentStyle);
  const quickDefaultsSummary = formatQuickDefaultsSummary(quickDefaults);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHECKIN_MODE_KEY, quickMode ? "quick" : "adjust");
  }, [quickMode]);

  useEffect(() => {
    if (quickMode) return;
    writeCheckinPreferences({ time: timeVal, situation: situationVal, need: needVal });
  }, [quickMode, needVal, situationVal, timeVal]);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    const loadProfileDefaults = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled || !authData.user) return;

      const { data } = await supabase
        .from("user_profile")
        .select("attachment_style, defaults, primary_pack_ids")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (cancelled || !data) return;

      const profile = data as {
        attachment_style?: unknown;
        defaults?: unknown;
        primary_pack_ids?: unknown;
      };

      if (isAttachmentStyle(profile.attachment_style)) {
        setAttachmentStyle(profile.attachment_style);
        window.localStorage.setItem("driftlatch_attachment_style", profile.attachment_style);
      }

      const defaults = parseStoredProfileDefaults(profile.defaults);
      setProfileDefaults(defaults);

      if (!hasLocalPreferencesRef.current) {
        setNeedVal(defaults.default_need ?? "wind_down");
        setTimeVal(defaults.default_time ?? 3);
        setSituationVal(defaults.default_situation ?? "alone");
      }

      const rawPackIds: unknown[] = Array.isArray(profile.primary_pack_ids)
        ? profile.primary_pack_ids
        : profile.defaults && typeof profile.defaults === "object" && !Array.isArray(profile.defaults) && Array.isArray((profile.defaults as Record<string, unknown>).primary_pack_ids)
          ? ((profile.defaults as Record<string, unknown>).primary_pack_ids as unknown[])
          : [];

      const nextPreferredPackIds = rawPackIds.filter((item: unknown): item is string => typeof item === "string");
      setPreferredPackIds(nextPreferredPackIds);
      safeWriteJSON("driftlatch_preferred_pack_ids", nextPreferredPackIds);
    };

    void loadProfileDefaults();
    return () => { cancelled = true; };
  }, []);

  function persistLastStateAndCtx(payload: LastCtx) {
    setLastState(payload.state);
    setLastCtx(payload);
    safeWriteJSON("driftlatch_last_state", payload.state);
    safeWriteJSON("driftlatch_last_ctx", payload);
  }

  function routeToTool(nextCtx: LastCtx, mode: CheckinMode, nextExcludeToolIds: string[]) {
    const recommendation = buildQuickRecommendation({
      attachmentStyle,
      defaults: {
        need: nextCtx.need,
        time: nextCtx.time,
        situation: nextCtx.situation,
      },
      excludeToolIds: nextExcludeToolIds,
      from: "checkin",
      mode,
      preferredPackIds,
      state: nextCtx.state,
    });
    persistLastStateAndCtx(nextCtx);
    router.push(recommendation.href);
  }

  function handleQuickStateSelect(state: DriftState) {
    const nextCtx: LastCtx = { state, need: quickDefaults.need, time: quickDefaults.time, situation: quickDefaults.situation };
    setSelectedState(state);
    setNeedVal(nextCtx.need);
    setTimeVal(nextCtx.time);
    setSituationVal(nextCtx.situation);
    routeToTool(nextCtx, "quick", []);
  }

  function handleUseLatestCheckin() {
    const ctx = readLastCtx();
    if (ctx) {
      const nextCtx: LastCtx = { state: ctx.state, need: ctx.need, time: ctx.time, situation: ctx.situation };
      setSelectedState(nextCtx.state);
      setNeedVal(nextCtx.need);
      setTimeVal(nextCtx.time);
      setSituationVal(nextCtx.situation);
      routeToTool(nextCtx, quickMode ? "quick" : "standard", []);
      return;
    }
    if (!lastState) return;
    handleQuickStateSelect(lastState);
  }

  function handleAdjustDetails() {
    setNeedVal(quickDefaults.need);
    setTimeVal(quickDefaults.time);
    setSituationVal(quickDefaults.situation);
    setQuickMode(false);
  }

  function handleAdjustSubmit() {
    const nextCtx: LastCtx = { state: selectedState, need: needVal, time: timeVal, situation: situationVal };
    writeCheckinPreferences({ time: timeVal, situation: situationVal, need: needVal });
    routeToTool(nextCtx, "standard", []);
  }

  return (
    <main style={mainStyle}>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.3, ease: "easeInOut" }}
          style={atmosphereWrapStyle}
        >
          <div style={atmosphereBlob(STATE_ATMOSPHERE[selectedState], { width: 680, height: 420, top: -120, left: "50%", transform: "translateX(-50%)" })} />
          <div style={atmosphereBlob(STATE_ATMOSPHERE[selectedState], { width: 420, height: 420, top: 120, right: -120, opacity: 0.8 })} />
          <div style={atmosphereBlob(STATE_ATMOSPHERE[selectedState], { width: 360, height: 360, bottom: 40, left: -100, opacity: 0.55 })} />
        </motion.div>
      </AnimatePresence>

      <div className="grain" />

      <div style={pageWrapStyle}>
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.05, ease: EASE }}
          style={{ display: "grid", gap: 10 }}
        >
          <span style={kickerStyle}>CHECK-IN</span>
          <h1 style={titleStyle}>What&apos;s your state right now?</h1>
          <p style={subtextStyle}>
            {quickMode ? "Choose one. We&apos;ll open the right tool." : "Override your defaults for this check-in."}
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.12, ease: EASE }}
        >
          <AnimatePresence mode="wait">
            {quickMode ? (
              <motion.div
                key="quick"
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={quickPanelStyle}
              >
                <div className="checkin-glass" style={{ position: "relative", padding: 18 }}>
                  <div className="top-highlight" />
                  <div style={{ display: "grid", gap: 10 }}>
                    <p style={{ ...subtextStyle, margin: 0, maxWidth: "none" }}>
                      We&apos;ll use your defaults: {quickDefaultsSummary}
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleAdjustDetails}
                        style={toggleButtonStyle}
                      >
                        Adjust details
                      </motion.button>
                    </div>
                  </div>
                </div>

                {STATES.map((state, index) => {
                  const isClearLight = state.id === "clear_light";
                  const isActive = selectedState === state.id;
                  return (
                    <motion.div
                      key={state.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.14 + index * 0.04, ease: EASE }}
                    >
                      <motion.button
                        whileTap={{ scale: 0.99, backgroundColor: "rgba(255,255,255,0.08)" }}
                        type="button"
                        onClick={() => handleQuickStateSelect(state.id)}
                        style={optionButtonStyle(isActive, isClearLight)}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isClearLight && (
                            <span style={{
                              width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                              background: "rgba(120,190,150,0.88)",
                              boxShadow: "0 0 8px rgba(120,190,150,0.55)",
                            }} />
                          )}
                          <span style={{ color: "var(--text)", fontSize: 17, lineHeight: 1.1, fontWeight: 700 }}>
                            {state.label}
                          </span>
                        </span>
                        <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, textAlign: "right" }}>
                          {state.hint}
                        </span>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="adjust"
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ display: "grid", gap: 14 }}
              >
                <div className="checkin-glass" style={{ position: "relative", padding: 18 }}>
                  <div className="top-highlight" />
                  <p style={{ ...subtextStyle, margin: 0, maxWidth: "none" }}>
                    Override your defaults for this check-in. Right now your defaults are {quickDefaultsSummary}.
                  </p>
                </div>

                <div className="checkin-glass" style={{ position: "relative", padding: 18 }}>
                  <div className="top-highlight" />
                  <div style={{ display: "grid", gap: 12 }}>
                    <span style={panelLabelStyle}>State</span>
                    <div style={{ display: "grid", gap: 8 }}>
                      {STATES.map((state) => (
                        <motion.button
                          key={state.id}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => setSelectedState(state.id)}
                          style={compactButtonStyle(selectedState === state.id)}
                        >
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{state.label}</span>
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>{state.hint}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="checkin-glass" style={{ position: "relative", padding: 18 }}>
                  <div className="top-highlight" />
                  <div style={{ display: "grid", gap: 12 }}>
                    <span style={panelLabelStyle}>Time</span>
                    <div className="time-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                      {TIMES.map((time) => (
                        <motion.button
                          key={time.minutes}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => setTimeVal(time.minutes)}
                          style={gridChoiceStyle(time.minutes === timeVal)}
                        >
                          <div style={{ color: time.minutes === timeVal ? "var(--accent)" : "var(--text)", fontSize: 14, fontWeight: 800 }}>
                            {time.label}
                          </div>
                          <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 4 }}>{time.sub}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="checkin-glass" style={{ position: "relative", padding: 18 }}>
                  <div className="top-highlight" />
                  <div style={{ display: "grid", gap: 12 }}>
                    <span style={panelLabelStyle}>Situation</span>
                    <div style={{ display: "grid", gap: 8 }}>
                      {SITUATIONS.map((situation) => (
                        <motion.button
                          key={situation.id}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => setSituationVal(situation.id)}
                          style={compactButtonStyle(situation.id === situationVal)}
                        >
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{situation.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="checkin-glass" style={{ position: "relative", padding: 18 }}>
                  <div className="top-highlight" />
                  <div style={{ display: "grid", gap: 12 }}>
                    <span style={panelLabelStyle}>Need</span>
                    <div className="need-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                      {NEEDS.map((need) => (
                        <motion.button
                          key={need.id}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => setNeedVal(need.id)}
                          style={gridChoiceStyle(need.id === needVal)}
                        >
                          <div style={{ color: need.id === needVal ? "var(--accent)" : "var(--text)", fontSize: 14, fontWeight: 800 }}>
                            {need.label}
                          </div>
                          <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>{need.sub}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.18, ease: EASE }}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleUseLatestCheckin}
            disabled={!lastCtx && !lastState}
            style={sameAsYesterdayStyle(Boolean(lastCtx || lastState))}
          >
            <span style={shortcutContentStyle}>
              <span style={shortcutIconStyle}>
                <span style={shortcutIconDotStyle} />
              </span>
              <span style={{ display: "grid", gap: 4, textAlign: "left" }}>
                <span style={{ color: "var(--text)", fontSize: 15, fontWeight: 800 }}>Use latest check-in</span>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {lastCtx
                    ? `Latest saved context: ${labelForState(lastCtx.state).toLowerCase()} | ${lastCtx.time} min | ${SITUATIONS.find((item) => item.id === lastCtx.situation)?.label.toLowerCase() ?? "alone"}`
                    : lastState
                      ? `Latest state: ${labelForState(lastState).toLowerCase()}`
                      : "No saved check-in yet"}
                </span>
              </span>
            </span>
            <span style={shortcutChevronStyle}>Open -&gt;</span>
          </motion.button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.22, ease: EASE }}
        >
          {quickMode ? null : (
            <div className="hero-actions" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {/* Primary CTA — clay gradient, full weight */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleAdjustSubmit}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "100%", minHeight: 56, padding: "14px 18px", borderRadius: 18,
                  border: `1px solid ${activeActionStyle.border}`,
                  background: activeActionStyle.background,
                  boxShadow: activeActionStyle.shadow,
                  color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", letterSpacing: "-0.01em",
                }}
              >
                Get one tool -&gt;
              </motion.button>
              {/* Secondary — glass, recedes behind primary */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setQuickMode(true)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "100%", minHeight: 56, padding: "14px 18px", borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.09)",
                  background: "rgba(39,39,42,0.62)",
                  backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  color: "rgba(161,161,170,0.85)", fontSize: 14, fontWeight: 800, cursor: "pointer",
                }}
              >
                &lt;- Back to quick
              </motion.button>
            </div>
          )}
        </motion.section>
      </div>

      <style jsx>{`
        * { -webkit-tap-highlight-color: transparent; }
        .grain {
          position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.08;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 3px 3px, 4px 4px; mix-blend-mode: soft-light;
        }
        .checkin-glass {
          background: rgba(39,39,42,0.62); border: 1px solid rgba(255,255,255,0.08); border-radius: 22px;
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .top-highlight {
          position: absolute; top: 0; left: 16px; right: 16px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); pointer-events: none;
        }
        @media (max-width: 640px) {
          .time-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .need-grid, .hero-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

const mainStyle: CSSProperties = { minHeight: "100dvh", background: "var(--bg)", padding: "56px 0 104px", position: "relative", overflowX: "hidden" };
const atmosphereWrapStyle: CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const pageWrapStyle: CSSProperties = { position: "relative", zIndex: 2, width: "min(680px, calc(100vw - 36px))", margin: "0 auto", display: "grid", gap: 16 };
const kickerStyle: CSSProperties = { color: "var(--muted)", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: 0, color: "rgba(244,244,245,0.88)", fontSize: "clamp(2.2rem, 7vw, 44px)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 650 };
const subtextStyle: CSSProperties = { margin: 0, color: "rgba(161,161,170,0.85)", fontSize: 15, lineHeight: 1.72, maxWidth: 460 };
const quickPanelStyle: CSSProperties = { display: "grid", gap: 10 };
const panelLabelStyle: CSSProperties = { color: "var(--muted)", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };

function sameAsYesterdayStyle(enabled: boolean): CSSProperties {
  return {
    width: "100%", minHeight: 76, display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 14, padding: "16px 18px", borderRadius: 22, border: "1px solid rgba(255,255,255,0.12)",
    background: enabled ? "rgba(52,52,56,0.72)" : "rgba(39,39,42,0.5)",
    backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    boxShadow: enabled ? "0 24px 70px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)" : "inset 0 1px 0 rgba(255,255,255,0.04)",
    color: "rgba(244,244,245,0.88)", opacity: enabled ? 1 : 0.62, cursor: enabled ? "pointer" : "not-allowed", textAlign: "left",
  };
}

const shortcutContentStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 12 };
const shortcutIconStyle: CSSProperties = { width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const shortcutIconDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: STATE_ACTION_STYLE.carrying_work.dot,
  boxShadow: STATE_ACTION_STYLE.carrying_work.dotShadow,
};
const shortcutChevronStyle: CSSProperties = { color: "rgba(161,161,170,0.9)", fontSize: 14, fontWeight: 800, letterSpacing: "0.04em", whiteSpace: "nowrap" };
const toggleButtonStyle: CSSProperties = { width: "auto", minHeight: 52, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(161,161,170,0.85)", fontSize: 13, fontWeight: 800, cursor: "pointer" };
