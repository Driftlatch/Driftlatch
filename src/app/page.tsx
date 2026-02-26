export default function Home() {
  return (
    <main className="container">
      {/* HERO */}
      <section className="card">
        <div className="kicker">Driftlatch</div>
        <h1>Build hard without burning out.</h1>
        <p>
          Driftlatch helps founders and high-drive professionals transition cleanly ensuring work
          pressure doesn’t cost you your closeness at home, and unspoken tension doesn't steal your focus at work
          .
        </p>

        <div className="btnRow">
          <a className="btn" href="/buy?plan=annual">Start now (Annual)</a>
          <a className="btn secondary" href="/buy?plan=monthly">Start monthly</a>
          <a className="btn secondary" href="/pricing">See pricing</a>
        </div>

        <p className="small" style={{ marginTop: 10 }}>
          14-day refund guarantee. Privacy-first. No message reading. No activity tracking.
        </p>
      </section>

      <div className="divider" />

      {/* PAIN + WHAT IT DOES */}
      <section className="grid two">
        <div className="card">
          <h2>If you’re running hot, this will feel familiar.</h2>
          <ul>
            <li>You’re productive, but you’re not recovering.</li>
            <li>Even off-hours feel like catch-up time.</li>
            <li>Your brain stays on—sleep gets lighter, mornings get heavier.</li>
            <li>Outside work, you’re there… but not fully there.</li>
            <li>Stress shows up as overthinking, snapping, shutting down, or needing reassurance.</li>
            <li>Over time, you lose both: performance at work and closeness outside it.</li>
          </ul>
          <p className="small" style={{ marginTop: 10 }}>
            Burnout isn’t just exhaustion. It’s when pressure starts stealing from everything else.
          </p>
        </div>

        <div className="card">
          <h2>Not therapy. Not productivity.</h2>
          <p>
            Driftlatch is a pressure and recovery system that fits real life. It helps you
            recognise your state after a demanding day and gives you one grounded next step. Keep work from drifting
            into your night and keep home tension from bleeding into your focus tomorrow.
          </p>
          <ul>
            <li><strong>Work:</strong> reduce mental carryover, decision fatigue, next-day fog.</li>
            <li><strong>Life:</strong> stay emotionally present without big talks or extra effort.</li>
          </ul>
          <p className="small" style={{ marginTop: 10 }}>
            No diagnosing. No preaching. Just the right tool at the right moment.
          </p>
        </div>
      </section>

      <div className="divider" />

      {/* HOW IT WORKS */}
      <section className="card">
        <h2>How it works</h2>
        <p><strong>1) Presence check (10 seconds)</strong><br/>You mark what’s true right now: carrying work, drained, wired, overloaded.</p>
        <p><strong>2) One grounded action (1–10 minutes)</strong><br/>Driftlatch gives you one action that fits your energy, time, and situation—closure, nervous system reset, or clean re-entry.</p>
        <p><strong>3) Re-entry + closure</strong><br/>You end the day in a way that protects recovery and protects connection.</p>
        <p className="small">No streaks. No guilt. Use it when life is busy.</p>
      </section>

      <div className="divider" />

      {/* EXPERT TOOLS */}
      <section className="card">
        <h2>Built from simple expert tools (made effortless)</h2>
        <p>
          Driftlatch uses practical techniques drawn from performance psychology,
          preventing burnout, and evidence-based relationship dynamics without turning your
          life into homework.
        </p>

        <section className="grid two">
          <div className="card">
            <div className="kicker">Work clarity tools</div>
            <ul>
              <li><strong>Shutdown ritual:</strong> capture open loops → set tomorrow’s first step → close the day</li>
              <li><strong>Worry container:</strong> give rumination a time slot so it stops hijacking nights</li>
              <li><strong>If–then plans:</strong> tiny rules that hold under stress</li>
            </ul>
          </div>

          <div className="card">
            <div className="kicker">Nervous system tools</div>
            <ul>
              <li><strong>STOP pause:</strong> interrupt reactive replies before they happen</li>
              <li><strong>Downshift resets:</strong> breath / movement / temperature—fast calm</li>
              <li><strong>Grounding:</strong> a simple reset when you feel overloaded</li>
            </ul>
          </div>
        </section>

        <div className="divider" />

        <div className="card">
          <div className="kicker">Interaction tools</div>
          <ul>
            <li><strong>Name the state:</strong> “I’m overloaded, not upset.”</li>
            <li><strong>Time-out with return time:</strong> space without disappearing</li>
            <li><strong>Re-entry language:</strong> a clean way back in after distance</li>
          </ul>
          <p className="small" style={{ marginTop: 10 }}>
            Driftlatch doesn’t diagnose. It helps you recover and re-enter with less effort.
          </p>
        </div>
      </section>

      <div className="divider" />

      {/* EXAMPLES */}
      <section className="card">
        <h2>What Driftlatch might suggest</h2>
        <ul>
          <li>“Write tomorrow’s first step. Close the loop.”</li>
          <li>“Two-minute downshift before you talk to anyone.”</li>
          <li>“I’m here — I’m just mentally full today.”</li>
          <li>“Ten minutes. No phones. No fixing.”</li>
          <li>“I need a little space, but I’m not pulling away.”</li>
          <li>“Sit nearby. No conversation required.”</li>
        </ul>
        <p className="small" style={{ marginTop: 10 }}>
          Not motivation. Not advice. Just stabilisers that prevent drift and carryover.
        </p>
      </section>

      <div className="divider" />

      {/* PRICING CTA */}
      <section className="card">
        <h2>Founding Access</h2>
        <p>
          Annual: <strong>$59/year</strong> (best value) · Monthly: <strong>$9.99/month</strong>
        </p>
        <p className="small">
          14-day refund guarantee — if it doesn’t feel useful, we’ll refund you. No questions asked.
        </p>
        <div className="btnRow">
          <a className="btn" href="/buy?plan=annual">Start now (Annual)</a>
          <a className="btn secondary" href="/buy?plan=monthly">Start monthly</a>
          <a className="btn secondary" href="/pricing">Read details</a>
        </div>
      </section>

      <div className="divider" />

      {/* PRIVACY */}
      <section className="card">
        <h2>Privacy-first. Always.</h2>
        <ul>
          <li>Driftlatch does not read your messages, emails, or calls.</li>
          <li>Driftlatch does not track your phone activity.</li>
          <li>Driftlatch works only from what you choose to enter.</li>
          <li>Export or delete your data anytime.</li>
        </ul>
        <p className="small">Trust isn’t a feature. It’s the baseline.</p>
      </section>
    </main>
  );
}