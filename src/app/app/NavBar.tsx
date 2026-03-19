"use client";

import type { CSSProperties, ReactElement, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type NavItem = {
  href: string;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
};

const MotionLink = motion(Link);

const navItems: NavItem[] = [
  { href: "/app", label: "Home", Icon: HomeIcon },
  { href: "/app/checkin", label: "Check-in", Icon: CheckInIcon },
  { href: "/app/tools", label: "Tools", Icon: ToolsIcon },
  { href: "/app/weekly", label: "Weekly", Icon: WeeklyIcon },
  { href: "/app/packs", label: "Packs", Icon: PacksIcon },
  { href: "/app/account", label: "Account", Icon: AccountIcon },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/app") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemStyle(active: boolean): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    padding: "0 8px",
    borderRadius: 18,
    overflow: "hidden",
    textDecoration: "none",
    color: active ? "rgba(244,244,245,0.94)" : "rgba(161,161,170,0.85)",
    WebkitTapHighlightColor: "transparent",
  };
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <div style={navWrapStyle}>
      <motion.nav
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        style={navStyle}
        aria-label="Primary"
      >
        <div style={topHighlightStyle} aria-hidden />

        {navItems.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);

          return (
            <MotionLink key={href} href={href} whileTap={{ scale: 0.98 }} aria-current={active ? "page" : undefined} style={itemStyle(active)}>
              {active ? <motion.span layoutId="nav-active" transition={capsuleTransition} style={activeCapsuleStyle} aria-hidden /> : null}

              <span style={itemInnerStyle}>
                <motion.span animate={active ? { y: -1, scale: 1.03 } : { y: 0, scale: 1 }} transition={iconTransition} style={iconStyle}>
                  <Icon width={22} height={22} />
                </motion.span>

                <AnimatePresence initial={false}>
                  {active ? (
                    <motion.span
                      key={`${href}-label`}
                      initial={{ opacity: 0, scale: 0.94, x: -6 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.96, x: -4 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      style={labelStyle}
                    >
                      {label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            </MotionLink>
          );
        })}
      </motion.nav>

      <style jsx>{`
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}

const navWrapStyle: CSSProperties = {
  position: "fixed",
  bottom: 18,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  zIndex: 50,
  pointerEvents: "none",
  padding: "0 12px",
};

const navStyle: CSSProperties = {
  position: "relative",
  pointerEvents: "auto",
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 6,
  width: "min(720px, 100%)",
  padding: "8px",
  background: "rgba(39,39,42,0.62)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 22,
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
  overflow: "hidden",
};

const topHighlightStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 16,
  right: 16,
  height: 1,
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
  pointerEvents: "none",
};

const activeCapsuleStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(194,122,92,0.16) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 24px rgba(0,0,0,0.18)",
};

const itemInnerStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
};

const iconStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
};

const capsuleTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
};

const iconTransition = {
  type: "spring" as const,
  stiffness: 360,
  damping: 28,
};

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
      <path d="M7.25 4.75v2.5" />
      <path d="M16.75 4.75v2.5" />
      <path d="M5.75 8h12.5" />
      <rect x="4.75" y="6.25" width="14.5" height="13" rx="3" />
      <path d="M9.25 13l2 2 3.75-4" />
    </IconBase>
  );
}

function ToolsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5.5 7.25h13" />
      <path d="M5.5 12h13" />
      <path d="M5.5 16.75h13" />
      <circle cx="9" cy="7.25" r="1.25" />
      <circle cx="15.25" cy="12" r="1.25" />
      <circle cx="11.75" cy="16.75" r="1.25" />
    </IconBase>
  );
}

function WeeklyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4.75" y="5.25" width="14.5" height="13.5" rx="3" />
      <path d="M8 9.25h8" />
      <path d="M8 13h5.5" />
      <path d="M8 16.75h3.25" />
    </IconBase>
  );
}

function PacksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 4.75l6.75 3.5L12 11.75 5.25 8.25 12 4.75z" />
      <path d="M5.25 8.25v7.5L12 19.25l6.75-3.5v-7.5" />
      <path d="M12 11.75v7.5" />
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
