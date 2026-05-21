"use client";

import React, { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/FadeIn";
import LogoAnimation from "@/components/LogoAnimation";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


// ─── Data ────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Is Driftlatch therapy?",
    a: "No. Driftlatch is a private support system for stress spillover, recovery, and cleaner re-entry into home life and work.",
  },
  {
    q: "Why would I pay for this?",
    a: "You are paying for a clear structure: quick check-ins, a tailored support library, and weekly reflection that help you use the right step at the right time.",
  },
  {
    q: "Do you read my messages or track my phone?",
    a: "No. Driftlatch only works from what you choose to enter.",
  },
  {
    q: "Is this a relationship app?",
    a: "Not exactly. Driftlatch is for the pressure that spills between work and home. It helps you protect closeness at home and clarity at work.",
  },
  {
    q: "What if my partner doesn't use it?",
    a: "Driftlatch still helps. One person ending the day cleanly often changes the tone of the whole dynamic.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Driftlatch works in your browser on any device. On your phone, you can add it to the home screen in one tap so it stays close. Nothing to download.",
  },
  {
    q: "What's the refund policy?",
    a: "14-day refund guarantee. If it is not useful, email support and we will refund you.",
  },
];

const PAIN_LINES = [
  "You close the laptop, but your brain keeps going.",
  "Sleep gets lighter. The next morning starts heavier.",
  "You're home, but part of you is still in the workday.",
  "One of you reaches for closeness. The other reaches for space.",
  "Stress shows up as snapping, shutting down, overthinking, or reassurance loops.",
  "You had a hard morning at home. By noon you still can't focus.",
  "A tense evening at home, and the next day starts already heavy.",
];

const MARQUEE_TEXT =
  "PRESSURE PROFILE · ONE CLEAR STEP · PRIVATE BY DEFAULT · CLOSENESS AT HOME · CLARITY AT WORK · PRESSURE EQ · KNOW YOUR EQ UNDER PRESSURE · MOMENT REVIEW · FIX IT IN 3 MINUTES · 6 EQ DOMAINS TRACKED · BUILT FOR FOUNDERS · ";

const EQ_DOMAINS = [
  {
    name: "Pressure Reading",
    dot: "rgba(194,122,92,0.8)",
    description: "Reading what others need when you are running low",
    scenario: "Your partner says they are fine. Something feels off. You are exhausted. What do you actually do?",
  },
  {
    name: "Repair Instinct",
    dot: "rgba(120,190,150,0.8)",
    description: "Moving toward difficult moments instead of away",
    scenario: "Something went wrong two days ago. It was not fully resolved. The window is narrowing. Do you go back to it?",
  },
  {
    name: "Presence Quality",
    dot: "rgba(120,190,150,0.7)",
    description: "Actually landing in a moment versus just being in the room",
    scenario: "Your child wants to show you something. Your mind is still at work. What actually happens?",
  },
  {
    name: "Boundary Intelligence",
    dot: "rgba(208,164,92,0.8)",
    description: "Closing the workday so it does not follow you home",
    scenario: "You closed the laptop an hour ago. A problem from today is still running. It will not resolve tonight. What happens?",
  },
  {
    name: "Recovery Awareness",
    dot: "rgba(100,160,200,0.8)",
    description: "Knowing what actually restores you versus what you reach for",
    scenario: "It is 9pm. You have one hour. You want to use it well. What does well actually mean to you and do you manage it?",
  },
  {
    name: "Signal Accuracy",
    dot: "rgba(180,120,200,0.8)",
    description: "Separating what you feel from what is actually happening",
    scenario: "You feel a flash of irritation. Later you realise it was not about the conversation at all. How often do you catch that in the moment?",
  },
];

// ─── Small components ─────────────────────────────────────────────────────────

const HOME_PROTECTION_ITEMS = [
  "A conversation that doesn't turn into a fight",
  "Being present when your kid wants to show you something",
  "Knowing when you need space, and how to ask clearly",
  "Your partner feeling your attention, not just your body in the room",
];

const WORK_PROTECTION_ITEMS = [
  "Ending the day without carrying tomorrow into tonight",
  "Sleeping without solving problems in your head",
  "Making decisions from a clear head, not a depleted one",
  "Knowing when to stop, and actually being able to stop",
];

const CLEAR_HEAD_TOOLS = [
  {
    name: "Shutdown ritual",
    description: "Capture open loops, choose tomorrow's first step, close the day",
  },
  {
    name: "Worry container",
    description: "Give rumination a place so it stops taking over the night",
  },
  {
    name: "If-then plans",
    description: "Simple decisions you can still follow under pressure",
  },
];

const WIND_DOWN_TOOLS = [
  {
    name: "STOP pause",
    description: "Interrupt a reactive reply before it leaves your mouth",
  },
  {
    name: "Downshift resets",
    description: "Breath, movement, or temperature to help your body land",
  },
  {
    name: "Grounding",
    description: "A simple reset when everything feels too loud",
  },
];

const GLASS_CARD_STYLE: CSSProperties = {
  background: "rgba(18,18,22,0.9)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 22,
  overflow: "hidden",
  position: "relative",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
};

const GLASS_RIM_LIGHT_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 16,
  right: 16,
  height: 1,
  background:
    "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
  pointerEvents: "none",
};

const TOOL_PANEL_STYLE: CSSProperties = {
  padding: "12px 14px",
  background: "rgba(255,255,255,0.03)",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.05)",
};

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    label: "PRESSURE PROFILE",
    title: "Map the pressure pattern",
    body: "Answer 20 short statements about work, recovery, home, and how you handle tension.",
    accent: "rgba(194,122,92,1)",
    accentSoft: "rgba(194,122,92,0.16)",
    accentBorder: "rgba(194,122,92,0.28)",
    glow: "rgba(194,122,92,0.12)",
    note: "A fast read on where pressure starts leaking across the day.",
  },
  {
    step: "02",
    label: "DAILY CHECK-IN",
    title: "Get one clear next move",
    body: "Driftlatch reads the moment and gives you one clear next step, using psychologically informed support that fits your time, energy, and situation.",
    accent: "rgba(208,164,92,1)",
    accentSoft: "rgba(208,164,92,0.16)",
    accentBorder: "rgba(208,164,92,0.28)",
    glow: "rgba(208,164,92,0.12)",
    note: "No feed, no spiral, and no giant menu when your head is already full.",
  },
  {
    step: "03",
    label: "WEEKLY REFLECTION",
    title: "Build a steadier week",
    body: "A few short check-ins turn into a clearer read on your patterns and a steadier response to them.",
    accent: "rgba(120,190,150,1)",
    accentSoft: "rgba(120,190,150,0.16)",
    accentBorder: "rgba(120,190,150,0.28)",
    glow: "rgba(120,190,150,0.12)",
    note: "See what is shifting before pressure starts running the room again.",
  },
] as const;

function GlassRimLight() {
  return <div aria-hidden style={GLASS_RIM_LIGHT_STYLE} />;
}

