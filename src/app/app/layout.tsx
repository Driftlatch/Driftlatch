"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import Link from "next/link";
import NavBar from "./NavBar";
import {
  hasAppAccess,
  hasCompletedSetup,
  loadAuthState,
  loadUserEntitlement,
} from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const SETUP_ROUTE = "/app/setup";
const APP_ROUTE = "/app";

function logAppGuard(label: string, details?: Record<string, unknown>) {
  console.info(`[app-guard] ${label}`, details ?? {});
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [guardError, setGuardError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

    const guardRoute = async (sessionOverride?: Session | null) => {
      try {
        logAppGuard("Resolving app route", {
          pathname,
          sessionOverride: Boolean(sessionOverride),
        });

        const authState = await loadAuthState(sessionOverride);

        if (!active) return;
        if (authState.diagnostics.length > 0) {
          logAppGuard("Auth state resolved with diagnostics", {
            diagnostics: authState.diagnostics,
            pathname,
          });
        }

        if (!authState.session) {
          logAppGuard("Missing session. Redirecting to login.", {
            pathname,
          });
          setGuardError(null);
          setReady(false);
          router.replace(loginHref);
          return;
        }

        const entitlement = await loadUserEntitlement(authState.session.user.id);
        if (!active) return;

        logAppGuard("Entitlement resolved", {
          entitlementStatus: entitlement?.status ?? null,
          pathname,
          userId: authState.session.user.id,
        });

        if (!hasAppAccess(entitlement?.status)) {
          logAppGuard("No active access. Redirecting to /buy.", {
            entitlementStatus: entitlement?.status ?? null,
            pathname,
          });
          setGuardError(null);
          setReady(false);
          router.replace("/buy");
          return;
        }

        const setupComplete = hasCompletedSetup(authState.profile);
        if (!setupComplete && pathname !== SETUP_ROUTE) {
          logAppGuard("Setup incomplete. Redirecting to setup.", {
            pathname,
            profilePresent: Boolean(authState.profile),
            username: authState.profile?.username ?? null,
          });
          setGuardError(null);
          setReady(false);
          router.replace(SETUP_ROUTE);
          return;
        }

        if (setupComplete && pathname === SETUP_ROUTE) {
          logAppGuard("Setup already complete. Redirecting to app home.", {
            pathname,
          });
          setGuardError(null);
          setReady(false);
          router.replace(APP_ROUTE);
          return;
        }

        logAppGuard("App route ready", {
          pathname,
          setupComplete,
          userId: authState.session.user.id,
        });
        setGuardError(null);
        setReady(true);
      } catch (error) {
        console.error("[app-guard] Failed to resolve app entry state", {
          error,
          pathname,
          sessionOverride: Boolean(sessionOverride),
        });
        if (!active) return;
        setReady(false);
        setGuardError("We could not restore this account state right now. Refresh or sign in again.");
      }
    };

    void guardRoute();

    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        logAppGuard("Auth event SIGNED_OUT", {
          pathname,
        });
        setGuardError(null);
        setReady(false);
        router.replace(loginHref);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        logAppGuard("Auth event received", {
          event,
          pathname,
          sessionPresent: Boolean(session),
        });
        setGuardError(null);
        setReady(false);
        void guardRoute(session);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--text)",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Loading</div>
          <p style={{ marginTop: 8, color: "var(--muted)" }}>
            {guardError ?? (pathname === SETUP_ROUTE ? "Checking your account." : "Checking your session.")}
          </p>
          {guardError ? (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button className="btn ghost" onClick={() => window.location.reload()} type="button">
                Refresh
              </button>
              <Link className="btn primary" href={`/login?next=${encodeURIComponent(pathname)}`}>
                Sign in again
              </Link>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  const showNav = pathname !== SETUP_ROUTE;

  return (
    <>
      <div
        style={{
          minHeight: "100svh",
          background: "var(--bg)",
          color: "var(--text)",
          paddingBottom: showNav ? "calc(96px + env(safe-area-inset-bottom))" : 0,
        }}
      >
        {children}
      </div>
      {showNav ? <NavBar /> : null}
    </>
  );
}
