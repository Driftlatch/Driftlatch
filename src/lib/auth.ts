import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/types/supabase";

export type UserProfile = Pick<
  Tables<"user_profile">,
  "user_id" | "username" | "display_name"
>;

export type UserEntitlement = {
  plan: string | null;
  user_id: string;
  status: string | null;
};

type UntypedEntitlementsQuery = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

type UntypedEntitlementsClient = {
  from: (relation: "user_entitlements") => UntypedEntitlementsQuery;
};

export function getPostAuthRedirectPath() {
  return "/app";
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
  const supabase = getSupabase() as unknown as UntypedEntitlementsClient;
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("user_id, plan, status")
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

export async function loadAuthState() {
  const supabase = getSupabase();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session) return { session: null, profile: null };

  const profile = await syncUserProfileIdentity(session);
  return { session, profile };
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}
