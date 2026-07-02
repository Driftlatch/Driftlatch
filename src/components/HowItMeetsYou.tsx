"use client";

import { useState, type CSSProperties } from "react";

/**
 * HowItMeetsYou. Landing section (nav label: "How it works").
 *
 * The routing differentiator, interactive: choose how you are arriving and
 * which way the pressure runs, get one matched move. Expand to reveal the
 * rest it reads (time, who is around). The result surface breathes in the
 * selected state's color.
 *
 * Conventions: "use client", inline CSSProperties, no Tailwind, no em dashes.
 * Keyframes and helper classes live in globals.css (dl- prefix), not inline.
 * Static marketing: does not call selectTool, Supabase, or auth.
 */

type StateDef = { id: string; label: string; color: string; pack: string; step: string; why: string };
type DirDef = { id: string; label: string; why: string };
type TimeDef = { id: number; label: string; scope: string };
type SituationDef = { id: string; label: string; note: string };

const STATES: StateDef[] = [
  { id: "carrying_work", label: "Still in work mode", color: "#C27A5C", pack: "Clear Head", step: "Set the work down in one pass.", why: "You are still running on work." },
  { id: "wired", label: "Wired, can't come down", color: "#DCAA5A", pack: "Wind Down", step: "Bring yourself down a notch.", why: "You are still on high alert." },
  { id: "drained", label: "Drained, nothing left", color: "#6EA290", pack: "Take Space", step: "Protect the little that is left.", why: "There is not much in the tank." },
  { id: "overloaded", label: "Too much at once", color: "#BE6A64", pack: "Overthinking", step: "Cut the noise down to one thing.", why: "Everything is arriving at once." },
  { id: "steady", label: "Steady enough", color: "#7E9AC6", pack: "Make It Count", step: "Use the good window well.", why: "You have some room tonight." },
  { id: "clear_light", label: "Clear and light", color: "#7FCB99", pack: "Stay Close", step: "Spend it on someone.", why: "You are actually clear right now." },
];

const DIRS: DirDef[] = [
  { id: "work_to_home", label: "Work is following me home", why: "So home gets you, not your inbox." },
  { id: "home_to_work", label: "Home's on my mind at work", why: "So work gets your focus back." },
  { id: "both", label: "Both, at once", why: "So neither side keeps stealing the other." },
  { id: "none", label: "Just me tonight", why: "Just for you, no one else in the frame." },
];

const TIMES: TimeDef[] = [
  { id: 1, label: "1 min", scope: "The smallest real version." },
  { id: 3, label: "3 min", scope: "The everyday version." },
  { id: 5, label: "5 min", scope: "A bit more room to work with." },
  { id: 10, label: "10 min", scope: "The full thing, unhurried." },
];

const SITUATIONS: SituationDef[] = [
  { id: "alone", label: "Alone", note: "Out loud if it helps. You have the room." },
  { id: "partner_nearby", label: "Partner nearby", note: "A quiet version, so it does not pull them in." },
  { id: "kids_around", label: "Kids around", note: "Keep it in your head. No one needs to notice." },
  { id: "housemates_around", label: "Housemates around", note: "Low-key, even with people in the flat." },
  { id: "long_distance", label: "Long distance", note: "A version that travels down a phone line." },
];

const OVERRIDES: Record<string, { pack: string; step: string }> = {
  "carrying_work|work_to_home": { pack: "Be Present", step: "Re-enter home like you mean it." },
  "carrying_work|home_to_work": { pack: "Repair", step: "Mend one thread before the next thing." },
  "carrying_work|none": { pack: "Wind Down", step: "Let the day actually end." },
  "wired|both": { pack: "Overthinking", step: "Interrupt the loop before it feeds itself." },
  "steady|home_to_work": { pack: "Use the Window", step: "Aim the clarity at what matters." },
  "clear_light|none": { pack: "Stay Steady", step: "Bank it so it lasts." },
  "drained|both": { pack: "Take Space", step: "Step back before you give more." },
};

function resolve(stateId: string, dirId: string) {
  const s = STATES.find((x) => x.id === stateId)!;
  const d = DIRS.find((x) => x.id === dirId)!;
  const ov = OVERRIDES[`${stateId}|${dirId}`];
  return {
    pack: ov ? ov.pack : s.pack,
    step: ov ? ov.step : s.step,
    why: `${s.why} ${d.why}`,
    color: s.color,
    stateLabel: s.label,
    dirLabel: d.label,
  };
}

const cssVars = (accent: string): CSSProperties =>
  ({ ["--accent"]: accent, ["--glow"]: `${accent}66` } as CSSProperties);

