"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { buildWhyThisNowCopy } from "@/lib/personalizedCopy";
import { loadSavedToolIds, saveTool, unsaveTool } from "@/lib/store";
import { selectTool } from "@/lib/selectTool";
import { getSupabase } from "@/lib/supabase";
import { getPackName } from "@/lib/toolLibrary";
import type { AttachmentStyle, DriftNeed, DriftSituation, DriftState, Tool } from "@/lib/toolLibrary";

type HelpfulScore = 1 | 2 | 3;
type ShiftValue = "no_change" | "bit_lighter" | "lighter";

type LocalFeedbackEntry = {
  tool_id: string;
  helpful_score: HelpfulScore;
  shift: ShiftValue;
  created_at: string;
};

type CheckinId = string;
type CheckinMode = "quick" | "standard";
type CheckinContext = {
  state: DriftState;
  need: DriftNeed;
  situation: DriftSituation;
  timeMinutes: 1 | 3 | 5 | 10;
  mode: CheckinMode;
  attachmentStyle: AttachmentStyle;
  preferredPackIds: string[];
};
type ExcludedToolsMap = Record<string, string[]>;

const MotionLink = motion(Link);
const FEEDBACK_KEY = "driftlatch_tool_feedback";
const RECENT_TOOLS_KEY = "driftlatch_recent_tools";
const CHECKIN_EXCLUDE_KEY = "driftlatch_checkin_excluded_tools";
const STATE_ATMOSPHERE: Record<DriftState, string> = {
  clear_light: "rgba(120,190,150,0.15)",
  steady: "rgba(120,150,200,0.14)",
  carrying_work: "rgba(194,122,92,0.16)",
  wired: "rgba(220,170,90,0.18)",
  drained: "rgba(90,140,120,0.14)",
  overloaded: "rgba(180,80,80,0.16)",
};
const NEUTRAL_ATMOSPHERE = "rgba(145,145,160,0.12)";
const STATE_DONE_BUTTON: Record<
  DriftState,
  { border: string; background: string; shadow: string }
> = {
  clear_light: {
    border: "rgba(120,190,150,0.3)",
    background: "linear-gradient(180deg, rgba(108,165,135,0.94) 0%, rgba(90,143,116,0.94) 100%)",
    shadow: "0 10px 30px rgba(108,165,135,0.18)",
  },
  wired: {
    border: "rgba(220,170,90,0.3)",
    background: "linear-gradient(180deg, rgba(201,156,82,0.95) 0%, rgba(177,134,64,0.95) 100%)",
    shadow: "0 10px 30px rgba(201,156,82,0.18)",
  },
  overloaded: {
    border: "rgba(180,96,88,0.3)",
    background: "linear-gradient(180deg, rgba(170,92,84,0.95) 0%, rgba(146,74,68,0.95) 100%)",
    shadow: "0 10px 30px rgba(170,92,84,0.18)",
  },
  drained: {
    border: "rgba(96,146,130,0.28)",
    background: "linear-gradient(180deg, rgba(92,136,122,0.95) 0%, rgba(78,116,105,0.95) 100%)",
    shadow: "0 10px 30px rgba(92,136,122,0.16)",
  },
  carrying_work: {
    border: "rgba(194,122,92,0.28)",
    background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
    shadow: "0 10px 30px rgba(194,122,92,0.18)",
  },
  steady: {
    border: "rgba(116,142,182,0.28)",
    background: "linear-gradient(180deg, rgba(108,132,169,0.94) 0%, rgba(89,110,144,0.94) 100%)",
    shadow: "0 10px 30px rgba(108,132,169,0.16)",
  },
};

function formatTimeRange(tool: Tool) {
  if (tool.time_min_minutes === tool.time_max_minutes) return `${tool.time_min_minutes} min`;
  return `${tool.time_min_minutes}-${tool.time_max_minutes} min`;
}

function isDriftState(value: string | null): value is DriftState {
  return (
    value === "carrying_work" ||
    value === "wired" ||
    value === "drained" ||
    value === "overloaded" ||
    value === "steady" ||
    value === "clear_light"
  );
}

function isDriftNeed(value: string | null): value is DriftNeed {
  return value === "regain_clarity" || value === "wind_down" || value === "be_here" || value === "come_back";
}

function isDriftSituation(value: string | null): value is DriftSituation {
  return value === "partner_nearby" || value === "kids_around" || value === "alone" || value === "long_distance";
}

