import type { Session, User } from "@supabase/supabase-js";
import { clearStoredPublicProfileData, syncStoredPublicProfileToAccount } from "@/lib/publicProfile";
import { getSupabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/types/supabase";

export type UserProfile = Pick<
  Tables<"user_profile">,
  "user_id" | "username" | "display_name" | "attachment_style" | "defaults"
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
  stage: "session" | "profile_sync" | "stored_profile_sync" | "profile_load" | "profile_reload" | "profile_duplicate_rows" | "entitlement_load";
};

export type AuthState = {
  diagnostics: AuthStateDiagnostic[];
  profile: UserProfile | null;
  session: Session | null;
};

export type CurrentUserAppState = {
  diagnostics: AuthStateDiagnostic[];
  email: string;
  entitlement: UserEntitlement | null;
  profile: UserProfile | null;
  profileErrorDetail: string | null;
  profileStatus: "available" | "missing" | "unavailable";
  session: Session | null;
  userId: string | null;
};

type UserProfileRow = UserProfile & Pick<Tables<"user_profile">, "created_at" | "updated_at">;

type UserProfileLoadResult = {
  detail: string | null;
  error: unknown;
  profile: UserProfile | null;
  rawRows: UserProfileRow[];
  status: "available" | "missing" | "unavailable";
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

function normalizeDisplayName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

export function getUserMetadataDisplayName(user: Pick<User, "user_metadata"> | null | undefined) {
  const metadata = user?.user_metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const record = metadata as Record<string, unknown>;
  return normalizeDisplayName(record.name) || normalizeDisplayName(record.full_name);
}

export function resolveUserDisplayName(
  profileDisplayName: string | null | undefined,
  user: Pick<User, "user_metadata"> | null | undefined,
) {
  return normalizeDisplayName(profileDisplayName) || getUserMetadataDisplayName(user);
}

export function hasAppAccess(status: string | null | undefined) {
  return status === "active";
}

export function hasCompletedSetup(
  profile: Pick<UserProfile, "username"> | null | undefined,
  session?: Pick<Session, "user"> | null,
) {
  if (typeof profile?.username === "string" && profile.username.trim().length > 0) {
    return true;
  }

  const sessionEmail = session?.user.email?.trim().toLowerCase();
  return typeof sessionEmail === "string" && sessionEmail.length > 0;
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

function getAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  return "code" in error && typeof error.code === "string" ? error.code : undefined;
}

function logAuthDebug(label: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[auth-debug] ${label}`, details);
  }
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
    const profileResult = await loadUserProfileResult(session.user.id);
    if (profileResult.status === "unavailable") {
      diagnostics.push({ detail: profileResult.detail ?? "Profile load unavailable", stage: "profile_load" });
      console.warn("[auth] Failed to load user profile. Treating setup as incomplete.", {
        detail: profileResult.detail,
        userId: session.user.id,
      });
      return null;
    }

    if (profileResult.rawRows.length > 1) {
      diagnostics.push({
        detail: `Found ${profileResult.rawRows.length} user_profile rows for ${session.user.id}. Using the most recent row.`,
        stage: "profile_duplicate_rows",
      });
    }

    return profileResult.profile;
  } catch (error) {
    const detail = describeAuthError(error);
    diagnostics.push({ detail, stage: "profile_load" });
    console.warn("[auth] Failed to load user profile unexpectedly. Treating setup as incomplete.", {
      detail,
      userId: session.user.id,
    });
    return null;
  }
}

export async function loadUserProfileResult(userId: string): Promise<UserProfileLoadResult> {
  const supabase = getSupabase();
  const query = 'select "user_id, username, display_name, attachment_style, defaults, created_at, updated_at" from public.user_profile where user_id = ? order by updated_at desc nulls last, created_at desc nulls last';
  logAuthDebug("user-profile-query-start", {
    query,
    userId,
  });

  const { data, error } = await supabase
    .from("user_profile")
    .select("user_id, username, display_name, attachment_style, defaults, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    const detail = describeAuthError(error);
    logAuthDebug("user-profile-query-error", {
      code: getAuthErrorCode(error) ?? null,
      detail,
      error,
      userId,
    });
    return {
      detail,
      error,
      profile: null,
      rawRows: [],
      status: "unavailable",
    };
  }

  const rows = ((data ?? []) as UserProfileRow[]);
  logAuthDebug("user-profile-query-result", {
    rowCount: rows.length,
    rows: rows.map((row) => ({
      created_at: row.created_at,
      display_name: row.display_name,
      updated_at: row.updated_at,
      user_id: row.user_id,
      username: row.username,
    })),
    userId,
  });

  if (rows.length === 0) {
    logAuthDebug("user-profile-query-classified", {
      classification: "missing",
      detail: "No profile row matched the signed-in user id.",
      userId,
    });
    return {
      detail: null,
      error: null,
      profile: null,
      rawRows: [],
      status: "missing",
    };
  }

  const [primaryRow] = rows;
  if (rows.length > 1) {
    logAuthDebug("user-profile-query-classified", {
      classification: "available",
      detail: `Duplicate rows recovered (${rows.length}). Using the most recent row.`,
      userId,
    });
  } else {
    logAuthDebug("user-profile-query-classified", {
      classification: "available",
      detail: "Single matching profile row loaded.",
      userId,
    });
  }

  return {
    detail: rows.length > 1 ? `Duplicate rows recovered (${rows.length}). Using the most recent row.` : null,
    error: null,
    profile: primaryRow,
    rawRows: rows,
    status: "available",
  };
}

export async function loadUserProfile(userId: string) {
  const result = await loadUserProfileResult(userId);
  if (result.status === "unavailable") {
    throw result.error ?? new Error(result.detail ?? "Failed to load user profile");
  }
  return result.profile;
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
  const existingDisplayName = normalizeDisplayName(existingProfile?.display_name) || null;
  const metadataDisplayName = getUserMetadataDisplayName(session.user) || null;
  const nextDisplayName =
    options && "displayName" in options ? normalizeDisplayName(options.displayName) || null : undefined;
  const resolvedDisplayName =
    nextDisplayName !== undefined ? nextDisplayName : existingDisplayName ?? metadataDisplayName ?? null;

  const needsIdentitySync =
    !existingProfile ||
    (email && existingProfile.username !== email) ||
    (nextDisplayName !== undefined && existingDisplayName !== nextDisplayName) ||
    (nextDisplayName === undefined && !existingDisplayName && Boolean(metadataDisplayName));

  if (!needsIdentitySync) {
    return existingProfile;
  }

  const payload: TablesInsert<"user_profile"> = {
    user_id: session.user.id,
    username: email || existingProfile?.username || null,
    updated_at: new Date().toISOString(),
  };

  if (resolvedDisplayName !== null) {
    payload.display_name = resolvedDisplayName;
  } else if (nextDisplayName !== undefined) {
    payload.display_name = null;
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("user_profile").upsert(payload, { onConflict: "user_id" });

  if (error) throw error;

  return loadUserProfile(session.user.id);
}

export async function loadAuthState(sessionOverride?: Session | null): Promise<AuthState> {
  const diagnostics: AuthStateDiagnostic[] = [];
  const loadStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

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

  logAuthDebug("session-resolved", {
    elapsedMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - loadStartedAt,
    sessionEmail: session?.user.email ?? null,
    sessionPresent: Boolean(session),
    sessionUserId: session?.user.id ?? null,
  });

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

export async function loadCurrentUserAppState(sessionOverride?: Session | null): Promise<CurrentUserAppState> {
  const authState = await loadAuthState(sessionOverride);
  const diagnostics = [...authState.diagnostics];

  if (!authState.session) {
    return {
      diagnostics,
      email: "",
      entitlement: null,
      profile: null,
      profileErrorDetail: null,
      profileStatus: "missing",
      session: null,
      userId: null,
    };
  }

  const session = authState.session;
  const userId = session.user.id;
  let profile = authState.profile;
  let profileErrorDetail: string | null = null;
  let profileStatus: "available" | "missing" | "unavailable" = profile ? "available" : "missing";

  if (!profile) {
    const profileResult = await loadUserProfileResult(userId);
    profile = profileResult.profile;
    profileStatus = profileResult.status;
    profileErrorDetail = profileResult.detail;
    if (profileResult.status === "unavailable") {
      diagnostics.push({ detail: profileResult.detail ?? "Profile reload unavailable", stage: "profile_reload" });
      console.warn("[auth] Failed to reload user profile for current-user state.", {
        detail: profileResult.detail,
        userId,
      });
    }
    if (profileResult.rawRows.length > 1) {
      diagnostics.push({
        detail: `Found ${profileResult.rawRows.length} user_profile rows for ${userId}. Using the most recent row.`,
        stage: "profile_duplicate_rows",
      });
    }
  } else {
    profileStatus = "available";
  }

  let entitlement: UserEntitlement | null = null;
  try {
    entitlement = await loadUserEntitlement(userId);
  } catch (error) {
    const detail = describeAuthError(error);
    diagnostics.push({ detail, stage: "entitlement_load" });
    console.warn("[auth] Failed to load entitlement for current-user state.", {
      detail,
      userId,
    });
  }

  logAuthDebug("current-user-app-state", {
    authEmail: getSessionUserEmail(session),
    authUserId: userId,
    diagnostics,
    entitlementStatus: entitlement?.status ?? null,
    profileErrorDetail,
    profilePresent: Boolean(profile),
    profileStatus,
  });

  return {
    diagnostics,
    email: getSessionUserEmail(session),
    entitlement,
    profile,
    profileErrorDetail,
    profileStatus,
    session,
    userId,
  };
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}
