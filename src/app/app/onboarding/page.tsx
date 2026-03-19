"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getSupabase } from "@/lib/supabase";

type Answer = 0 | 1 | 2 | 3 | 4;

const SCALE: { label: string; value: Answer }[] = [
  { label: "Never", value: 0 },
  { label: "Rarely", value: 1 },
  { label: "Sometimes", value: 2 },
  { label: "Often", value: 3 },
  { label: "Almost always", value: 4 },
];

type Question = { id: number; text: string; domain: "work" | "recovery" | "home" | "attach" };

const QUESTIONS: Question[] = [
  // A) Work Focus & Cognitive Load (1–5)
  {
    id: 1,
    domain: "work",
    text: "When the laptop closes, the work doesn't. My brain stays on.",
  },
  {
    id: 2,
    domain: "work",
    text: "Even mid-meal or on a walk, I'm still working through something in the background.",
  },
  {
    id: 3,
    domain: "work",
    text: "A Slack message, Teams notification or unexpected request costs me more than an hour of actual deep work.",
  },
  {
    id: 4,
    domain: "work",
    text: "I sit down to do one thing. My brain opens twelve others.",
  },
  {
    id: 5,
    domain: "work",
    text: "When things pile up, everything feels equally on fire and nothing gets properly done.",
  },

  // B) Spillover & Recovery (6–10)
  {
    id: 6,
    domain: "recovery",
    text: "My body is done. My brain hasn't got the message yet.",
  },
  {
    id: 7,
    domain: "recovery",
    text: "After a heavy day, it takes hours before I actually feel like I'm off.",
  },
  {
    id: 8,
    domain: "recovery",
    text: "Scrolling or zoning out is the only thing that reliably turns the noise down.",
  },
  {
    id: 9,
    domain: "recovery",
    text: "Work follows me into sleep — I wake early, or don't sleep cleanly at all.",
  },
  {
    id: 10,
    domain: "recovery",
    text: "Hours after finishing, I notice tight shoulders, a clenched jaw, or shallow breathing.",
  },

  // C) Home Drift & Family Load (11–15)
  {
    id: 11,
    domain: "home",
    text: "I'm in the room. I'm not really there.",
  },
  {
    id: 12,
    domain: "home",
    text: "Heavy weeks turn dinner conversations into status updates.",
  },
  {
    id: 13,
    domain: "home",
    text: "My patience runs shorter at home after a hard day. My family feel it before I do.",
  },
  {
    id: 14,
    domain: "home",
    text: "Work gets my best. The people I'm doing it all for get what's left.",
  },
  {
    id: 15,
    domain: "home",
    text: "I check my phone when no one's looking. I know I shouldn't.",
  },

  // D) Conflict Pattern & Connection Style (16–20)
  {
    id: 16,
    domain: "attach",
    text: "When tension starts at home, I don't engage. I don't have the energy for it.",
  },
  {
    id: 17,
    domain: "attach",
    text: "When something feels off with my partner, it runs in the background of the whole day.",
  },
  {
    id: 18,
    domain: "attach",
    text: "When we disagree, I go quiet and need to process alone before I can say anything useful.",
  },
  {
    id: 19,
    domain: "attach",
    text: "In conflict I shut down. Not to be cold — just to stop things from getting worse.",
  },
  {
    id: 20,
    domain: "attach",
    text: "When someone asks how my day was, I give the short version. The full one feels like too much.",
  },
];

type PageKey = "intro" | "context" | "q1" | "q2" | "q3" | "q4" | "results";

type HomeSetup = "Partner/spouse" | "Kids/family" | "Partner + kids" | "Long distance" | "Solo";
type WorkIntensity = "Normal" | "Busy" | "Peak pressure";
type Spillover = "Work → home" | "Home → work" | "Both ways";
type Priority = "Clarity at work" | "Closeness at home" | "Both";

function avg(vals: number[]) {
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function band(a: number) {
  if (a <= 1.4) return "Low";
  if (a <= 2.7) return "Medium";
  return "High";
}

function top2FromMap(map: Record<string, number>) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
}

