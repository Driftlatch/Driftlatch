"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { hasAppAccess, loadAuthState, loadUserEntitlement, signOut } from "@/lib/auth";
import type { Json, Tables } from "@/lib/types/supabase";

type ProfileDetails = Pick<Tables<"user_profile">, "attachment_style" | "defaults" | "display_name">;
type ProfileDefaults = {
  default_need?: string;
  default_time?: number;
  default_situation?: string;
};
type DefaultsRecord = Record<string, Json | undefined>;
type EditableDefaults = {
  default_need: string;
  default_time: string;
  default_situation: string;
};
type NoticeTone = "success" | "error" | "neutral";
type Notice = { tone: NoticeTone; text: string } | null;
type BusyAction =
  | "signout"
  | "save-defaults"
  | "clear-defaults"
  | "clear-history"
  | "reset-personalization"
  | "export"
  | "delete-data"
  | null;

type UntypedEntitlementsDeleteQuery = {
  delete: () => {
    eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
  };
};

type UntypedEntitlementsDeleteClient = {
  from: (relation: "user_entitlements") => UntypedEntitlementsDeleteQuery;
};

const SUPPORT_EMAIL = "support@driftlatch.com";
const DEFAULT_NEED_OPTIONS = [
  { value: "regain_clarity", label: "Regain clarity" },
  { value: "wind_down", label: "Wind down" },
  { value: "be_here", label: "Be here" },
  { value: "come_back", label: "Come back" },
] as const;
const DEFAULT_TIME_OPTIONS = [
  { value: "1", label: "1 min" },
  { value: "3", label: "3 min" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
] as const;
const DEFAULT_SITUATION_OPTIONS = [
  { value: "partner_nearby", label: "Partner nearby" },
  { value: "kids_around", label: "Kids around" },
  { value: "alone", label: "Alone" },
  { value: "long_distance", label: "Long distance" },
] as const;
const RECENT_HISTORY_KEYS = [
  "driftlatch_recent_tools",
  "driftlatch_last_state",
  "driftlatch_last_ctx",
] as const;
const DEFAULTS_LOCAL_KEYS = ["driftlatch_checkin_preferences"] as const;
const PERSONALIZATION_KEYS = [
  "driftlatch_attachment_style",
  "driftlatch_preferred_pack_ids",
  "driftlatch_checkin_mode",
  "driftlatch_checkin_preferences",
] as const;
const SESSION_KEYS = ["driftlatch_checkin_excluded_tools"] as const;
const DELETE_ACCOUNT_LOCAL_KEYS = [
  ...RECENT_HISTORY_KEYS,
  ...PERSONALIZATION_KEYS,
  "driftlatch_saved_tools",
  "driftlatch_tutorial_done",
] as const;

function parseDefaults(value: unknown): ProfileDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    default_need: typeof raw.default_need === "string" ? raw.default_need : undefined,
    default_time: typeof raw.default_time === "number" ? raw.default_time : undefined,
    default_situation: typeof raw.default_situation === "string" ? raw.default_situation : undefined,
  };
}

function toDefaultsRecord(value: unknown): DefaultsRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as DefaultsRecord) };
}

function toEditableDefaults(defaults: ProfileDefaults): EditableDefaults {
  return {
    default_need: defaults.default_need ?? "",
    default_time: typeof defaults.default_time === "number" ? String(defaults.default_time) : "",
    default_situation: defaults.default_situation ?? "",
  };
}

function clearStorageKeys(keys: readonly string[]) {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    window.localStorage.removeItem(key);
  }
}

function clearSessionKeys(keys: readonly string[]) {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    window.sessionStorage.removeItem(key);
  }
}

function noticeStyle(tone: NoticeTone) {
  if (tone === "success") {
    return {
      border: "1px solid rgba(79,115,101,0.42)",
      background: "rgba(79,115,101,0.16)",
      color: "var(--text)",
    };
  }

  if (tone === "error") {
    return {
      border: "1px solid rgba(194,122,92,0.36)",
      background: "rgba(194,122,92,0.14)",
      color: "var(--text)",
    };
  }

  return {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--muted)",
  };
}

