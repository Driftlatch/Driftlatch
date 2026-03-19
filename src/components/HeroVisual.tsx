"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type CardKey = "main" | "a" | "b";

const CARD_ORDER: CardKey[] = ["main", "a", "b"];
const BASE_ROTATION: Record<CardKey, number> = {
  main: -1,
  a: 2,
  b: -3,
};

const AWAY_ROTATION: Record<CardKey, number> = {
  main: -6,
  a: 7,
  b: -8,
};

const BASE_Z: Record<CardKey, number> = {
  main: 4,
  a: 6,
  b: 5,
};

const SPRING = { type: "spring", stiffness: 300, damping: 20 } as const;

function cardStyle(key: CardKey, hovered: CardKey | null) {
  if (hovered === key) {
    return {
      rotate: 0,
      scale: 1.06,
      y: -12,
      opacity: 1,
      zIndex: 20,
      boxShadow: "0 30px 70px rgba(0,0,0,0.48), 0 0 38px rgba(201,122,90,0.52)",
      transition: SPRING,
    };
  }

  if (hovered && hovered !== key) {
    return {
      rotate: AWAY_ROTATION[key],
      scale: 0.93,
      y: 0,
      opacity: 0.5,
      zIndex: 2,
      boxShadow: "0 14px 36px rgba(0,0,0,0.26)",
      transition: SPRING,
    };
  }

  return {
    rotate: BASE_ROTATION[key],
    scale: 1,
    y: 0,
    opacity: 1,
    zIndex: BASE_Z[key],
    boxShadow: "0 16px 38px rgba(0,0,0,0.3)",
    transition: SPRING,
  };
}

function activeIndex(hovered: CardKey | null, cycleIndex: number) {
  if (!hovered) return cycleIndex;
  return CARD_ORDER.indexOf(hovered);
}

export function HeroVisual() {
  const [hovered, setHovered] = useState<CardKey | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % CARD_ORDER.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  const activeDot = useMemo(() => activeIndex(hovered, cycleIndex), [hovered, cycleIndex]);

  return (
    <>
      <div className="heroVisualWrap" aria-hidden="true">
        <motion.div
          className="heroBlob"
          animate={{ x: [0, 16, -12, 0], y: [0, -10, 14, 0], scale: [1, 1.08, 0.95, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="deskLayer">
          <motion.div
            className="floatTile mainTile"
            onHoverStart={() => setHovered("main")}
            onHoverEnd={() => setHovered(null)}
            animate={cardStyle("main", hovered)}
          >
            <motion.div
              animate={{ y: [0, -5, 0, 4, 0], x: [0, 1, -1, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            >
              <span className="chip">Check-in</span>
              <Image src="/visuals/ui-checkin.png" alt="" fill sizes="(max-width: 900px) 90vw, 46vw" priority />
            </motion.div>
          </motion.div>

          <motion.div
            className="floatTile tileA"
            onHoverStart={() => setHovered("a")}
            onHoverEnd={() => setHovered(null)}
            animate={cardStyle("a", hovered)}
          >
            <motion.div
              animate={{ y: [0, -8, 0, 6, 0], x: [0, -2, 1, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            >
              <span className="chip">Action</span>
              <Image src="/visuals/ui-action.png" alt="" fill sizes="(max-width: 900px) 58vw, 24vw" />
            </motion.div>
          </motion.div>

          <motion.div
            className="floatTile tileB"
            onHoverStart={() => setHovered("b")}
            onHoverEnd={() => setHovered(null)}
            animate={cardStyle("b", hovered)}
          >
            <motion.div
              animate={{ y: [0, -4, 0, 3, 0], x: [0, 2, -1, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}
            >
              <span className="chip">Weekly</span>
              <Image src="/visuals/ui-weekly.png" alt="" fill sizes="(max-width: 900px) 62vw, 28vw" />
            </motion.div>
          </motion.div>

          <div className="floatTile tex1">
            <Image src="/visuals/texture-1.png" alt="" fill sizes="180px" />
          </div>

          <div className="floatTile tex2">
            <Image src="/visuals/texture-2.png" alt="" fill sizes="160px" />
          </div>
        </div>
      </div>

      <div className="stackHint" aria-hidden="true">
        {CARD_ORDER.map((card, idx) => (
          <motion.span
            key={card}
            className={`dot${activeDot === idx ? " active" : ""}`}
            animate={{ opacity: activeDot === idx ? 1 : 0.35, scale: activeDot === idx ? 1.18 : 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        ))}
        <span className="hintText">3-part system</span>
      </div>
    </>
  );
}
