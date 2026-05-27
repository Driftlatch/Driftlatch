"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Banner storage key + dismiss window.
const DISMISS_KEY = "driftlatch_ios_install_dismissed_at";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Skip prefixes: high-focus surfaces where a banner would distract.
const SKIP_PATH_PREFIXES = [
  "/pressure-eq",
  "/pressure-profile",
  "/app/onboarding",
  "/login",
  "/buy",
  "/thanks",
];

// Exact-match skips: paths to skip without matching child routes.
// /app is the home page where the 5-step tutorial runs; deeper /app/* routes still show the banner.
const SKIP_PATHS_EXACT = new Set<string>(["/app"]);

function isIOSSafariBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  if (!isIOS) return false;

  // Already running as an installed PWA — nothing to nudge.
  const standaloneMQ =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  // Legacy iOS-specific property; not in standard Navigator types.
  const legacyStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standaloneMQ || legacyStandalone) return false;

  return true;
}

function isRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number.parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

export default function IOSInstallBanner() {
  const pathname = usePathname() ?? "";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafariBrowser()) return;
    if (isRecentlyDismissed()) return;
    if (SKIP_PATHS_EXACT.has(pathname)) return;
    if (SKIP_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return;
    setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  const onDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore quota / privacy mode errors
    }
    setVisible(false);
  };

  // Account for the bottom NavBar on /app/** (NavBar sits at bottom: 16, height ~64, total ~80px occupied).
  const isInApp = pathname.startsWith("/app");
  const bottomOffset = isInApp
    ? "calc(96px + env(safe-area-inset-bottom))"
    : "calc(16px + env(safe-area-inset-bottom))";

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: bottomOffset,
        left: 12,
        right: 12,
        zIndex: 101,
        padding: 12,
        borderRadius: 16,
        background: "rgba(18,18,22,0.95)",
        border: "1px solid rgba(194,122,92,0.22)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(244,244,245,0.92)",
            marginBottom: 4,
            letterSpacing: "-0.01em",
          }}
        >
          Install Driftlatch on your iPhone
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(161,161,170,0.78)",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span>Tap</span>
          {/* iOS share icon: rounded box with up-arrow */}
          <svg
            width={16}
            height={20}
            viewBox="0 0 16 20"
            fill="none"
            aria-label="Share"
            style={{ flexShrink: 0, transform: "translateY(2px)" }}
          >
            <path
              d="M8 13 L8 2"
              stroke="rgba(194,122,92,0.95)"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
            <path
              d="M4.5 5.5 L8 2 L11.5 5.5"
              stroke="rgba(194,122,92,0.95)"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M4 8 L2.5 8 Q1.5 8 1.5 9 L1.5 17 Q1.5 18.5 3 18.5 L13 18.5 Q14.5 18.5 14.5 17 L14.5 9 Q14.5 8 13.5 8 L12 8"
              stroke="rgba(194,122,92,0.95)"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span>in Safari, then</span>
          <span style={{ color: "rgba(244,244,245,0.92)", fontWeight: 600 }}>
            Add to Home Screen
          </span>
          <span>.</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          padding: 0,
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "rgba(161,161,170,0.7)",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
