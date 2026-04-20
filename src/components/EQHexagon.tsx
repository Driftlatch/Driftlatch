"use client";

import { motion } from "framer-motion";

type EQDomainKey =
  | "pressure_reading"
  | "repair_instinct"
  | "presence_quality"
  | "boundary_intel"
  | "recovery_aware"
  | "signal_accuracy";

interface EQHexagonProps {
  scores: Record<EQDomainKey, number>;
  weakestDomain: string;
}

const DOMAIN_ORDER: EQDomainKey[] = [
  "pressure_reading",
  "repair_instinct",
  "presence_quality",
  "boundary_intel",
  "recovery_aware",
  "signal_accuracy",
];

const DOMAIN_COLORS: Record<EQDomainKey, string> = {
  pressure_reading: "rgba(194,122,92,0.9)",
  repair_instinct: "rgba(120,190,150,0.9)",
  presence_quality: "rgba(120,190,150,0.9)",
  boundary_intel: "rgba(208,164,92,0.9)",
  recovery_aware: "rgba(100,160,200,0.9)",
  signal_accuracy: "rgba(180,120,200,0.9)",
};

const DOMAIN_SHORT_LABELS: Record<EQDomainKey, string> = {
  pressure_reading: "Pressure Reading",
  repair_instinct: "Repair",
  presence_quality: "Presence",
  boundary_intel: "Boundary Intel",
  recovery_aware: "Recovery",
  signal_accuracy: "Signal",
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const VB = 480;
const CENTER = 240;
const MAX_RADIUS = 148;

// Label positions: placed at radius ~176 (28px beyond outer ring)
// Angles: 0=-90deg (top), 1=-30deg, 2=30deg, 3=90deg, 4=150deg, 5=210deg
const LABEL_POSITIONS: { x: number; y: number; textAnchor: "start" | "middle" | "end"; scoreY: number }[] = [
  // top: pressure_reading
  { x: 240, y: 56, textAnchor: "middle", scoreY: 72 },
  // top-right: repair_instinct  (sin60=0.866, cos60=0.5 => x=240+152=392, y=240-88=152)
  { x: 392, y: 148, textAnchor: "start", scoreY: 164 },
  // bottom-right: presence_quality
  { x: 392, y: 324, textAnchor: "start", scoreY: 340 },
  // bottom: boundary_intel
  { x: 240, y: 424, textAnchor: "middle", scoreY: 440 },
  // bottom-left: recovery_aware
  { x: 88, y: 324, textAnchor: "end", scoreY: 340 },
  // top-left: signal_accuracy
  { x: 88, y: 148, textAnchor: "end", scoreY: 164 },
];

function getPoint(score: number, angleIndex: number) {
  const angle = (angleIndex * 60 - 90) * (Math.PI / 180);
  const r = (score / 100) * MAX_RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

function getRingPoint(pct: number, angleIndex: number) {
  const angle = (angleIndex * 60 - 90) * (Math.PI / 180);
  const r = pct * MAX_RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

export default function EQHexagon({
  scores,
  weakestDomain,
}: EQHexagonProps) {
  const safeScores: Record<EQDomainKey, number> = {
    pressure_reading: scores.pressure_reading ?? 50,
    repair_instinct: scores.repair_instinct ?? 50,
    presence_quality: scores.presence_quality ?? 50,
    boundary_intel: scores.boundary_intel ?? 50,
    recovery_aware: scores.recovery_aware ?? 50,
    signal_accuracy: scores.signal_accuracy ?? 50,
  };
  const safeWeakest = weakestDomain && DOMAIN_ORDER.includes(weakestDomain as EQDomainKey)
    ? weakestDomain
    : DOMAIN_ORDER.reduce((min, d) => safeScores[d] < safeScores[min] ? d : min, DOMAIN_ORDER[0]);

  const scorePts = DOMAIN_ORDER.map((d, i) => getPoint(safeScores[d], i));
  const scorePath = `M ${scorePts[0].x},${scorePts[0].y} ${scorePts.slice(1).map((p) => `L ${p.x},${p.y}`).join(" ")} Z`;

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" style={{ width: "100%", maxWidth: "100%" }}>
      <defs>
        <radialGradient id="hexFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(194,122,92,0.22)" />
          <stop offset="100%" stopColor="rgba(194,122,92,0.04)" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1.0].map((pct) => (
        <polygon
          key={pct}
          points={Array.from({ length: 6 }, (_, i) => {
            const p = getRingPoint(pct, i);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getRingPoint(1.0, i);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        );
      })}

      {/* Baseline ring (dashed at 65%) */}
      <polygon
        points={Array.from({ length: 6 }, (_, i) => {
          const p = getRingPoint(0.65, i);
          return `${p.x},${p.y}`;
        }).join(" ")}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      {(() => {
        const bp = getRingPoint(0.65, 1);
        return (
          <text
            x={bp.x + 8}
            y={bp.y - 8}
            fill="rgba(255,255,255,0.2)"
            fontSize={10}
            fontFamily="var(--font-sans)"
          >
            baseline
          </text>
        );
      })()}

      {/* Score polygon */}
      <motion.path
        d={scorePath}
        fill="url(#hexFill)"
        stroke="rgba(194,122,92,0.65)"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />

      {/* Score dots + pulse rings */}
      {DOMAIN_ORDER.map((domain, i) => {
        const pt = scorePts[i];
        const color = DOMAIN_COLORS[domain];
        const isWeakest = domain === safeWeakest;
        return (
          <g key={domain}>
            {isWeakest && (
              <motion.circle
                cx={pt.x}
                cy={pt.y}
                r={9}
                fill="none"
                stroke={color.replace("0.9)", "0.3)")}
                strokeWidth={1}
                animate={{ r: [9, 14, 9], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <motion.circle
              cx={pt.x}
              cy={pt.y}
              r={5}
              fill={color}
              stroke="#18181B"
              strokeWidth={2.5}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.06, duration: 0.3, ease: EASE }}
            />
          </g>
        );
      })}

      {/* Domain labels */}
      {DOMAIN_ORDER.map((domain, i) => {
        const pos = LABEL_POSITIONS[i];
        const color = DOMAIN_COLORS[domain];
        const isWeakest = domain === safeWeakest;
        return (
          <g key={`label-${domain}`}>
            <text
              x={pos.x}
              y={pos.y}
              textAnchor={pos.textAnchor}
              dominantBaseline="central"
              fontSize={13}
              fontWeight={600}
              fill="rgba(244,244,245,0.72)"
              fontFamily="var(--font-sans)"
            >
              {DOMAIN_SHORT_LABELS[domain]}
            </text>
            <text
              x={pos.x}
              y={pos.scoreY}
              textAnchor={pos.textAnchor}
              dominantBaseline="central"
              fontSize={11}
              fill={color.replace("0.9)", "0.8)")}
              fontFamily="var(--font-sans)"
            >
              {safeScores[domain]}
              {isWeakest && (
                <tspan fill="rgba(255,255,255,0.3)"> · low</tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
