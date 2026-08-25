"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * TheLoop. Landing section (nav label: "The loop").
 *
 * The three beats as one rhythm, each a choose-what-you-relate-to interaction
 * in the same living aesthetic: check in, catch the moment, see the week. The
 * week beat ends on the payoff line the whole loop builds toward.
 *
 * Conventions: "use client", inline CSSProperties, no Tailwind, no em dashes.
 * Keyframes and helper classes live in globals.css (dl- prefix), not inline.
 * Static marketing: does not call selectTool, Supabase, or auth.
 */

const C: Record<string, string> = {
  clear_light: "#7FCB99", steady: "#7E9AC6", carrying_work: "#C27A5C",
  wired: "#DCAA5A", drained: "#6EA290", overloaded: "#BE6A64", clay: "#C27A5C",
};

const LEGEND = [
  { s: "clear_light", label: "Clear" },
  { s: "steady", label: "Steady" },
  { s: "carrying_work", label: "Carrying work" },
  { s: "wired", label: "Wired" },
  { s: "drained", label: "Drained" },
  { s: "overloaded", label: "Overloaded" },
];

type StateDef = { id: string; label: string; color: string; pack: string; step: string; why: string };
type DirDef = { id: string; label: string; why: string };

const STATES: StateDef[] = [
  { id: "carrying_work", label: "Still in work mode", color: C.carrying_work, pack: "Clear Head", step: "Set the work down in one pass.", why: "You are still running on work." },
  { id: "wired", label: "Wired, can't come down", color: C.wired, pack: "Wind Down", step: "Bring yourself down a notch.", why: "You are still on high alert." },
  { id: "drained", label: "Drained, nothing left", color: C.drained, pack: "Take Space", step: "Protect the little that is left.", why: "There is not much in the tank." },
  { id: "overloaded", label: "Too much at once", color: C.overloaded, pack: "Overthinking", step: "Cut the noise down to one thing.", why: "Everything is arriving at once." },
  { id: "steady", label: "Steady enough", color: C.steady, pack: "Make It Count", step: "Use the good window well.", why: "You have some room tonight." },
  { id: "clear_light", label: "Clear and light", color: C.clear_light, pack: "Stay Close", step: "Spend it on someone.", why: "You are actually clear right now." },
];
const DIRS: DirDef[] = [
  { id: "work_to_home", label: "Work is following me home", why: "So home gets you, not your inbox." },
  { id: "home_to_work", label: "Home's on my mind at work", why: "So work gets your focus back." },
  { id: "both", label: "Both, at once", why: "So neither side keeps stealing the other." },
  { id: "none", label: "Just me tonight", why: "Just for you, no one else in the frame." },
];
const MOVE_OVR: Record<string, { pack: string; step: string }> = {
  "carrying_work|work_to_home": { pack: "Be Present", step: "Re-enter home like you mean it." },
  "carrying_work|home_to_work": { pack: "Repair", step: "Mend one thread before the next thing." },
  "carrying_work|none": { pack: "Wind Down", step: "Let the day actually end." },
  "wired|both": { pack: "Overthinking", step: "Interrupt the loop before it feeds itself." },
  "steady|home_to_work": { pack: "Use the Window", step: "Aim the clarity at what matters." },
  "clear_light|none": { pack: "Stay Steady", step: "Bank it so it lasts." },
  "drained|both": { pack: "Take Space", step: "Step back before you give more." },
};
function resolveMove(sId: string, dId: string) {
  const s = STATES.find((x) => x.id === sId)!;
  const d = DIRS.find((x) => x.id === dId)!;
  const ov = MOVE_OVR[`${sId}|${dId}`];
  return { pack: ov ? ov.pack : s.pack, step: ov ? ov.step : s.step, why: `${s.why} ${d.why}`, color: s.color, a: s.label, b: d.label };
}

const WHO = [
  { id: "partner", label: "My partner" }, { id: "child", label: "One of the kids" },
  { id: "colleague", label: "A colleague" }, { id: "friend", label: "A friend" }, { id: "parent", label: "A parent" },
];
const WHAT = [
  { id: "coming_home", label: "Coming home", line: "You walked in still carrying the day, and it landed on them.", next: "Be Present", color: "#C27A5C" },
  { id: "dinner", label: "Dinner", line: "Dinner turned sharp over nothing much.", next: "Be Present", color: "#CE8A63" },
  { id: "bedtime", label: "Bedtime", line: "The end of the day got heavier than it needed to.", next: "Wind Down", color: "#B98A6A" },
  { id: "conversation", label: "A conversation", line: "A conversation tilted before you meant it to.", next: "Repair", color: "#C77A5E" },
  { id: "argument", label: "An argument", line: "It tipped into an argument you did not plan.", next: "Repair", color: "#BE6A64" },
];

