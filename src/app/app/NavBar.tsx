"use client";

import type { CSSProperties, ReactElement, SVGProps } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type NavItem = {
  href: string;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  match: (pathname: string) => boolean;
};

const MotionLink = motion(Link);
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const navItems: NavItem[] = [
  {
    href: "/app",
    label: "Home",
    Icon: HomeIcon,
    match: (p) => p === "/app" || p === "/app/",
  },
  {
    href: "/app/checkin",
    label: "Check-in",
    Icon: CheckInIcon,
    match: (p) => p === "/app/checkin" || p.startsWith("/app/checkin/"),
  },
  {
    href: "/app/packs",
    label: "Packs",
    Icon: PacksIcon,
    match: (p) => p === "/app/packs" || p.startsWith("/app/packs/"),
  },
  {
    href: "/app/weekly",
    label: "Weekly",
    Icon: WeeklyIcon,
    match: (p) => p === "/app/weekly" || p.startsWith("/app/weekly/"),
  },
  {
    href: "/app/account",
    label: "Account",
    Icon: AccountIcon,
    match: (p) => p === "/app/account" || p.startsWith("/app/account/"),
  },
];

function IconBase({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4.75 10.5L12 4.75l7.25 5.75" />
      <path d="M6.75 9.75v8.5h10.5v-8.5" />
      <path d="M10 18.25v-4.75h4v4.75" />
    </IconBase>
  );
}

function CheckInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.25" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function PacksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4.75" y="4.75" width="6" height="6" rx="1.5" />
      <rect x="13.25" y="4.75" width="6" height="6" rx="1.5" />
      <rect x="4.75" y="13.25" width="6" height="6" rx="1.5" />
      <rect x="13.25" y="13.25" width="6" height="6" rx="1.5" />
    </IconBase>
  );
}

function WeeklyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5 18.25l4.25-5.5 3.5 3.5 3.75-6 3.75-4" />
    </IconBase>
  );
}

function AccountIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8.25" r="3.25" />
      <path d="M6.25 18.5c1.2-2.4 3.32-3.75 5.75-3.75s4.55 1.35 5.75 3.75" />
    </IconBase>
  );
}

function NavItem({
  item,
  active,
  indicatorDot,
}: {
  item: NavItem;
  active: boolean;
  indicatorDot?: boolean;
}) {
  const { href, label, Icon } = item;

  return (
    <MotionLink
      href={href}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.15, ease: EASE }}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        minWidth: 52,
        padding: "6px 14px",
        borderRadius: 14,
        textDecoration: "none",
        color: active ? "rgba(194,122,92,0.9)" : "rgba(161,161,170,0.45)",
        background: active ? "rgba(194,122,92,0.12)" : "transparent",
        transition: "color 0.2s ease, background 0.2s ease",
        WebkitTapHighlightColor: "transparent",
        position: "relative",
      }}
    >
      {indicatorDot && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "rgba(194,122,92,0.7)",
            pointerEvents: "none",
          }}
        />
      )}
      <Icon width={20} height={20} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.02em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </MotionLink>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const [hasEQProfile, setHasEQProfile] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      (supabase as any)
        .from("user_eq_profile")
        .select("archetype")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }: { data: { archetype: string } | null }) => {
          if (data) setHasEQProfile(true);
        });
    });
  }, []);

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      aria-label="Primary"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        x: "-50%",
        width: "calc(100% - 32px)",
        maxWidth: 480,
        height: 64,
        zIndex: 100,
        background: "rgba(18,18,22,0.92)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 24,
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 8px",
        WebkitTapHighlightColor: "transparent",
      }}
    >
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
        }}
      />
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          active={item.match(pathname)}
          indicatorDot={item.href === "/app/account" && hasEQProfile}
        />
      ))}
    </motion.nav>
  );
}