function formatPlan(plan: string | null | undefined) {
  if (!plan) return "No plan on file";
  return plan
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "No access";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

async function deleteEntitlementRow(userId: string) {
  const supabase = getSupabase() as unknown as UntypedEntitlementsDeleteClient;
  const { error } = await supabase.from("user_entitlements").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

function ensureNoDeleteErrors(
  results: Array<{ error: { message: string } | null }>,
  fallbackMessage: string,
) {
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message || fallbackMessage);
  }
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [entitlement, setEntitlement] = useState<Awaited<ReturnType<typeof loadUserEntitlement>>>(null);

  const defaults = useMemo(() => parseDefaults(profile?.defaults), [profile?.defaults]);
  const [editableDefaults, setEditableDefaults] = useState<EditableDefaults>(() => toEditableDefaults(defaults));
  const defaultsDirty =
    editableDefaults.default_need !== (defaults.default_need ?? "") ||
    editableDefaults.default_time !== (typeof defaults.default_time === "number" ? String(defaults.default_time) : "") ||
    editableDefaults.default_situation !== (defaults.default_situation ?? "");

  useEffect(() => {
    setEditableDefaults(toEditableDefaults(defaults));
  }, [defaults]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { session } = await loadAuthState();
        if (!active) return;

        if (!session) {
          router.replace("/login");
          return;
        }

        const supabase = getSupabase();
        const [profileRes, entitlementRes] = await Promise.all([
          supabase
            .from("user_profile")
            .select("display_name, attachment_style, defaults")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          loadUserEntitlement(session.user.id),
        ]);

        if (!active) return;

        if (profileRes.error) throw profileRes.error;

        setEmail(session.user.email?.trim().toLowerCase() ?? "");
        setProfile((profileRes.data ?? null) as ProfileDetails | null);
        setEntitlement(entitlementRes);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load account data:", error);
        if (!active) return;
        setNotice({ tone: "error", text: "We could not load your account right now." });
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  async function refreshAccountData() {
    const { session } = await loadAuthState();
    if (!session) return;

    const supabase = getSupabase();
    const [profileRes, entitlementRes] = await Promise.all([
      supabase
        .from("user_profile")
        .select("display_name, attachment_style, defaults")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      loadUserEntitlement(session.user.id),
    ]);

    if (profileRes.error) throw profileRes.error;

    setEmail(session.user.email?.trim().toLowerCase() ?? "");
    setProfile((profileRes.data ?? null) as ProfileDetails | null);
    setEntitlement(entitlementRes);
  }

  async function handleSignOut() {
    setBusyAction("signout");
    setNotice(null);

    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
      setNotice({ tone: "error", text: "Sign out failed. Try again." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveDefaults() {
    setBusyAction("save-defaults");
    setNotice(null);

    try {
      const { session } = await loadAuthState();
      if (!session) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabase();
      const nextDefaults = toDefaultsRecord(profile?.defaults);

      if (editableDefaults.default_need) {
        nextDefaults.default_need = editableDefaults.default_need;
      } else {
        delete nextDefaults.default_need;
      }

      if (editableDefaults.default_time) {
        nextDefaults.default_time = Number(editableDefaults.default_time);
      } else {
        delete nextDefaults.default_time;
      }

      if (editableDefaults.default_situation) {
        nextDefaults.default_situation = editableDefaults.default_situation;
      } else {
        delete nextDefaults.default_situation;
      }

      const hasAnyDefaults =
        typeof nextDefaults.default_need === "string" ||
        typeof nextDefaults.default_time === "number" ||
        typeof nextDefaults.default_situation === "string" ||
        Object.keys(nextDefaults).length > 0;

      const { error } = await supabase
        .from("user_profile")
        .update({
          defaults: hasAnyDefaults ? nextDefaults : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      if (
        !editableDefaults.default_need &&
        !editableDefaults.default_time &&
        !editableDefaults.default_situation
      ) {
        clearStorageKeys(DEFAULTS_LOCAL_KEYS);
      }

      await refreshAccountData();
      setNotice({ tone: "success", text: "Defaults saved." });
    } catch (error) {
      console.error("Failed to save defaults:", error);
      setNotice({ tone: "error", text: "We could not save your defaults." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleClearDefaults() {
    setBusyAction("clear-defaults");
    setNotice(null);

    try {
      const { session } = await loadAuthState();
      if (!session) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabase();
      const nextDefaults = toDefaultsRecord(profile?.defaults);
      delete nextDefaults.default_need;
      delete nextDefaults.default_time;
      delete nextDefaults.default_situation;

      const { error } = await supabase
        .from("user_profile")
        .update({
          defaults: Object.keys(nextDefaults).length > 0 ? nextDefaults : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      clearStorageKeys(DEFAULTS_LOCAL_KEYS);
      await refreshAccountData();
      setNotice({ tone: "success", text: "Defaults cleared." });
    } catch (error) {
      console.error("Failed to clear defaults:", error);
      setNotice({ tone: "error", text: "We could not clear your defaults." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleClearRecentHistory() {
    setBusyAction("clear-history");
    setNotice(null);

    try {
      const { session } = await loadAuthState();
      if (!session) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabase();
      const { error } = await supabase.from("user_recent_tools").delete().eq("user_id", session.user.id);
      if (error) throw error;

      clearStorageKeys(RECENT_HISTORY_KEYS);
      clearSessionKeys(SESSION_KEYS);
      setNotice({ tone: "success", text: "Recent history cleared." });
    } catch (error) {
      console.error("Failed to clear recent history:", error);
      setNotice({ tone: "error", text: "We could not clear recent history." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetPersonalization() {
    setBusyAction("reset-personalization");
    setNotice(null);

    try {
      const { session } = await loadAuthState();
      if (!session) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabase();
      const { error } = await supabase
        .from("user_profile")
        .update({
          attachment_style: null,
          defaults: null,
          primary_pack_ids: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      clearStorageKeys(PERSONALIZATION_KEYS);
      clearSessionKeys(SESSION_KEYS);
      await refreshAccountData();
      setNotice({ tone: "success", text: "Personalization reset. Your account is still intact." });
    } catch (error) {
      console.error("Failed to reset personalization:", error);
      setNotice({ tone: "error", text: "We could not reset personalization." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExportData() {
    setBusyAction("export");
    setNotice(null);

    try {
      const { session } = await loadAuthState();
      if (!session) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabase();
      const [userProfile, userCheckins, userRecentTools, userSavedTools, userToolFeedback] = await Promise.all([
        supabase.from("user_profile").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("user_checkins").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("user_recent_tools").select("*").eq("user_id", session.user.id).order("used_at", { ascending: false }),
        supabase.from("user_saved_tools").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("user_tool_feedback").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
      ]);

      const errors = [
        userProfile.error,
        userCheckins.error,
        userRecentTools.error,
        userSavedTools.error,
        userToolFeedback.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw errors[0];
      }

      downloadJsonFile(`driftlatch-export-${new Date().toISOString().slice(0, 10)}.json`, {
        exported_at: new Date().toISOString(),
        user_email: session.user.email ?? null,
        user_profile: userProfile.data ?? null,
        user_checkins: userCheckins.data ?? [],
        user_recent_tools: userRecentTools.data ?? [],
        user_saved_tools: userSavedTools.data ?? [],
        user_tool_feedback: userToolFeedback.data ?? [],
      });

      setNotice({ tone: "success", text: "Your data export is downloading." });
    } catch (error) {
      console.error("Failed to export data:", error);
      setNotice({ tone: "error", text: "We could not export your data." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteDataAndSignOut() {
    setBusyAction("delete-data");
    setNotice(null);

    try {
      const { session } = await loadAuthState();
      if (!session) {
        router.replace("/login");
        return;
      }

      const supabase = getSupabase();
      const deleteResults = await Promise.all([
        supabase.from("user_pins").delete().eq("user_id", session.user.id),
        supabase.from("user_tool_feedback").delete().eq("user_id", session.user.id),
        supabase.from("user_saved_tools").delete().eq("user_id", session.user.id),
        supabase.from("user_recent_tools").delete().eq("user_id", session.user.id),
        supabase.from("user_checkins").delete().eq("user_id", session.user.id),
        supabase.from("user_profile").delete().eq("user_id", session.user.id),
      ]);
      ensureNoDeleteErrors(deleteResults, "We could not delete every public record.");
      await deleteEntitlementRow(session.user.id);

      clearStorageKeys(DELETE_ACCOUNT_LOCAL_KEYS);
      clearSessionKeys(SESSION_KEYS);

      // TODO: full auth user deletion should happen via a secure server route or admin function.
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Failed to delete account data:", error);
      setNotice({ tone: "error", text: "We could not delete your data. Nothing was faked." });
      setBusyAction(null);
      return;
    }
  }

  if (loading) {
    return (
      <main style={loadingStyle}>
        <div style={loadingCardStyle}>
          <div className="kicker">ACCOUNT</div>
          <h1 style={{ marginTop: 10, marginBottom: 8 }}>Loading your account</h1>
          <p className="small">Pulling your settings, access, and controls.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={atmosphereStyle} aria-hidden>
        <div style={blobOneStyle} />
        <div style={blobTwoStyle} />
      </div>

      <div style={contentStyle}>
        <header style={headerStyle}>
          <div>
            <div className="kicker">ACCOUNT</div>
            <h1 style={{ marginTop: 10, marginBottom: 8 }}>Settings and access</h1>
            <p className="small" style={{ maxWidth: 560 }}>
              Everything important in one place: access, setup, data controls, and support.
            </p>
          </div>
        </header>

        {notice ? (
          <div
            style={{
              ...noticeStyle(notice.tone),
              borderRadius: 18,
              padding: "14px 16px",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {notice.text}
          </div>
        ) : null}

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={sectionHeaderStyle}>
            <div>
              <div className="kicker">ACCOUNT</div>
              <h2 style={sectionTitleStyle}>Identity and access</h2>
            </div>
          </div>

          <div style={infoGridStyle}>
            <div style={infoTileStyle}>
              <div className="small">Email</div>
              <div style={infoValueStyle}>{email || "No email on file"}</div>
            </div>
            <div style={infoTileStyle}>
              <div className="small">Plan</div>
              <div style={infoValueStyle}>{formatPlan(entitlement?.plan)}</div>
            </div>
            <div style={infoTileStyle}>
              <div className="small">Entitlement status</div>
              <div style={infoValueStyle}>{formatStatus(entitlement?.status)}</div>
            </div>
            <div style={infoTileStyle}>
              <div className="small">Member access</div>
              <div style={infoValueStyle}>{hasAppAccess(entitlement?.status) ? "Active member" : "No active access"}</div>
            </div>
          </div>

          <div style={buttonRowStyle}>
            <button
              className="btn ghost"
              type="button"
              onClick={() => void handleSignOut()}
              disabled={busyAction !== null}
            >
              {busyAction === "signout" ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={sectionHeaderStyle}>
            <div>
              <div className="kicker">DRIFTLATCH SETUP</div>
              <h2 style={sectionTitleStyle}>Profile and defaults</h2>
            </div>
          </div>

          <div style={infoGridStyle}>
            <div style={infoTileStyle}>
              <div className="small">Display name</div>
              <div style={infoValueStyle}>{profile?.display_name?.trim() || "No display name saved"}</div>
            </div>
            <div style={infoTileStyle}>
              <div className="small">Attachment style</div>
              <div style={infoValueStyle}>{profile?.attachment_style || "Not set yet"}</div>
            </div>
          </div>

          <div style={subCardStyle}>
            <div style={subCardHeaderStyle}>
              <div>
                <div className="small" style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Defaults
                </div>
                <div style={actionTitleStyle}>Check-in defaults</div>
                <p className="small" style={{ margin: 0 }}>
                  These prefill the check-in flow. Attachment style still updates only through the Pressure Profile.
                </p>
              </div>
            </div>

            <div style={defaultsGridStyle}>
              <label style={fieldStyle}>
                <span className="small">Default need</span>
                <select
                  value={editableDefaults.default_need}
                  onChange={(event) =>
                    setEditableDefaults((current) => ({ ...current, default_need: event.target.value }))
                  }
                  disabled={busyAction === "save-defaults" || busyAction === "clear-defaults"}
                  style={selectStyle}
                >
                  <option value="">No default</option>
                  {DEFAULT_NEED_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span className="small">Default time</span>
                <select
                  value={editableDefaults.default_time}
                  onChange={(event) =>
                    setEditableDefaults((current) => ({ ...current, default_time: event.target.value }))
                  }
                  disabled={busyAction === "save-defaults" || busyAction === "clear-defaults"}
                  style={selectStyle}
                >
                  <option value="">No default</option>
                  {DEFAULT_TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span className="small">Default situation</span>
                <select
                  value={editableDefaults.default_situation}
                  onChange={(event) =>
                    setEditableDefaults((current) => ({ ...current, default_situation: event.target.value }))
                  }
                  disabled={busyAction === "save-defaults" || busyAction === "clear-defaults"}
                  style={selectStyle}
                >
                  <option value="">No default</option>
                  {DEFAULT_SITUATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={buttonRowStyle}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleClearDefaults()}
                disabled={busyAction !== null}
              >
                {busyAction === "clear-defaults" ? "Clearing..." : "Clear defaults"}
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => void handleSaveDefaults()}
                disabled={busyAction !== null || !defaultsDirty}
              >
                {busyAction === "save-defaults" ? "Saving..." : "Save defaults"}
              </button>
            </div>
          </div>

          <div style={buttonRowStyle}>
            <Link className="btn primary" href="/app/onboarding">
              Retake Pressure Profile
            </Link>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={sectionHeaderStyle}>
            <div>
              <div className="kicker">DATA CONTROLS</div>
              <h2 style={sectionTitleStyle}>History, export, and reset</h2>
            </div>
          </div>

          <div style={stackStyle}>
            <div style={actionRowStyle}>
              <div>
                <div style={actionTitleStyle}>Clear recent history</div>
                <p className="small" style={{ margin: 0 }}>
                  Clears recent tools from Supabase and related local/session history keys.
                </p>
              </div>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleClearRecentHistory()}
                disabled={busyAction !== null}
              >
                {busyAction === "clear-history" ? "Clearing..." : "Clear recent history"}
              </button>
            </div>

            <div style={actionRowStyle}>
              <div>
                <div style={actionTitleStyle}>Reset personalization</div>
                <p className="small" style={{ margin: 0 }}>
                  Clears saved defaults, attachment style, and the related personalization keys.
                </p>
              </div>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleResetPersonalization()}
                disabled={busyAction !== null}
              >
                {busyAction === "reset-personalization" ? "Resetting..." : "Reset personalization"}
              </button>
            </div>

            <div style={actionRowStyle}>
              <div>
                <div style={actionTitleStyle}>Export my data</div>
                <p className="small" style={{ margin: 0 }}>
                  Downloads your profile, check-ins, recent tools, saved tools, and feedback as JSON.
                </p>
              </div>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleExportData()}
                disabled={busyAction !== null}
              >
                {busyAction === "export" ? "Preparing export..." : "Export my data"}
              </button>
            </div>

            <div style={{ ...actionRowStyle, borderColor: "rgba(194,122,92,0.18)" }}>
              <div>
                <div style={actionTitleStyle}>Delete account</div>
                <p className="small" style={{ margin: 0 }}>
                  First pass: deletes your public Driftlatch data, then signs you out. Auth-user deletion needs a secure server path.
                </p>
              </div>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busyAction !== null}
              >
                Delete account
              </button>
            </div>

            {confirmDelete ? (
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(194,122,92,0.28)",
                  background: "rgba(194,122,92,0.10)",
                  padding: 18,
                }}
              >
                <div style={actionTitleStyle}>Confirm deletion</div>
                <p className="small" style={{ marginBottom: 14 }}>
                  This will delete your Driftlatch data from public tables and sign you out. It will not remove the auth user itself yet.
                </p>
                <div style={buttonRowStyle}>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => void handleDeleteDataAndSignOut()}
                    disabled={busyAction !== null}
                  >
                    {busyAction === "delete-data" ? "Deleting..." : "Delete my data and sign out"}
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busyAction !== null}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={sectionHeaderStyle}>
            <div>
              <div className="kicker">BILLING / SUPPORT</div>
              <h2 style={sectionTitleStyle}>Subscription and help</h2>
            </div>
          </div>

          <div style={stackStyle}>
            <div style={actionRowStyle}>
              <div>
                <div style={actionTitleStyle}>Manage subscription</div>
                <p className="small" style={{ margin: 0 }}>
                  Billing portal is not wired yet. For now, email support and we&apos;ll help directly.
                </p>
              </div>
              <a
                className="btn ghost"
                href={`mailto:${SUPPORT_EMAIL}?subject=Manage%20my%20Driftlatch%20subscription`}
                style={{ textDecoration: "none" }}
              >
                Email support
              </a>
            </div>

            <div style={legalLinksStyle}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/refunds">Refunds</Link>
            </div>

            <div style={supportRowStyle}>
              <div className="small">Support email</div>
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--text)" }}>
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const loadingStyle = {
  minHeight: "100dvh",
  background: "var(--bg)",
  display: "grid",
  placeItems: "center",
  padding: 18,
} as const;

const loadingCardStyle = {
  width: "100%",
  maxWidth: 560,
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(39,39,42,0.82)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  padding: 24,
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
} as const;

const pageStyle = {
  minHeight: "100dvh",
  background: "var(--bg)",
  color: "var(--text)",
  position: "relative",
  overflow: "hidden",
  padding: "36px 18px 132px",
} as const;

const atmosphereStyle = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
} as const;

const blobOneStyle = {
  position: "absolute",
  top: "8%",
  left: "-10%",
  width: 360,
  height: 360,
  borderRadius: 999,
  background: "radial-gradient(circle, rgba(194,122,92,0.16) 0%, rgba(24,24,27,0) 72%)",
  filter: "blur(52px)",
} as const;

const blobTwoStyle = {
  position: "absolute",
  right: "-12%",
  top: "36%",
  width: 320,
  height: 320,
  borderRadius: 999,
  background: "radial-gradient(circle, rgba(96,120,136,0.12) 0%, rgba(24,24,27,0) 72%)",
  filter: "blur(56px)",
} as const;

const contentStyle = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: 860,
  margin: "0 auto",
  display: "grid",
  gap: 18,
} as const;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
} as const;

const cardStyle = {
  position: "relative",
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(39,39,42,0.72)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
  overflow: "hidden",
  padding: 22,
} as const;

const cardTopHighlightStyle = {
  position: "absolute",
  top: 0,
  left: 18,
  right: 18,
  height: 1,
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
  pointerEvents: "none",
} as const;

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  marginBottom: 18,
} as const;

const sectionTitleStyle = {
  margin: "10px 0 0",
  fontSize: 30,
  lineHeight: 1.08,
  letterSpacing: "-0.03em",
} as const;

const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
} as const;

const infoTileStyle = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.03)",
  padding: 14,
  minHeight: 96,
  display: "grid",
  alignContent: "space-between",
  gap: 8,
} as const;

const infoValueStyle = {
  color: "var(--text)",
  fontSize: 15,
  lineHeight: 1.5,
  fontWeight: 650,
  wordBreak: "break-word",
} as const;

const buttonRowStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
} as const;

const stackStyle = {
  display: "grid",
  gap: 12,
} as const;

const actionRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 16,
  alignItems: "center",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.03)",
  padding: 16,
} as const;

const actionTitleStyle = {
  color: "var(--text)",
  fontSize: 16,
  lineHeight: 1.2,
  fontWeight: 650,
  marginBottom: 6,
} as const;

const legalLinksStyle = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "center",
} as const;

const supportRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.03)",
  padding: 14,
} as const;

const subCardStyle = {
  marginTop: 16,
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.03)",
  padding: 16,
  display: "grid",
  gap: 14,
} as const;

const subCardHeaderStyle = {
  display: "grid",
  gap: 6,
} as const;

const defaultsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
} as const;

const fieldStyle = {
  display: "grid",
  gap: 8,
} as const;

const selectStyle = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(24,24,27,0.66)",
  color: "var(--text)",
  padding: "0 14px",
  fontSize: 14,
  lineHeight: 1.2,
  outline: "none",
} as const;