function toValidTime(value: string | null): 1 | 3 | 5 | 10 | null {
  if (value === "1") return 1;
  if (value === "3") return 3;
  if (value === "5") return 5;
  if (value === "10") return 10;
  return null;
}

function isAttachmentStyle(value: string | null): value is AttachmentStyle {
  return value === "Anxious" || value === "Avoidant" || value === "Mixed" || value === "Unknown";
}

function isCheckinMode(value: string | null): value is CheckinMode {
  return value === "quick" || value === "standard";
}

function readPreferredPackIds(value: string | null) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function readAttachmentStyle(): AttachmentStyle {
  if (typeof window === "undefined") return "Unknown";
  const value = window.localStorage.getItem("driftlatch_attachment_style");
  return isAttachmentStyle(value) ? value : "Unknown";
}

function readStoredPreferredPackIds() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const raw = window.localStorage.getItem("driftlatch_preferred_pack_ids");
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readLocalFeedback() {
  if (typeof window === "undefined") return [] as LocalFeedbackEntry[];

  try {
    const raw = window.localStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalFeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFeedback(entry: LocalFeedbackEntry) {
  if (typeof window === "undefined") return;
  const next = [entry, ...readLocalFeedback()].slice(0, 50);
  window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
}

function writeRecentTool(toolId: string) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(RECENT_TOOLS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const recent = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    const next = [toolId, ...recent.filter((id) => id !== toolId)].slice(0, 20);
    window.localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
  } catch {
    window.localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify([toolId]));
  }
}

function buildCheckinBucketKey(ctx: CheckinContext) {
  const preferred = ctx.preferredPackIds.join(",");
  return `${ctx.state}|${ctx.need}|${ctx.situation}|${ctx.timeMinutes}|${ctx.mode}|${ctx.attachmentStyle}|${preferred}`;
}

function readExcludedToolsMap(): ExcludedToolsMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(CHECKIN_EXCLUDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [],
      ])
    );
  } catch {
    return {};
  }
}

function writeExcludedToolsMap(value: ExcludedToolsMap) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHECKIN_EXCLUDE_KEY, JSON.stringify(value));
  } catch {}
}

function getAtmosphereColor(state: DriftState | null) {
  return state ? STATE_ATMOSPHERE[state] : NEUTRAL_ATMOSPHERE;
}

function getDoneButtonStyle(state: DriftState | null): CSSProperties {
  if (!state) return primaryButtonStyle;

  const accent = STATE_DONE_BUTTON[state];
  return {
    ...primaryButtonStyle,
    border: `1px solid ${accent.border}`,
    background: accent.background,
    boxShadow: accent.shadow,
  };
}

function InnerHighlight() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: 16,
        right: 16,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        pointerEvents: "none",
      }}
    />
  );
}