const PACK_ID_BY_NAME: Record<string, string> = {
  "Clear Head Pack": "clear_head_pack",
  "Wind Down Pack": "wind_down_pack",
  "Be Here Pack": "be_here_pack",
  "Come Back Pack": "come_back_pack",
  "Settle the Spiral Pack": "settle_the_spiral_pack",
  "Space, Not Distance Pack": "space_not_distance_pack",
};

function mapNeedToId(priority: Priority, primaryPack: string) {
  if (priority === "Clarity at work") return "regain_clarity";
  if (priority === "Closeness at home") return "be_here";
  if (primaryPack === "Clear Head Pack") return "regain_clarity";
  if (primaryPack === "Wind Down Pack") return "wind_down";
  if (primaryPack === "Be Here Pack") return "be_here";
  return "come_back";
}

function mapTimeToDefault(workIntensity: WorkIntensity) {
  if (workIntensity === "Normal") return 3;
  if (workIntensity === "Busy") return 5;
  return 10;
}

function mapSituationToId(homeSetup: HomeSetup) {
  if (homeSetup === "Solo") return "alone";
  if (homeSetup === "Long distance") return "long_distance";
  if (homeSetup === "Partner/spouse") return "partner_nearby";
  return "kids_around";
}

export default function OnboardingPage() {
  const router = useRouter();
  const hasPersistedResultsRef = useRef(false);
  const [page, setPage] = useState<PageKey>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [displayNameInput, setDisplayNameInput] = useState("");

  const [homeSetup, setHomeSetup] = useState<HomeSetup>("Partner + kids");
  const [workIntensity, setWorkIntensity] = useState<WorkIntensity>("Busy");
  const [spillover, setSpillover] = useState<Spillover>("Both ways");
  const [priority, setPriority] = useState<Priority>("Both");

  const [answers, setAnswers] = useState<Answer[]>(Array(20).fill(2) as Answer[]);

  const groups = useMemo(() => {
    const work = answers.slice(0, 5);
    const recovery = answers.slice(5, 10);
    const home = answers.slice(10, 15);
    const attach = answers.slice(15, 20);

    const workAvg = avg(work);
    const recoveryAvg = avg(recovery);
    const homeAvg = avg(home);
    const attachAvg = avg(attach);

    const q16 = answers[15];
    const q17 = answers[16];
    const q18 = answers[17];
    const q19 = answers[18];
    const q20 = answers[19];

    const anxiousIndex = q17 * 1.3 + q16 * 0.6 + q20 * 0.3;
    const avoidantIndex = (q18 + q19) * 1.0 + q16 * 0.5 + q20 * 0.6;

    const diff = anxiousIndex - avoidantIndex;
    let style: "Anxious" | "Avoidant" | "Mixed" = "Mixed";
    if (diff >= 1.2) style = "Anxious";
    else if (diff <= -1.2) style = "Avoidant";
    else style = "Mixed";

    const workSub = {
      "No Off-Switch": answers[0] + answers[1],
      "Context-Switch Drain": answers[2] * 1.3,
      "Open Loops Load": answers[3] + answers[4] * 1.1,
      "Urgency Distortion": answers[4] * 1.4,
      "Background Processing": answers[1] + answers[3],
    };

    const recoverySub = {
      "Wired-Tired": answers[5] + answers[6] * 0.6,
      "Slow Decompress": answers[6] * 1.4,
      "Numbing Switch-Off": answers[7] * 1.4,
      "Sleep Spillover": answers[8] * 1.4,
      "Body Carry": answers[9] * 1.4,
    };

    const homeSub = {
      "Mind Elsewhere": answers[10] * 1.4,
      "Logistics Mode": answers[11] * 1.4,
      "Short Fuse": answers[12] * 1.4,
      "Guilt Loop": answers[13] * 1.4,
      "Sneaky Checking": answers[14] * 1.4,
    };

    const attachSub = {
      "Avoid Tension": q16 * 1.2,
      "Distance Anxiety": q17 * 1.4,
      "Retreat to Process": q18 * 1.3,
      "Shutdown Quiet": q19 * 1.3,
      "Verbal Depletion": q20 * 1.2,
    };

    const [workTop, workAlso] = top2FromMap(workSub);
    const [recoveryTop, recoveryAlso] = top2FromMap(recoverySub);
    const [homeTop, homeAlso] = top2FromMap(homeSub);
    const [attachTop, attachAlso] = top2FromMap(attachSub);

    const domainScores: Record<string, number> = {
      Work: workAvg,
      Recovery: recoveryAvg,
      Home: homeAvg,
      Connection: attachAvg,
    };
    const primaryDomain = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0][0];

    const primaryPack =
      primaryDomain === "Work"
        ? "Clear Head Pack"
        : primaryDomain === "Recovery"
          ? "Wind Down Pack"
          : primaryDomain === "Home"
            ? "Be Here Pack"
            : "Come Back Pack";

    const microPack =
      style === "Anxious"
        ? "Settle the Spiral Pack"
        : style === "Avoidant"
          ? "Space, Not Distance Pack"
          : "Settle the Spiral Pack + Space, Not Distance Pack";

    const sortedDomains = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
    const second = sortedDomains[1];
    const secondaryPack =
      spillover === "Both ways" && Math.abs(sortedDomains[0][1] - second[1]) <= 0.25
        ? second[0] === "Work"
          ? "Clear Head Pack"
          : second[0] === "Recovery"
            ? "Wind Down Pack"
            : second[0] === "Home"
              ? "Be Here Pack"
              : "Come Back Pack"
        : null;

    const overallAvg = avg(answers);
    const emotionalLine =
      overallAvg > 2.8
        ? "You're holding a lot — more than you probably let on. Here's where it's concentrated."
        : overallAvg > 1.8
          ? "You're navigating it. Not always cleanly, but you're doing it. Here's what the data says."
          : "Things look relatively stable. That's worth knowing. Here's what to keep an eye on.";

    return {
      workAvg,
      recoveryAvg,
      homeAvg,
      attachAvg,
      overallAvg,
      emotionalLine,
      style,
      anxiousIndex,
      avoidantIndex,
      workTop,
      workAlso,
      recoveryTop,
      recoveryAlso,
      homeTop,
      homeAlso,
      attachTop,
      attachAlso,
      primaryPack,
      secondaryPack,
      microPack,
    };
  }, [answers, spillover]);

  function setAnswer(questionIndex: number, val: Answer) {
    setAnswers((prev) => {
      const next = [...prev] as Answer[];
      next[questionIndex] = val;
      return next;
    });
  }

  function handleDisplayNameChange(event: ChangeEvent<HTMLInputElement>) {
    setDisplayNameInput(event.target.value);
  }

  const progressLabel = (key: PageKey) => {
    if (key === "q1") return "1/4";
    if (key === "q2") return "2/4";
    if (key === "q3") return "3/4";
    if (key === "q4") return "4/4";
    return "";
  };

  const pageFromQuestionIndex = (idx: number): PageKey => {
    if (idx <= 4) return "q1";
    if (idx <= 9) return "q2";
    if (idx <= 14) return "q3";
    return "q4";
  };

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const withinGroupIndex = (currentQuestionIndex % 5) + 1;
  const totalProgressPct = ((currentQuestionIndex + 1) / 20) * 100;

  const goToQuestion = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(19, idx));
    setCurrentQuestionIndex(safeIdx);
    setPage(pageFromQuestionIndex(safeIdx));
  };

  const goNextQuestion = () => {
    if (currentQuestionIndex >= 19) { setPage("results"); return; }
    goToQuestion(currentQuestionIndex + 1);
  };

  const goBackQuestion = () => {
    if (currentQuestionIndex <= 0) return;
    goToQuestion(currentQuestionIndex - 1);
  };

  useEffect(() => {
    const supabase = getSupabase();
    if (page !== "results" || hasPersistedResultsRef.current) return;
    hasPersistedResultsRef.current = true;

    let cancelled = false;

    const persistProfile = async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !data.user) return;

      const primaryPackIds = [groups.primaryPack, groups.secondaryPack]
        .filter((pack): pack is string => Boolean(pack))
        .map((pack) => PACK_ID_BY_NAME[pack])
        .filter((id): id is string => Boolean(id));

      const topPatterns = [groups.workTop?.[0], groups.recoveryTop?.[0], groups.homeTop?.[0], groups.attachTop?.[0]]
        .filter((p): p is string => Boolean(p));

      const defaults = {
        default_need: mapNeedToId(priority, groups.primaryPack),
        default_time: mapTimeToDefault(workIntensity),
        default_situation: mapSituationToId(homeSetup),
        primary_pack_ids: primaryPackIds,
        top_patterns: topPatterns,
      };

      const { error } = await supabase.from("user_profile").upsert({
        user_id: data.user.id,
        display_name: displayNameInput.trim() || null,
        attachment_style: groups.style,
        defaults,
        updated_at: new Date().toISOString(),
      });

      if (cancelled) return;
      if (error) {
        console.error("Failed to upsert user_profile from onboarding:", error);
        hasPersistedResultsRef.current = false;
      }
    };

    void persistProfile();
    return () => { cancelled = true; };
  }, [
    page, router,
    groups.style, groups.primaryPack, groups.secondaryPack,
    groups.workTop, groups.recoveryTop, groups.homeTop, groups.attachTop,
    displayNameInput, priority, workIntensity, homeSetup,
  ]);

  return (
    <main className="container">
      <section className="section">

        {/* ── INTRO ── */}
        {page === "intro" && (
          <>
            <div className="kicker">PRESSURE PROFILE</div>
            <h1 style={{ marginBottom: 10 }}>Two minutes. You'll see exactly where it's leaking.</h1>
            <p style={{ maxWidth: "78ch" }}>
              20 statements about your real life — work, evenings, home, how you handle friction. We'll map where pressure is costing you most and match tools to your specific patterns.
            </p>

            <div className="card" style={{ marginTop: 18, maxWidth: 460 }}>
              <div className="kicker">WHAT SHOULD WE CALL YOU? (OPTIONAL)</div>
              <label style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <span className="sr-only">Display name</span>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={handleDisplayNameChange}
                  placeholder="Display name"
                  autoComplete="nickname"
                  style={{
                    width: "100%",
                    minHeight: 52,
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid var(--line)",
                    background: "rgba(255,255,255,0.03)",
                    color: "var(--text)",
                    fontSize: 15,
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <div className="stamp" style={{ marginTop: 18 }}>
              <div className="stampTitle">
                <span style={{ color: "var(--accent)" }}>🔒</span>
                <span>Private by design</span>
              </div>
              <p className="small" style={{ marginTop: 10, maxWidth: "78ch" }}>
                No message reading. No behavioural tracking. Only what you choose to type here.
              </p>
            </div>

            <div className="btnRow" style={{ marginTop: 18 }}>
              <button className="btn primary" type="button" onClick={() => setPage("context")}>
                Start
              </button>
              <Link className="btn ghost" href="/">
                Back to site
              </Link>
            </div>
          </>
        )}

        {/* ── CONTEXT ── */}
        {page === "context" && (
          <>
            <div className="kicker">CONTEXT</div>
            <h1 style={{ marginBottom: 10 }}>Tell us what your life actually looks like.</h1>
            <p className="small" style={{ maxWidth: "78ch" }}>
              This shapes which tools Driftlatch puts in front of you first. No wrong answers.
            </p>

            <div className="grid two" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="kicker">Who's at home?</div>
                <div className="btnRow" style={{ marginTop: 12 }}>
                  {(["Partner/spouse", "Kids/family", "Partner + kids", "Long distance", "Solo"] as HomeSetup[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`btn ${homeSetup === v ? "primary" : "ghost"}`}
                      style={{ padding: "10px 14px" }}
                      onClick={() => setHomeSetup(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="kicker">How's work right now?</div>
                <div className="btnRow" style={{ marginTop: 12 }}>
                  {(["Normal", "Busy", "Peak pressure"] as WorkIntensity[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`btn ${workIntensity === v ? "primary" : "ghost"}`}
                      style={{ padding: "10px 14px" }}
                      onClick={() => setWorkIntensity(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="hr" />

                <div className="kicker">Where does it spill?</div>
                <div className="btnRow" style={{ marginTop: 12 }}>
                  {(["Work → home", "Home → work", "Both ways"] as Spillover[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`btn ${spillover === v ? "primary" : "ghost"}`}
                      style={{ padding: "10px 14px" }}
                      onClick={() => setSpillover(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="kicker">What do you most want to protect?</div>
              <div className="btnRow" style={{ marginTop: 12 }}>
                {(["Clarity at work", "Closeness at home", "Both"] as Priority[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`btn ${priority === v ? "primary" : "ghost"}`}
                    style={{ padding: "10px 14px" }}
                    onClick={() => setPriority(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="small" style={{ marginTop: 12 }}>
                This determines which pack leads your experience.
              </p>
            </div>

            <div className="btnRow" style={{ marginTop: 18 }}>
              <button className="btn primary" type="button" onClick={() => goToQuestion(0)}>
                Continue
              </button>
              <button className="btn ghost" type="button" onClick={() => setPage("intro")}>
                Back
              </button>
            </div>
          </>
        )}

        {/* ── QUESTIONS ── */}
        {(page === "q1" || page === "q2" || page === "q3" || page === "q4") && (
          <>
            <div
              aria-label="Overall progress"
              style={{
                width: "100%",
                height: 6,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <motion.div
                style={{ height: "100%", background: "var(--accent)" }}
                animate={{ width: `${totalProgressPct}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="kicker">PRESSURE PROFILE · {progressLabel(page)}</div>
            <h1 style={{ marginBottom: 8 }}>Be honest. Nobody's watching.</h1>
            <p className="small" style={{ maxWidth: "78ch" }}>
              Rate each statement based on the last two weeks. Not your best weeks — your typical ones.
            </p>

            <div className="card" style={{ marginTop: 18 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="small" style={{ marginBottom: 12 }}>
                    {withinGroupIndex} of 5
                  </div>
                  <div className="card" style={{ boxShadow: "none" }}>
                    <div style={{ fontWeight: 650, marginBottom: 12 }}>
                      {currentQuestion.id}. {currentQuestion.text}
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "space-between", maxWidth: 320 }}>
                      {SCALE.map((opt, i) => {
                        const selected = answers[currentQuestionIndex] === opt.value;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            aria-label={`${i + 1}`}
                            onClick={() => setAnswer(currentQuestionIndex, opt.value)}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              border: selected ? "1px solid var(--accent)" : "1px solid var(--line)",
                              background: selected ? "var(--accent)" : "transparent",
                              color: selected ? "#fff" : "var(--text)",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                    <div
                      className="small"
                      style={{ marginTop: 10, display: "flex", justifyContent: "space-between", maxWidth: 320 }}
                    >
                      <span>1 = Never</span>
                      <span>5 = Almost always</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="btnRow" style={{ marginTop: 18 }}>
                {currentQuestionIndex > 0 && (
                  <button className="btn ghost" type="button" onClick={goBackQuestion}>
                    Back
                  </button>
                )}
                <button className="btn primary" type="button" onClick={goNextQuestion}>
                  {currentQuestionIndex === 19 ? "See my map" : "Next"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── RESULTS ── */}
        {page === "results" && (
          <>
            <div className="kicker">YOUR DRIFTLATCH MAP</div>
            <h1 style={{ marginBottom: 8 }}>Where pressure is showing up</h1>
            <p style={{ maxWidth: "78ch" }}>{groups.emotionalLine}</p>
            <p className="small" style={{ maxWidth: "78ch" }}>
              This isn't a diagnosis. It's a practical map — so Driftlatch can put the right tool in front of you with less effort on your part.
            </p>

            <div className="grid two" style={{ marginTop: 18 }}>
              {/* Card 1: Work */}
              <div className="card">
                <div className="kicker">At work · {band(groups.workAvg)}</div>
                <h2 style={{ marginTop: 10 }}>{groups.workTop?.[0]}</h2>
                <p className="small">
                  Also present: <span style={{ color: "var(--text)" }}>{groups.workAlso?.[0]}</span>
                </p>
                <div className="hr" />
                <p className="small">
                  Suggested pack: <span style={{ color: "var(--text)" }}>Clear Head</span>
                </p>
              </div>

              {/* Card 2: Recovery */}
              <div className="card">
                <div className="kicker">Switching off · {band(groups.recoveryAvg)}</div>
                <h2 style={{ marginTop: 10 }}>{groups.recoveryTop?.[0]}</h2>
                <p className="small">
                  Also present: <span style={{ color: "var(--text)" }}>{groups.recoveryAlso?.[0]}</span>
                </p>
                <div className="hr" />
                <p className="small">
                  Suggested pack: <span style={{ color: "var(--text)" }}>Wind Down</span>
                </p>
              </div>

              {/* Card 3: Home */}
              <div className="card">
                <div className="kicker">At home · {band(groups.homeAvg)}</div>
                <h2 style={{ marginTop: 10 }}>{groups.homeTop?.[0]}</h2>
                <p className="small">
                  Also present: <span style={{ color: "var(--text)" }}>{groups.homeAlso?.[0]}</span>
                </p>
                <div className="hr" />
                <p className="small">
                  Suggested pack: <span style={{ color: "var(--text)" }}>Be Here</span>
                </p>
              </div>

              {/* Card 4: Attachment */}
              <div className="card">
                <div className="kicker">Under friction · {band(groups.attachAvg)}</div>
                <h2 style={{ marginTop: 10 }}>{groups.style}</h2>
                <p className="small">
                  Most present: <span style={{ color: "var(--text)" }}>{groups.attachTop?.[0]}</span>
                  {groups.attachAlso?.[0] ? (
                    <> · also: <span style={{ color: "var(--text)" }}>{groups.attachAlso?.[0]}</span></>
                  ) : null}
                </p>
                <div className="hr" />
                <p className="small">
                  Micro-pack: <span style={{ color: "var(--text)" }}>{groups.microPack}</span>
                </p>
              </div>
            </div>

            <div className="card premium" style={{ marginTop: 18 }}>
              <div className="kicker">YOUR STARTING PACK</div>
              <h2 style={{ marginTop: 10 }}>{groups.primaryPack}</h2>
              <p className="small" style={{ maxWidth: "78ch" }}>
                Based on your scores and your goal —{" "}
                <span style={{ color: "var(--text)" }}>{priority}</span> — this is where Driftlatch will start you.
              </p>
              {groups.secondaryPack && (
                <p className="small" style={{ marginTop: 8 }}>
                  Because pressure runs <span style={{ color: "var(--text)" }}>{spillover}</span>, you'll also have access to:{" "}
                  <span style={{ color: "var(--text)" }}>{groups.secondaryPack}</span>.
                </p>
              )}
              <div className="hr" />
              <div className="btnRow">
                <Link className="btn primary" href="/app/checkin">
                  Open your first tool →
                </Link>
                <button className="btn ghost" type="button" onClick={() => goToQuestion(0)}>
                  Retake
                </button>
                <Link className="btn ghost" href="/">
                  Back to site
                </Link>
              </div>
              <p className="small" style={{ marginTop: 12 }}>
                Home: <span style={{ color: "var(--text)" }}>{homeSetup}</span> · Work:{" "}
                <span style={{ color: "var(--text)" }}>{workIntensity}</span> · Spillover:{" "}
                <span style={{ color: "var(--text)" }}>{spillover}</span>
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
