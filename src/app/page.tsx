import { FadeIn } from "@/components/FadeIn";
import { HeroVisual } from "@/components/HeroVisual";
export default function Home() {
  return (
    <main className="container">
      {/* 01 HERO */}
      <FadeIn>
      <section className="section">
        <div className="kicker">DRIFTLATCH</div>
        <h1>Closeness at home. Clarity at work. Kept intact.</h1>
        <p style={{ maxWidth: "68ch" }}>
          Driftlatch is a privacy-first system for founders and high-drive professionals.
          It helps you build emotional intelligence under pressure, so work does not follow you home and home tension does not take your edge at work.
        </p>

        <HeroVisual />

        <div className="btnRow" style={{ marginTop: 26 }}>
  <a className="btn primary" href="/pressure-profile">
    Take the Pressure Profile (2 min)
  </a>
  <a className="btn ghost" href="/buy?plan=annual">
    Start Annual
  </a>
  <a className="btn ghost" href="/buy?plan=monthly">
    Start Monthly
  </a>
  <a className="btn ghost" href="/pricing">
    Pricing
  </a>
</div>

        <p className="small" style={{ marginTop: 14 }}>
          Start with a 2-minute profile. Then choose a pack. 14-day refund guarantee. No message reading. No activity tracking.
        </p>
      </section>
      </FadeIn>
      {/* 01B PRESSURE PROFILE (Liven-style structure, Driftlatch wording) */}
<FadeIn>
<section className="section">
  <h2>Start with a Pressure Profile</h2>
  <p className="small" style={{ maxWidth: "78ch" }}>
    A short check that identifies your carryover, drift pattern and attachment style (Anxious/Avoidant) —so Driftlatch can match the right kind of support to your state.
    No tracking. No message reading. Just what you choose to enter.
  </p>

  <div className="grid three" style={{ marginTop: 18 }}>
    <div className="card">
      <div className="badge">1</div>
      <h3 style={{ marginTop: 12 }}>Take a 2-minute profile</h3>
      <p className="small">Answer a few questions about carryover, sleep, and stress response.</p>
    </div>

    <div className="card">
      <div className="badge">2</div>
      <h3 style={{ marginTop: 12 }}>Get your pattern</h3>
      <p className="small">You’ll see what’s stealing clarity at work and closeness at home—without labels.</p>
    </div>

    <div className="card">
      <div className="badge">3</div>
      <h3 style={{ marginTop: 12 }}>Receive your first support pack</h3>
      <p className="small">Late-night shutdown, low-sleep day, overloaded &amp; reactive, clean re-entry, and more.</p>
    </div>
  </div>

  <div className="btnRow" style={{ marginTop: 18 }}>
    <a className="btn primary" href="/app/onboarding">Take the Pressure Profile</a>
    <a className="btn ghost" href="#pricing">See Founding Access</a>
  </div>
</section>
</FadeIn>

      {/* 02 PAIN */}
      <FadeIn>
      <section className="section">
        <h2>If this feels familiar, you’re not alone.</h2>

        <div className="painLine" style={{ maxWidth: "78ch" }}>
          <ul style={{ color: "var(--muted)", marginTop: 0 }}>
            <li>You close the laptop, but your brain keeps going.</li>
            <li>Sleep gets lighter. The next morning starts heavier.</li>
            <li>You’re home, but part of you is still in the workday.</li>
            <li>One of you reaches for closeness. The other reaches for space.</li>
            <li>Stress shows up as snapping, shutting down, overthinking, or reassurance loops.</li>
            <li>
              Left alone long enough, it costs both: <span style={{ color: "var(--text)" }}>closeness at home</span>{" "}
              and <span style={{ color: "var(--text)" }}>clarity at work</span>.
            </li>
          </ul>

          <p className="small" style={{ marginTop: 12 }}>
            Most people don’t lose it suddenly — they lose it slowly when days pass without having the cognitive load managed cleanly.
          </p>
          <p className="small" style={{ marginTop: 10 }}>
  Driftlatch breaks this pattern by lowering pressure first — then giving one clean next step that protects both.
</p>
        </div>
      </section>
      </FadeIn>

      {/* 03 HOW IT WORKS */}
      <FadeIn>
      <section className="section">
        <h2>How it works</h2>

        <div className="grid three" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="badge">Step 1</div>
            <h3 style={{ marginTop: 12 }}>Presence check</h3>
            <p className="small">
              10 seconds to mark what’s true right now: carrying work, drained, wired, overloaded.
            </p>
          </div>

          <div className="card">
            <div className="badge">Step 2</div>
            <h3 style={{ marginTop: 12 }}>One grounded action</h3>
            <p className="small">
              Driftlatch chooses one action that fits your energy, time, and situation—closure,
              downshift, or clean re-entry.
            </p>
          </div>

          <div className="card">
            <div className="badge">Step 3</div>
            <h3 style={{ marginTop: 12 }}>Re-entry + closure</h3>
            <p className="small">
              End the day in a way that protects recovery and protects connection—without emotional
              performance.
            </p>
          </div>
        </div>

        <p className="small" style={{ marginTop: 14 }}>
          No streaks. No guilt. Use it when life is busy.
        </p>
      </section>
      </FadeIn>

      {/* 04 SPLIT: HOME vs WORK (only background change) */}
      <FadeIn>
      <section className="section">
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: 26,
            boxShadow: "var(--shadow)",
          }}
        >
          <h2 style={{ marginBottom: 18 }}>A system that protects both.</h2>

          <div className="grid two">
            <div>
              <div className="kicker">Closeness at home</div>
              <ul style={{ color: "var(--muted)" }}>
                <li>Less misinterpretation of silence or distance</li>
                <li>Less “space vs reassurance” friction on heavy weeks</li>
                <li>More steadiness in small moments</li>
              </ul>
            </div>

            <div>
              <div className="kicker">Clarity at work</div>
              <ul style={{ color: "var(--muted)" }}>
                <li>Cleaner mental shutdowns</li>
                <li>Better sleep and recovery</li>
                <li>More consistent focus and decision-making</li>
              </ul>
            </div>
          </div>

          <div className="hr" />

          <p className="small">
            High performance isn’t the problem. <span style={{ color: "var(--text)" }}>Unclosed days</span> are.
          </p>
        </div>
      </section>
      </FadeIn>

      {/* 05 EXPERT TOOLS */}
      <FadeIn>
      <section className="section">
        <h2>A calmer system for hard days.</h2>
        <p className="small" style={{ maxWidth: "78ch" }}>
          Driftlatch turns proven practices into short resets and grounded next steps, without turning your life into homework.
        </p>

        <div className="grid two" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="kicker">Work clarity support</div>
            <ul style={{ color: "var(--muted)" }}>
              <li>
                <span style={{ color: "var(--text)" }}>Shutdown ritual</span>: capture open loops → set tomorrow’s first
                step → close the day
              </li>
              <li>
                <span style={{ color: "var(--text)" }}>Worry container</span>: give rumination a time slot so it stops
                hijacking nights
              </li>
              <li>
                <span style={{ color: "var(--text)" }}>If–then plans</span>: tiny rules that hold under pressure
              </li>
            </ul>
          </div>

          <div className="card">
            <div className="kicker">Nervous system resets</div>
            <ul style={{ color: "var(--muted)" }}>
              <li>
                <span style={{ color: "var(--text)" }}>STOP pause</span>: interrupt reactive replies before they happen
              </li>
              <li>
                <span style={{ color: "var(--text)" }}>Downshift resets</span>: breath / movement / temperature—fast calm
              </li>
              <li>
                <span style={{ color: "var(--text)" }}>Grounding</span>: a simple reset when you feel overloaded
              </li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 24 }} className="card">
          <div className="kicker">Interaction support</div>
          <ul style={{ color: "var(--muted)" }}>
            <li>
              <span style={{ color: "var(--text)" }}>Name the state</span>: “I’m overloaded, not upset.”
            </li>
            <li>
              <span style={{ color: "var(--text)" }}>Time-out with return time</span>: space without disappearing
            </li>
            <li>
              <span style={{ color: "var(--text)" }}>Re-entry language</span>: a clean way back in after distance
            </li>
          </ul>
          <p className="small" style={{ marginTop: 12 }}>
            Driftlatch doesn’t diagnose. It helps you find the right next step at the right moment.
          </p>
        </div>
      </section>
      </FadeIn>

      {/* 06 PRICING */}
      <FadeIn>
      <section className="section" id="pricing">
        <h2>Founding Access</h2>
        <p className="small">No free tier. Driftlatch is built to be a system you keep.</p>
        <p className="small" style={{ marginTop: 8 }}>
          Both plans include full access. Annual just costs less.
        </p>

        <div className="grid two" style={{ marginTop: 18 }}>
          <div
            className="card premium"
            style={{
              border: "1px solid rgba(194,122,92,0.28)",
              boxShadow: "0 18px 40px rgba(194,122,92,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
              background: "linear-gradient(180deg, rgba(194,122,92,0.08) 0%, rgba(255,255,255,0.02) 100%)",
            }}
          >
            <div className="kicker">Annual (Best value)</div>
            <p style={{ marginBottom: 6 }}>
              <strong>$59 / year</strong>
            </p>
            <p className="small">
              Full access. Best for building consistency under pressure.
            </p>

            <div className="btnRow">
              <a className="btn primary" href="/buy?plan=annual">Start Annual</a>
              <a className="btn ghost" href="/pricing">Read details</a>
            </div>
            <p className="small" style={{ marginTop: 10 }}>
              Secure checkout via Paddle.
            </p>

            <p className="small" style={{ marginTop: 12 }}>
              14-day refund guarantee—no questions asked.
            </p>
          </div>

          <div className="card">
            <div className="kicker">Monthly</div>
            <p style={{ marginBottom: 6 }}>
              <strong>$9.99 / month</strong>
            </p>
            <p className="small">
              Flexible. Switch to annual anytime.
            </p>

            <div className="btnRow">
              <a className="btn ghost" href="/buy?plan=monthly">Start Monthly</a>
            </div>
            <p className="small" style={{ marginTop: 10 }}>
              Secure checkout via Paddle.
            </p>

            <p className="small" style={{ marginTop: 12 }}>
              Includes the same system—just billed monthly.
            </p>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* 07 PRIVACY PROMISE */}
      <FadeIn>
      <section className="section">
        <div className="stamp">
          <div className="stampTitle">
            <span style={{ color: "var(--accent)" }}>🔒</span>
            <span>Privacy-first guarantee</span>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            Driftlatch does not read your messages, emails, or calls. Driftlatch does not track your phone activity.
            It works only from what you choose to enter. Export or delete your data anytime.
          </p>
          <div style={{ marginTop: 12 }} className="badge">
            Trust isn’t a feature. It’s the baseline.
          </div>
        </div>
      </section>
      </FadeIn>