type Day = { d: string; s: string; h: number; mark?: boolean };
type Week = { id: string; label: string; color: string; days: Day[]; landed: string; helped: string; payoff: string };

const WEEKS: Week[] = [
  { id: "rough", label: "A rough one", color: C.overloaded,
    days: [{ d: "M", s: "overloaded", h: 90, mark: true }, { d: "T", s: "wired", h: 78 }, { d: "W", s: "carrying_work", h: 66 }, { d: "T", s: "overloaded", h: 86, mark: true }, { d: "F", s: "wired", h: 80 }, { d: "S", s: "drained", h: 58 }, { d: "S", s: "carrying_work", h: 64 }],
    landed: "Most evenings, both directions.", helped: "Take Space, Wind Down.",
    payoff: "A heavy week. It landed most nights. You still caught two before they spread." },
  { id: "mixed", label: "A mixed one", color: C.wired,
    days: [{ d: "M", s: "steady", h: 38 }, { d: "T", s: "carrying_work", h: 58 }, { d: "W", s: "wired", h: 82, mark: true }, { d: "T", s: "carrying_work", h: 54 }, { d: "F", s: "overloaded", h: 88 }, { d: "S", s: "drained", h: 46 }, { d: "S", s: "clear_light", h: 30 }],
    landed: "Mostly midweek, work into home.", helped: "Wind Down, Take Space.",
    payoff: "Two heavy evenings. You caught one before it reached her. The week ended lighter than it began." },
  { id: "steadier", label: "A steadier one", color: C.steady,
    days: [{ d: "M", s: "steady", h: 40 }, { d: "T", s: "clear_light", h: 32 }, { d: "W", s: "steady", h: 44 }, { d: "T", s: "carrying_work", h: 50, mark: true }, { d: "F", s: "steady", h: 38 }, { d: "S", s: "clear_light", h: 30 }, { d: "S", s: "clear_light", h: 28 }],
    landed: "A couple of soft dips, caught early.", helped: "Stay Steady, Make It Count.",
    payoff: "A steadier week. Fewer spikes, quicker recoveries. It is starting to hold." },
];

const STEPS = [
  { label: "Check in", tag: "Most days" },
  { label: "Catch the moment", tag: "When it lands" },
  { label: "See the week", tag: "Every week" },
];

const cssVars = (accent: string): CSSProperties =>
  ({ ["--accent"]: accent, ["--glow"]: `${accent}66` } as CSSProperties);