export default function ToolClient({ tool }: { tool: Tool }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const fromCheckin = from === "checkin";
  const feedbackRequested = searchParams.get("feedback") === "1";
  const stateParam = searchParams.get("state");
  const needParam = searchParams.get("need");
  const situationParam = searchParams.get("situation");
  const timeParam = searchParams.get("time");
  const modeParam = searchParams.get("mode");
  const attachmentStyleParam = searchParams.get("attachmentStyle");
  const preferredPackIdsParam = searchParams.get("preferredPackIds");
  const activeState = isDriftState(stateParam) ? stateParam : null;
  const activeNeed = isDriftNeed(needParam) ? needParam : null;
  const activeSituation = isDriftSituation(situationParam) ? situationParam : null;
  const activeTime = toValidTime(timeParam);
  const activeAttachmentStyle = isAttachmentStyle(attachmentStyleParam) ? attachmentStyleParam : readAttachmentStyle();
  const atmosphereColor = getAtmosphereColor(activeState);
  const doneButtonStyle = getDoneButtonStyle(activeState);
  const checkinContext = useMemo<CheckinContext | null>(() => {
    const parsedTime = toValidTime(timeParam);
    const mode = isCheckinMode(modeParam) ? modeParam : "quick";
    const attachmentStyle = isAttachmentStyle(attachmentStyleParam) ? attachmentStyleParam : readAttachmentStyle();
    const preferredPackIds = readPreferredPackIds(preferredPackIdsParam);
    return fromCheckin && isDriftState(stateParam) && isDriftNeed(needParam) && isDriftSituation(situationParam) && parsedTime
      ? {
          state: stateParam,
          need: needParam,
          situation: situationParam,
          timeMinutes: parsedTime,
          mode,
          attachmentStyle,
          preferredPackIds: preferredPackIds.length > 0 ? preferredPackIds : readStoredPreferredPackIds(),
        }
      : null;
  }, [attachmentStyleParam, fromCheckin, modeParam, needParam, preferredPackIdsParam, situationParam, stateParam, timeParam]);
  const whyThisNow = useMemo(
    () =>
      buildWhyThisNowCopy({
        attachmentStyle: activeAttachmentStyle,
        need: activeNeed,
        situation: activeSituation,
        state: activeState,
        timeMinutes: activeTime,
        tool,
      }),
    [activeAttachmentStyle, activeNeed, activeSituation, activeState, activeTime, tool],
  );
  const [showFeedback, setShowFeedback] = useState(feedbackRequested);
  const [helpfulScore, setHelpfulScore] = useState<HelpfulScore | null>(null);
  const [shift, setShift] = useState<ShiftValue | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasSavedCurrent, setHasSavedCurrent] = useState(false);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [checkinId, setCheckinId] = useState<CheckinId | null>(null);
  const [didMarkDone, setDidMarkDone] = useState(false);
  const [toolSaved, setToolSaved] = useState(false);
  const [toolSavePending, setToolSavePending] = useState(false);
  const [alternateStatus, setAlternateStatus] = useState<string | null>(null);
  const draftPromiseRef = useRef<Promise<CheckinId | null> | null>(null);
  const checkinExcludeBucketKey = useMemo(
    () => (checkinContext ? buildCheckinBucketKey(checkinContext) : null),
    [checkinContext]
  );

  useEffect(() => {
    if (!feedbackRequested) return;
    setShowFeedback(true);
  }, [feedbackRequested]);

  useEffect(() => {
    setShowFeedback(feedbackRequested);
    setHelpfulScore(null);
    setShift(null);
    setSaved(false);
    setHasSavedCurrent(false);
    setCheckinId(null);
    setDidMarkDone(false);
    setToolSaved(false);
    setToolSavePending(false);
    setAlternateStatus(null);
    draftPromiseRef.current = null;
  }, [feedbackRequested, tool.id]);

  useEffect(() => {
    if (!checkinExcludeBucketKey) {
      setExcludeIds([]);
      return;
    }

    setExcludeIds(readExcludedToolsMap()[checkinExcludeBucketKey] ?? []);
  }, [checkinExcludeBucketKey]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedState = async () => {
      try {
        const savedToolIds = await loadSavedToolIds();
        if (!cancelled) setToolSaved(savedToolIds.includes(tool.id));
      } catch {
        if (!cancelled) setToolSaved(false);
      }
    };

    void loadSavedState();

    return () => {
      cancelled = true;
    };
  }, [tool.id]);

  async function ensureCheckinDraft(userId: string) {
    if (!checkinContext) return null;
    if (checkinId) return checkinId;
    if (draftPromiseRef.current) return draftPromiseRef.current;

    const supabase = getSupabase();
    const promise = (async () => {
      const { data, error } = await supabase
        .from("user_checkins")
        .insert({
          user_id: userId,
          state: checkinContext.state,
          need: checkinContext.need,
          situation: checkinContext.situation,
          time_minutes: checkinContext.timeMinutes,
          tool_id: tool.id,
          did_complete: false,
        })
        .select("id")
        .single();

      if (error) return null;
      const nextId = data?.id != null ? String(data.id) : null;
      if (nextId !== null) setCheckinId(nextId);
      return nextId;
    })().finally(() => {
      draftPromiseRef.current = null;
    });

    draftPromiseRef.current = promise;
    return promise;
  }

  useEffect(() => {
    if (!checkinContext) return;
    let cancelled = false;

    const createDraft = async () => {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled || !authData.user) return;
      if (checkinId) return;

      const nextId = await (async () => {
        if (draftPromiseRef.current) return draftPromiseRef.current;

        const promise = (async () => {
          const { data, error } = await supabase
            .from("user_checkins")
            .insert({
              user_id: authData.user.id,
              state: checkinContext.state,
              need: checkinContext.need,
              situation: checkinContext.situation,
              time_minutes: checkinContext.timeMinutes,
              tool_id: tool.id,
              did_complete: false,
            })
            .select("id")
            .single();

          if (error) return null;
          const draftId = data?.id != null ? String(data.id) : null;
          if (draftId !== null) setCheckinId(draftId);
          return draftId;
        })().finally(() => {
          draftPromiseRef.current = null;
        });

        draftPromiseRef.current = promise;
        return promise;
      })();

      if (cancelled || nextId === null) return;
    };

    void createDraft();

    return () => {
      cancelled = true;
    };
  }, [checkinContext, checkinId, tool.id]);

  async function syncCheckinFeedback(userId: string, nextHelpfulScore: HelpfulScore, nextShift: ShiftValue) {
    const nextCheckinId = await ensureCheckinDraft(userId);
    if (!nextCheckinId) return;

    const supabase = getSupabase();
    const feedbackUpdate = await supabase
      .from("user_checkins")
      .update({
        did_complete: true,
        helpful_score: nextHelpfulScore,
        shift: nextShift,
      })
      .eq("id", nextCheckinId)
      .eq("user_id", userId);

    if (!feedbackUpdate.error) return;

    await supabase
      .from("user_checkins")
      .update({
        did_complete: true,
        metadata: {
          helpful_score: nextHelpfulScore,
          shift: nextShift,
        },
      })
      .eq("id", nextCheckinId)
      .eq("user_id", userId);
  }

  async function saveFeedback(nextHelpfulScore: HelpfulScore, nextShift: ShiftValue) {
    if (isSaving) return;

    const entry: LocalFeedbackEntry = {
      tool_id: tool.id,
      helpful_score: nextHelpfulScore,
      shift: nextShift,
      created_at: new Date().toISOString(),
    };

    setIsSaving(true);

    try {
      const supabase = getSupabase();
      const { data: authData } = await supabase.auth.getUser();

      if (authData.user) {
        const { error } = await supabase.from("user_tool_feedback").insert({
          user_id: authData.user.id,
          tool_id: tool.id,
          helpful_score: nextHelpfulScore,
          shift: nextShift,
          notes: null,
        });

        if (error) {
          writeLocalFeedback(entry);
        }

        if (checkinContext) {
          await syncCheckinFeedback(authData.user.id, nextHelpfulScore, nextShift);
        }
      } else {
        writeLocalFeedback(entry);
      }

      writeRecentTool(tool.id);
    } catch {
      writeLocalFeedback(entry);
      writeRecentTool(tool.id);
    } finally {
      setIsSaving(false);
      setSaved(true);
      setHasSavedCurrent(true);
      window.setTimeout(() => {
        setSaved(false);
        setShowFeedback(false);
        setHelpfulScore(null);
        setShift(null);
      }, 1200);
    }
  }

  function handleHelpfulScore(nextScore: HelpfulScore) {
    setHelpfulScore(nextScore);
    if (shift && !hasSavedCurrent) void saveFeedback(nextScore, shift);
  }

  function handleShift(nextShift: ShiftValue) {
    setShift(nextShift);
    if (helpfulScore && !hasSavedCurrent) void saveFeedback(helpfulScore, nextShift);
  }

  async function handleMarkDone() {
    setShowFeedback(true);
    setSaved(false);
    setHasSavedCurrent(false);
    setHelpfulScore(null);
    setShift(null);
    if (didMarkDone) return;

    if (checkinContext) {
      try {
        const supabase = getSupabase();
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const nextCheckinId = await ensureCheckinDraft(authData.user.id);
          if (nextCheckinId) {
            await supabase
              .from("user_checkins")
              .update({ did_complete: true })
              .eq("id", nextCheckinId)
              .eq("user_id", authData.user.id);
          }
        }
      } catch {}
    }

    setDidMarkDone(true);
  }

  function handleAnotherOption() {
    if (!checkinContext || !checkinExcludeBucketKey) return;

    const nextExcludeIds = excludeIds.includes(tool.id) ? excludeIds : [...excludeIds, tool.id];
    const nextExcludeMap = readExcludedToolsMap();
    nextExcludeMap[checkinExcludeBucketKey] = nextExcludeIds;
    writeExcludedToolsMap(nextExcludeMap);
    const nextSelection = selectTool({
      need: checkinContext.need,
      state: checkinContext.state,
      timeMinutes: checkinContext.timeMinutes,
      situation: checkinContext.situation,
      mode: checkinContext.mode,
      attachmentStyle: checkinContext.attachmentStyle,
      preferredPackIds: checkinContext.preferredPackIds,
      excludeToolIds: nextExcludeIds,
    });

    setExcludeIds(nextExcludeIds);
    if (!nextSelection.primary || nextSelection.primary.id === tool.id) {
      setAlternateStatus("No other tool fits this check-in right now.");
      return;
    }
    setAlternateStatus(null);

    const params = new URLSearchParams({
      from: "checkin",
      state: checkinContext.state,
      need: checkinContext.need,
      situation: checkinContext.situation,
      time: `${checkinContext.timeMinutes}`,
      mode: checkinContext.mode,
      attachmentStyle: checkinContext.attachmentStyle,
    });
    if (checkinContext.preferredPackIds.length > 0) {
      params.set("preferredPackIds", checkinContext.preferredPackIds.join(","));
    }

    router.push(`/app/tool/${nextSelection.primary.id}?${params.toString()}`);
  }

  async function handleToggleSavedTool() {
    if (toolSavePending) return;

    const nextSaved = !toolSaved;
    setToolSavePending(true);
    setToolSaved(nextSaved);

    try {
      if (nextSaved) await saveTool(tool.id);
      else await unsaveTool(tool.id);
    } catch {
      setToolSaved(!nextSaved);
    } finally {
      setToolSavePending(false);
    }
  }

  return (
    <main style={mainStyle}>
      <div aria-hidden style={ambientGlowStyle(atmosphereColor)} />

      <div style={pageWrapStyle}>
        <MotionLink whileTap={{ scale: 0.97 }} href={fromCheckin ? "/app/checkin" : "/app/checkin"} style={backLinkStyle}>
          Back to check-in
        </MotionLink>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}>
          <div style={toolCardStyle}>
            <InnerHighlight />
            <div aria-hidden style={cardGlowStyle(atmosphereColor)} />

            <div style={{ display: "grid", gap: 12 }}>
              <span style={eyebrowStyle(atmosphereColor)}>TOOL</span>
              <h1 style={titleStyle}>{tool.title}</h1>
              <div style={chipRowStyle}>
                <span style={chipStyle}>{formatTimeRange(tool)}</span>
                <span style={chipStyle}>{getPackName(tool.pack_id)}</span>
              </div>
            </div>

            <div style={sectionStyle}>
              <span style={sectionLabelStyle}>Do this</span>
              <p style={bodyCopyStyle}>{tool.do}</p>
            </div>

            <div style={sectionStyle}>
              <span style={sectionLabelStyle}>Why it helps</span>
              <p style={bodyCopyStyle}>{tool.why}</p>
            </div>

            <div style={whyNowStyle}>
              <span style={sectionLabelStyle}>Why this now</span>
              <p style={whyNowCopyStyle}>{whyThisNow}</p>
            </div>

            <div style={actionRowStyle}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleMarkDone}
                disabled={didMarkDone}
                style={didMarkDone ? disabledPrimaryButtonStyle : doneButtonStyle}
              >
                Done
              </motion.button>
              <div className="tool-secondary-actions" style={secondaryActionRowStyle}>
                {checkinContext ? (
                  <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleAnotherOption} style={subtleActionButtonStyle}>
                    Another option
                  </motion.button>
                ) : null}
                <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleToggleSavedTool} style={subtleActionButtonStyle}>
                  {toolSaved ? "Unsave" : "Save"}
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => router.push("/app")} style={tertiaryActionButtonStyle}>
                  Home
                </motion.button>
              </div>
            </div>
            {fromCheckin && !checkinContext ? (
              <div style={statusTextStyle}>Check-in context unavailable for another option.</div>
            ) : null}
            {alternateStatus ? <div style={statusTextStyle}>{alternateStatus}</div> : null}
          </div>
        </motion.section>

        <AnimatePresence initial={false}>
          {showFeedback ? (
            <motion.section
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 12, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div style={feedbackCardStyle}>
                <InnerHighlight />

                <div style={{ display: "grid", gap: 10 }}>
                  <span style={sectionLabelStyle}>Was this helpful?</span>
                  <div className="feedback-grid" style={feedbackGridStyle}>
                    {([
                      { label: "Not really", score: 1 as HelpfulScore },
                      { label: "Somewhat", score: 2 as HelpfulScore },
                      { label: "Yes", score: 3 as HelpfulScore },
                    ]).map((option) => (
                      <motion.button
                        key={option.label}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => handleHelpfulScore(option.score)}
                        style={{
                          ...optionButtonStyle,
                          ...(helpfulScore === option.score ? selectedOptionStyle : null),
                        }}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <span style={sectionLabelStyle}>Did it shift your state?</span>
                  <div className="feedback-grid" style={feedbackGridStyle}>
                    {([
                      { label: "No change", value: "no_change" as ShiftValue },
                      { label: "A bit lighter", value: "bit_lighter" as ShiftValue },
                      { label: "Noticeably lighter", value: "lighter" as ShiftValue },
                    ]).map((option) => (
                      <motion.button
                        key={option.label}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => handleShift(option.value)}
                        style={{
                          ...optionButtonStyle,
                          ...(shift === option.value ? selectedOptionStyle : null),
                        }}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {saved ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      style={savedStateStyle}
                    >
                      Saved
                    </motion.div>
                  ) : isSaving ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      style={statusTextStyle}
                    >
                      Saving...
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .feedback-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 640px) {
          .feedback-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

const mainStyle: CSSProperties = {
  minHeight: "100dvh",
  background: "var(--bg)",
  padding: "32px 20px 96px",
  WebkitTapHighlightColor: "transparent",
};

const pageWrapStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 680,
  margin: "0 auto",
  display: "grid",
  gap: 14,
};

function ambientGlowStyle(color: string): CSSProperties {
  return {
    position: "fixed",
    top: -60,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 999,
    pointerEvents: "none",
    background: `radial-gradient(circle, ${color} 0%, rgba(24,24,27,0) 76%)`,
    filter: "blur(56px)",
    opacity: 0.9,
  };
}

const glassStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: "rgba(39,39,42,0.62)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)",
};

const toolCardStyle: CSSProperties = {
  ...glassStyle,
  padding: 22,
  display: "grid",
  gap: 18,
};

const feedbackCardStyle: CSSProperties = {
  ...glassStyle,
  padding: 18,
  display: "grid",
  gap: 18,
};

function cardGlowStyle(color: string): CSSProperties {
  return {
    position: "absolute",
    top: -72,
    right: -36,
    width: 210,
    height: 210,
    borderRadius: 999,
    background: `radial-gradient(circle, ${color} 0%, rgba(24,24,27,0) 74%)`,
    pointerEvents: "none",
  };
}

const backLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 52,
  width: "fit-content",
  color: "var(--muted)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 800,
};

function eyebrowStyle(color: string): CSSProperties {
  return {
    color,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
  };
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: "clamp(2rem, 5vw, 3rem)",
  lineHeight: 1,
  letterSpacing: "-0.04em",
  fontWeight: 700,
  fontFamily: "Zodiak, Georgia, serif",
};

const chipRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 30,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 700,
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const whyNowStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
};

const sectionLabelStyle: CSSProperties = {
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const bodyCopyStyle: CSSProperties = {
  margin: 0,
  color: "var(--text)",
  fontSize: 16,
  lineHeight: 1.8,
};

const whyNowCopyStyle: CSSProperties = {
  margin: 0,
  color: "rgba(244,244,245,0.86)",
  fontSize: 15,
  lineHeight: 1.7,
};

const actionRowStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const buttonBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 16,
  fontSize: 14,
  fontWeight: 800,
};

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: "1px solid rgba(194,122,92,0.28)",
  background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)",
  color: "var(--text)",
  boxShadow: "0 10px 30px rgba(194,122,92,0.18)",
  cursor: "pointer",
};

const disabledPrimaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "var(--muted)",
  boxShadow: "none",
  cursor: "default",
  opacity: 0.8,
};

const secondaryActionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  alignItems: "center",
};

const subtleActionButtonStyle: CSSProperties = {
  minHeight: 36,
  padding: "0 2px",
  border: "none",
  background: "transparent",
  color: "rgba(244,244,245,0.82)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "left",
};

const tertiaryActionButtonStyle: CSSProperties = {
  ...subtleActionButtonStyle,
  color: "var(--muted)",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--text)",
  cursor: "pointer",
};

const feedbackGridStyle: CSSProperties = {};

const optionButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  minHeight: 48,
  fontWeight: 700,
};

const selectedOptionStyle: CSSProperties = {
  border: "1px solid rgba(194,122,92,0.28)",
  background: "rgba(194,122,92,0.12)",
  color: "var(--text)",
};

const savedStateStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "10px 14px",
  borderRadius: 999,
  background: "rgba(194,122,92,0.12)",
  border: "1px solid rgba(194,122,92,0.18)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 800,
};

const statusTextStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 700,
};
