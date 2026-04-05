"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";

type CardKey = "main" | "a" | "b";
const BASE_ROTATION: Record<CardKey, number> = {
  main: -1,
  a: 4,
  b: -5,
};

const AWAY_ROTATION: Record<CardKey, number> = {
  main: -6,
  a: 7,
  b: -8,
};

const BASE_Z: Record<CardKey, number> = {
  main: 12,
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

  if (key === "main") {
    return {
      rotate: BASE_ROTATION[key],
      scale: 1.03,
      y: -8,
      opacity: 1,
      zIndex: BASE_Z[key],
      boxShadow: "0 32px 72px rgba(0,0,0,0.42), 0 0 44px rgba(201,122,90,0.18)",
      transition: SPRING,
    };
  }

  return {
    rotate: BASE_ROTATION[key],
    scale: key === "a" ? 0.9 : 0.88,
    y: key === "a" ? 8 : 18,
    opacity: key === "a" ? 0.82 : 0.72,
    zIndex: BASE_Z[key],
    boxShadow: "0 14px 32px rgba(0,0,0,0.24)",
    transition: SPRING,
  };
}

export function HeroVisual() {
  const [hovered, setHovered] = useState<CardKey | null>(null);

  return (
    <div className="heroVisualWrap" aria-hidden="true">
      <motion.div
        className="heroBlob"
        animate={{ x: [0, 16, -12, 0], y: [0, -10, 14, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="heroStageGlow" />
      <div className="heroStagePanel" />

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
            <span className="chip">Get one step</span>
            <Image src="/visuals/ui-action.png" alt="" fill sizes="(max-width: 900px) 90vw, 46vw" priority />
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
            <span className="chip">Check in</span>
            <Image src="/visuals/ui-checkin.png" alt="" fill sizes="(max-width: 900px) 58vw, 24vw" />
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
            <span className="chip">Steadier week</span>
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
  );
}