function extractRgb(rgba: string): string {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? `${m[1]},${m[2]},${m[3]}` : "194,122,92";
}

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M2.75 8.1L9 3.25L15.25 8.1V15.1C15.25 15.4315 15.1183 15.7495 14.8839 15.9839C14.6495 16.2183 14.3315 16.35 14 16.35H10.25V11.85H7.75V16.35H4C3.66848 16.35 3.35054 16.2183 3.11612 15.9839C2.8817 15.7495 2.75 15.4315 2.75 15.1V8.1Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BriefcaseIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M6.75 5V4.25C6.75 3.91848 6.8817 3.60054 7.11612 3.36612C7.35054 3.1317 7.66848 3 8 3H10C10.3315 3 10.6495 3.1317 10.8839 3.36612C11.1183 3.60054 11.25 3.91848 11.25 4.25V5"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 7.25C3 6.91848 3.1317 6.60054 3.36612 6.36612C3.60054 6.1317 3.91848 6 4.25 6H13.75C14.0815 6 14.3995 6.1317 14.6339 6.36612C14.8683 6.60054 15 6.91848 15 7.25V13.75C15 14.0815 14.8683 14.3995 14.6339 14.6339C14.3995 14.8683 14.0815 15 13.75 15H4.25C3.91848 15 3.60054 14.8683 3.36612 14.6339C3.1317 14.3995 3 14.0815 3 13.75V7.25Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8.75H15"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
      <circle cx="9.5" cy="9.5" r="6.75" stroke={color} strokeWidth="1.7" />
      <path
        d="M9.5 5.75V9.5L11.85 11.1"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
      <path
        d="M12.7513 2.96875C11.9535 3.76657 11.5053 4.84865 11.5053 5.97693C11.5053 7.1052 11.9535 8.18728 12.7513 8.9851C13.5491 9.78292 14.6312 10.2311 15.7595 10.2311C16.0915 10.2311 16.4226 10.1923 16.7458 10.1156C16.4501 11.3415 15.8022 12.454 14.8825 13.3164C13.9628 14.1788 12.8109 14.7545 11.5685 14.972C10.3261 15.1895 9.04727 15.0394 7.88873 14.5404C6.73019 14.0415 5.74141 13.2148 5.04024 12.1621C4.33906 11.1094 3.95629 9.87754 3.93852 8.61447C3.92076 7.3514 4.26879 6.10906 4.94009 5.03709C5.61139 3.96512 6.57656 3.11095 7.72066 2.57964C8.86477 2.04833 10.1388 1.86232 11.387 2.04358C11.845 2.11008 12.2962 2.23714 12.7273 2.42125L12.7513 2.96875Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
      <rect x="3" y="3.25" width="13" height="12.5" rx="3" stroke={color} strokeWidth="1.7" />
      <path
        d="M6.5 7H12.5M6.5 10H12.5M6.5 13H10"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SignalIcon({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
      <path
        d="M4 13.75L7.25 10.5L9.5 12.75L14.75 7.5"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.75 7.5H14.75V10.5"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4.75V14.25H14.5"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PulseIcon({ color }: { color: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
      <path
        d="M3.5 11H6.25L7.7 7.6L10.2 13.2L11.85 9.5H15.5"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.25 15H15.75"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 2.5l2.3 5.1 5.7.5-4.2 3.8 1.3 5.6L11 14.5l-5.1 2.9 1.3-5.6L3 7.9l5.7-.5z"
        stroke="rgba(194,122,92,0.75)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M14.5 3.5l4 4-6 3.5-2 5.5-3.5-3.5 7.5-9.5z"
        stroke="rgba(120,190,150,0.75)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 13.5L4 18"
        stroke="rgba(120,190,150,0.75)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const PACK_CHIPS: { name: string; color: string }[] = [
  { name: "Clear Head", color: "rgba(194,122,92,1)" },
  { name: "Wind Down", color: "rgba(100,160,200,1)" },
  { name: "Be Present", color: "rgba(120,190,150,1)" },
  { name: "Repair", color: "rgba(194,122,92,0.75)" },
  { name: "Overthinking", color: "rgba(208,164,92,1)" },
  { name: "Take Space", color: "rgba(100,160,200,0.75)" },
  { name: "Use the Window", color: "rgba(194,122,92,0.8)" },
  { name: "Stay Close", color: "rgba(120,190,150,0.75)" },
  { name: "Make It Count", color: "rgba(208,164,92,0.8)" },
  { name: "Stay Steady", color: "rgba(100,160,200,0.65)" },
];

function SpotlightCard({
  children,
  style,
  ...props
}: {
  children: React.ReactNode;
  style?: CSSProperties;
  [key: string]: unknown;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, opacity: 0 });
  const [pressed, setPressed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setTimeout(() => setPressed(false), 400)}
      style={{
        background: "rgba(18,18,22,0.9)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 24,
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        cursor: "default",
        ...style,
      }}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {/* Cursor spotlight */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: spotlight.opacity,
          transition: "opacity 0.35s ease",
          background: `radial-gradient(320px circle at ${spotlight.x}px ${spotlight.y}px, rgba(194,122,92,0.13) 0%, rgba(194,122,92,0.04) 40%, transparent 70%)`,
        }}
      />
      {/* Border highlight near cursor */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: spotlight.opacity,
          transition: "opacity 0.35s ease",
          borderRadius: 24,
          background: `radial-gradient(280px circle at ${spotlight.x}px ${spotlight.y}px, rgba(194,122,92,0.18) 0%, transparent 60%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />
      {/* Touch pulse */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          borderRadius: 24,
          background: pressed
            ? "radial-gradient(ellipse at 50% 50%, rgba(194,122,92,0.16) 0%, transparent 70%)"
            : "transparent",
          transition: "background 0.4s ease",
        }}
      />
      {/* Top rim light */}
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
          zIndex: 1,
        }}
      />
      {children}
    </div>
  );
}

function HowItWorksCard({
  step,
}: {
  step: (typeof HOW_IT_WORKS_STEPS)[number];
}) {
  const iconMap = {
    "01": <ProfileIcon color={step.accent} />,
    "02": <SignalIcon color={step.accent} />,
    "03": <PulseIcon color={step.accent} />,
  } as const;

  return (
    <motion.div
      whileHover={{ scale: 1.012, y: -3 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <SpotlightCard
        style={{
          padding: "22px 22px 20px",
          minHeight: 332,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
        }}
      >
        {/* Top accent line */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)`,
            opacity: 0.7,
            zIndex: 2,
          }}
        />
        {/* Glow blob */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -46,
            left: "50%",
            transform: "translateX(-50%)",
            width: 180,
            height: 92,
            borderRadius: "50%",
            background: step.glow,
            filter: "blur(34px)",
            zIndex: 2,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            gap: 18,
            height: "100%",
          }}
        >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              aria-hidden
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: step.accentSoft,
                border: `1px solid ${step.accentBorder}`,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {iconMap[step.step]}
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: step.accent,
                }}
              >
                {step.label}
              </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    lineHeight: 1.08,
                    maxWidth: "12ch",
                    textWrap: "balance",
                  }}
                >
                  {step.title}
                </h3>
            </div>
          </div>

          <div
            style={{
              minWidth: 42,
              height: 42,
              borderRadius: 999,
              border: `1px solid ${step.accentBorder}`,
              color: step.accent,
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 700,
              background: "rgba(255,255,255,0.02)",
              flexShrink: 0,
            }}
          >
            {step.step}
          </div>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.65,
            color: "rgba(244,244,245,0.82)",
          }}
        >
          {step.body}
        </p>

        {step.step === "01" ? (
          <div
            style={{
              ...TOOL_PANEL_STYLE,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {["Work", "Recovery", "Home", "Attachment"].map((item) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    color: "rgba(244,244,245,0.84)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "rgba(161,161,170,0.82)", lineHeight: 1.55 }}>
              Private by default. Fast enough to do before your day gets loud.
            </div>
          </div>
        ) : null}

        {step.step === "02" ? (
          <div
            style={{
              ...TOOL_PANEL_STYLE,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Time", "Energy", "Situation"].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.025)",
                    color: "rgba(244,244,245,0.84)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {["1 minute when you are fried", "3 minutes between roles", "10 minutes when you can go deeper"].map(
                (item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      color: "rgba(161,161,170,0.84)",
                      fontSize: 12,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: step.accent,
                        flexShrink: 0,
                      }}
                    />
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        ) : null}

        {step.step === "03" ? (
          <div
            style={{
              ...TOOL_PANEL_STYLE,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              aria-hidden
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 8,
                alignItems: "end",
                minHeight: 54,
              }}
            >
              {[32, 18, 28, 40, 24, 46, 36].map((height, index) => (
                <div
                  key={`${height}-${index}`}
                  style={{
                    height,
                    borderRadius: 999,
                    background:
                      index >= 4
                        ? "linear-gradient(180deg, rgba(120,190,150,0.92) 0%, rgba(120,190,150,0.38) 100%)"
                        : "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: "rgba(161,161,170,0.82)", lineHeight: 1.55 }}>
              A clearer weekly signal of what is improving, repeating, or costing you.
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: "auto",
            paddingTop: 2,
            fontSize: 12,
            lineHeight: 1.6,
            color: "rgba(161,161,170,0.84)",
          }}
        >
          {step.note}
        </div>
      </div>
      </SpotlightCard>
    </motion.div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="stickyNav">
      <div className="navInner">
        <a href="/" className="navLogo" aria-label="Driftlatch home">
          <Image
            src="/icon.png"
            alt="Driftlatch mark"
            width={22}
            height={22}
            priority
            style={{ objectFit: "contain", display: "block" }}
          />
          <span className="navWordmark">Driftlatch</span>
        </a>

        <nav className="navLinks" aria-label="Main navigation">
          <a href="#how-it-works" className="navLink">How it works</a>
          <a href="#pressure-eq" className="navLink">Pressure EQ</a>
          <a href="#pricing" className="navLink">Pricing</a>
          <a href="#faq" className="navLink">FAQ</a>
        </nav>

        <a href="/login" className="nav-login">
          Log in
        </a>

        <a href="/pressure-profile" className="btn primary navCta">
          Start free profile test
        </a>

        <button
          className="navHamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={`hamburgerLine${menuOpen ? " hbOpen" : ""}`} />
          <span className={`hamburgerLine${menuOpen ? " hbOpen" : ""}`} />
          <span className={`hamburgerLine${menuOpen ? " hbOpen" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobileMenu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <a href="/login" className="mobileMenuLink" onClick={() => setMenuOpen(false)}>
              Log in
            </a>
            <a href="#how-it-works" className="mobileMenuLink" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#pressure-eq" className="mobileMenuLink" onClick={() => setMenuOpen(false)}>
              Pressure EQ
            </a>
            <a href="#pricing" className="mobileMenuLink" onClick={() => setMenuOpen(false)}>
              Pricing
            </a>
            <a href="#faq" className="mobileMenuLink" onClick={() => setMenuOpen(false)}>
              FAQ
            </a>
            <a
              href="/pressure-profile"
              className="btn primary"
              style={{ marginTop: 10 }}
              onClick={() => setMenuOpen(false)}
            >
              Start free profile
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function MarqueeRibbon() {
  return (
    <div className="marqueeRibbon" aria-hidden="true">
      <div className="marqueeTrack">
        <span className="marqueeText">{MARQUEE_TEXT}</span>
        <span className="marqueeText">{MARQUEE_TEXT}</span>
      </div>
    </div>
  );
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="faqItem">
      <button
        className="faqTrigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <strong>{q}</strong>
        <motion.span
          className="faqIcon"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.18 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="faqBody"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <p className="small" style={{ padding: "10px 20px 18px" }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [landingLoaded, setLandingLoaded] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const seen = sessionStorage.getItem("dl_landing_seen");
    if (!seen) {
      setLandingLoaded(false);
      sessionStorage.setItem("dl_landing_seen", "1");
    }
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const laptopX = useTransform(scrollYProgress, [0, 0.4], ["0px", "-160px"]);
  const laptopY = useTransform(scrollYProgress, [0, 0.4], ["0px", "20px"]);
  const coupleX = useTransform(scrollYProgress, [0, 0.4], ["0px", "120px"]);
  const coupleScale = useTransform(scrollYProgress, [0, 0.4], [1, 0.94]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.2]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.2], ["0px", "-40px"]);

  return (
    <>
      <AnimatePresence>
        {!landingLoaded && (
          <motion.div
            key="dl-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <LogoAnimation variant="landing" onComplete={() => setLandingLoaded(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar />

      {/* ── 01 HERO ──────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="landingHeroFull"
        style={{ height: "100dvh", background: "#0B0B0E" }}
      >

          {/* LAYER 1 — Noise grain */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              opacity: 0.06,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "180px",
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />

          {/* LAYER 2 — Ground plane gradient */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              background:
                "radial-gradient(ellipse at 50% 100%, rgba(60,35,15,0.7) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />

          {/* LAYER 3 — Central warm glow (animated) */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              opacity: glowOpacity,
              position: "absolute",
              zIndex: 3,
              left: "50%",
              top: "65%",
              transform: "translate(-50%,-50%)",
              width: 700,
              height: 500,
              borderRadius: 999,
              background:
                "radial-gradient(ellipse, rgba(194,122,92,0.55) 0%, rgba(194,122,92,0.18) 40%, transparent 70%)",
              filter: "blur(80px)",
              pointerEvents: "none",
              willChange: "opacity",
            }}
          />

          {/* LAYER 4 — SVG silhouette scene */}
          <motion.svg
            aria-hidden
            className="hero-scene-svg"
            style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}
            width="100%"
            height="100%"
            viewBox={isMobile ? "0 0 400 500" : "0 0 1440 900"}
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <radialGradient id="couchGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(200,120,50,0.7)" />
                <stop offset="100%" stopColor="rgba(200,120,50,0)" />
              </radialGradient>
              <radialGradient id="coupleGlow" cx="50%" cy="60%" r="50%">
                <stop offset="0%" stopColor="rgba(210,130,55,0.85)" />
                <stop offset="100%" stopColor="rgba(210,130,55,0)" />
              </radialGradient>
              <radialGradient id="mobileGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(210,130,55,0.85)" />
                <stop offset="100%" stopColor="rgba(210,130,55,0)" />
              </radialGradient>
            </defs>

            {isMobile ? (
              <g id="mobile-scene">
                {/* Ground */}
                <ellipse cx="200" cy="460" rx="240" ry="35" fill="rgba(15,8,3,0.85)" />

                {/* Sofa */}
                <path d="M 40,340 Q 40,310 65,310 L 335,310 Q 360,310 360,340 L 360,420 Q 360,432 348,432 L 52,432 Q 40,432 40,420 Z"
                  fill="rgba(45,25,10,1)" />
                <path d="M 65,311 Q 200,305 335,311" stroke="rgba(194,122,92,0.5)" strokeWidth="1.5" fill="none" />
                <rect x="26" y="330" width="20" height="90" rx="6" fill="rgba(45,25,10,1)" />
                <rect x="354" y="330" width="20" height="90" rx="6" fill="rgba(45,25,10,1)" />

                {/* Couple glow */}
                <ellipse cx="200" cy="400" rx="100" ry="35" fill="url(#mobileGlow)" opacity="1" />

                {/* Left figure */}
                <ellipse cx="170" cy="248" rx="22" ry="24" fill="rgba(45,25,10,1)" />
                <rect x="162" y="270" width="16" height="18" fill="rgba(45,25,10,1)" />
                <path d="M 138,355 Q 136,278 162,270 L 178,270 Q 204,278 206,355 Z" fill="rgba(45,25,10,1)" />
                <ellipse cx="170" cy="248" rx="22" ry="24" fill="none" stroke="rgba(194,122,92,0.35)" strokeWidth="1" />

                {/* Right figure */}
                <ellipse cx="224" cy="232" rx="19" ry="21" fill="rgba(45,25,10,1)" />
                <rect x="217" y="252" width="14" height="16" fill="rgba(45,25,10,1)" />
                <path d="M 200,350 Q 198,260 217,252 L 231,252 Q 250,258 254,350 Z" fill="rgba(45,25,10,1)" />
                <ellipse cx="224" cy="232" rx="19" ry="21" fill="none" stroke="rgba(194,122,92,0.35)" strokeWidth="1" />

                {/* Laptop */}
                <path d="M 30,285 L 110,285 L 116,355 L 24,355 Z" fill="rgba(35,20,8,1)" />
                <path d="M 33,289 L 107,289 L 113,351 L 27,351 Z" fill="rgba(194,122,92,0.07)" />
                <line x1="36" y1="305" x2="108" y2="305" stroke="rgba(194,122,92,0.15)" strokeWidth="1.5" />
                <line x1="36" y1="320" x2="100" y2="320" stroke="rgba(194,122,92,0.1)" strokeWidth="1.5" />
                <path d="M 20,356 L 120,356 L 126,370 L 14,370 Z" fill="rgba(35,20,8,1)" />
                <ellipse cx="70" cy="375" rx="55" ry="12" fill="rgba(194,122,92,0.1)" />

                {/* Mug */}
                <rect x="124" y="342" width="20" height="22" rx="3" fill="rgba(35,20,8,1)" />
                <rect x="122" y="362" width="24" height="4" rx="2" fill="rgba(35,20,8,1)" />
                <path d="M 144,347 Q 153,347 153,353 Q 153,359 144,359" stroke="rgba(35,20,8,1)" strokeWidth="4" fill="none" />
                <path d="M 129,340 Q 131,333 129,326" stroke="rgba(194,122,92,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"
                  style={{ animation: "steamRise 2.4s ease-in-out infinite" }} />
                <path d="M 135,338 Q 137,330 135,323" stroke="rgba(194,122,92,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round"
                  style={{ animation: "steamRise 2.4s ease-in-out 0.5s infinite" }} />

                {/* Ground shadow */}
                <ellipse cx="200" cy="435" rx="200" ry="8" fill="rgba(0,0,0,0.4)" />

                {/* Particles */}
                <circle cx="80" cy="280" r="2" fill="rgba(194,122,92,0.7)" style={{ animation: "floatParticle 4s linear 0.5s infinite" }} />
                <circle cx="200" cy="260" r="1.5" fill="rgba(220,160,80,0.6)" style={{ animation: "floatParticle 5s linear 1s infinite" }} />
                <circle cx="300" cy="290" r="2" fill="rgba(194,122,92,0.5)" style={{ animation: "floatParticle 3.5s linear 0.2s infinite" }} />
                <circle cx="150" cy="300" r="1.5" fill="rgba(194,122,92,0.6)" style={{ animation: "floatParticle 4.5s linear 1.5s infinite" }} />
                <circle cx="260" cy="270" r="2" fill="rgba(220,160,80,0.5)" style={{ animation: "floatParticle 3.8s linear 0.8s infinite" }} />
              </g>
            ) : (
              <g id="desktop-scene">
                {/* Ground plane */}
                <ellipse cx="720" cy="880" rx="1100" ry="90" fill="rgba(15,8,3,0.85)" />
                <ellipse cx="720" cy="820" rx="320" ry="28" fill="rgba(194,122,92,0.12)" />

                {/* Sofa + couple */}
                <motion.g style={{ x: coupleX, scale: coupleScale, transformOrigin: "1150px 700px", willChange: "transform" }}>
                  <path
                    d="M 980,580 Q 980,545 1015,545 L 1370,545 Q 1405,545 1405,580 L 1405,730 Q 1405,748 1388,748 L 997,748 Q 980,748 980,730 Z"
                    fill="rgba(35,20,10,1)"
                  />
                  <path d="M 1015,546 Q 1192,538 1370,546" stroke="rgba(194,122,92,0.4)" strokeWidth="1.5" fill="none" />
                  <rect x="962" y="600" width="30" height="130" rx="10" fill="rgba(35,20,10,1)" />
                  <rect x="1398" y="600" width="30" height="130" rx="10" fill="rgba(35,20,10,1)" />
                  <path d="M 980,680 L 1405,680" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <ellipse cx="1192" cy="758" rx="400" ry="14" fill="rgba(0,0,0,0.5)" />
                  <ellipse cx="1192" cy="750" rx="350" ry="8" fill="rgba(194,122,92,0.1)" />
                  <ellipse cx="1145" cy="660" rx="180" ry="60" fill="url(#coupleGlow)" opacity="1" />
                  <ellipse cx="1105" cy="468" rx="32" ry="35" fill="rgba(35,20,10,1)" />
                  <rect x="1096" y="501" width="18" height="22" fill="rgba(35,20,10,1)" />
                  <path d="M 1055,590 Q 1053,522 1096,510 L 1114,510 Q 1157,520 1158,590 Z" fill="rgba(35,20,10,1)" />
                  <ellipse cx="1175" cy="448" rx="28" ry="31" fill="rgba(35,20,10,1)" />
                  <rect x="1167" y="477" width="16" height="20" fill="rgba(35,20,10,1)" />
                  <path d="M 1145,585 Q 1143,508 1167,498 L 1183,498 Q 1207,506 1212,585 Z" fill="rgba(35,20,10,1)" />
                  <ellipse cx="1105" cy="468" rx="32" ry="35" fill="none" stroke="rgba(194,122,92,0.22)" strokeWidth="1" />
                  <ellipse cx="1175" cy="448" rx="28" ry="31" fill="none" stroke="rgba(194,122,92,0.18)" strokeWidth="1" />
                </motion.g>

                {/* Laptop */}
                <motion.g style={{ x: laptopX, y: laptopY, willChange: "transform" }}>
                  <path d="M 120,420 L 380,380 L 400,580 L 140,610 Z" fill="rgba(18,11,6,1)" />
                  <path d="M 132,432 L 372,394 L 390,572 L 152,598 Z" fill="rgba(194,122,92,0.07)" />
                  <line x1="148" y1="460" x2="375" y2="428" stroke="rgba(194,122,92,0.14)" strokeWidth="2" />
                  <line x1="148" y1="490" x2="340" y2="462" stroke="rgba(194,122,92,0.09)" strokeWidth="2" />
                  <line x1="148" y1="518" x2="355" y2="490" stroke="rgba(194,122,92,0.07)" strokeWidth="2" />
                  <line x1="120" y1="420" x2="380" y2="380" stroke="rgba(194,122,92,0.2)" strokeWidth="1.5" />
                  <path d="M 105,618 L 415,575 L 430,640 L 95,685 Z" fill="rgba(18,11,6,1)" />
                  <path d="M 115,628 L 410,587 L 422,630 L 108,668 Z" fill="rgba(25,15,8,0.6)" />
                  <ellipse cx="265" cy="680" rx="140" ry="22" fill="rgba(194,122,92,0.14)" />
                  <rect x="428" y="618" width="34" height="38" rx="5" fill="rgba(35,20,10,1)" />
                  <rect x="426" y="654" width="38" height="6" rx="3" fill="rgba(35,20,10,1)" />
                  <path d="M 462,626 Q 478,626 478,636 Q 478,646 462,646" stroke="rgba(35,20,10,1)" strokeWidth="6" fill="none" />
                  <path d="M 436,616 Q 439,606 436,596" stroke="rgba(194,122,92,0.3)" strokeWidth="2" fill="none" strokeLinecap="round"
                    style={{ animation: "steamRise 2.4s ease-in-out infinite" }} />
                  <path d="M 445,614 Q 448,603 445,593" stroke="rgba(194,122,92,0.22)" strokeWidth="2" fill="none" strokeLinecap="round"
                    style={{ animation: "steamRise 2.4s ease-in-out 0.5s infinite" }} />
                  <path d="M 454,616 Q 457,605 454,595" stroke="rgba(194,122,92,0.16)" strokeWidth="2" fill="none" strokeLinecap="round"
                    style={{ animation: "steamRise 2.4s ease-in-out 1s infinite" }} />
                </motion.g>

                {/* Particles */}
                <circle cx="432" cy="750" r="2.5" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 7s linear 0s infinite" }} />
                <circle cx="468" cy="710" r="3.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 9s linear 1.2s infinite" }} />
                <circle cx="510" cy="740" r="2.0" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 6s linear 2.5s infinite" }} />
                <circle cx="548" cy="768" r="3.5" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 11s linear 0.8s infinite" }} />
                <circle cx="582" cy="722" r="2.5" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 8s linear 3.1s infinite" }} />
                <circle cx="618" cy="758" r="2.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 5s linear 1.7s infinite" }} />
                <circle cx="652" cy="736" r="3.0" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 10s linear 4.0s infinite" }} />
                <circle cx="688" cy="714" r="2.5" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 7s linear 0.3s infinite" }} />
                <circle cx="722" cy="752" r="2.0" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 9s linear 2.9s infinite" }} />
                <circle cx="758" cy="728" r="3.5" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 6s linear 5.4s infinite" }} />
                <circle cx="792" cy="744" r="2.5" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 11s linear 1.5s infinite" }} />
                <circle cx="828" cy="710" r="2.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 8s linear 3.8s infinite" }} />
                <circle cx="862" cy="762" r="3.0" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 5s linear 6.2s infinite" }} />
                <circle cx="898" cy="730" r="2.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 10s linear 0.6s infinite" }} />
                <circle cx="934" cy="748" r="3.0" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 7s linear 4.7s infinite" }} />
                <circle cx="970" cy="716" r="2.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 9s linear 2.2s infinite" }} />
                <circle cx="450" cy="680" r="2.5" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 6s linear 7.1s infinite" }} />
                <circle cx="496" cy="658" r="2.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 11s linear 3.5s infinite" }} />
                <circle cx="544" cy="672" r="3.0" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 8s linear 1.0s infinite" }} />
                <circle cx="596" cy="646" r="3.5" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 5s linear 8.3s infinite" }} />
                <circle cx="644" cy="664" r="2.5" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 10s linear 2.8s infinite" }} />
                <circle cx="700" cy="638" r="2.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 7s linear 5.9s infinite" }} />
                <circle cx="756" cy="654" r="2.0" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 9s linear 0.9s infinite" }} />
                <circle cx="848" cy="642" r="3.0" fill="rgba(220,160,80,0.60)" style={{ animation: "floatParticle 6s linear 6.8s infinite" }} />
                <circle cx="960" cy="668" r="2.5" fill="rgba(194,122,92,0.75)" style={{ animation: "floatParticle 11s linear 4.2s infinite" }} />
              </g>
            )}
          </motion.svg>

          {/* LAYER 5 — Edge vignette */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(8,5,3,0.75) 100%)",
            }}
          />

          {/* LAYER 6 — Gradient fade: solid dark behind text, transparent below */}
          <div
            aria-hidden
            className="hero-gradient-shelf"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 6,
              background:
                "linear-gradient(to bottom, #0B0B0E 0%, rgba(11,11,14,0.85) 22%, rgba(11,11,14,0.2) 38%, transparent 52%)",
              pointerEvents: "none",
            }}
          />

          {/* Hero text — relative in flow, sits at top of flex column */}
          <div
            className="hero-text-wrapper"
            style={{
              position: "relative",
              zIndex: 10,
              textAlign: "center",
              paddingTop: 80,
              paddingLeft: 24,
              paddingRight: 24,
              maxWidth: 860,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <motion.div
              style={{
                opacity: textOpacity,
                y: textY,
                display: "grid",
                gap: "clamp(24px, 3vh, 34px)",
              }}
            >
            <div>
              <FadeIn delay={0.04} duration={0.55} distance={10}>
                  <div className="kicker">FOUNDERS AND PROFESSIONALS</div>
                </FadeIn>
                <FadeIn delay={0.12} duration={0.62} distance={16}>
                  <h1
                    style={{
                      fontSize: "clamp(2.4rem, 9vw, 5.25rem)",
                      lineHeight: 0.98,
                      letterSpacing: "-0.045em",
                      marginBottom: 14,
                      fontFamily: "Zodiak, Georgia, serif",
                      fontWeight: 700,
                    }}
                  >
                    Closeness at home. Clarity at work.
                  </h1>
                </FadeIn>
                <FadeIn delay={0.22} duration={0.62} distance={18}>
                  <p
                    style={{
                      maxWidth: "31rem",
                      margin: "0 auto",
                      color: "rgba(244,244,245,0.88)",
                      fontSize: 17,
                      lineHeight: 1.58,
                    }}
                  >
                    You had a good day. Still lost the evening.
                    <br /><br />
                    Work follows you home. Home tension takes your focus at work. Driftlatch helps you break the loop in under ten minutes a day.
                  </p>
                </FadeIn>
              </div>

              <div>
                <FadeIn delay={0.3} duration={0.58} distance={14}>
                  <div
                    className="landingHeroActionRow"
                    style={{ justifyContent: "center" }}
                  >
                    <a className="btn primary" href="/pressure-profile">
                      Take the Pressure Profile
                    </a>
                    <a className="heroSecondaryCta" href="#pricing">
                      See pricing
                    </a>
                  </div>
                  <p className="landingHeroMeta">
                    2-minute profile. One clear step. Under 10 minutes a day.
                    Private by default.
                  </p>
                </FadeIn>
              </div>
            </motion.div>
          </div>

        {/* Scroll indicator — pinned to bottom */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <FadeIn delay={0.65} duration={0.45} distance={4}>
            <div className="scrollIndicator">
              <svg width="16" height="26" viewBox="0 0 16 26" fill="none">
                <rect
                  x="1"
                  y="1"
                  width="14"
                  height="24"
                  rx="7"
                  stroke="rgba(161,161,170,0.45)"
                  strokeWidth="1.5"
                />
                <motion.rect
                  x="6.5"
                  y="5"
                  width="3"
                  height="6"
                  rx="1.5"
                  fill="rgba(194,122,92,0.75)"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
                />
              </svg>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
      <MarqueeRibbon />

      {/* ── CONTENT SECTIONS ─────────────────────────────────────────────── */}
      <div className="container">

        {/* ── 02 WHAT CHANGES WHEN THIS WORKS ──────────────────────────── */}
        <section className="section" id="what-changes" style={{ scrollMarginTop: "96px" }}>
          <FadeIn>
            <div style={{ display: "grid", gap: 14, textAlign: "center", marginBottom: 36 }}>
              <div
                style={{
                  color: "rgba(194,122,92,0.82)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                The outcome
              </div>
              <h2
                style={{
                  margin: "0 auto",
                  maxWidth: "20ch",
                  fontSize: "clamp(2rem, 4.4vw, 3rem)",
                  fontWeight: 700,
                  lineHeight: 1.06,
                  letterSpacing: "-0.03em",
                  color: "var(--text)",
                  textWrap: "balance",
                }}
              >
                What changes when this works
              </h2>
              <p
                style={{
                  margin: "0 auto",
                  maxWidth: "32ch",
                  color: "rgba(161,161,170,0.75)",
                  fontSize: 15,
                  lineHeight: 1.55,
                }}
              >
                Not a productivity gain. A return of presence.
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                title: "Your mornings start clear",
                body:
                  "Start the day without yesterday's tension running underneath. Decisions come easier. The first hour stops being recovery from the last one.",
              },
              {
                title: "Your evenings come back",
                body:
                  "You're home, and you're actually here. The tense conversation from 4pm stops running in the background of dinner. Conversation gets easier. Your relationships with everyone get more of you back.",
              },
              {
                title: "Your weeks feel lighter",
                body:
                  "You stop dragging one hard day into the next. By Friday, you're not burnt, you're tired in a recoverable way. The weekend stops being damage control.",
              },
            ].map((card, index) => (
              <FadeIn key={card.title} delay={0.08 + index * 0.08}>
                <div
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    padding: "32px 28px",
                    borderRadius: 20,
                    background: "rgba(18,18,22,0.6)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    height: "100%",
                    display: "grid",
                    gap: 14,
                    alignContent: "start",
                  }}
                >
                  {/* Clay-tinted top accent */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 20,
                      right: 20,
                      height: 1,
                      background:
                        "linear-gradient(90deg, transparent, rgba(194,122,92,0.34), transparent)",
                      pointerEvents: "none",
                    }}
                  />
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "Zodiak, Georgia, serif",
                      fontSize: "clamp(1.45rem, 2.4vw, 1.65rem)",
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                      lineHeight: 1.15,
                      color: "rgba(244,244,245,0.95)",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      lineHeight: 1.62,
                      color: "rgba(161,161,170,0.85)",
                    }}
                  >
                    {card.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 02 HOW IT WORKS ──────────────────────────────────────────── */}
        <section className="section" id="how-it-works" style={{ scrollMarginTop: "96px" }}>
          <FadeIn>
            <div
              className="how-it-works-top"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.12fr) minmax(380px, 0.88fr)",
                gap: 30,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 18,
                  alignContent: "start",
                }}
              >
                <div
                  style={{
                    color: "rgba(194,122,92,0.82)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  How it works
                </div>
                <h2
                  style={{
                    margin: 0,
                    maxWidth: "13ch",
                    lineHeight: 1.04,
                    textWrap: "balance",
                  }}
                >
                  Start with a Pressure Profile
                </h2>
                <p
                  style={{
                    margin: 0,
                    maxWidth: "36rem",
                    fontSize: 18,
                    lineHeight: 1.65,
                    color: "rgba(244,244,245,0.82)",
                  }}
                >
                  Start with a 2-minute profile. Then Driftlatch turns that into
                  a short daily system: check in, get one clear step, and build
                  a steadier week in under 10 minutes a day. No tracking. No
                  message reading. Just what you choose to enter.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {["2-minute profile", "One clear step", "Under 10 min/day", "Private by default"].map(
                    (item) => (
                      <div
                        key={item}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.07)",
                          background: "rgba(255,255,255,0.025)",
                          color: "rgba(244,244,245,0.84)",
                          fontSize: 13,
                          fontWeight: 600,
                          letterSpacing: "0.01em",
                        }}
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div
                style={{
                  ...GLASS_CARD_STYLE,
                  padding: "22px 22px 20px",
                }}
              >
                <GlassRimLight />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -56,
                    right: -10,
                    width: 220,
                    height: 140,
                    borderRadius: "50%",
                    background: "rgba(194,122,92,0.10)",
                    filter: "blur(42px)",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "grid",
                    gap: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <div
                        style={{
                          color: "rgba(194,122,92,0.78)",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        The Driftlatch loop
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          lineHeight: 1.16,
                          color: "var(--text)",
                          fontWeight: 600,
                          maxWidth: "15ch",
                          textWrap: "balance",
                        }}
                      >
                        From pressure to a steadier week.
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.07)",
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(244,244,245,0.86)",
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.4,
                        minWidth: 112,
                      }}
                    >
                      One system
                      <br />
                      three short moves
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    {[
                      {
                        title: "Profile the pattern",
                        body: "See where work pressure, recovery, and home friction are getting tangled.",
                        accent: "rgba(194,122,92,1)",
                      },
                      {
                        title: "Use the right move fast",
                        body: "Get one next step that matches your time, state, and situation.",
                        accent: "rgba(208,164,92,1)",
                      },
                      {
                        title: "Notice what is changing",
                        body: "Build a clearer weekly signal before the pressure piles up again.",
                        accent: "rgba(120,190,150,1)",
                      },
                    ].map((item, index) => (
                      <div
                        key={item.title}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "32px minmax(0, 1fr)",
                          gap: 12,
                          alignItems: "start",
                          padding: "12px 12px 12px 10px",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.05)",
                          background: "rgba(255,255,255,0.025)",
                        }}
                      >
                        <div
                          aria-hidden
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            border: `1px solid ${item.accent.replace(",1)", ",0.28)")}`,
                            background: item.accent.replace(",1)", ",0.14)"),
                            display: "grid",
                            placeItems: "center",
                            color: item.accent,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {index + 1}
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <div
                            style={{
                              color: "rgba(244,244,245,0.92)",
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              color: "rgba(161,161,170,0.86)",
                              fontSize: 13,
                              lineHeight: 1.55,
                            }}
                          >
                            {item.body}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <div style={{ position: "relative", marginTop: 28 }}>
            <div
              className="how-it-works-connector"
              aria-hidden
              style={{
                position: "absolute",
                left: "12%",
                right: "12%",
                top: 54,
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(194,122,92,0) 0%, rgba(194,122,92,0.3) 18%, rgba(208,164,92,0.3) 50%, rgba(120,190,150,0.3) 82%, rgba(120,190,150,0) 100%)",
                pointerEvents: "none",
              }}
            />
            <div
              className="how-it-works-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <FadeIn key={step.step} delay={0.04 + index * 0.06}>
                  <HowItWorksCard step={step} />
                </FadeIn>
              ))}
            </div>
          </div>

          <div className="btnRow" style={{ marginTop: 18 }}>
            <a className="btn primary" href="/pressure-profile">
              Take the Pressure Profile
            </a>
            <a className="btn ghost" href="#pricing">
              See Founding Access
            </a>
          </div>
        </section>

        {/* ── 03 PAIN ──────────────────────────────────────────────────── */}
        <section className="section">
          <FadeIn>
            <div
              className="pain-card"
              style={{
                background: "rgba(18,18,22,0.95)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 22,
                padding: "56px 52px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Rim light */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 16,
                  right: 16,
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
                  pointerEvents: "none",
                }}
              />
              {/* Ambient glow top-left */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: -60,
                  left: -40,
                  width: 280,
                  height: 200,
                  background: "rgba(180,80,80,0.07)",
                  borderRadius: "50%",
                  filter: "blur(60px)",
                  pointerEvents: "none",
                }}
              />
              {/* Ambient glow bottom-right */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: -40,
                  right: -20,
                  width: 200,
                  height: 160,
                  background: "rgba(194,122,92,0.06)",
                  borderRadius: "50%",
                  filter: "blur(50px)",
                  pointerEvents: "none",
                }}
              />

              <div
                className="pain-inner-grid"
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 48,
                  alignItems: "start",
                }}
              >
                {/* LEFT — heading + body */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(194,122,92,0.7)",
                      marginBottom: 16,
                    }}
                  >
                    THE PATTERN
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-serif)",
                      fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                      fontWeight: 700,
                      lineHeight: 1.08,
                      letterSpacing: "-0.03em",
                      color: "var(--text)",
                      marginBottom: 28,
                    }}
                  >
                    If this feels familiar, you&apos;re not alone.
                  </h2>
                  <div
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                      paddingTop: 20,
                      marginTop: 4,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        color: "rgba(161,161,170,0.75)",
                        lineHeight: 1.65,
                      }}
                    >
                      Most people don&apos;t hit a wall all at once. Pressure
                      builds slowly when work, recovery, and home life never
                      fully reset.
                    </p>
                    <p
                      style={{
                        margin: "14px 0 0",
                        fontSize: 14,
                        lineHeight: 1.65,
                      }}
                    >
                      <span style={{ color: "rgba(161,161,170,0.6)" }}>
                        Left alone long enough, it costs both:{" "}
                      </span>
                      <span
                        style={{
                          color: "rgba(120,190,150,0.9)",
                          fontWeight: 500,
                        }}
                      >
                        closeness at home
                      </span>
                      <span style={{ color: "rgba(161,161,170,0.6)" }}>
                        {" "}and{" "}
                      </span>
                      <span
                        style={{
                          color: "rgba(208,164,92,0.9)",
                          fontWeight: 500,
                        }}
                      >
                        clarity at work
                      </span>
                      <span style={{ color: "rgba(161,161,170,0.6)" }}>.</span>
                    </p>
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 14,
                        color: "rgba(161,161,170,0.7)",
                        lineHeight: 1.65,
                      }}
                    >
                      And it goes both ways. What happens at home shows up at
                      work just as much.
                    </p>
                  </div>
                </div>

                {/* RIGHT — pain lines */}
                <div>
                  {PAIN_LINES.map((line) => (
                    <div
                      key={line}
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                        paddingTop: 14,
                        paddingBottom: 14,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 1,
                          background: "rgba(194,122,92,0.4)",
                          alignSelf: "stretch",
                          flexShrink: 0,
                          borderRadius: 1,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 14.5,
                          lineHeight: 1.55,
                          color: "rgba(244,244,245,0.82)",
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom strip */}
              <div
                className="pain-bottom-strip"
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginTop: 36,
                  paddingTop: 28,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "rgba(244,244,245,0.85)",
                    lineHeight: 1.5,
                    maxWidth: 480,
                  }}
                >
                  Driftlatch helps you lower pressure sooner, then take one
                  clear next step that protects both.
                </p>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(194,122,92,0.7)",
                    whiteSpace: "nowrap",
                    paddingLeft: 24,
                  }}
                >
                  2 min to start →
                </span>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── 04 SPLIT ─────────────────────────────────────────────────── */}
        <section className="section">
          <FadeIn>
            <div style={{ display: "grid", gap: 24 }}>
              <h2 style={{ margin: 0 }}>A system that protects both.</h2>

              <div
                className="protects-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    ...GLASS_CARD_STYLE,
                    padding: "26px 26px 24px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <GlassRimLight />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background:
                        "linear-gradient(90deg, transparent, rgba(120,190,150,0.7), transparent)",
                      borderRadius: "22px 22px 0 0",
                    }}
                  />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: -40,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 160,
                      height: 80,
                      background: "rgba(120,190,150,0.10)",
                      borderRadius: "50%",
                      filter: "blur(30px)",
                    }}
                  />

                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        aria-hidden
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: "rgba(120,190,150,0.15)",
                          border: "1px solid rgba(120,190,150,0.25)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <HomeIcon color="rgba(120,190,150,0.9)" />
                      </div>
                      <div
                        style={{
                          color: "rgba(120,190,150,0.8)",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        CLOSENESS AT HOME
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      {HOME_PROTECTION_ITEMS.map((item) => (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                            padding: "12px 14px",
                            borderRadius: 12,
                            border: "1px solid rgba(120,190,150,0.08)",
                            background: "rgba(120,190,150,0.04)",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "rgba(120,190,150,0.6)",
                              marginTop: 7,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 14,
                              color: "rgba(244,244,245,0.85)",
                              lineHeight: 1.55,
                            }}
                          >
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        paddingTop: 20,
                        borderTop: "1px solid rgba(120,190,150,0.10)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "rgba(120,190,150,0.7)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(120,190,150,0.65)",
                          fontWeight: 500,
                        }}
                      >
                        Protected by presence, not just proximity
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    ...GLASS_CARD_STYLE,
                    padding: "26px 26px 24px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <GlassRimLight />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background:
                        "linear-gradient(90deg, transparent, rgba(208,164,92,0.7), transparent)",
                      borderRadius: "22px 22px 0 0",
                    }}
                  />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: -40,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 160,
                      height: 80,
                      background: "rgba(208,164,92,0.10)",
                      borderRadius: "50%",
                      filter: "blur(30px)",
                    }}
                  />

                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        aria-hidden
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: "rgba(208,164,92,0.15)",
                          border: "1px solid rgba(208,164,92,0.25)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <BriefcaseIcon color="rgba(208,164,92,0.9)" />
                      </div>
                      <div
                        style={{
                          color: "rgba(208,164,92,0.8)",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        CLARITY AT WORK
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      {WORK_PROTECTION_ITEMS.map((item) => (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                            padding: "12px 14px",
                            borderRadius: 12,
                            border: "1px solid rgba(208,164,92,0.08)",
                            background: "rgba(208,164,92,0.04)",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "rgba(208,164,92,0.6)",
                              marginTop: 7,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 14,
                              color: "rgba(244,244,245,0.85)",
                              lineHeight: 1.55,
                            }}
                          >
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        paddingTop: 20,
                        borderTop: "1px solid rgba(208,164,92,0.10)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "rgba(208,164,92,0.7)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(208,164,92,0.65)",
                          fontWeight: 500,
                        }}
                      >
                        Sharp when it counts. Off when it should be
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p
                style={{
                  margin: 0,
                  borderLeft: "2px solid rgba(194,122,92,0.4)",
                  paddingLeft: 20,
                  fontSize: 15,
                  color: "rgba(161,161,170,0.9)",
                  lineHeight: 1.65,
                }}
              >
                Work pressure and home tension feed each other.{" "}
                <strong style={{ fontWeight: 500, color: "var(--text)" }}>
                  Driftlatch helps you interrupt that loop before it costs you
                  both.
                </strong>
              </p>
            </div>
          </FadeIn>
        </section>

        {/* ── 05 EXPERT TOOLS ──────────────────────────────────────────── */}
        <section className="section">
          <FadeIn>
            <div
              className="calmer-top-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                marginBottom: 40,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    maxWidth: "none",
                    lineHeight: 1.06,
                  }}
                >
                  A calmer system
                  <br />
                  for hard days.
                </h2>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "rgba(161,161,170,0.85)",
                    lineHeight: 1.7,
                  }}
                >
                  Proven practices turned into short, usable steps so support
                  still works when you are tired, busy, or overloaded. One
                  clear move you can actually use.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* PART 1: Stats row */}
          <FadeIn delay={0.04}>
            <div
              className="calmer-stats"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 14,
              }}
            >
              {(
                [
                  { number: "10", label: "Support packs" },
                  { number: "220+", label: "Supports inside" },
                  { number: "1-10", label: "Minutes each" },
                  { number: "\u221e", label: "Possible paths" },
                ] as { number: string; label: string }[]
              ).map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    ...GLASS_CARD_STYLE,
                    padding: "20px 16px",
                    textAlign: "center",
                  }}
                >
                  <GlassRimLight />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: "var(--text)",
                        letterSpacing: "-0.03em",
                        fontFamily: "Zodiak, Georgia, serif",
                      }}
                    >
                      {stat.number}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(161,161,170,0.65)",
                        marginTop: 5,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* PART 2: Main feature card */}
          <FadeIn delay={0.08}>
            <div
              style={{
                ...GLASS_CARD_STYLE,
                padding: "30px 26px",
                marginBottom: 14,
              }}
            >
              <GlassRimLight />
              <div
                className="calmer-main-grid"
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 32,
                }}
              >
                {/* Left: packs */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 7,
                      marginBottom: 20,
                    }}
                  >
                    {PACK_CHIPS.map((pack) => (
                      <div
                        key={pack.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 10px",
                          borderRadius: 20,
                          background: "rgba(255,255,255,0.045)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: pack.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: "rgba(244,244,245,0.8)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pack.name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "rgba(161,161,170,0.78)",
                      lineHeight: 1.65,
                    }}
                  >
                    Ten packs, each built around a distinct need. From clearing
                    your head after a hard meeting to staying present with your
                    kids at 6pm. Short steps, no warmup required.
                  </p>
                </div>

                {/* Right: how it picks */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "rgba(161,161,170,0.5)",
                      marginBottom: 14,
                    }}
                  >
                    HOW IT PICKS
                  </div>
                  <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                    {(
                      [
                        {
                          step: "1",
                          title: "Reads your current state",
                          body: "You pick how you feel right now. Wired, drained, carrying work. Six states that map to real pressure patterns.",
                        },
                        {
                          step: "2",
                          title: "Shaped by your profile",
                          body: "Your attachment style and defaults guide which packs surface first. It gets more relevant the more you use it.",
                        },
                        {
                          step: "3",
                          title: "Gets sharper over time",
                          body: "Tools you pin or rate well appear more often. The ones that do not work get pushed back.",
                        },
                      ] as { step: string; title: string; body: string }[]
                    ).map((item) => (
                      <div
                        key={item.step}
                        style={{
                          padding: "13px 15px",
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "rgba(194,122,92,0.14)",
                              border: "1px solid rgba(194,122,92,0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "rgba(194,122,92,0.9)",
                              }}
                            >
                              {item.step}
                            </span>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text)",
                                marginBottom: 3,
                              }}
                            >
                              {item.title}
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "rgba(161,161,170,0.72)",
                                lineHeight: 1.55,
                              }}
                            >
                              {item.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(161,161,170,0.45)",
                      lineHeight: 1.5,
                    }}
                  >
                    No AI reads your messages. No tracking. Works only from
                    what you choose to enter.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* PART 3: Bottom strip */}
          <div
            className="calmer-bottom"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FadeIn delay={0.12}>
              <div
                style={{
                  ...GLASS_CARD_STYLE,
                  padding: "20px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <GlassRimLight />
                <div aria-hidden style={{ flexShrink: 0 }}>
                  <StarIcon />
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 3,
                    }}
                  >
                    More supports added regularly
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(161,161,170,0.68)",
                      lineHeight: 1.5,
                    }}
                  >
                    New tools and packs drop based on real usage patterns.
                  </p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.16}>
              <div
                style={{
                  ...GLASS_CARD_STYLE,
                  padding: "20px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <GlassRimLight />
                <div aria-hidden style={{ flexShrink: 0 }}>
                  <PinIcon />
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 3,
                    }}
                  >
                    Pin what works for you
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(161,161,170,0.68)",
                      lineHeight: 1.5,
                    }}
                  >
                    Save your best tools to the top of each context. Always one
                    tap away.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── 06 PRESSURE EQ ───────────────────────────────────────────── */}
        <section
          id="pressure-eq"
          style={{
            scrollMarginTop: 96,
            marginTop: 100,
            marginLeft: -18,
            marginRight: -18,
            padding: "100px 24px",
            background: "#0B0B0E",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow 1 — left sage */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "10%",
              left: "-5%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(120,190,150,0.08) 0%, transparent 65%)",
              filter: "blur(80px)",
              pointerEvents: "none",
            }}
          />
          {/* Glow 2 — right amber */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: "10%",
              right: "-5%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(208,164,92,0.07) 0%, transparent 65%)",
              filter: "blur(80px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ maxWidth: "var(--container)", margin: "0 auto" }}>
            {/* PART 1 — Mirror copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                maxWidth: 580,
                margin: "0 0 64px",
                textAlign: "left",
              }}
            >
              <div
                className="kicker"
                style={{
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <motion.div
                  aria-hidden
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgba(194,122,92,0.8)",
                    display: "inline-block",
                    marginRight: 8,
                    flexShrink: 0,
                  }}
                />
                PRESSURE EQ
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(2rem,4.5vw,3.2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.08,
                  marginBottom: 24,
                }}
              >
                <span style={{ color: "rgba(244,244,245,0.92)", display: "block" }}>
                  You are good at your work.
                </span>
                <span style={{ color: "rgba(194,122,92,0.9)", display: "block" }}>
                  You are not always good at coming home.
                </span>
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(161,161,170,0.65)",
                  lineHeight: 1.75,
                  maxWidth: 480,
                  margin: "0 0 16px",
                  textAlign: "left",
                }}
              >
                Not because you do not care. Because no one taught you how to
                switch off the part of your brain that runs on problems and
                turn on the part that runs on people.
              </p>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(161,161,170,0.65)",
                  lineHeight: 1.75,
                  maxWidth: 480,
                  margin: "0 0 16px",
                  textAlign: "left",
                }}
              >
                Driftlatch measures the gap between how your emotional
                intelligence performs when you are clear and how it performs
                when you are under pressure. Then it closes it.
              </p>
            </motion.div>

            {/* PART 2 — Six domain cards */}
            <div
              className="eq-domain-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 48,
              }}
            >
              {EQ_DOMAINS.map((domain, index) => (
                <motion.div
                  key={domain.name}
                  className="eq-domain-card"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                    delay: index * 0.07,
                  }}
                  style={{
                    ...GLASS_CARD_STYLE,
                    padding: "26px 22px",
                    cursor: "default",
                  }}
                >
                  {/* Colored top accent bar */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      borderRadius: "22px 22px 0 0",
                      background: `linear-gradient(90deg, transparent, rgba(${extractRgb(domain.dot)},0.6), transparent)`,
                      pointerEvents: "none",
                    }}
                  />
                  <GlassRimLight />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: domain.dot,
                        marginBottom: 14,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "rgba(244,244,245,0.85)",
                        marginBottom: 8,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {domain.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(161,161,170,0.55)",
                        lineHeight: 1.55,
                        marginBottom: 18,
                      }}
                    >
                      {domain.description}
                    </div>
                    <div
                      style={{
                        padding: "14px 16px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderLeft: `2px solid rgba(${extractRgb(domain.dot)},0.3)`,
                        paddingLeft: 14,
                        fontSize: 13,
                        color: "rgba(161,161,170,0.65)",
                        lineHeight: 1.65,
                      }}
                    >
                      {domain.scenario}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* PART 3 — CTA */}
            <div
              style={{
                ...GLASS_CARD_STYLE,
                padding: "40px 36px",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              <GlassRimLight />
              {/* Inner glow */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: -40,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 300,
                  height: 150,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(194,122,92,0.12) 0%, transparent 70%)",
                  filter: "blur(40px)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(1.4rem,3vw,2rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--text)",
                    margin: "0 0 6px",
                  }}
                >
                  See where you actually land.
                </h2>
                <p
                  style={{
                    fontSize: 15,
                    color: "rgba(161,161,170,0.5)",
                    marginBottom: 32,
                  }}
                >
                  Free. No account needed. Takes about 4 minutes.
                </p>
                <a
                  href="/pressure-eq"
                  className="btn primary eq-cta-primary"
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    display: "block",
                    width: "100%",
                    maxWidth: 360,
                    margin: "0 auto 16px",
                    textAlign: "center",
                    boxSizing: "border-box",
                  }}
                >
                  Take the Pressure EQ &rarr;
                </a>
                <a
                  href="#pricing"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(161,161,170,0.6)",
                    padding: "14px 28px",
                    borderRadius: 12,
                    fontSize: 14,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  See the full app
                </a>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(161,161,170,0.4)",
                    marginTop: 20,
                    fontStyle: "italic",
                  }}
                >
                  Used by founders who want to be better at home, not just at
                  work.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    marginTop: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(161,161,170,0.3)",
                    }}
                  >
                    4 minutes
                  </span>
                  <span
                    aria-hidden
                    style={{ fontSize: 11, color: "rgba(161,161,170,0.2)" }}
                  >
                    &middot;
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(161,161,170,0.3)",
                    }}
                  >
                    No account needed
                  </span>
                  <span
                    aria-hidden
                    style={{ fontSize: 11, color: "rgba(161,161,170,0.2)" }}
                  >
                    &middot;
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(161,161,170,0.3)",
                    }}
                  >
                    220+ supports behind the result
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 06.5 SAMPLE WEEKLY REFLECTION ────────────────────────────── */}
        <section className="section" id="sample-weekly" style={{ scrollMarginTop: "96px" }}>
          <FadeIn>
            <div style={{ display: "grid", gap: 12, textAlign: "center", marginBottom: 22 }}>
              <div
                style={{
                  color: "rgba(194,122,92,0.82)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Inside the product
              </div>
              <h2
                style={{
                  margin: "0 auto",
                  maxWidth: "24ch",
                  fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  color: "var(--text)",
                  textWrap: "balance",
                }}
              >
                Here&apos;s what a week looks like inside Driftlatch
              </h2>
              <p
                style={{
                  margin: "0 auto",
                  maxWidth: "32ch",
                  color: "rgba(161,161,170,0.55)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  fontStyle: "italic",
                }}
              >
                Sample data. Your reflection draws from your actual check-ins.
              </p>
            </div>
          </FadeIn>

          <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
            {/* Block A — Where pressure landed this week */}
            <FadeIn delay={0.08}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: "22px 24px",
                  borderRadius: 20,
                  background: "rgba(18,18,22,0.6)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
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
                <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "Zodiak, Georgia, serif",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        letterSpacing: "-0.025em",
                        color: "rgba(244,244,245,0.95)",
                      }}
                    >
                      Where pressure landed this week
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      { label: "Work into home", count: 3 },
                      { label: "Home into work", count: 2 },
                      { label: "Both directions", count: 1 },
                      { label: "Not today", count: 1 },
                      { label: "Days skipped", count: 0 },
                    ].map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          color: "rgba(244,244,245,0.78)",
                        }}
                      >
                        <span>{row.label}</span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color: row.count > 0 ? "rgba(244,244,245,0.92)" : "rgba(161,161,170,0.4)",
                          }}
                        >
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(161,161,170,0.55)",
                      lineHeight: 1.55,
                      fontStyle: "italic",
                    }}
                  >
                    Most days this week, pressure leaked work into home.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Block B — States you carried */}
            <FadeIn delay={0.16}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: "22px 24px",
                  borderRadius: 20,
                  background: "rgba(18,18,22,0.6)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
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
                <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "Zodiak, Georgia, serif",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        letterSpacing: "-0.025em",
                        color: "rgba(244,244,245,0.95)",
                      }}
                    >
                      States you carried
                    </div>
                  </div>
                  {/* Day-dot strip — Mon → Sun, colored by state */}
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    {[
                      { label: "M", color: "#DCAA5A" /* wired */ },
                      { label: "T", color: "#C27A5C" /* carrying_work */ },
                      { label: "W", color: "#B66660" /* overloaded */ },
                      { label: "T", color: "#6EA290" /* drained */ },
                      { label: "F", color: "#7E9AC6" /* steady */ },
                      { label: "S", color: "#7E9AC6" /* steady */ },
                      { label: "S", color: "#78C896" /* clear_light */ },
                    ].map((day, idx) => (
                      <div key={`day-${idx}`} style={{ flex: 1, display: "grid", gap: 6, justifyItems: "center" }}>
                        <div
                          style={{
                            width: "100%",
                            height: 28,
                            borderRadius: 8,
                            background: day.color,
                            opacity: 0.85,
                            boxShadow: `0 0 16px ${day.color}33`,
                          }}
                        />
                        <span style={{ fontSize: 10, color: "rgba(161,161,170,0.5)", letterSpacing: "0.04em" }}>
                          {day.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Legend: state-color → label */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      rowGap: 8,
                      columnGap: 14,
                      marginTop: 16,
                      marginBottom: 12,
                    }}
                  >
                    {[
                      { label: "Clear & light", color: "#78C896" },
                      { label: "Steady", color: "#7E9AC6" },
                      { label: "Carrying work", color: "#C27A5C" },
                      { label: "Wired", color: "#DCAA5A" },
                      { label: "Drained", color: "#6EA290" },
                      { label: "Overloaded", color: "#B66660" },
                    ].map((entry) => (
                      <span
                        key={entry.label}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            background: entry.color,
                            opacity: 0.85,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12, color: "rgba(161,161,170,0.65)" }}>
                          {entry.label}
                        </span>
                      </span>
                    ))}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(161,161,170,0.55)",
                      lineHeight: 1.55,
                      fontStyle: "italic",
                    }}
                  >
                    Heavier early in the week, lighter by Friday.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Block C — What seemed to help */}
            <FadeIn delay={0.24}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: "22px 24px",
                  borderRadius: 20,
                  background: "rgba(18,18,22,0.6)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
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
                <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "Zodiak, Georgia, serif",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        letterSpacing: "-0.025em",
                        color: "rgba(244,244,245,0.95)",
                      }}
                    >
                      What seemed to help
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 0 }}>
                    {[
                      { title: "Pre-Home Arrive First", uses: 3 },
                      { title: "Repeat the Good Thing", uses: 2 },
                    ].map((tool, i) => (
                      <div
                        key={tool.title}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 0",
                          borderBottom: i === 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                          gap: 12,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(244,244,245,0.85)" }}>
                          {tool.title}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "rgba(161,161,170,0.55)",
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                          }}
                        >
                          Used {tool.uses} times
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── 07 PRICING ───────────────────────────────────────────────── */}
        <section className="section" id="pricing" style={{ scrollMarginTop: "96px" }}>
          <FadeIn>
            <h2>Founding Access</h2>
            <p className="small">
              No free tier. Driftlatch is designed as an ongoing support system,
              not a trial app you outgrow.
            </p>
            <p className="small" style={{ marginTop: 8 }}>
              Both plans include full access. Annual is simply the lower price.
            </p>
          </FadeIn>

          <div className="grid two" style={{ marginTop: 18 }}>
            <FadeIn delay={0.04}>
              <div
                className="card premium"
                style={{
                  border: "1px solid rgba(194,122,92,0.28)",
                  boxShadow:
                    "0 18px 40px rgba(194,122,92,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                  background:
                    "linear-gradient(180deg, rgba(194,122,92,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                }}
              >
                <div className="kicker">Annual (Best value)</div>
                <p style={{ marginBottom: 6 }}>
                  <strong>$59 / year</strong>
                </p>
                <p className="small">
                  Full access. Best for people who want a steady system they
                  can keep using under pressure.
                </p>

                <div className="btnRow">
                  <a className="btn primary" href="/buy?plan=annual">
                    Start Annual
                  </a>
                  <a className="btn ghost" href="/pricing">
                    Read details
                  </a>
                </div>
                <p className="small" style={{ marginTop: 10 }}>
                  Secure checkout via Paddle.
                </p>
                <p className="small" style={{ marginTop: 12 }}>
                  14-day refund guarantee. No questions asked.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="card">
                <div className="kicker">Monthly</div>
                <p style={{ marginBottom: 6 }}>
                  <strong>$9.99 / month</strong>
                </p>
                <p className="small">Flexible. Switch to annual anytime.</p>

                <div className="btnRow">
                  <a className="btn ghost" href="/buy?plan=monthly">
                    Start Monthly
                  </a>
                </div>
                <p className="small" style={{ marginTop: 10 }}>
                  Secure checkout via Paddle.
                </p>
                <p className="small" style={{ marginTop: 12 }}>
                  Includes the same support system, billed monthly.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── 07 PRIVACY ───────────────────────────────────────────────── */}
        <section className="section">
          <FadeIn>
            <div className="privacyBand">
              <div className="privacyBandInner">
                <span
                  style={{ color: "var(--accent)", fontSize: 22, flexShrink: 0 }}
                  aria-hidden="true"
                >
                  🔒
                </span>
                <div>
                  <div className="stampTitle">Privacy-first guarantee</div>
                  <p className="small" style={{ marginTop: 10 }}>
                    Driftlatch does not read your messages, emails, or calls. It
                    does not track your phone activity. It works only from what
                    you choose to enter. You can export or delete your data
                    anytime.
                  </p>
                  <div style={{ marginTop: 12 }} className="badge">
                    Privacy is the baseline.
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── 08 FAQ ───────────────────────────────────────────────────── */}
        <section className="section" id="faq" style={{ scrollMarginTop: "96px" }}>
          <FadeIn>
            <h2>FAQ</h2>
            <p className="small" style={{ maxWidth: "78ch" }}>
              Short answers, no fluff.
            </p>
          </FadeIn>

          <div className="faqList" style={{ marginTop: 24 }}>
            {FAQ_ITEMS.map((item, i) => (
              <FadeIn key={item.q} delay={i * 0.05}>
                <FaqItem q={item.q} a={item.a} />
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer
          className="section public-footer"
          style={{
            marginTop: 32,
            marginBottom: 40,
            padding: "32px 28px",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 22,
            background: "rgba(18,18,22,0.6)",
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
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(214,150,120,1) 0%, rgba(194,122,92,1) 55%, rgba(146,86,63,1) 100%)",
                    boxShadow: "0 0 18px rgba(194,122,92,0.22)",
                  }}
                />
                <span
                  style={{
                    color: "var(--text)",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  Driftlatch
                </span>
              </div>
              <p className="small" style={{ margin: 0, maxWidth: 320 }}>
                Built for founders and high-drive professionals who want a
                cleaner end to the day and a steadier start to the next one.
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
              <div
                className="small"
                style={{ color: "var(--text)", fontWeight: 700 }}
              >
                Quick links
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px" }}>
                <a
                  href="/pricing"
                  style={{
                    color: "var(--muted)",
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                >
                  Pricing
                </a>
                <a
                  href="/terms"
                  style={{
                    color: "var(--muted)",
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                >
                  Terms
                </a>
                <a
                  href="/privacy"
                  style={{
                    color: "var(--muted)",
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                >
                  Privacy
                </a>
                <a
                  href="/refunds"
                  style={{
                    color: "var(--muted)",
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                >
                  Refunds
                </a>
                <a
                  href="mailto:support@driftlatch.com"
                  style={{
                    color: "var(--muted)",
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                >
                  Support
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
