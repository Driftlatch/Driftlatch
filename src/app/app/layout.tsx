"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import NavBar from "./NavBar";
import {
  hasAppAccess,
  hasCompletedSetup,
  loadAuthState,
  loadUserProfile,
  loadUserEntitlement,
  syncUserProfileIdentity,
} from "@/lib/auth";
import { syncStoredPublicProfileToAccount } from "@/lib/publicProfile";
import { getSupabase } from "@/lib/supabase";

const SETUP_ROUTE = "/app/setup";
const APP_ROUTE = "/app";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    const guardRoute = async (sessionOverride?: Session | null) => {
      try {
        const authState = sessionOverride
          ? {
              session: sessionOverride,
              profile: await (async () => {
                await syncUserProfileIdentity(sessionOverride);
                await syncStoredPublicProfileToAccount(sessionOverride);
                return loadUserProfile(sessionOverride.user.id);
              })(),
            }
          : await loadAuthState();

        if (!active) return;

        if (!authState.session) {
          setReady(false);
          router.replace("/login");
          return;
        }

        const entitlement = await loadUserEntitlement(authState.session.user.id);
        if (!active) return;

        if (!hasAppAccess(entitlement?.status)) {
          setReady(false);
          router.replace("/buy");
          return;
        }

        const setupComplete = hasCompletedSetup(authState.profile);
        if (!setupComplete && pathname !== SETUP_ROUTE) {
          setReady(false);
          router.replace(SETUP_ROUTE);
          return;
        }

        if (setupComplete && pathname === SETUP_ROUTE) {
          setReady(false);
          router.replace(APP_ROUTE);
          return;
        }

        setReady(true);
      } catch (error) {
        console.error("Failed to resolve auth state:", error);
        if (!active) return;
        setReady(false);
        router.replace("/login");
      }
    };

    void guardRoute();

    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setReady(false);
        router.replace("/login");
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
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
            {pathname === SETUP_ROUTE ? "Checking your account." : "Checking your session."}
          </p>
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
