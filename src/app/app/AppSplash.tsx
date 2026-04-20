"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LogoAnimation from "@/components/LogoAnimation";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SPLASH_KEY = "driftlatch_splash_shown";

export default function AppSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shown = window.localStorage.getItem(SPLASH_KEY);
    if (shown) return;
    setVisible(true);
  }, []);

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SPLASH_KEY, "1");
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="app-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "all" }}
        >
          <LogoAnimation variant="splash" onComplete={handleComplete} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
