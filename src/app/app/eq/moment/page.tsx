"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { LIBRARY } from "@/lib/toolLibrary";
import { STATE_ACCENT } from "@/lib/weeklyReflection";
import type { DriftState } from "@/lib/toolLibrary";

// ─── Types ────────────────────────────────────────────────────────────────────
type WhoInvolved = "partner" | "kids" | "both" | "colleague" | "myself";
type MomentType = "escalated" | "withdrew" | "regret" | "not_present" | "disconnect" | "felt_off";
type FixItCardType = "right_now" | "next_time" | "build_it";

interface FixItCard {
  type: FixItCardType;
  title: string;
  body: string;
  toolId?: string;
  toolName?: string;
}

type EQProfileData = {
  pressure_reading: number;
  repair_instinct: number;
  presence_quality: number;
  boundary_intel: number;
  recovery_aware: number;
  signal_accuracy: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const WHO_OPTIONS: { value: WhoInvolved; label: string; sub: string }[] = [
  { value: "partner", label: "Partner", sub: "The person closest to you" },
  { value: "kids", label: "Kids", sub: "Your child or children" },
  { value: "both", label: "Both", sub: "Partner and kids together" },
  { value: "colleague", label: "A colleague", sub: "Someone at work" },
  { value: "myself", label: "Myself", sub: "Something internal" },
];

const MOMENT_OPTIONS: { value: MomentType; label: string; sub: string }[] = [
  { value: "escalated", label: "It escalated", sub: "Things went further than either of you meant" },
  { value: "withdrew", label: "I withdrew", sub: "I went quiet or shut down" },
  { value: "regret", label: "I said something", sub: "It came out wrong or harder than intended" },
  { value: "not_present", label: "I was not present", sub: "Physically there, mentally elsewhere" },
  { value: "disconnect", label: "We could not connect", sub: "Something felt off between you" },
  { value: "felt_off", label: "Something felt wrong", sub: "Hard to name but it sat with you after" },
];

const STATE_OPTIONS: { value: DriftState; label: string }[] = [
  { value: "clear_light", label: "Clear and light" },
  { value: "steady", label: "Steady" },
  { value: "carrying_work", label: "Carrying work" },
  { value: "wired", label: "Wired" },
  { value: "drained", label: "Drained" },
  { value: "overloaded", label: "Overloaded" },
];

const BUILD_IT_COPY: Record<string, { title: string; body: string }> = {
  come_back_pack: {
    title: "Repair Instinct",
    body: "A support that helps you move toward difficult moments instead of away from them. Builds the muscle over time.",
  },
  wind_down_pack: {
    title: "Come Down First",
    body: "A support that helps your nervous system land before you re-engage. Most escalations end faster when one person comes down first.",
  },
  be_here_pack: {
    title: "Presence Quality",
    body: "A support that helps you actually land in a moment instead of just being in the room. Works in under five minutes.",
  },
  settle_the_spiral_pack: {
    title: "Settle the Spiral",
    body: "A support for the mental replay that happens after a moment you wish had gone differently. Helps you process it and put it down.",
  },
  warm_pack: {
    title: "Stay Close",
    body: "A support for evenings when connection feels hard but you both want it. Low friction. No big conversation required.",
  },
  clear_head_pack: {
    title: "Clear the Loop",
    body: "A support that helps you process what happened and close the mental loop so it stops running in the background.",
  },
};

// ─── Helper: Reframe ──────────────────────────────────────────────────────────
function generateReframe(
  who: WhoInvolved,
  momentType: MomentType,
  stateBefore: string,
  _eq: EQProfileData | null,
): string {
  if (who === "myself") {
    return "The hardest moments to sit with are the ones where you were not who you wanted to be and no one else caused it. That self awareness is the beginning of something.";
  }
  if (momentType === "felt_off") {
    return "The moments that sit with you without a clear cause are usually the ones where something was sensed but not spoken. You were reading something real even if you could not name it.";
  }
  if (momentType === "disconnect") {
    return "Some evenings the distance between two people is not about anything that happened. It is about two people who both needed something and neither knew how to ask.";
  }
  if (momentType === "withdrew") {
    if (["carrying_work", "wired", "overloaded"].includes(stateBefore)) {
      return "You had nothing left and going quiet was the only thing that felt safe. That was not indifference. It was a system protecting itself.";
    }
    if (who === "partner" || who === "both") {
      return "When you shut down with a partner it usually means the moment felt bigger than your capacity to handle it cleanly. That gap is what Driftlatch is built to close.";
    }
    return "You had nothing left and going quiet was the only thing that felt safe. That was not indifference. It was a system protecting itself.";
  }
  if (momentType === "escalated") {
    if (["wired", "overloaded"].includes(stateBefore)) {
      return "When you are running that hot, the volume on everything turns up. What came out was probably less about the moment and more about what had been building.";
    }
    if (who === "partner" || who === "both") {
      return "Escalation with a partner almost never starts with the thing you were arguing about. Something underneath needed air and found the wrong door.";
    }
    return "When you are running that hot, the volume on everything turns up. What came out was probably less about the moment and more about what had been building.";
  }
  if (momentType === "not_present") {
    if (who === "kids" || who === "both") {
      return "Your body was there. The part of you that was still at work was louder than the room. That split is something most parents carry without ever naming it.";
    }
    if (who === "partner") {
      return "Being present when you are depleted is genuinely hard. What your partner felt was not rejection. It was the cost of a system running on empty.";
    }
    return "Being present when you are depleted is genuinely hard. What the other person felt was not rejection. It was the cost of a system running on empty.";
  }
  if (momentType === "regret") {
    if (["carrying_work", "wired"].includes(stateBefore)) {
      return "The words came from a place of pressure not intention. The version of you that said that was not the version you want to be leading with.";
    }
    if (who === "partner" || who === "both") {
      return "Something that needed saying found the wrong moment or the wrong shape. That happens most when you are carrying too much to edit yourself.";
    }
    return "The words came from a place of pressure not intention. The version of you that said that was not the version you want to be leading with.";
  }
  return "Something about that moment cost more than it should have. That usually means something real was at stake. Worth understanding before it repeats.";
}

// ─── Helper: Question ─────────────────────────────────────────────────────────
function generateQuestion(who: WhoInvolved, momentType: MomentType, attachmentStyle: string | null): string {
  if (momentType === "withdrew") {
    if (attachmentStyle === "Avoidant" || attachmentStyle === "Mixed") {
      return "When you went quiet, what were you actually protecting yourself from?";
    }
    if (attachmentStyle === "Anxious") {
      return "When you shut down, was it because you thought it would not go well or because you were afraid of what you might say?";
    }
    return "When you went quiet, what were you actually protecting yourself from?";
  }
  if (momentType === "escalated") return "What did you actually need in that moment that came out as pressure instead?";
  if (momentType === "regret") return "What was true underneath what you said that you have not found a cleaner way to express yet?";
  if (momentType === "not_present") {
    if (who === "kids" || who === "both") return "What would it have cost you to put the other thing down for ten minutes?";
    if (who === "partner") return "What would being fully there have required from you that you did not have?";
    return "What would it have cost you to put the other thing down for ten minutes?";
  }
  if (momentType === "disconnect") return "What did you need from that person that you did not ask for?";
  if (momentType === "felt_off") return "What were you sensing that you talked yourself out of naming?";
  if (who === "myself") return "If the version of you from that moment could talk to you now, what would they want you to understand?";
  return "What would you do differently if that moment happened again tomorrow?";
}

// ─── Helper: Fix It Cards ─────────────────────────────────────────────────────
function generateFixItCards(
  who: WhoInvolved,
  momentType: MomentType,
  _stateBefore: string,
  attachmentStyle: string | null,
  _eq: EQProfileData | null,
): FixItCard[] {
  // RIGHT NOW
  let rightNow: FixItCard;
  if (momentType === "withdrew" && (who === "partner" || who === "kids" || who === "both")) {
    rightNow = {
      type: "right_now",
      title: "Go back into the room",
      body: "Not to fix anything. Just to be there. Say: I was not fully here earlier. I am now. That is enough for tonight.",
    };
  } else if (momentType === "escalated" && (who === "partner" || who === "both")) {
    rightNow = {
      type: "right_now",
      title: "Name what happened simply",
      body: "Find them and say one thing: that went further than I meant. No explanation needed after that. Just let it land.",
    };
  } else if (momentType === "regret") {
    rightNow = {
      type: "right_now",
      title: "A short acknowledgement",
      body: "Find a quiet moment and say: that came out wrong. Do not over explain it. The acknowledgement is the repair.",
    };
  } else if (momentType === "not_present" && (who === "kids" || who === "both")) {
    rightNow = {
      type: "right_now",
      title: "Ten minutes fully present",
      body: "Put the phone in another room. Find your child and do one thing with them with nothing else running. It does not need to be meaningful. Just undivided.",
    };
  } else if (momentType === "not_present" && who === "partner") {
    rightNow = {
      type: "right_now",
      title: "Check in before the evening ends",
      body: "Before you both go to sleep, find one minute to actually land in the same place. Not to process anything. Just to be in the same room on purpose.",
    };
  } else if (momentType === "disconnect") {
    rightNow = {
      type: "right_now",
      title: "A small reach",
      body: "You do not need to address the distance directly. A small reach is enough. A question, a touch, a moment of eye contact. Start there.",
    };
  } else if (who === "myself") {
    rightNow = {
      type: "right_now",
      title: "Write one sentence",
      body: "What happened. What you wish had happened differently. One sentence each. Not to solve it. Just to get it out of your head.",
    };
  } else if (who === "colleague") {
    rightNow = {
      type: "right_now",
      title: "A brief note",
      body: "Send them a short message. Not a lengthy explanation. Just: I want to follow up on how that landed. Five words.",
    };
  } else {
    rightNow = {
      type: "right_now",
      title: "A small reach",
      body: "You do not need to address it directly right now. A small reach is enough. Start there.",
    };
  }

  // NEXT TIME
  let nextTime: FixItCard;
  if (momentType === "withdrew") {
    if (attachmentStyle === "Anxious") {
      nextTime = {
        type: "next_time",
        title: "Name the size of it",
        body: "Next time you feel the urge to shut down, try saying: this feels bigger than I can handle right now. That is more honest than silence and lands better with people who care about you.",
      };
    } else {
      nextTime = {
        type: "next_time",
        title: "The signal sentence",
        body: "Before you go quiet next time, say out loud: I am here but I am running on empty. Give me ten minutes. That one sentence prevents most of what happened tonight.",
      };
    }
  } else if (momentType === "escalated") {
    nextTime = {
      type: "next_time",
      title: "The pause before the point",
      body: "Next time you feel the volume going up, say the thing you want to say in your head first. If it sounds like pressure, it probably is. Wait thirty seconds. Most escalations start in that gap.",
    };
  } else if (momentType === "regret") {
    nextTime = {
      type: "next_time",
      title: "Say the need not the complaint",
      body: "What came out as criticism was probably a need underneath. Next time try leading with what you actually need rather than what is wrong. It is harder but it lands cleaner.",
    };
  } else if (momentType === "not_present") {
    nextTime = {
      type: "next_time",
      title: "The arrival ritual",
      body: "Create one thing you do when you walk through the door that signals the transition. It does not need to be elaborate. Just something that tells your brain: work is over, I am here now.",
    };
  } else if (momentType === "disconnect") {
    nextTime = {
      type: "next_time",
      title: "Name the gap before it grows",
      body: "Next time you notice the distance, name it early. Something like: we feel a bit off tonight, is that right? Early naming costs much less than late repair.",
    };
  } else {
    nextTime = {
      type: "next_time",
      title: "The honest check before",
      body: "Before the next high pressure moment, ask yourself: what do I actually need right now. Not what should I do. What do I need. The answer usually changes how you show up.",
    };
  }

  // BUILD IT
  let packId = "clear_head_pack";
  if (momentType === "withdrew" && (who === "partner" || who === "kids" || who === "both")) packId = "come_back_pack";
  else if (momentType === "escalated") packId = "wind_down_pack";
  else if (momentType === "not_present") packId = "be_here_pack";
  else if (momentType === "regret") packId = "settle_the_spiral_pack";
  else if (momentType === "disconnect") packId = "warm_pack";

  const buildTool = LIBRARY.tools.find((t) => t.pack_id === packId);
  const buildCopy = BUILD_IT_COPY[packId] ?? BUILD_IT_COPY.clear_head_pack;
  const buildIt: FixItCard = {
    type: "build_it",
    ...buildCopy,
    toolId: buildTool?.id,
    toolName: buildTool?.title,
  };

  return [rightNow, nextTime, buildIt];
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const glassCard: CSSProperties = {
  background: "rgba(18,18,22,0.9)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 22,
  position: "relative",
  overflow: "hidden",
};

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: "clamp(1.6rem,4vw,2rem)",
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: "var(--text)",
  lineHeight: 1.1,
  marginBottom: 8,
};

const subtextStyle: CSSProperties = {
  fontSize: 14,
  color: "rgba(161,161,170,0.5)",
  lineHeight: 1.6,
  marginBottom: 32,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(161,161,170,0.6)",
  marginBottom: 12,
  display: "block",
};

const continueBtnStyle: CSSProperties = {
  marginTop: 32,
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  background: "var(--accent)",
  color: "white",
  fontSize: 15,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};

const optionCardBase: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 14,
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.18s ease",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};

const rimLight = (
  <div
    aria-hidden
    style={{
      position: "absolute",
      top: 0,
      left: 16,
      right: 16,
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
      pointerEvents: "none",
    }}
  />
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MomentReviewPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [who, setWho] = useState<WhoInvolved | null>(null);
  const [momentType, setMomentType] = useState<MomentType | null>(null);
  const [stateBefore, setStateBefore] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [savedReflection, setSavedReflection] = useState(false);
  const [fixItCards, setFixItCards] = useState<FixItCard[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [attachmentStyle, setAttachmentStyle] = useState<string | null>(null);
  const [eqProfile, setEqProfile] = useState<EQProfileData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        setSessionUserId(session.user.id);
        const [profileRes, eqRes] = await Promise.all([
          supabase.from("user_profile").select("attachment_style").eq("user_id", session.user.id).maybeSingle(),
          supabase.from("user_eq_profile").select("pressure_reading,repair_instinct,presence_quality,boundary_intel,recovery_aware,signal_accuracy").eq("user_id", session.user.id).maybeSingle(),
        ]);
        if (!profileRes.error && profileRes.data?.attachment_style) {
          setAttachmentStyle(profileRes.data.attachment_style as string);
        }
        if (!eqRes.error && eqRes.data) {
          setEqProfile(eqRes.data as EQProfileData);
        }
      } catch {
        // fail silently
      }
    }
    void load();
  }, []);

  async function handleStep3Continue() {
    if (!who || !momentType || !stateBefore || submitting) return;
    setSubmitting(true);
    try {
      const cards = generateFixItCards(who, momentType, stateBefore, attachmentStyle, eqProfile);
      setFixItCards(cards);
      if (sessionUserId) {
        try {
          const supabase = supabaseBrowser();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("user_moment_reviews").insert({
            user_id: sessionUserId,
            who_involved: who,
            moment_type: momentType,
            state_before: stateBefore,
            reflection_text: savedReflection && reflection.trim() ? reflection.trim() : null,
            fixit_cards: cards,
            created_at: new Date().toISOString(),
          });
        } catch {
          // fail silently
        }
      }
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  const allStep1Done = who !== null && momentType !== null && stateBefore !== null;
  const reframeText = who && momentType && stateBefore ? generateReframe(who, momentType, stateBefore, eqProfile) : "";
  const questionText = who && momentType ? generateQuestion(who, momentType, attachmentStyle) : "";

  return (
    <main style={{ background: "var(--bg)", minHeight: "100dvh", padding: "44px 18px 100px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          style={{ fontSize: 13, color: "rgba(161,161,170,0.4)", cursor: "pointer", marginBottom: 32, background: "none", border: "none", padding: 0 }}
        >
          ← Back
        </button>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 40, justifyContent: "center" }}>
          {([1, 2, 3, 4] as const).map((s) => (
            <div
              key={s}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: s < step ? "rgba(194,122,92,0.8)" : s === step ? "rgba(194,122,92,0.4)" : "rgba(255,255,255,0.1)",
                outline: s === step ? "2px solid rgba(194,122,92,0.4)" : "none",
                outlineOffset: s === step ? 2 : 0,
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1 ── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(194,122,92,0.7)", marginBottom: 16 }}>
                Moment Review
              </div>
              <div style={headingStyle}>What happened?</div>
              <div style={subtextStyle}>No detail needed. Just the shape of it.</div>

              {/* WHO */}
              <span style={labelStyle}>Who was involved?</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {WHO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWho(opt.value)}
                    style={{
                      ...optionCardBase,
                      border: who === opt.value ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.07)",
                      background: who === opt.value ? "rgba(194,122,92,0.1)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(244,244,245,0.8)" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(161,161,170,0.4)", marginTop: 3 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>

              {/* MOMENT TYPE — animate in after who */}
              <AnimatePresence>
                {who && (
                  <motion.div
                    key="moment-type"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    <span style={{ ...labelStyle, marginTop: 24 }}>What kind of moment was it?</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {MOMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMomentType(opt.value)}
                          style={{
                            ...optionCardBase,
                            border: momentType === opt.value ? "1px solid rgba(194,122,92,0.28)" : "1px solid rgba(255,255,255,0.07)",
                            background: momentType === opt.value ? "rgba(194,122,92,0.1)" : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(244,244,245,0.8)" }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: "rgba(161,161,170,0.4)", marginTop: 3 }}>{opt.sub}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* STATE BEFORE — animate in after moment type */}
              <AnimatePresence>
                {momentType && (
                  <motion.div
                    key="state-before"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    <span style={{ ...labelStyle, marginTop: 24 }}>How were you before it started?</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {STATE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStateBefore(opt.value)}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 999,
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                            border: stateBefore === opt.value
                              ? `1px solid ${STATE_ACCENT[opt.value]}66`
                              : "1px solid rgba(255,255,255,0.08)",
                            background: stateBefore === opt.value
                              ? `${STATE_ACCENT[opt.value]}22`
                              : "rgba(255,255,255,0.04)",
                            fontSize: 13,
                            fontWeight: 500,
                            color: stateBefore === opt.value ? STATE_ACCENT[opt.value] : "rgba(161,161,170,0.6)",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CONTINUE */}
              <AnimatePresence>
                {allStep1Done && (
                  <motion.div
                    key="continue-1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, ease: EASE }}
                  >
                    <button type="button" onClick={() => setStep(2)} style={continueBtnStyle}>
                      Continue
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && who && momentType && stateBefore && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div style={headingStyle}>What was actually happening.</div>
              <div style={subtextStyle}>Not a diagnosis. Just a different angle.</div>

              <div style={{ ...glassCard, padding: "22px 22px 22px 28px" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 3,
                    background: "rgba(194,122,92,0.5)",
                    borderRadius: "22px 0 0 22px",
                  }}
                />
                {rimLight}
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "rgba(244,244,245,0.82)",
                    lineHeight: 1.75,
                    fontStyle: "italic",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {reframeText}
                </p>
              </div>

              <button type="button" onClick={() => setStep(3)} style={continueBtnStyle}>
                Continue
              </button>
            </motion.div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && who && momentType && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div style={headingStyle}>One question.</div>
              <div style={subtextStyle}>You do not have to answer it here. Just sit with it.</div>

              <div style={{ ...glassCard, padding: "28px 24px" }}>
                {rimLight}
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "rgba(244,244,245,0.9)",
                    lineHeight: 1.5,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {questionText}
                </p>
              </div>

              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Write anything or just reflect."
                style={{
                  width: "100%",
                  marginTop: 24,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  resize: "vertical",
                  minHeight: 80,
                  fontSize: 14,
                  color: "rgba(244,244,245,0.8)",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ fontSize: 12, color: "rgba(161,161,170,0.35)", marginTop: 6 }}>
                Saved only if you choose to keep it.
              </div>

              {reflection.trim().length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={savedReflection}
                    onChange={(e) => setSavedReflection(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, color: "rgba(161,161,170,0.5)" }}>Keep this reflection</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleStep3Continue}
                disabled={submitting}
                style={{ ...continueBtnStyle, opacity: submitting ? 0.6 : 1 }}
              >
                See what to do next
              </button>
            </motion.div>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div style={headingStyle}>Three moves.</div>
              <div style={subtextStyle}>Pick the one that fits right now.</div>

              <div style={{ display: "grid", gap: 12 }}>
                {fixItCards.map((card, i) => {
                  const badgeColor =
                    card.type === "right_now"
                      ? "rgba(120,190,150,0.8)"
                      : card.type === "next_time"
                        ? "rgba(208,164,92,0.8)"
                        : "rgba(100,160,200,0.8)";
                  const badgeText =
                    card.type === "right_now" ? "RIGHT NOW" : card.type === "next_time" ? "NEXT TIME" : "BUILD IT";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: i * 0.08, ease: EASE }}
                      style={{ ...glassCard, padding: "20px 18px" }}
                    >
                      {rimLight}
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: badgeColor,
                            marginBottom: 10,
                          }}
                        >
                          {badgeText}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(244,244,245,0.9)", marginBottom: 6 }}>
                          {card.title}
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(161,161,170,0.65)", lineHeight: 1.65 }}>
                          {card.body}
                        </div>
                        {card.type === "build_it" && card.toolId && (
                          <button
                            type="button"
                            onClick={() => router.push(`/app/tool/${card.toolId}`)}
                            style={{
                              fontSize: 12,
                              color: "rgba(194,122,92,0.7)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              marginTop: 10,
                            }}
                          >
                            Open support
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
