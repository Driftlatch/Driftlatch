import { FadeIn } from "@/components/FadeIn";
import { HeroVisual } from "@/components/HeroVisual";
export default function Home() {
  return (
    <main className="container">
      {/* 01 HERO */}
      <FadeIn>
      <section className="section">
        <div className="kicker">DRIFTLATCH</div>
        <h1>Closeness at home. Clarity at work.</h1>
        <p style={{ maxWidth: "68ch" }}>
          Driftlatch is a privacy-first companion for founders and high-drive professionals.
          It helps you manage your cognitive state cleanly, ensuring work pressure doesn't cost your closeness at home,
          and home tension doesn't steal your focus at work.
        </p>

        <HeroVisual />

        <div className="btnRow" style={{ marginTop: 26 }}>
  <a className="btn primary" href="/app/onboarding">
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
    A short check that identifies your carryover, drift pattern and attachment style (Anxious/Avoidant) —so Driftlatch can match the right tools to your state.
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
      <h3 style={{ marginTop: 12 }}>Receive your first pack</h3>
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
            <li>You finish work, but your head doesn’t shut off.</li>
            <li>Sleep gets lighter. Mornings get heavier.</li>
            <li>Outside work, you’re present physically—mentally elsewhere.</li>
            <li>Anxious one wants closeness. The other avoidant one needs space.</li>
            <li>Stress shows up as overthinking, snapping, shutting down, or reassurance loops and both get misunderstood.</li>
            <li>
              Over time, you lose both: <span style={{ color: "var(--text)" }}>closeness at home</span>{" "}
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
        <h2>Built from simple expert tools (made effortless)</h2>
        <p className="small" style={{ maxWidth: "78ch" }}>
          Driftlatch uses practical tools drawn from performance psychology and evidence-based
          relationship dynamics without turning your life into homework.
        </p>

        <div className="grid two" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="kicker">Work clarity tools</div>
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
            <div className="kicker">Nervous system tools</div>
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
          <div className="kicker">Interaction tools</div>
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
            Driftlatch doesn’t diagnose. It helps you use the right tool at the right moment.
          </p>
        </div>
      </section>
      </FadeIn>

      {/* 06 PRICING */}
      <FadeIn>
      <section className="section">
        <h2>Founding Access</h2>
        <p className="small">No free tier. Driftlatch is built to be a system you keep.</p>

        <div className="grid two" style={{ marginTop: 18 }}>
          <div className="card premium">
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
          No. Driftlatch is a daily pressure + presence system. It helps with closure, regulation, and clean re-entry.
          It doesn’t diagnose or provide treatment.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>Why would I pay for this?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          You’re paying for structure: the right tool at the right state, a tailored library, and weekly pattern reflection—
          so it gets easier over time. Without that, it’s just reminders.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>Do you read my messages or track my phone?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          No. Driftlatch does not read messages, emails, calls, or track your phone activity. It works only from what you choose to enter.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>Is this a relationship app?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          No. Driftlatch protects two outcomes: closeness at home and clarity at work. It’s about preventing spillover and drift—especially on heavy weeks.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>What if my partner doesn’t use it?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          Driftlatch still works. One person ending the day cleanly—without disappearing or escalating—often stabilises the whole dynamic.
        </p>
      </details>
    </div>

    <div className="card">
      <details>
        <summary><strong>What’s the refund policy?</strong></summary>
        <p className="small" style={{ marginTop: 12 }}>
          14-day refund guarantee. If it doesn’t feel useful, email support and we’ll refund you—no questions asked.
        </p>
      </details>
    </div>
  </div>
</section>
</FadeIn>

      {/* FOOTER */}
      <FadeIn>
      <section className="section" style={{ paddingBottom: 40 }}>
        <div className="small">
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> ·{" "}
          <span style={{ color: "var(--muted)" }}>© {new Date().getFullYear()} Driftlatch</span>
        </div>
      </section>
      </FadeIn>
    </main>
  );
}