export default function TheLoop() {
  const [step, setStep] = useState(0);
  const [sId, setSId] = useState("carrying_work");
  const [dId, setDId] = useState("work_to_home");
  const [whoId, setWhoId] = useState("partner");
  const [whatId, setWhatId] = useState("argument");
  const [weekId, setWeekId] = useState("mixed");

  const chip = (on: boolean, tint: string): CSSProperties => ({
    ...styles.chip,
    ...(on ? { color: "#F6F1EC", background: `${tint}22`, borderColor: `${tint}99`, boxShadow: `0 0 18px ${tint}33` } : {}),
  });

  const move = resolveMove(sId, dId);
  const who = WHO.find((x) => x.id === whoId)!;
  const what = WHAT.find((x) => x.id === whatId)!;
  const week = WEEKS.find((x) => x.id === weekId)!;

  return (
    <section id="the-loop" style={styles.section}>
      <div style={styles.grain} aria-hidden />

      <div style={styles.inner}>
        <div style={styles.head}>
          <span style={styles.eyebrow}>THE LOOP</span>
          <h2 style={styles.h2}>You carry the day home. Driftlatch helps you set it down.</h2>
          <p style={styles.sub}>
            Work follows you home. Home follows you back. One read of the moment, one move that
            fits, in under ten minutes. Choose what you relate to.
          </p>
        </div>

        <div style={styles.stepper} role="tablist" aria-label="The loop">
          <div style={styles.track} aria-hidden>
            <div style={{ ...styles.trackFill, width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
          {STEPS.map((s, i) => {
            const on = i === step, done = i < step;
            return (
              <button key={i} role="tab" aria-selected={on} onClick={() => setStep(i)} className="dl-node" style={styles.node}>
                <span className="dl-nodeDot" style={{ ...styles.nodeDot, background: on || done ? "#C27A5C" : "rgba(255,255,255,0.08)", borderColor: on ? "#E0A863" : "transparent", boxShadow: on ? "0 0 16px rgba(194,122,92,0.6)" : "none", color: on || done ? "#1A1216" : "rgba(161,161,170,0.7)" }}>{i + 1}</span>
                <span style={{ ...styles.nodeLabel, color: on ? "#F6F1EC" : "rgba(200,198,204,0.55)" }}>{s.label}</span>
                <span style={styles.nodeTag}>{s.tag}</span>
              </button>
            );
          })}
        </div>

        <div className="dl-grid">
          <div style={styles.inputs}>
            {step === 0 && (
              <>
                <Group label="How are you arriving?">
                  {STATES.map((s) => (
                    <button key={s.id} className="dl-chip" aria-pressed={s.id === sId} onClick={() => setSId(s.id)} style={chip(s.id === sId, s.color)}>
                      <span style={{ ...styles.dot, background: s.id === sId ? s.color : "rgba(255,255,255,0.18)" }} />{s.label}
                    </button>
                  ))}
                </Group>
                <Group label="Which way is it running?">
                  {DIRS.map((d) => (<button key={d.id} className="dl-chip" aria-pressed={d.id === dId} onClick={() => setDId(d.id)} style={chip(d.id === dId, C.clay)}>{d.label}</button>))}
                </Group>
              </>
            )}
            {step === 1 && (
              <>
                <Group label="Who was it with?">
                  {WHO.map((w) => (<button key={w.id} className="dl-chip" aria-pressed={w.id === whoId} onClick={() => setWhoId(w.id)} style={chip(w.id === whoId, C.clay)}>{w.label}</button>))}
                </Group>
                <Group label="What was the moment?">
                  {WHAT.map((w) => (<button key={w.id} className="dl-chip" aria-pressed={w.id === whatId} onClick={() => setWhatId(w.id)} style={chip(w.id === whatId, w.color)}>{w.label}</button>))}
                </Group>
              </>
            )}
            {step === 2 && (
              <>
                <Group label="How did your week go?">
                  {WEEKS.map((w) => (
                    <button key={w.id} className="dl-chip" aria-pressed={w.id === weekId} onClick={() => setWeekId(w.id)} style={chip(w.id === weekId, w.color)}>
                      <span style={{ ...styles.dot, background: w.id === weekId ? w.color : "rgba(255,255,255,0.18)" }} />{w.label}
                    </button>
                  ))}
                </Group>
                <div style={styles.legend}>
                  <span style={styles.legendKick}>THE COLORS</span>
                  <div style={styles.legendGrid}>
                    {LEGEND.map((l) => (
                      <span key={l.s} style={styles.legendItem}>
                        <span style={{ ...styles.legendSwatch, background: C[l.s] }} />{l.label}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {step === 0 && (
            <LiveCard accent={move.color} resetKey={`${sId}|${dId}`} kicker="YOUR MOVE" echo={<>{move.a} <span style={styles.plus}>+</span> {move.b}</>}>
              <span className="dl-r dl-pill" style={{ ...styles.pill, color: move.color, background: `${move.color}1f`, borderColor: `${move.color}66`, animationDelay: "0.02s" }}>{move.pack}</span>
              <h3 className="dl-r" style={{ ...styles.big, animationDelay: "0.1s" }}>{move.step}</h3>
              <p className="dl-r" style={{ ...styles.line, animationDelay: "0.18s" }}>{move.why}</p>
            </LiveCard>
          )}
          {step === 1 && (
            <LiveCard accent={what.color} resetKey={`${whoId}|${whatId}`} kicker="CAUGHT" echo={<>{who.label} <span style={styles.plus}>+</span> {what.label}</>}>
              <h3 className="dl-r" style={{ ...styles.big, animationDelay: "0.06s" }}>{what.line}</h3>
              <p className="dl-r" style={{ ...styles.line, animationDelay: "0.16s" }}>Logged while it is fresh. This is what teaches your week where pressure keeps landing.</p>
              <div className="dl-r" style={{ ...styles.nextRow, animationDelay: "0.26s" }}>
                <span style={styles.nextKick}>WHEN YOU ARE READY</span>
                <span style={{ ...styles.pill, color: what.color, background: `${what.color}1f`, borderColor: `${what.color}66`, marginTop: 8 }}>{what.next}</span>
              </div>
            </LiveCard>
          )}
          {step === 2 && (
            <LiveCard accent={week.color} resetKey={weekId} kicker={`YOUR WEEK · ${week.label}`}>
              <div className="dl-r" style={{ ...styles.weekWrap, animationDelay: "0.02s" }}>
                {week.days.map((w, i) => (
                  <div key={i} style={styles.weekCol}>
                    <div style={styles.weekTrack}>
                      {w.mark && <span style={styles.weekMark} />}
                      <div className="dl-bar" style={{ height: `${w.h}%`, background: `linear-gradient(180deg, ${C[w.s]} 0%, ${C[w.s]}aa 100%)`, boxShadow: `0 0 16px ${C[w.s]}40`, animationDelay: `${0.06 + i * 0.05}s`, ...styles.weekBar }} />
                    </div>
                    <span style={styles.weekDay}>{w.d}</span>
                  </div>
                ))}
              </div>
              <div className="dl-r" style={{ ...styles.readouts, animationDelay: "0.16s" }}>
                <div style={styles.readout}><span style={styles.readKick}>WHERE PRESSURE LANDED</span><span style={styles.readVal}>{week.landed}</span></div>
                <div style={styles.readout}><span style={styles.readKick}>WHAT SEEMED TO HELP</span><span style={styles.readVal}>{week.helped}</span></div>
              </div>
              <p className="dl-r" style={{ ...styles.payoff, borderLeft: `2px solid ${week.color}`, animationDelay: "0.26s" }}>{week.payoff}</p>
            </LiveCard>
          )}
        </div>

        <div style={styles.nav}>
          <button className="dl-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ ...styles.back, opacity: step === 0 ? 0.35 : 1, cursor: step === 0 ? "default" : "pointer" }}>Back</button>
          {step < STEPS.length - 1 ? (
            <button className="dl-btn" onClick={() => setStep((s) => s + 1)} style={styles.next}>{step === 0 ? "Then a hard moment" : "Then the week"}</button>
          ) : (
            <a href="/pressure-profile" style={{ ...styles.next, textDecoration: "none" }}>Start the free profile</a>
          )}
        </div>
      </div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset style={styles.group}>
      <legend style={styles.q}>{label}</legend>
      <div style={styles.chips}>{children}</div>
    </fieldset>
  );
}

function LiveCard({ accent, resetKey, kicker, echo, children }: { accent: string; resetKey: string; kicker: string; echo?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ ...styles.result, ...cssVars(accent) }}>
      <div className="dl-accent" aria-hidden />
      <div className="dl-auraA" aria-hidden />
      <div className="dl-auraB" aria-hidden />
      <div style={styles.resultContent}>
        <span style={styles.resultKicker}>{kicker}</span>
        {echo && <div style={styles.echo}>{echo}</div>}
        <div key={resetKey} style={{ display: "flex", flexDirection: "column", flex: 1 }}>{children}</div>
        <div style={styles.resultFoot}>From what you told it. Private by default.</div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { position: "relative", background: "linear-gradient(180deg, #0B0B0E 0%, #100E12 100%)", color: "#F4F4F5", padding: "clamp(52px, 9vw, 116px) 20px", overflow: "hidden" },
  grain: { position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")", opacity: 0.04, mixBlendMode: "soft-light", pointerEvents: "none" },
  inner: { position: "relative", maxWidth: 1000, margin: "0 auto" },
  head: { maxWidth: 640, marginBottom: 36 },
  eyebrow: { fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(194,122,92,0.85)" },
  h2: { fontFamily: "var(--font-serif)", margin: "16px 0 0", fontSize: "clamp(1.75rem, 4.2vw, 2.5rem)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.12, color: "#F6F1EC", maxWidth: 620 },
  sub: { fontFamily: "var(--font-sans)", margin: "16px 0 0", fontSize: 16, lineHeight: 1.55, color: "rgba(200,198,204,0.72)" },
  stepper: { position: "relative", display: "flex", justifyContent: "space-between", marginBottom: 30, maxWidth: 620 },
  track: { position: "absolute", top: 15, left: "12%", right: "12%", height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2 },
  trackFill: { height: "100%", background: "linear-gradient(90deg, #C27A5C, #E0A863)", borderRadius: 2, transition: "width 380ms cubic-bezier(0.22,1,0.36,1)" },
  node: { position: "relative", zIndex: 1, appearance: "none", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer", flex: 1, padding: 0 },
  nodeDot: { fontFamily: "var(--font-sans)", width: 32, height: 32, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, transition: "all 260ms ease" },
  nodeLabel: { fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, transition: "color 200ms ease", textAlign: "center" },
  nodeTag: { fontFamily: "var(--font-sans)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(161,161,170,0.5)" },
  inputs: { display: "flex", flexDirection: "column", gap: 24 },
  group: { border: "none", margin: 0, padding: 0 },
  q: { fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", color: "rgba(200,198,204,0.55)", marginBottom: 12, padding: 0 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { fontFamily: "var(--font-sans)", appearance: "none", display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)", color: "rgba(244,244,245,0.6)", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  legend: { marginTop: 4, padding: "18px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" },
  legendKick: { fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(161,161,170,0.55)" },
  legendGrid: { marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "11px 14px" },
  legendItem: { fontFamily: "var(--font-sans)", display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13, color: "rgba(200,198,204,0.75)" },
  legendSwatch: { width: 11, height: 11, borderRadius: 4, flexShrink: 0 },
  result: { position: "relative", minHeight: 340, borderRadius: 22, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(18,18,22,0.9)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", overflow: "hidden", isolation: "isolate" },
  resultContent: { position: "relative", zIndex: 1, padding: "30px 32px 24px", display: "flex", flexDirection: "column", minHeight: 340 },
  resultKicker: { fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(161,161,170,0.65)" },
  echo: { fontFamily: "var(--font-sans)", marginTop: 10, fontSize: 13.5, color: "rgba(200,198,204,0.7)", lineHeight: 1.6 },
  plus: { color: "rgba(194,122,92,0.9)", margin: "0 3px", fontWeight: 600 },
  pill: { fontFamily: "var(--font-sans)", display: "inline-block", width: "fit-content", marginTop: 22, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", padding: "5px 12px", borderRadius: 999, border: "1px solid" },
  big: { fontFamily: "var(--font-serif)", margin: "14px 0 0", fontSize: "clamp(1.4rem, 3.3vw, 1.9rem)", fontWeight: 600, lineHeight: 1.14, letterSpacing: "-0.01em", color: "#F6F1EC" },
  line: { fontFamily: "var(--font-sans)", margin: "12px 0 0", fontSize: 15, lineHeight: 1.55, color: "rgba(200,198,204,0.7)", maxWidth: 400 },
  nextRow: { marginTop: 20, display: "flex", flexDirection: "column", alignItems: "flex-start" },
  nextKick: { fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", color: "rgba(226,178,132,0.75)" },
  weekWrap: { display: "flex", alignItems: "flex-end", gap: 12, height: 128, marginTop: 22, maxWidth: 360, borderBottom: "1px solid rgba(255,255,255,0.08)" },
  weekCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, height: "100%" },
  weekTrack: { position: "relative", flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" },
  weekBar: { width: "74%", borderRadius: "7px 7px 2px 2px", minHeight: 10 },
  weekMark: { position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 7, height: 7, borderRadius: "50%", background: "#F4E3CE", boxShadow: "0 0 0 3px rgba(244,199,154,0.25), 0 0 10px rgba(240,199,154,0.9)", zIndex: 3 },
  weekDay: { fontFamily: "var(--font-sans)", fontSize: 11, color: "rgba(161,161,170,0.6)" },
  readouts: { display: "flex", gap: 26, marginTop: 24, flexWrap: "wrap" },
  readout: { display: "flex", flexDirection: "column", gap: 5 },
  readKick: { fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: "rgba(161,161,170,0.6)" },
  readVal: { fontFamily: "var(--font-sans)", fontSize: 14, color: "rgba(246,241,236,0.85)" },
  payoff: { fontFamily: "var(--font-serif)", margin: "24px 0 0", paddingLeft: 16, fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", lineHeight: 1.42, letterSpacing: "-0.01em", color: "#F6F1EC", maxWidth: 470 },
  resultFoot: { fontFamily: "var(--font-sans)", marginTop: "auto", paddingTop: 22, fontSize: 12, color: "rgba(161,161,170,0.5)" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 26, maxWidth: 620 },
  back: { fontFamily: "var(--font-sans)", appearance: "none", border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "rgba(244,244,245,0.75)", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 500 },
  next: { fontFamily: "var(--font-sans)", appearance: "none", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#1A1216", background: "linear-gradient(180deg, #D89066 0%, #C27A5C 100%)", boxShadow: "0 8px 24px rgba(194,122,92,0.28)", cursor: "pointer" },
};
