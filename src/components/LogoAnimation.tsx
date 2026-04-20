"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { type CSSProperties, useEffect, useState } from "react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface LogoAnimationProps {
  onComplete?: () => void;
  variant?: "splash" | "landing";
}

type Phase = "rings" | "logo" | "wordmark" | "dots" | "done";

const PARTICLES: Array<{ tx: number; ty: number; dur: number; delay: number }> = [
  { tx: -90, ty: -90, dur: 3.2, delay: 1.0 },
  { tx: -45, ty: -110, dur: 3.8, delay: 1.1 },
  { tx: 0, ty: -120, dur: 3.5, delay: 1.05 },
  { tx: 45, ty: -110, dur: 4.0, delay: 1.15 },
  { tx: 90, ty: -90, dur: 3.3, delay: 1.0 },
  { tx: 115, ty: -45, dur: 3.7, delay: 1.2 },
  { tx: 120, ty: 0, dur: 4.2, delay: 1.1 },
  { tx: 115, ty: 45, dur: 3.4, delay: 1.25 },
  { tx: 90, ty: 90, dur: 3.6, delay: 1.05 },
  { tx: 45, ty: 115, dur: 4.1, delay: 1.3 },
  { tx: 0, ty: 120, dur: 3.9, delay: 1.15 },
  { tx: -45, ty: 115, dur: 3.2, delay: 1.2 },
  { tx: -90, ty: 90, dur: 4.3, delay: 1.1 },
  { tx: -115, ty: 45, dur: 3.5, delay: 1.35 },
  { tx: -120, ty: 0, dur: 3.8, delay: 1.0 },
  { tx: -115, ty: -45, dur: 4.0, delay: 1.25 },
  { tx: 70, ty: -70, dur: 3.1, delay: 1.4 },
  { tx: -70, ty: -70, dur: 3.6, delay: 1.15 },
  { tx: 70, ty: 70, dur: 4.4, delay: 1.3 },
  { tx: -70, ty: 70, dur: 3.3, delay: 1.2 },
];

export default function LogoAnimation({
  onComplete,
  variant = "splash",
}: LogoAnimationProps) {
  const [phase, setPhase] = useState<Phase>("rings");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 150);
    const t2 = setTimeout(() => setPhase("wordmark"), 950);
    const t3 = setTimeout(() => setPhase("dots"), 1350);
    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, variant === "landing" ? 1900 : 2600);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [onComplete, variant]);

  const showLogo = phase !== "rings";
  const showWordmark = phase === "wordmark" || phase === "dots" || phase === "done";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: variant === "landing" ? "#0B0B0E" : "#18181B",
      }}
    >
      {/* Expanding rings */}
      <svg
        viewBox="0 0 320 320"
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      >
        <circle
          cx={160}
          cy={160}
          r={20}
          fill="none"
          stroke="rgba(194,122,92,0.5)"
          strokeWidth={1.5}
          style={{ animation: "dlRingExpand 1.6s ease-out 0.15s both" }}
        />
        <circle
          cx={160}
          cy={160}
          r={20}
          fill="none"
          stroke="rgba(194,122,92,0.3)"
          strokeWidth={1.5}
          style={{ animation: "dlRingExpand 1.6s ease-out 0.35s both" }}
        />
        <circle
          cx={160}
          cy={160}
          r={20}
          fill="none"
          stroke="rgba(194,122,92,0.15)"
          strokeWidth={1.5}
          style={{ animation: "dlRingExpand 1.6s ease-out 0.55s both" }}
        />
      </svg>

      {/* Floating particles */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {PARTICLES.map((p, i) => {
          const color = i % 2 === 0 ? "rgba(194,122,92,0.8)" : "rgba(220,160,80,0.6)";
          const style: CSSProperties = {
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 3,
            height: 3,
            borderRadius: "50%",
            marginLeft: -1.5,
            marginTop: -1.5,
            background: color,
            animation: `dlParticleFloat ${p.dur}s ease-out ${p.delay}s both`,
            ["--ptx" as string]: `${p.tx}px`,
            ["--pty" as string]: `${p.ty}px`,
          } as CSSProperties;
          return <div key={i} style={style} />;
        })}
      </div>

      {/* Content stack */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Logo container */}
        <div
          style={{
            position: "relative",
            width: 96,
            height: 96,
            marginBottom: 20,
            zIndex: 2,
          }}
        >
          {/* Warm glow */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -20,
              background:
                "radial-gradient(ellipse, rgba(194,122,92,0.35) 0%, transparent 65%)",
              filter: "blur(20px)",
              borderRadius: "50%",
              pointerEvents: "none",
              animation: "dlGlowBreath 3s ease-in-out 1.5s infinite",
            }}
          />

          {/* Logo with fade-in and settle bounce */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={showLogo ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.55, ease: EASE }}
            style={{ position: "relative", width: 96, height: 96 }}
          >
            <motion.div
              animate={showLogo ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5, ease: EASE }}
              style={{ width: 96, height: 96 }}
            >
              <Image
                src="/icon.png"
                alt="Driftlatch"
                width={96}
                height={96}
                priority
                style={{ width: 96, height: 96, objectFit: "contain" }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={showWordmark ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ textAlign: "center", marginTop: 4, zIndex: 2 }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: variant === "splash" ? 26 : 22,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              color: "rgba(244,244,245,0.92)",
            }}
          >
            Driftlatch
          </p>
          {variant === "splash" && (
            <span
              style={{
                display: "block",
                marginTop: 6,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(194,122,92,0.55)",
              }}
            >
              Presence under pressure
            </span>
          )}
        </motion.div>

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "dots" ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: "flex",
            gap: 7,
            alignItems: "center",
            marginTop: 28,
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "rgba(194,122,92,0.65)",
              animation: "dlDotPulse 1.1s ease-in-out 0s infinite",
            }}
          />
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "rgba(194,122,92,0.4)",
              animation: "dlDotPulse 1.1s ease-in-out 0.22s infinite",
            }}
          />
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "rgba(194,122,92,0.2)",
              animation: "dlDotPulse 1.1s ease-in-out 0.44s infinite",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