{/* 08 FAQ */}
<FadeIn>
<section className="section">
  <h2>FAQ</h2>
  <p className="small" style={{ maxWidth: "78ch" }}>
    Short answers, no fluff.
  </p>

  <div className="grid" style={{ marginTop: 18 }}>
    <div className="card">
      <details>
        <summary><strong>Is Driftlatch therapy?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          No. Driftlatch is a daily pressure and presence system for cleaner shutdowns, steadier evenings, and better re-entry.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>Why would I pay for this?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          You’re paying for structure: the right next step for your state, a tailored library, and weekly reflection that makes the whole system easier to use over time. In real life, that helps you build emotional intelligence under pressure.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>Do you read my messages or track my phone?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          No. Driftlatch only works from what you choose to enter.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>Is this a relationship app?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          No. Driftlatch protects two outcomes: closeness at home and clarity at work. It is built to reduce spillover, especially on heavy weeks.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>What if my partner doesn’t use it?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          Driftlatch still helps. One person ending the day cleanly often changes the tone of the whole dynamic.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>What’s the refund policy?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          14-day refund guarantee. If it is not useful, email support and we will refund you.
        </p>
      </details>
    </div>
  </div>
</section>
</FadeIn>

      {/* FOOTER */}
      <FadeIn>
      <footer
        className="section public-footer"
        style={{
          marginTop: 20,
          paddingTop: 26,
          paddingBottom: 40,
          borderTop: "1px solid var(--border)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span
                aria-hidden
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: "radial-gradient(circle at 30% 30%, rgba(214,150,120,1) 0%, rgba(194,122,92,1) 55%, rgba(146,86,63,1) 100%)",
                  boxShadow: "0 0 18px rgba(194,122,92,0.22)",
                }}
              />
              <span style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "0.04em" }}>Driftlatch</span>
            </div>
            <p className="small" style={{ margin: 0, maxWidth: 320 }}>
              Built for founders and high-drive professionals who want a cleaner end to the day and a steadier start to the next one.
            </p>
            <div className="small" style={{ color: "var(--muted)" }}>
              © {new Date().getFullYear()} Driftlatch. All rights reserved.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              minWidth: "min(100%, 320px)",
            }}
          >
            <div className="small" style={{ color: "var(--text)", fontWeight: 700 }}>
              Quick links
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 18px",
              }}
            >
              <a href="/pricing" style={{ color: "var(--muted)", textDecoration: "none", transition: "color 0.2s ease" }}>Pricing</a>
              <a href="/terms" style={{ color: "var(--muted)", textDecoration: "none", transition: "color 0.2s ease" }}>Terms</a>
              <a href="/privacy" style={{ color: "var(--muted)", textDecoration: "none", transition: "color 0.2s ease" }}>Privacy</a>
              <a href="/refunds" style={{ color: "var(--muted)", textDecoration: "none", transition: "color 0.2s ease" }}>Refunds</a>
              <a href="mailto:support@driftlatch.com" style={{ color: "var(--muted)", textDecoration: "none", transition: "color 0.2s ease" }}>Support</a>
            </div>
          </div>
        </div>
      </footer>
      </FadeIn>
    </main>
  );
}
