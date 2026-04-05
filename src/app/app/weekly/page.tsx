"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { loadCurrentUserAppState } from "@/lib/auth";
import { getRoomToneLabel } from "@/lib/roomTone";
import { getNeedLabel } from "@/lib/supportLabels";
import { getSupabase } from "@/lib/supabase";
import {
  EMPTY_WEEKLY_CHECKINS_FETCH_META,
  RANGE_DAYS,
  STATE_LABEL,
  STATE_LADDER,
  accentForState,
  buildDayNote,
  buildWeeklyReflection,
  fetchWeeklyCheckins,
  getWeeklyRangeBounds,
  getStateRank,
  normalizeCheckinRows,
  normalizeRecentRows,
  roomToneAccent,
  toolTitle,
  type WeeklyCheckinRow as CheckinRow,
  type WeeklyCheckinsFetchMeta,
  type WeeklyFeedbackRow as FeedbackRow,
  type WeeklyRecentRow as RecentRow,
} from "@/lib/weeklyReflection";

const MotionLink = motion(Link);
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const LADDER_TOP = 18;
const LADDER_ROW_GAP = 36;
const CHART_HEIGHT = LADDER_TOP * 2 + LADDER_ROW_GAP * (STATE_LADDER.length - 1);

function getLadderTop(rank: number) {
  return LADDER_TOP + rank * LADDER_ROW_GAP;
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
  const [currentCheckins, setCurrentCheckins] = useState<CheckinRow[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackRow[]>([]);
  const [currentRecentTools, setCurrentRecentTools] = useState<RecentRow[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyFetchError, setWeeklyFetchError] = useState<string | null>(null);
  const [weeklyFetchMeta, setWeeklyFetchMeta] = useState<WeeklyCheckinsFetchMeta>(EMPTY_WEEKLY_CHECKINS_FETCH_META);
  const [weeklyFetchWindow, setWeeklyFetchWindow] = useState<{ endIso: string | null; startIso: string | null }>({ endIso: null, startIso: null });
  const [selectedDayIdx, setSelectedDayIdx] = useState(RANGE_DAYS - 1);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const currentUser = await loadCurrentUserAppState();
        if (cancelled) return;

        if (!currentUser.session || !currentUser.userId) {
          setCurrentCheckins([]);
          setCurrentFeedback([]);
          setCurrentRecentTools([]);
          setIsLoggedIn(false);
          setWeeklyFetchError(null);
          setWeeklyFetchMeta(EMPTY_WEEKLY_CHECKINS_FETCH_META);
          setWeeklyFetchWindow({ endIso: null, startIso: null });
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);

        const userId = currentUser.userId;
        const { endIso: nowIso, startIso: currentStartIso } = getWeeklyRangeBounds(RANGE_DAYS);
        setWeeklyFetchWindow({ endIso: nowIso, startIso: currentStartIso });

        const [currentCheckinsRes, currentFeedbackRes, currentRecentRes] = await Promise.all([
          fetchWeeklyCheckins(supabase, userId, currentStartIso, nowIso),
          supabase.from("user_tool_feedback").select("created_at,helpful_score,shift,tool_id").eq("user_id", userId).gte("created_at", currentStartIso).lt("created_at", nowIso).order("created_at", { ascending: false }),
          supabase.from("user_recent_tools").select("tool_id,used_at").eq("user_id", userId).gte("used_at", currentStartIso).lt("used_at", nowIso).order("used_at", { ascending: false }),
        ]);

        if (cancelled) return;

        setCurrentFeedback((currentFeedbackRes.data ?? []) as FeedbackRow[]);
        const nextRecent = normalizeRecentRows((currentRecentRes.data ?? []) as RecentRow[]);
        setCurrentRecentTools(nextRecent);
        setWeeklyFetchMeta(currentCheckinsRes.meta);

        if (currentCheckinsRes.error) {
          const errorMessage = currentCheckinsRes.error.message ?? "Weekly check-ins failed to load.";
          setWeeklyFetchError(errorMessage);
          if (process.env.NODE_ENV !== "production") {
            console.error("[weekly-fetch-error]", {
              endIso: nowIso,
              error: currentCheckinsRes.error,
              fullSelectFailed: currentCheckinsRes.meta.fullSelectFailed,
              safeSelectUsed: currentCheckinsRes.meta.safeSelectUsed,
              startIso: currentStartIso,
            });
          }
          setLoading(false);
          return;
        }

        const nextCheckins = normalizeCheckinRows((currentCheckinsRes.data ?? []) as CheckinRow[]);
        const nextReflection = buildWeeklyReflection({ checkins: nextCheckins, feedbackRows: (currentFeedbackRes.data ?? []) as FeedbackRow[], recentRows: nextRecent });
        setWeeklyFetchError(null);

        if (process.env.NODE_ENV !== "production") {
          const explicitCount = nextCheckins.filter((row) => row.source !== "implicit").length;
          const implicitCount = nextCheckins.filter((row) => row.source === "implicit").length;
          const roomToneCount = nextCheckins.filter((row) => typeof row.room_tone === "string" && row.room_tone.length > 0).length;
          const timestamps = nextCheckins.map((row) => row.created_at).filter((value): value is string => typeof value === "string").sort();
          console.info("[weekly-fetch-debug]", {
            explicitWeeklyCheckins: explicitCount,
            fetchedRowCount: nextCheckins.length,
            firstReturnedCreatedAt: timestamps[0] ?? null,
            fullSelectFailed: currentCheckinsRes.meta.fullSelectFailed,
            implicitWeeklyCheckins: implicitCount,
            lastReturnedCreatedAt: timestamps[timestamps.length - 1] ?? null,
            roomToneCheckins: roomToneCount,
            safeSelectUsed: currentCheckinsRes.meta.safeSelectUsed,
            startIso: currentStartIso,
            endIso: nowIso,
            finalSelectedRenderMode: nextReflection.mode,
          });
        }

        setCurrentCheckins(nextCheckins);
        setSelectedDayIdx(nextReflection.selectedDayIndex);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load weekly state:", error);
        setWeeklyFetchError(error instanceof Error ? error.message : String(error));
        setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const currentSummary = useMemo(
    () => buildWeeklyReflection({ checkins: currentCheckins, feedbackRows: currentFeedback, recentRows: currentRecentTools }),
    [currentCheckins, currentFeedback, currentRecentTools],
  );
  const daySummaries = currentSummary.days;
  const selectedDay = daySummaries[selectedDayIdx] ?? daySummaries[daySummaries.length - 1] ?? null;
  const accentColor = accentForState(currentSummary.accentState);
  const detailCountLabel = currentSummary.signalMode === "recent" ? "Sessions" : "Number of check-ins";
  const showFetchErrorState = Boolean(weeklyFetchError) && currentSummary.mode === "empty";

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const explicitCount = currentCheckins.filter((row) => row.source !== "implicit").length;
    const implicitCount = currentCheckins.filter((row) => row.source === "implicit").length;
    const roomToneCount = currentCheckins.filter((row) => typeof row.room_tone === "string" && row.room_tone.length > 0).length;
    const graphableDays = currentSummary.days.filter((day) => day.hasData).length;
    const timestamps = currentCheckins.map((row) => row.created_at).filter((value): value is string => typeof value === "string").sort();
    console.info("[weekly-debug]", {
      endIso: weeklyFetchWindow.endIso,
      explicitWeeklyCheckins: explicitCount,
      firstReturnedTimestamp: timestamps[0] ?? null,
      fullSelectFailed: weeklyFetchMeta.fullSelectFailed,
      graphableDays,
      implicitWeeklyCheckins: implicitCount,
      lastReturnedTimestamp: timestamps[timestamps.length - 1] ?? null,
      fetchedRowCount: currentCheckins.length,
      finalSelectedRenderMode: showFetchErrorState ? "error" : currentSummary.mode,
      roomToneCheckins: roomToneCount,
      safeSelectUsed: weeklyFetchMeta.safeSelectUsed,
      signalMode: currentSummary.signalMode,
      startIso: weeklyFetchWindow.startIso,
      summarySourceKey: currentSummary.summarySourceKey,
      usingSharedWeeklySource: true,
      visibleWeekEnd: currentSummary.visibleWeekEnd,
      visibleWeekStart: currentSummary.visibleWeekStart,
      weeklyFetchError,
    });
  }, [currentCheckins, currentSummary, showFetchErrorState, weeklyFetchError, weeklyFetchMeta, weeklyFetchWindow]);

  if (loading) {
    return (
      <main style={loadingMainStyle}>
        <motion.div animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} style={loadingTextStyle}>LOADING</motion.div>
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
            <MotionLink whileTap={{ scale: 0.97 }} href="/login" style={primaryButtonStyle}>Sign in -&gt;</MotionLink>
          </GlassCard>
        </motion.div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (showFetchErrorState) {
    return (
      <main className="wk-page" style={mainStyle}>
        <div style={atmosphereWrapStyle}>
          <motion.div aria-hidden style={{ ...blobStyle, width: 260, height: 260, top: -50, right: -40, background: `radial-gradient(circle, ${accentColor}22 0%, rgba(194,122,92,0.04) 54%, transparent 76%)` }} animate={{ opacity: [0.38, 0.68, 0.38], scale: [0.96, 1.04, 0.96] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden style={{ ...blobStyle, width: 220, height: 220, bottom: 90, left: -60, background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 52%, transparent 76%)" }} animate={{ opacity: [0.18, 0.3, 0.18], scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        <div className="film-grain" />
        <div style={pageWrapStyle}>
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }}>
            <div style={headerStyle}>
              <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={eyebrowStyle}>Weekly</span>
                <h1 style={serifTitleStyle}>This week</h1>
                <p style={subtitleStyle}>Weekly data could not load right now.</p>
              </div>
              <span style={quietMetaStyle}>{currentSummary.weekRangeTitle}</span>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>This is a fetch error, not an empty week.</div>
                  </div>
                </div>
                <div style={emptyStateBlockStyle}>
                  <p style={mutedCopyStyle}>{weeklyFetchError}</p>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => window.location.reload()} className="btn-primary">
                  Try again -&gt;
                </motion.button>
              </div>
            </GlassCard>
          </motion.section>
        </div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (currentSummary?.mode === "empty") {
    return (
      <main className="wk-page" style={mainStyle}>
        <div style={atmosphereWrapStyle}>
          <motion.div aria-hidden style={{ ...blobStyle, width: 260, height: 260, top: -50, right: -40, background: `radial-gradient(circle, ${accentColor}22 0%, rgba(194,122,92,0.04) 54%, transparent 76%)` }} animate={{ opacity: [0.38, 0.68, 0.38], scale: [0.96, 1.04, 0.96] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden style={{ ...blobStyle, width: 220, height: 220, bottom: 90, left: -60, background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 52%, transparent 76%)" }} animate={{ opacity: [0.18, 0.3, 0.18], scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        <div className="film-grain" />
        <div style={pageWrapStyle}>
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }}>
            <div style={headerStyle}>
              <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={eyebrowStyle}>Weekly</span>
                <h1 style={serifTitleStyle}>This week</h1>
                <p style={subtitleStyle}>Still getting a read on your week.</p>
              </div>
              <span style={quietMetaStyle}>{currentSummary.weekRangeTitle}</span>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>{currentSummary.title}</div>
                  </div>
                </div>
                <div style={emptyStateBlockStyle}>
                  <p style={mutedCopyStyle}>{currentSummary.body}</p>
                </div>
                <MotionLink whileTap={{ scale: 0.97 }} href="/app/checkin" className="btn-primary">
                  Start a check-in -&gt;
                </MotionLink>
              </div>
            </GlassCard>
          </motion.section>
        </div>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  return (
    <main className="wk-page" style={mainStyle}>
      <div style={atmosphereWrapStyle}>
        <motion.div aria-hidden style={{ ...blobStyle, width: 260, height: 260, top: -50, right: -40, background: `radial-gradient(circle, ${accentColor}22 0%, rgba(194,122,92,0.04) 54%, transparent 76%)` }} animate={{ opacity: [0.38, 0.68, 0.38], scale: [0.96, 1.04, 0.96] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden style={{ ...blobStyle, width: 220, height: 220, bottom: 90, left: -60, background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 52%, transparent 76%)" }} animate={{ opacity: [0.18, 0.3, 0.18], scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <div className="film-grain" />
      <div style={pageWrapStyle}>
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: EASE }}>
          <div style={headerStyle}>
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={eyebrowStyle}>Weekly</span>
              <h1 style={serifTitleStyle}>This week</h1>
              <p style={subtitleStyle}>{currentSummary.summaryLine}</p>
            </div>
            <span style={quietMetaStyle}>{currentSummary.weekRangeTitle}</span>
          </div>
        </motion.section>

        {currentSummary.mode === "full" ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>{currentSummary.summaryLine}</div>
                  </div>
                </div>

                <div style={movementWrapStyle}>
                  <div style={axisStyle}>
                    {STATE_LADDER.map((state) => (
                      <div key={state} style={{ ...axisLabelStyle, top: getLadderTop(getStateRank(state)) }}>{STATE_LABEL[state]}</div>
                    ))}
                  </div>

                  <div style={chartPanelStyle}>
                    {STATE_LADDER.map((state) => (
                      <div key={state} style={{ ...ladderRuleStyle, top: getLadderTop(getStateRank(state)) }} />
                    ))}

                    <div style={dayColumnsStyle}>
                      {daySummaries.map((day, index) => {
                        const isActive = index === selectedDayIdx;
                        const latestAccent = accentForState(day.latestState);
                        const firstTop = day.firstStateRank !== null ? getLadderTop(day.firstStateRank) : null;
                        const latestTop = day.latestStateRank !== null ? getLadderTop(day.latestStateRank) : null;
                        const lineTop = firstTop !== null && latestTop !== null ? Math.min(firstTop, latestTop) : null;
                        const lineHeight = firstTop !== null && latestTop !== null ? Math.max(Math.abs(latestTop - firstTop), 2) : 0;

                        return (
                          <motion.button
                            key={day.key}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setSelectedDayIdx(index)}
                            onFocus={() => setSelectedDayIdx(index)}
                            style={dayButtonStyle(day.hasData, isActive)}
                          >
                            <div style={dayCanvasStyle}>
                              {day.hasData ? (
                                <>
                                  {lineTop !== null && lineHeight > 2 ? <div style={{ ...movementLineStyle, background: latestAccent, height: lineHeight, opacity: 0.22, top: lineTop }} /> : null}
                                  {firstTop !== null ? <div style={{ ...firstMarkerStyle, borderColor: `${latestAccent}66`, top: firstTop }} /> : null}
                                  {latestTop !== null ? <div style={{ ...latestMarkerStyle, background: latestAccent, boxShadow: isActive ? `0 10px 26px ${latestAccent}36` : `0 6px 18px ${latestAccent}18`, opacity: isActive ? 0.98 : 0.88, top: latestTop }} /> : null}
                                </>
                              ) : (
                                <div style={emptyColumnDotStyle} />
                              )}
                            </div>

                            <div style={dayLabelWrapStyle}>
                              <span style={dayLabelStyle}>{day.label}</span>
                              <span style={{ ...roomIndicatorStyle, background: roomToneAccent(day.latestRoomTone), opacity: day.latestRoomTone ? 1 : 0.16 }} />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {currentSummary.microInsight ? <p style={microInsightStyle}>{currentSummary.microInsight}</p> : null}

                {selectedDay?.hasData ? (
                  <div style={selectedDayCardStyle}>
                    <div style={selectedDayTitleStyle}>{selectedDay.tooltipLabel}</div>
                    <div className="wk-detail-grid">
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Started state</span><span style={detailValueStyle}>{selectedDay.firstState ? STATE_LABEL[selectedDay.firstState] : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Ended state</span><span style={detailValueStyle}>{selectedDay.latestState ? STATE_LABEL[selectedDay.latestState] : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>{detailCountLabel}</span><span style={detailValueStyle}>{selectedDay.checkinCount}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Highest intensity reached</span><span style={detailValueStyle}>{selectedDay.highestState ? STATE_LABEL[selectedDay.highestState] : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Main support used</span><span style={detailValueStyle}>{selectedDay.mainSupport ? getNeedLabel(selectedDay.mainSupport) : "Not tracked"}</span></div>
                      <div style={detailStatStyle}><span style={detailLabelStyle}>Completion %</span><span style={detailValueStyle}>{selectedDay.completionRate !== null ? `${selectedDay.completionRate}%` : "Not tracked"}</span></div>
                      {selectedDay.firstRoomTone || selectedDay.latestRoomTone ? (
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Room tone change</span><span style={detailValueStyle}>{(getRoomToneLabel(selectedDay.firstRoomTone) ?? "Not tracked")} -&gt; {(getRoomToneLabel(selectedDay.latestRoomTone) ?? "Not tracked")}</span></div>
                      ) : null}
                    </div>
                    {buildDayNote(selectedDay) ? <p style={dayNoteStyle}>{buildDayNote(selectedDay)}</p> : null}
                  </div>
                ) : null}
              </div>
            </GlassCard>
          </motion.section>
        ) : (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.08, ease: EASE }}>
            <GlassCard style={primaryCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                <div style={weeklyHeadStyle}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={eyebrowStyle}>This week</span>
                    <div style={bodyStyle}>{currentSummary.summaryLine}</div>
                  </div>
                </div>

                <div style={fallbackContentStyle}>
                  <p style={mutedCopyStyle}>{currentSummary.body}</p>
                  <div style={movementWrapStyle}>
                    <div style={axisStyle}>
                      {STATE_LADDER.map((state) => (
                        <div key={state} style={{ ...axisLabelStyle, top: getLadderTop(getStateRank(state)) }}>{STATE_LABEL[state]}</div>
                      ))}
                    </div>

                    <div style={chartPanelStyle}>
                      {STATE_LADDER.map((state) => (
                        <div key={state} style={{ ...ladderRuleStyle, top: getLadderTop(getStateRank(state)) }} />
                      ))}

                      <div style={dayColumnsStyle}>
                        {daySummaries.map((day, index) => {
                          const isActive = index === selectedDayIdx;
                          const latestAccent = accentForState(day.latestState);
                          const firstTop = day.firstStateRank !== null ? getLadderTop(day.firstStateRank) : null;
                          const latestTop = day.latestStateRank !== null ? getLadderTop(day.latestStateRank) : null;
                          const lineTop = firstTop !== null && latestTop !== null ? Math.min(firstTop, latestTop) : null;
                          const lineHeight = firstTop !== null && latestTop !== null ? Math.max(Math.abs(latestTop - firstTop), 2) : 0;

                          return (
                            <motion.button
                              key={day.key}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => setSelectedDayIdx(index)}
                              onFocus={() => setSelectedDayIdx(index)}
                              style={dayButtonStyle(day.hasData, isActive)}
                            >
                              <div style={dayCanvasStyle}>
                                {day.hasData ? (
                                  <>
                                    {lineTop !== null && lineHeight > 2 ? <div style={{ ...movementLineStyle, background: latestAccent, height: lineHeight, opacity: 0.22, top: lineTop }} /> : null}
                                    {firstTop !== null ? <div style={{ ...firstMarkerStyle, borderColor: `${latestAccent}66`, top: firstTop }} /> : null}
                                    {latestTop !== null ? <div style={{ ...latestMarkerStyle, background: latestAccent, boxShadow: isActive ? `0 10px 26px ${latestAccent}36` : `0 6px 18px ${latestAccent}18`, opacity: isActive ? 0.98 : 0.88, top: latestTop }} /> : null}
                                  </>
                                ) : (
                                  <div style={emptyColumnDotStyle} />
                                )}
                              </div>

                              <div style={dayLabelWrapStyle}>
                                <span style={dayLabelStyle}>{day.label}</span>
                                <span style={{ ...roomIndicatorStyle, background: roomToneAccent(day.latestRoomTone), opacity: day.latestRoomTone ? 1 : 0.16 }} />
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {currentSummary.microInsight ? <p style={microInsightStyle}>{currentSummary.microInsight}</p> : null}
                  {selectedDay?.hasData ? (
                    <div style={selectedDayCardStyle}>
                      <div style={selectedDayTitleStyle}>{selectedDay.tooltipLabel}</div>
                      <div className="wk-detail-grid">
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Started state</span><span style={detailValueStyle}>{selectedDay.firstState ? STATE_LABEL[selectedDay.firstState] : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Ended state</span><span style={detailValueStyle}>{selectedDay.latestState ? STATE_LABEL[selectedDay.latestState] : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>{detailCountLabel}</span><span style={detailValueStyle}>{selectedDay.checkinCount}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Highest intensity reached</span><span style={detailValueStyle}>{selectedDay.highestState ? STATE_LABEL[selectedDay.highestState] : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Main support used</span><span style={detailValueStyle}>{selectedDay.mainSupport ? getNeedLabel(selectedDay.mainSupport) : "Not tracked"}</span></div>
                        <div style={detailStatStyle}><span style={detailLabelStyle}>Completion %</span><span style={detailValueStyle}>{selectedDay.completionRate !== null ? `${selectedDay.completionRate}%` : "Not tracked"}</span></div>
                        {selectedDay.firstRoomTone || selectedDay.latestRoomTone ? (
                          <div style={detailStatStyle}><span style={detailLabelStyle}>Room tone change</span><span style={detailValueStyle}>{(getRoomToneLabel(selectedDay.firstRoomTone) ?? "Not tracked")} -&gt; {(getRoomToneLabel(selectedDay.latestRoomTone) ?? "Not tracked")}</span></div>
                        ) : null}
                      </div>
                      {buildDayNote(selectedDay) ? <p style={dayNoteStyle}>{buildDayNote(selectedDay)}</p> : null}
                    </div>
                  ) : null}
                  <div style={fallbackStatsRowStyle}>
                    <div style={fallbackStatCardStyle}>
                      <span style={fallbackStatLabelStyle}>Sessions</span>
                      <span style={fallbackStatValueStyle}>{currentSummary.sessions ?? 0}</span>
                    </div>
                  </div>
                  {currentSummary.topTools.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={fallbackSectionLabelStyle}>Most used this week</div>
                      {currentSummary.topTools.slice(0, 2).map((toolId, index) => (
                        <motion.button key={toolId} type="button" whileTap={{ scale: 0.99 }} onClick={() => router.push(`/app/tool/${toolId}`)} style={fallbackToolButtonStyle}>
                          <span style={{ ...rankBadgeStyle, ...(index === 0 ? rankBadgeActiveStyle(accentColor) : rankOtherBadgeStyle) }}>{index + 1}</span>
                          <span style={toolCopyStyle}>
                            <span style={toolTitleStyle}>{toolTitle(toolId)}</span>
                          </span>
                          <span style={toolActionStyle}>Open -&gt;</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {currentSummary.returnLine ? <p style={microInsightStyle}>{currentSummary.returnLine}</p> : null}
                {currentSummary.footer ? <p style={fallbackFooterStyle}>{currentSummary.footer}</p> : null}
              </div>
            </GlassCard>
          </motion.section>
        )}

        {currentSummary.insights.length ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.14, ease: EASE }}>
            <GlassCard style={patternCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={eyebrowStyle}>Weekly</span>
                  <div style={sectionTitleStyle}>What&apos;s been happening</div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {currentSummary.insights.map((insight, index) => (
                    <p key={insight} style={{ ...patternTextStyle, borderBottom: index < currentSummary.insights.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", paddingBottom: index < currentSummary.insights.length - 1 ? 10 : 0 }}>{insight}</p>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.section>
        ) : null}

        {currentSummary.workedSection.toolRows.length ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.22, ease: EASE }}>
            <GlassCard style={workedCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ ...workedHeaderStyle, position: "relative", zIndex: 1 }}>
                <span style={eyebrowStyle}>Weekly</span>
                <div style={sectionTitleStyle}>What actually helped</div>
                {currentSummary.helpedCopy ? <div style={workedSubcopyStyle}>{currentSummary.helpedCopy}</div> : null}
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                {currentSummary.workedSection.toolRows.map(({ note, toolId }, index) => (
                  <motion.button key={toolId} type="button" className="wk-tool-row" whileTap={{ scale: 0.99 }} onClick={() => router.push(`/app/tool/${toolId}`)} style={toolRowButtonStyle}>
                    <span style={{ ...rankBadgeStyle, ...(index === 0 ? rankBadgeActiveStyle(accentColor) : rankOtherBadgeStyle) }}>{index + 1}</span>
                    <span style={toolCopyStyle}>
                      <span style={toolTitleStyle}>{toolTitle(toolId)}</span>
                      {note ? <span style={toolNoteStyle}>{note}</span> : null}
                    </span>
                    <span style={toolActionStyle}>Open -&gt;</span>
                  </motion.button>
                ))}
              </div>
            </GlassCard>
          </motion.section>
        ) : null}

        {currentSummary.roomPatternReads.length ? (
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.26, ease: EASE }}>
            <GlassCard style={patternCardStyle}>
              <div className="home-top-highlight" />
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={eyebrowStyle}>Weekly</span>
                  <div style={sectionTitleStyle}>What the room felt like</div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {currentSummary.roomPatternReads.map((read, index) => (
                    <p key={read} style={{ ...patternTextStyle, borderBottom: index < currentSummary.roomPatternReads.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", margin: 0, paddingBottom: index < currentSummary.roomPatternReads.length - 1 ? 10 : 0 }}>{read}</p>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.section>
        ) : null}
      </div>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

const loadingMainStyle: CSSProperties = { minHeight: "100dvh", background: "var(--bg)", display: "grid", placeItems: "center", overflow: "hidden" };
const loadingTextStyle: CSSProperties = { color: "#F4F4F5", fontSize: 13, fontWeight: 800, letterSpacing: "0.28em" };
const mainStyle: CSSProperties = { minHeight: "100dvh", padding: "44px 18px 120px", background: "var(--bg)", position: "relative", overflow: "hidden" };
const centeredMainStyle: CSSProperties = { ...mainStyle, alignItems: "center", display: "flex", justifyContent: "center" };
const atmosphereWrapStyle: CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 };
const blobStyle: CSSProperties = { position: "absolute", borderRadius: 999, filter: "blur(72px)" };
const pageWrapStyle: CSSProperties = { position: "relative", zIndex: 2, width: "100%", maxWidth: 740, margin: "0 auto", display: "grid", gap: 20 };
const innerHighlightStyle: CSSProperties = { background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", height: 1, left: 16, pointerEvents: "none", position: "absolute", right: 16, top: 0 };
const loggedOutCardStyle: CSSProperties = { display: "grid", gap: 14, padding: 24 };
const primaryCardStyle: CSSProperties = { width: "100%", padding: 20, display: "grid", border: "none", textAlign: "left" };
const patternCardStyle: CSSProperties = { padding: 20, display: "grid", gap: 10 };
const workedCardStyle: CSSProperties = { overflow: "hidden", padding: 0 };
const serifTitleStyle: CSSProperties = { color: "#F4F4F5", fontFamily: "Zodiak, Georgia, serif", fontSize: "clamp(30px,7vw,40px)", fontWeight: 400, lineHeight: 1, margin: 0 };
const subtitleStyle: CSSProperties = { margin: 0, color: "rgba(161,161,170,0.85)", fontSize: 14, lineHeight: 1.65, maxWidth: 460 };
const bodyStyle: CSSProperties = { margin: 0, color: "rgba(244,244,245,0.80)", fontSize: 15, lineHeight: 1.68 };
const mutedCopyStyle: CSSProperties = { color: "rgba(161,161,170,0.85)", fontSize: 14, lineHeight: 1.65, margin: 0 };
const headerStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "nowrap" };
const eyebrowStyle: CSSProperties = { color: "rgba(161,161,170,0.85)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };
const quietMetaStyle: CSSProperties = { color: "rgba(161,161,170,0.74)", fontSize: 12, lineHeight: 1.4, whiteSpace: "nowrap", paddingTop: 6 };
const weeklyHeadStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const sectionTitleStyle: CSSProperties = { color: "rgba(244,244,245,0.9)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 };
const movementWrapStyle: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "112px minmax(0, 1fr)" };
const axisStyle: CSSProperties = { height: CHART_HEIGHT, position: "relative", paddingTop: 2 };
const axisLabelStyle: CSSProperties = { color: "rgba(161,161,170,0.7)", fontSize: 11, lineHeight: 1.25, position: "absolute", transform: "translateY(-50%)", width: "100%" };
const chartPanelStyle: CSSProperties = { height: CHART_HEIGHT, position: "relative" };
const ladderRuleStyle: CSSProperties = { borderTop: "1px solid rgba(255,255,255,0.05)", left: 0, position: "absolute", right: 0, transform: "translateY(-50%)" };
const dayColumnsStyle: CSSProperties = { display: "grid", gap: 8, gridTemplateColumns: "repeat(7, minmax(0, 1fr))", height: "100%", position: "relative" };
function dayButtonStyle(hasData: boolean, isActive: boolean): CSSProperties { return { background: isActive ? "rgba(255,255,255,0.04)" : "transparent", border: `1px solid ${isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.02)"}`, borderRadius: 18, color: "inherit", cursor: hasData ? "pointer" : "default", display: "grid", gap: 8, gridTemplateRows: `${CHART_HEIGHT}px auto`, padding: "10px 8px 8px", textAlign: "center", transition: "background 0.22s ease, border-color 0.22s ease" }; }
const dayCanvasStyle: CSSProperties = { height: CHART_HEIGHT, position: "relative" };
const movementLineStyle: CSSProperties = { borderRadius: 999, left: "50%", position: "absolute", transform: "translateX(-50%)", width: 2 };
const firstMarkerStyle: CSSProperties = { background: "rgba(24,24,27,0.92)", border: "1.5px solid rgba(255,255,255,0.28)", borderRadius: 999, height: 8, left: "calc(50% - 10px)", position: "absolute", transform: "translateY(-50%)", width: 8 };
const latestMarkerStyle: CSSProperties = { border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, height: 18, left: "calc(50% + 2px)", position: "absolute", transform: "translateY(-50%)", width: 18 };
const emptyColumnDotStyle: CSSProperties = { background: "rgba(255,255,255,0.08)", borderRadius: 999, height: 8, left: "calc(50% - 4px)", position: "absolute", top: getLadderTop(1), width: 8 };
const dayLabelWrapStyle: CSSProperties = { alignItems: "center", display: "grid", gap: 6, justifyItems: "center" };
const dayLabelStyle: CSSProperties = { color: "#F4F4F5", fontSize: 12, fontWeight: 700 };
const roomIndicatorStyle: CSSProperties = { borderRadius: 999, height: 3, width: 18 };
const microInsightStyle: CSSProperties = { color: "rgba(244,244,245,0.76)", fontSize: 14, lineHeight: 1.65, margin: 0 };
const selectedDayCardStyle: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, display: "grid", gap: 14, padding: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" };
const selectedDayTitleStyle: CSSProperties = { color: "#F4F4F5", fontSize: 22, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 };
const detailStatStyle: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, display: "grid", gap: 4, padding: 12 };
const detailLabelStyle: CSSProperties = { color: "#A1A1AA", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" };
const detailValueStyle: CSSProperties = { color: "#F4F4F5", fontSize: 14, lineHeight: 1.5 };
const dayNoteStyle: CSSProperties = { color: "#D4D4D8", fontSize: 14, lineHeight: 1.7, margin: 0 };
const patternTextStyle: CSSProperties = { color: "#D4D4D8", fontSize: 14, lineHeight: 1.75, margin: 0 };
const workedHeaderStyle: CSSProperties = { borderBottom: "1px solid rgba(255,255,255,0.05)", display: "grid", gap: 4, padding: "16px 18px 14px" };
const workedSubcopyStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12 };
const toolRowButtonStyle: CSSProperties = { alignItems: "center", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "inherit", cursor: "pointer", display: "grid", gap: 12, gridTemplateColumns: "auto 1fr auto", padding: "14px 18px", textAlign: "left", width: "100%" };
const rankBadgeStyle: CSSProperties = { alignItems: "center", borderRadius: 999, display: "inline-flex", fontSize: 12, fontWeight: 800, height: 28, justifyContent: "center", width: 28 };
const rankBadgeActiveStyle = (accentColor: string): CSSProperties => ({ background: `${accentColor}26`, color: accentColor });
const rankOtherBadgeStyle: CSSProperties = { background: "rgba(255,255,255,0.06)", color: "#D4D4D8" };
const toolCopyStyle: CSSProperties = { display: "grid", gap: 3 };
const toolTitleStyle: CSSProperties = { color: "#F4F4F5", fontSize: 14, fontWeight: 700, lineHeight: 1.4 };
const toolNoteStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, lineHeight: 1.4 };
const toolActionStyle: CSSProperties = { color: "rgba(194,122,92,0.80)", fontSize: 12, fontWeight: 700, letterSpacing: "0.01em" };
const emptyStateBlockStyle: CSSProperties = { display: "grid", gap: 10 };
const fallbackContentStyle: CSSProperties = { display: "grid", gap: 12 };
const fallbackStatsRowStyle: CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 160px)" };
const fallbackStatCardStyle: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, display: "grid", gap: 6, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" };
const fallbackStatLabelStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, fontWeight: 700 };
const fallbackStatValueStyle: CSSProperties = { color: "#F4F4F5", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 };
const fallbackSectionLabelStyle: CSSProperties = { color: "#A1A1AA", fontSize: 12, fontWeight: 700 };
const fallbackToolButtonStyle: CSSProperties = { alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, color: "inherit", cursor: "pointer", display: "grid", gap: 12, gridTemplateColumns: "auto 1fr auto", padding: "14px 16px", textAlign: "left", width: "100%" };
const fallbackFooterStyle: CSSProperties = { color: "#A1A1AA", fontSize: 13, lineHeight: 1.6, margin: 0 };
const primaryButtonStyle: CSSProperties = { alignItems: "center", background: "linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%)", border: "1px solid rgba(194,122,92,0.28)", borderRadius: 18, color: "#fff", display: "inline-flex", fontSize: 14, fontWeight: 900, justifyContent: "center", minHeight: 52, padding: "14px 18px", textDecoration: "none" };

const pageStyles = `
  * { -webkit-tap-highlight-color: transparent; }
  .wk-page { color: #F4F4F5; }
  .wk-glass { background: rgba(39,39,42,0.62); border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; box-shadow: 0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); position: relative; overflow: hidden; }
  .home-top-highlight { position: absolute; top: 0; left: 16px; right: 16px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent); pointer-events: none; z-index: 10; }
  .film-grain { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.07; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 3px 3px, 4px 4px; mix-blend-mode: soft-light; }
  .btn-primary { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; width: 100%; padding: 13px 16px; border-radius: 14px; font-size: 13px; font-weight: 900; text-decoration: none; border: 1px solid rgba(194,122,92,0.28); cursor: pointer; color: #fff; background: linear-gradient(180deg, rgba(194,122,92,0.96) 0%, rgba(173,103,77,0.96) 100%); box-shadow: 0 14px 36px rgba(194,122,92,0.20); }
  .wk-tool-row:last-child { border-bottom: none; }
  .wk-detail-grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 720px) { .wk-glass { border-radius: 22px; } }
  @media (max-width: 640px) {
    .film-grain { opacity: 0.05; }
    .wk-detail-grid { grid-template-columns: 1fr; }
    .wk-page header { gap: 12px; }
  }
`;