export default function HowItMeetsYou() {
  const [stateId, setStateId] = useState("carrying_work");
  const [dirId, setDirId] = useState("work_to_home");
  const [timeId, setTimeId] = useState(3);
  const [situationId, setSituationId] = useState("alone");
  const [open, setOpen] = useState(false);

  const r = resolve(stateId, dirId);
  const t = TIMES.find((x) => x.id === timeId)!;
  const sit = SITUATIONS.find((x) => x.id === situationId)!;
  const swapKey = `${stateId}|${dirId}|${timeId}|${situationId}|${open}`;

  const chip = (on: boolean, tint?: string): CSSProperties => ({
    ...styles.chip,
    ...(on
      ? {
          color: "#F6F1EC",
          background: tint ? `${tint}22` : "rgba(194,122,92,0.14)",
          borderColor: tint ? `${tint}99` : "rgba(194,122,92,0.5)",
          boxShadow: tint ? `0 0 18px ${tint}33` : "0 0 18px rgba(194,122,92,0.22)",
        }
      : {}),
  });

  return (
    <section id="how-it-meets-you" style={styles.section}>
      <div style={styles.grain} aria-hidden />

      <div style={styles.inner}>
        <div style={styles.head}>
          <span style={styles.eyebrow}>HOW IT WORKS</span>
          <h2 style={styles.h2}>You bring the moment. Driftlatch finds the move.</h2>
          <p style={styles.sub}>
            Not one exercise for everyone. It reads where the pressure is landing, and which
            way it is running, then points you at the one thing that fits.
          </p>
        </div>

        <div className="dl-grid">
          <div style={styles.inputs}>
            <fieldset style={styles.group}>
              <legend style={styles.q}>How are you arriving?</legend>
              <div style={styles.chips}>
                {STATES.map((s) => {
                  const on = s.id === stateId;
                  return (
                    <button key={s.id} className="dl-chip" aria-pressed={on} onClick={() => setStateId(s.id)} style={chip(on, s.color)}>
                      <span style={{ ...styles.dot, background: on ? s.color : "rgba(255,255,255,0.18)" }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset style={styles.group}>
              <legend style={styles.q}>Which way is it running?</legend>
              <div style={styles.chips}>
                {DIRS.map((d) => {
                  const on = d.id === dirId;
                  return (
                    <button key={d.id} className="dl-chip" aria-pressed={on} onClick={() => setDirId(d.id)} style={chip(on, "#C27A5C")}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button className="dl-refine" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={styles.refine}>
              <span style={{ ...styles.chevron, transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>&rsaquo;</span>
              {open ? "The details it also reads" : "Add the details it also reads"}
            </button>

            <div className={`dl-collapse ${open ? "open" : ""}`}>
              <div style={styles.collapseInner}>
                <div style={styles.refineWrap}>
                  <fieldset style={styles.group}>
                    <legend style={styles.q}>How long have you got?</legend>
                    <div style={styles.chips}>
                      {TIMES.map((x) => {
                        const on = x.id === timeId;
                        return (
                          <button key={x.id} className="dl-chip" aria-pressed={on} onClick={() => setTimeId(x.id)} style={chip(on, "#C27A5C")}>
                            {x.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset style={styles.group}>
                    <legend style={styles.q}>Who's around?</legend>
                    <div style={styles.chips}>
                      {SITUATIONS.map((x) => {
                        const on = x.id === situationId;
                        return (
                          <button key={x.id} className="dl-chip" aria-pressed={on} onClick={() => setSituationId(x.id)} style={chip(on, "#C27A5C")}>
                            {x.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...styles.result, ...cssVars(r.color) }}>
            <div className="dl-accent" aria-hidden />
            <div className="dl-auraA" aria-hidden />
            <div className="dl-auraB" aria-hidden />
            <div style={styles.resultContent}>
              <span style={styles.resultKicker}>YOUR MOVE</span>
              <div style={styles.echo}>
                {r.stateLabel} <span style={styles.plus}>+</span> {r.dirLabel}
                {open && (
                  <>
                    {" "}
                    <span style={styles.plus}>+</span> {t.label} <span style={styles.plus}>+</span> {sit.label}
                  </>
                )}
              </div>

              <div key={swapKey}>
                <span className="dl-r dl-pill" style={{ ...styles.pill, color: r.color, background: `${r.color}1f`, borderColor: `${r.color}66`, animationDelay: "0.02s" }}>
                  {r.pack}
                </span>
                <h3 className="dl-r" style={{ ...styles.step, animationDelay: "0.1s" }}>{r.step}</h3>
                <p className="dl-r" style={{ ...styles.why, animationDelay: "0.18s" }}>{r.why}</p>

                {open && (
                  <div className="dl-r" style={{ ...styles.tuned, animationDelay: "0.26s" }}>
                    <span style={styles.tunedKicker}>TUNED TO YOU</span>
                    <div style={styles.tunedRow}>
                      <span style={styles.tunedTime}>{t.label}</span>
                      {t.scope}
                    </div>
                    <div style={styles.tunedRow}>{sit.note}</div>
                  </div>
                )}
              </div>

              <div style={styles.resultFoot}>Matched from what you told it. One of 220 supports.</div>
            </div>
          </div>
        </div>

        <div style={styles.foot}>
          <a href="/pressure-profile" style={styles.cta}>Start the free profile</a>
          <span style={styles.footNote}>Two minutes. No account needed.</span>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { position: "relative", background: "linear-gradient(180deg, #0B0B0E 0%, #100E12 100%)", color: "#F4F4F5", padding: "clamp(64px, 9vw, 116px) 20px", overflow: "hidden" },
  grain: { position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")", opacity: 0.04, mixBlendMode: "soft-light", pointerEvents: "none" },
  inner: { position: "relative", maxWidth: 1000, margin: "0 auto" },
  head: { maxWidth: 620, marginBottom: 40 },
  eyebrow: { fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(194,122,92,0.85)" },
  h2: { fontFamily: "var(--font-serif)", margin: "16px 0 0", fontSize: "clamp(1.9rem, 4.8vw, 2.8rem)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, color: "#F6F1EC" },
  sub: { fontFamily: "var(--font-sans)", margin: "16px 0 0", fontSize: 16, lineHeight: 1.55, color: "rgba(200,198,204,0.72)" },
  inputs: { display: "flex", flexDirection: "column", gap: 24 },
  group: { border: "none", margin: 0, padding: 0 },
  q: { fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", color: "rgba(200,198,204,0.55)", marginBottom: 12, padding: 0 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { fontFamily: "var(--font-sans)", appearance: "none", display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)", color: "rgba(244,244,245,0.6)", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  refine: { fontFamily: "var(--font-sans)", appearance: "none", display: "inline-flex", alignItems: "center", gap: 8, marginTop: 2, padding: "4px 2px", border: "none", background: "transparent", color: "rgba(194,122,92,0.85)", fontSize: 14, fontWeight: 500, cursor: "pointer", alignSelf: "flex-start" },
  chevron: { display: "inline-block", fontSize: 18, lineHeight: 1, transition: "transform 260ms cubic-bezier(0.22,1,0.36,1)" },
  collapseInner: { overflow: "hidden" },
  refineWrap: { display: "flex", flexDirection: "column", gap: 22, paddingTop: 18 },
  result: { position: "relative", minHeight: 300, borderRadius: 22, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(18,18,22,0.9)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", overflow: "hidden", isolation: "isolate" },
  resultContent: { position: "relative", zIndex: 1, padding: "30px 30px 22px", display: "flex", flexDirection: "column", minHeight: 300 },
  resultKicker: { fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(161,161,170,0.65)" },
  echo: { fontFamily: "var(--font-sans)", marginTop: 10, fontSize: 13.5, color: "rgba(200,198,204,0.7)", lineHeight: 1.6 },
  plus: { color: "rgba(194,122,92,0.9)", margin: "0 3px", fontWeight: 600 },
  pill: { fontFamily: "var(--font-sans)", display: "inline-block", marginTop: 22, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", padding: "5px 12px", borderRadius: 999, border: "1px solid" },
  step: { fontFamily: "var(--font-serif)", margin: "14px 0 0", fontSize: "clamp(1.5rem, 3.4vw, 1.95rem)", fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.01em", color: "#F6F1EC" },
  why: { fontFamily: "var(--font-sans)", margin: "12px 0 0", fontSize: 15, lineHeight: 1.55, color: "rgba(200,198,204,0.7)", maxWidth: 380 },
  tuned: { marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.08)" },
  tunedKicker: { fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(226,178,132,0.75)" },
  tunedRow: { fontFamily: "var(--font-sans)", marginTop: 9, fontSize: 14, lineHeight: 1.5, color: "rgba(200,198,204,0.72)", display: "flex", gap: 8, alignItems: "baseline" },
  tunedTime: { color: "#F6F1EC", fontWeight: 600, fontSize: 13 },
  resultFoot: { fontFamily: "var(--font-sans)", marginTop: "auto", paddingTop: 20, fontSize: 12.5, color: "rgba(161,161,170,0.5)" },
  foot: { marginTop: 38, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" },
  cta: { fontFamily: "var(--font-sans)", textDecoration: "none", display: "inline-block", borderRadius: 10, padding: "13px 26px", fontSize: 15, fontWeight: 600, color: "#1A1216", background: "linear-gradient(180deg, #D89066 0%, #C27A5C 100%)", boxShadow: "0 8px 24px rgba(194,122,92,0.28)" },
  footNote: { fontFamily: "var(--font-sans)", fontSize: 13, color: "rgba(161,161,170,0.6)" },
};
