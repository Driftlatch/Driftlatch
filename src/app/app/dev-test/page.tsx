"use client";

import { useMemo } from "react";
import { selectTool } from "@/lib/selectTool";

export default function DevTestPage() {
  const out = useMemo(
    () =>
      selectTool({
        need: "wind_down",
        state: "wired",
        timeMinutes: 1,
        situation: "alone",
        attachmentStyle: "Anxious",
      }),
    []
  );

  return (
    <main className="container">
      <section className="section">
        <h1>Selector Test</h1>
        <p className="small">Reason: {out.reason}</p>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="kicker">Primary tool</div>
          <h2 style={{ marginTop: 10 }}>{out.primary.title}</h2>
          <p className="small">{out.primary.do}</p>
          <p className="small" style={{ color: "var(--muted)" }}>{out.primary.why}</p>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="kicker">Alternates</div>
          <ul style={{ color: "var(--muted)" }}>
            {out.alternates.slice(0, 5).map((t) => (
              <li key={t.id}>{t.title}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}