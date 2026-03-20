import type { Session } from "@supabase/supabase-js";
import { clearStoredPublicProfileData, syncStoredPublicProfileToAccount } from "@/lib/publicProfile";
import { getSupabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/types/supabase";

export type UserProfile = Pick<
  Tables<"user_profile">,
  "user_id" | "username" | "display_name"
>;

export type UserEntitlement = {
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  plan: string | null;
  user_id: string;
  status: string | null;
};

export type AuthStateDiagnostic = {
  detail?: string;
  stage: "session" | "profile_sync" | "stored_profile_sync" | "profile_load";
};

export type AuthState = {
  diagnostics: AuthStateDiagnostic[];
  profile: UserProfile | null;
  session: Session | null;
};

function isSafeAppPath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export function getPostAuthRedirectPath(nextPath?: string | null): string {
  return isSafeAppPath(nextPath) ? nextPath : "/app";
}

export function getSessionUserEmail(session: Session | null) {
  return session?.user.email?.trim().toLowerCase() ?? "";
}

export function hasAppAccess(status: string | null | undefined) {
  return status === "active";
}

export function hasCompletedSetup(profile: Pick<UserProfile, "username"> | null | undefined) {
  return typeof profile?.username === "string" && profile.username.trim().length > 0;
}

function describeAuthError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }

    if ("error_description" in error && typeof error.error_description === "string") {
      return error.error_description;
    }
  }

  return "Unknown auth error";
}

function isMissingSupabaseSessionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";

  return name === "AuthSessionMissingError" || message === "Auth session missing!";
}

async function resolveProfileForSession(session: Session, diagnostics: AuthStateDiagnostic[]) {
  try {
    await syncUserProfileIdentity(session);
  } catch (error) {
    const detail = describeAuthError(error);
    diagnostics.push({ detail, stage: "profile_sync" });
    console.warn("[auth] Failed to sync profile identity. Continuing with existing profile.", {
      detail,
      userId: session.user.id,
    });
  }

  try {
    const syncedStoredProfile = await syncStoredPublicProfileToAccount(session);
    if (syncedStoredProfile) {
      console.info("[auth] Synced stored public profile into account.", {
        userId: session.user.id,
      });
    }
  } catch (error) {
    const detail = describeAuthError(error);
    diagnostics.push({ detail, stage: "stored_profile_sync" });
    console.warn("[auth] Failed to sync stored public profile. Clearing stale local data.", {
      detail,
      userId: session.user.id,
    });
    clearStoredPublicProfileData();
  }

  try {
    return await loadUserProfile(session.user.id);
  } catch (error) {
    const detail = describeAuthError(error);
    diagnostics.push({ detail, stage: "profile_load" });
    console.warn("[auth] Failed to load user profile. Treating setup as incomplete.", {
      detail,
      userId: session.user.id,
    });
    return null;
  }
}

export async function loadUserProfile(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_profile")
    .select("user_id, username, display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as UserProfile | null;
}

export async function loadUserEntitlement(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("user_id, plan, status, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as UserEntitlement | null;
}

export async function syncUserProfileIdentity(
  session: Session,
  options?: { displayName?: string | null },
) {
  const existingProfile = await loadUserProfile(session.user.id);
  const email = getSessionUserEmail(session);
  const nextDisplayName =
    options && "displayName" in options ? options.displayName?.trim() || null : undefined;

  const needsIdentitySync =
    !existingProfile ||
    (email && existingProfile.username !== email) ||
    (nextDisplayName !== undefined && (existingProfile.display_name ?? null) !== nextDisplayName);

  if (!needsIdentitySync) {
    return existingProfile;
  }

  const payload: TablesInsert<"user_profile"> = {
    user_id: session.user.id,
    username: email || existingProfile?.username || null,
    updated_at: new Date().toISOString(),
  };

  if (nextDisplayName !== undefined) {
    payload.display_name = nextDisplayName;
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("user_profile").upsert(payload);

  if (error) throw error;

  return loadUserProfile(session.user.id);
}

export async function loadAuthState(sessionOverride?: Session | null): Promise<AuthState> {
  const diagnostics: AuthStateDiagnostic[] = [];

  if (sessionOverride !== undefined) {
    if (!sessionOverride) {
      return { diagnostics, session: null, profile: null };
    }

    const profile = await resolveProfileForSession(sessionOverride, diagnostics);
    return { diagnostics, session: sessionOverride, profile };
  }

  const supabase = getSupabase();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    if (isMissingSupabaseSessionError(error)) {
      diagnostics.push({ detail: describeAuthError(error), stage: "session" });
      return { diagnostics, session: null, profile: null };
    }

    throw error;
  }

  if (!session) return { diagnostics, session: null, profile: null };

  const profile = await resolveProfileForSession(session, diagnostics);
  return { diagnostics, session, profile };
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}
