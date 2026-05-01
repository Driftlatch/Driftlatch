"use client";

import React from "react";
import Link from "next/link";
import LogoAnimation from "@/components/LogoAnimation";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ThemedSelect from "@/components/ui/ThemedSelect";
import {
  getAttachmentStyleDisplayLabel,
  getAttachmentStyleExplanation,
  getAttachmentStyleQualifier,
  getAttachmentStyleSummary,
} from "@/lib/attachmentStyleCopy";
import { parseStoredProfileDefaults } from "@/lib/quickFlow";
import { getNeedLabel } from "@/lib/supportLabels";
import { getSupabase } from "@/lib/supabase";
import { hasAppAccess, loadAuthState, loadCurrentUserAppState, signOut, type CurrentUserAppState } from "@/lib/auth";
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

const SUPPORT_EMAIL = "support@driftlatch.com";
const ORIENTATION_SESSION_KEY = "driftlatch_account_orientation_open";
const DEFAULT_NEED_OPTIONS = [
  { value: "regain_clarity", label: getNeedLabel("regain_clarity") },
  { value: "wind_down", label: getNeedLabel("wind_down") },
  { value: "be_here", label: getNeedLabel("be_here") },
  { value: "come_back", label: getNeedLabel("come_back") },
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
const NO_DEFAULT_OPTION = [{ value: "", label: "No default" }] as const;
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
  "driftlatch_public_eq_result",
  "driftlatch_public_eq_completed_at",
] as const;
type OrientationVisualKind = "home" | "packs" | "weekly";

const HOW_IT_WORKS_FLOW = [
  {
    step: "01",
    label: "Home",
    copy: "Start here when you need help right now. Home shows one useful next step based on your state.",
    visual: "home" as OrientationVisualKind,
  },
  {
    step: "02",
    label: "Packs",
    copy: "Use Packs when you want to browse a type of support like Clear Head, Wind Down, Be Present, or Repair.",
    visual: "packs" as OrientationVisualKind,
  },
  {
    step: "03",
    label: "Weekly",
    copy: "Use Weekly to notice patterns over time. It shows what came up most and what helped most.",
    visual: "weekly" as OrientationVisualKind,
  },
] as const;

const STATE_MEANINGS = [
  {
    label: "Clear & light",
    copy: "you have room, clarity, or a good window",
    tint: "rgba(120,180,142,0.92)",
  },
  {
    label: "Steady",
    copy: "you are okay and want to stay that way",
    tint: "rgba(131,145,176,0.92)",
  },
  {
    label: "Carrying work",
    copy: "part of your head is still at work",
    tint: "rgba(201,154,98,0.92)",
  },
  {
    label: "Wired",
    copy: "your body or mind is still switched on",
    tint: "rgba(194,122,92,0.96)",
  },
  {
    label: "Drained",
    copy: "your energy is low",
    tint: "rgba(112,127,156,0.92)",
  },
  {
    label: "Overloaded",
    copy: "too much is active at once",
    tint: "rgba(216,102,92,0.98)",
  },
] as const;

const SUPPORT_MEANINGS = [
  {
    label: "Clear Head",
    copy: "Reduce mental load and find a clear next step.",
  },
  {
    label: "Wind Down",
    copy: "Come down without carrying the day into the night.",
  },
  {
    label: "Be Present",
    copy: "Come back to the people and moment in front of you.",
  },
  {
    label: "Repair",
    copy: "Reconnect after tension, distance, or a hard moment.",
  },
  {
    label: "Overthinking",
    copy: "Settle spirals before they take over.",
  },
  {
    label: "Take Space",
    copy: "Take space without creating more distance.",
  },
  {
    label: "Use the Window",
    copy: "Use clear energy while it is here.",
  },
  {
    label: "Stay Close",
    copy: "Turn a good moment into real closeness.",
  },
  {
    label: "Make It Count",
    copy: "Use available energy on what matters.",
  },
  {
    label: "Stay Steady",
    copy: "Protect a good state before it slips.",
  },
] as const;

function parseDefaults(value: unknown): ProfileDefaults {
  return parseStoredProfileDefaults(value);
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
  const map: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    canceled: "Canceled",
    past_due: "Past due",
    inactive: "Inactive",
    expired: "Expired",
  };
  return map[status] ?? (status.charAt(0).toUpperCase() + status.slice(1));
}

function formatPlanLabel(plan: string | null | undefined) {
  if (plan === "annual") return "Annual";
  if (plan === "monthly") return "Monthly";
  return "No active plan";
}

function statusColor(status: string | null | undefined): string {
  if (status === "active") return "rgba(120,190,150,0.9)";
  if (status === "trialing") return "rgba(100,160,200,0.9)";
  if (status === "past_due" || status === "canceled") return "rgba(194,122,92,0.9)";
  return "rgba(161,161,170,0.7)";
}

function formatBillingDate(
  entitlement: { status: string | null; current_period_end: string | null; cancel_at_period_end: boolean | null } | null,
): string | null {
  if (!entitlement?.current_period_end) return null;
  const date = new Date(entitlement.current_period_end);
  if (!isFinite(date.getTime())) return null;
  const formatted = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const isCanceled = entitlement.status === "canceled" || entitlement.cancel_at_period_end === true;
  return isCanceled ? `Access until ${formatted}` : `Renews ${formatted}`;
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

function logAccountDebug(label: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[account-state] ${label}`, details);
  }
}

function OrientationCardVisual({ kind }: { kind: OrientationVisualKind }) {
  if (kind === "home") {
    return (
      <div style={orientationVisualShellStyle}>
        <div style={orientationVisualGlowStyle} />
        <div style={orientationVisualPanelStyle}>
          <div style={orientationMiniTopRowStyle}>
            <span style={orientationMiniChipStyle}>State</span>
            <span style={{ ...orientationMiniChipStyle, color: "rgba(244,244,245,0.92)" }}>Right now</span>
          </div>
          <div style={orientationStackStyle}>
            <div style={orientationMiniStateBarStyle}>
              <span style={orientationMiniDotStyle} />
              <span>Wired</span>
            </div>
            <div style={orientationMiniActionCardStyle}>
              <div style={orientationMiniActionLabelStyle}>Next step</div>
              <div style={orientationMiniActionTitleStyle}>One useful reset</div>
              <div style={orientationMiniActionLineStyle} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "packs") {
    return (
      <div style={orientationVisualShellStyle}>
        <div style={{ ...orientationVisualGlowStyle, background: "radial-gradient(circle, rgba(96,120,136,0.18) 0%, rgba(24,24,27,0) 72%)" }} />
        <div style={orientationVisualPanelStyle}>
          <div style={orientationMiniTopRowStyle}>
            <span style={orientationMiniChipStyle}>Browse</span>
            <span style={{ ...orientationMiniChipStyle, color: "rgba(244,244,245,0.88)" }}>Support types</span>
          </div>
          <div style={orientationPillGridStyle}>
            {["Clear Head", "Wind Down", "Be Present", "Repair"].map((item) => (
              <div key={item} style={orientationSupportPillStyle}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={orientationVisualShellStyle}>
      <div style={{ ...orientationVisualGlowStyle, background: "radial-gradient(circle, rgba(120,170,140,0.18) 0%, rgba(24,24,27,0) 74%)" }} />
      <div style={orientationVisualPanelStyle}>
        <div style={orientationMiniTopRowStyle}>
          <span style={orientationMiniChipStyle}>Weekly</span>
          <span style={{ ...orientationMiniChipStyle, color: "rgba(244,244,245,0.88)" }}>Patterns</span>
        </div>
        <div style={orientationChartStyle}>
          <div style={orientationChartLineStyle} />
          {[
            { left: "10%", top: "66%" },
            { left: "32%", top: "52%" },
            { left: "54%", top: "34%" },
            { left: "76%", top: "44%" },
            { left: "90%", top: "22%" },
          ].map((point, index) => (
            <span key={`${point.left}-${index}`} style={{ ...orientationChartDotStyle, ...point }} />
          ))}
        </div>
        <div style={orientationMiniFooterRowStyle}>
          <span style={orientationMiniMutedStyle}>Most common</span>
          <span style={orientationMiniMutedStyle}>Helped most</span>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [orientationPreferenceLoaded, setOrientationPreferenceLoaded] = useState(false);
  const [eqArchetype, setEqArchetype] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<CurrentUserAppState>({
    diagnostics: [],
    email: "",
    entitlement: null,
    profile: null,
    profileErrorDetail: null,
    profileStatus: "missing",
    session: null,
    userId: null,
  });

  const email = accountState.email;
  const profile = (accountState.profile ?? null) as ProfileDetails | null;
  const entitlement = accountState.entitlement;
  const profileLoadFailed = accountState.diagnostics.some((item) => item.stage === "profile_load" || item.stage === "profile_reload");
  const entitlementLoadFailed = accountState.diagnostics.some((item) => item.stage === "entitlement_load");

  const defaults = useMemo(() => parseDefaults(profile?.defaults), [profile?.defaults]);
  const attachmentStyleSummary = useMemo(
    () => getAttachmentStyleSummary(profile?.attachment_style ?? undefined),
    [profile?.attachment_style],
  );
  const [editableDefaults, setEditableDefaults] = useState<EditableDefaults>(() => toEditableDefaults(defaults));
  const defaultsDirty =
    editableDefaults.default_need !== (defaults.default_need ?? "") ||
    editableDefaults.default_time !== (typeof defaults.default_time === "number" ? String(defaults.default_time) : "") ||
    editableDefaults.default_situation !== (defaults.default_situation ?? "");

  useEffect(() => {
    setEditableDefaults(toEditableDefaults(defaults));
  }, [defaults]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(ORIENTATION_SESSION_KEY);
    if (stored === "1") {
      setOrientationOpen(true);
    }
    setOrientationPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!orientationPreferenceLoaded) return;
    window.sessionStorage.setItem(ORIENTATION_SESSION_KEY, orientationOpen ? "1" : "0");
  }, [orientationOpen, orientationPreferenceLoaded]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const nextAccountState = await loadCurrentUserAppState();
        if (!active) return;

        if (!nextAccountState.session) {
          router.replace("/login");
          return;
        }

        logAccountDebug("loaded-current-user-state", {
          authEmail: nextAccountState.email,
          authUserId: nextAccountState.userId,
          diagnostics: nextAccountState.diagnostics,
          entitlementRowLoaded: nextAccountState.entitlement,
          profileRowLoaded: nextAccountState.profile,
        });

        setAccountState(nextAccountState);

        // Load EQ archetype for link card
        if (nextAccountState.userId) {
          const supabase = getSupabase();
          const eqRes = await (supabase as any)
            .from("user_eq_profile")
            .select("archetype")
            .eq("user_id", nextAccountState.userId)
            .maybeSingle();
          if (active && eqRes.data?.archetype) {
            setEqArchetype(eqRes.data.archetype as string);
          }
        }

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
    const nextAccountState = await loadCurrentUserAppState();
    if (!nextAccountState.session) return;

    logAccountDebug("refreshed-current-user-state", {
      authEmail: nextAccountState.email,
      authUserId: nextAccountState.userId,
      diagnostics: nextAccountState.diagnostics,
      entitlementRowLoaded: nextAccountState.entitlement,
      profileRowLoaded: nextAccountState.profile,
    });

    setAccountState(nextAccountState);
  }

  useEffect(() => {
    logAccountDebug("rendered-account-state", {
      authEmail: email || null,
      authUserId: accountState.userId,
      diagnostics: accountState.diagnostics,
      finalRenderedAccountState: {
        attachmentStyle: profile?.attachment_style ?? null,
        displayName: profile?.display_name?.trim() || null,
        entitlementStatus: entitlement?.status ?? null,
        plan: entitlement?.plan ?? null,
      },
    });
  }, [accountState.diagnostics, accountState.userId, email, entitlement?.plan, entitlement?.status, profile?.attachment_style, profile?.display_name]);

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

      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json() as { success?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "We could not delete your data.");
      }

      clearStorageKeys(DELETE_ACCOUNT_LOCAL_KEYS);
      clearSessionKeys(SESSION_KEYS);

      await signOut();
      router.replace("/");
    } catch (error) {
      console.error("Failed to delete account data:", error);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "We could not delete your data." });
      setBusyAction(null);
      return;
    }
  }

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoAnimation variant="splash" />
      </div>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={atmosphereStyle} aria-hidden>
        <div style={blobOneStyle} />
        <div style={blobTwoStyle} />
      </div>

      <div style={contentStyle}>
        <header>
          <div style={pageKickerStyle}>ACCOUNT</div>
          <h1 style={pageH1Style}>Settings and access</h1>
          <p style={pageSubtitleStyle}>
            Everything important in one place: access, setup, data controls, and support.
          </p>
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

        {/* EQ link card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.06 }}
          onClick={() => router.push("/app/eq")}
          style={{
            background: "rgba(18,18,22,0.9)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 18,
            padding: "16px 18px",
            position: "relative",
            overflow: "hidden",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            WebkitTapHighlightColor: "transparent",
          }}
        >
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
          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 3 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Pressure EQ
            </div>
            <div style={{ fontSize: 12, color: "rgba(161,161,170,0.55)" }}>
              {eqArchetype ?? "Not taken yet"}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexShrink: 0,
            }}
          >
            <Link
              href="/pressure-eq"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(194,122,92,0.6)",
                textDecoration: "none",
              }}
            >
              Retake →
            </Link>
            <div
              aria-hidden
              style={{
                fontSize: 18,
                color: "rgba(161,161,170,0.35)",
              }}
            >
              →
            </div>
          </div>
        </motion.div>

        <section style={orientationSectionStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={orientationSectionGlowStyle} aria-hidden />

          <div style={orientationInnerStyle}>
            <motion.button
              type="button"
              onClick={() => setOrientationOpen((value) => !value)}
              whileTap={{ scale: 0.995 }}
              style={{
                ...orientationToggleButtonStyle,
                ...(orientationOpen ? orientationToggleButtonOpenStyle : {}),
              }}
              aria-expanded={orientationOpen}
              aria-controls="account-orientation-panel"
            >
              <div style={orientationToggleCopyStyle}>
                <div style={orientationToggleTitleStyle}>How to use Driftlatch</div>
                <p style={orientationToggleHelperStyle}>
                  Quick guide to Home, Packs, Weekly, states, and supports
                </p>
              </div>
              <motion.span
                aria-hidden
                animate={{ rotate: orientationOpen ? 180 : 0 }}
                transition={orientationChevronTransition}
                style={orientationChevronShellStyle}
              >
                <svg viewBox="0 0 20 20" fill="none" style={orientationChevronIconStyle}>
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
            </motion.button>

            <motion.div
              id="account-orientation-panel"
              initial={false}
              animate={orientationOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
              transition={orientationRevealTransition}
              style={orientationRevealStyle}
              aria-hidden={!orientationOpen}
            >
              <motion.div
                initial={false}
                animate={
                  orientationOpen
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0, y: -8, filter: "blur(4px)" }
                }
                transition={orientationContentTransition}
                style={orientationExpandedContentStyle}
              >
                <div style={sectionHeaderStyle}>
                  <div>
                    <div style={cardKickerStyle}>PRODUCT ORIENTATION</div>
                    <h2 style={sectionTitleStyle}>How to use Driftlatch</h2>
                    <p className="small" style={{ maxWidth: 640, marginTop: 10, marginBottom: 0 }}>
                      Driftlatch works best when you keep it simple. Check in with your state, take one useful step,
                      and let the system build a clearer weekly picture over time.
                    </p>
                  </div>
                </div>

                <div style={orientationFlowGridStyle}>
                  {HOW_IT_WORKS_FLOW.map((card) => (
                    <article key={card.label} style={orientationFlowCardStyle}>
                      <div style={orientationFlowCardTopStyle}>
                        <span style={orientationStepBadgeStyle}>{card.step}</span>
                      </div>
                      <OrientationCardVisual kind={card.visual} />
                      <div style={orientationFlowCopyStyle}>
                        <h3 style={orientationCardTitleStyle}>{card.label}</h3>
                        <p style={orientationCardCopyStyle}>{card.copy}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div style={orientationDefaultsNoteStyle}>
                  <span style={orientationNoteEyebrowStyle}>Helpful default</span>
                  <p style={orientationNoteCopyStyle}>
                    Defaults save your usual setup, so Driftlatch can suggest more relevant support faster.
                  </p>
                </div>

                <div style={orientationMeaningGridStyle}>
                  <section style={orientationMeaningCardStyle}>
                    <div style={orientationMeaningHeaderStyle}>
                      <div>
                        <div className="kicker">States</div>
                        <div style={orientationMeaningTitleStyle}>What your check-in state means</div>
                      </div>
                      <div style={orientationMeaningCountStyle}>{STATE_MEANINGS.length}</div>
                    </div>

                    <div style={orientationMeaningItemsStyle}>
                      {STATE_MEANINGS.map((item) => (
                        <div key={item.label} style={orientationMeaningItemStyle}>
                          <div style={orientationMeaningItemHeaderStyle}>
                            <span style={{ ...orientationMeaningDotStyle, background: item.tint }} />
                            <span style={orientationMeaningLabelStyle}>{item.label}</span>
                          </div>
                          <p style={orientationMeaningCopyStyle}>{item.copy}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section style={orientationMeaningCardStyle}>
                    <div style={orientationMeaningHeaderStyle}>
                      <div>
                        <div className="kicker">Supports</div>
                        <div style={orientationMeaningTitleStyle}>What each support is for</div>
                      </div>
                      <div style={orientationMeaningCountStyle}>{SUPPORT_MEANINGS.length}</div>
                    </div>

                    <div style={orientationMeaningItemsStyle}>
                      {SUPPORT_MEANINGS.map((item) => (
                        <div key={item.label} style={orientationSupportItemStyle}>
                          <div style={orientationMeaningItemHeaderStyle}>
                            <span style={orientationMeaningSupportAccentStyle} />
                            <span style={orientationMeaningLabelStyle}>{item.label}</span>
                          </div>
                          <p style={orientationMeaningCopyStyle}>{item.copy}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={cardKickerStyle}>ACCOUNT</div>
          <h2 style={sectionTitleStyle}>Identity and access</h2>

          <div>
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Email</span>
              <span style={fieldValueStyle}>{email || "Email unavailable right now"}</span>
            </div>
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Plan</span>
              <span style={fieldValueStyle}>
                {entitlementLoadFailed ? (
                  "Unavailable right now"
                ) : (
                  <span style={planPillStyle}>{formatPlan(entitlement?.plan)}</span>
                )}
              </span>
            </div>
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Status</span>
              <span style={fieldValueStyle}>
                {entitlementLoadFailed ? (
                  "Unavailable right now"
                ) : entitlement?.status === "active" ? (
                  <span style={greenPillStyle}>{formatStatus(entitlement?.status)}</span>
                ) : (
                  formatStatus(entitlement?.status)
                )}
              </span>
            </div>
            <div style={{ ...fieldRowStyle, borderBottom: "none" }}>
              <span style={fieldLabelStyle}>Member access</span>
              <span style={fieldValueStyle}>
                {entitlementLoadFailed ? (
                  "Unavailable right now"
                ) : hasAppAccess(entitlement?.status) ? (
                  <span style={greenPillStyle}>Active member</span>
                ) : (
                  "No active access"
                )}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="account-signout"
              type="button"
              onClick={() => void handleSignOut()}
              disabled={busyAction !== null}
              style={ghostBtnStyle}
            >
              {busyAction === "signout" ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={cardKickerStyle}>SUBSCRIPTION</div>
          <h2 style={sectionTitleStyle}>Plan and billing</h2>

          <div>
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Current plan</span>
              <span style={fieldValueStyle}>
                {entitlementLoadFailed ? (
                  "Unavailable right now"
                ) : (
                  <span style={planPillStyle}>{formatPlanLabel(entitlement?.plan)}</span>
                )}
              </span>
            </div>
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Status</span>
              <span style={fieldValueStyle}>
                {entitlementLoadFailed ? (
                  "Unavailable right now"
                ) : entitlement?.status === "active" ? (
                  <span style={greenPillStyle}>{formatStatus(entitlement?.status)}</span>
                ) : (
                  <span style={{ color: statusColor(entitlement?.status) }}>{formatStatus(entitlement?.status)}</span>
                )}
              </span>
            </div>
            {!entitlementLoadFailed && formatBillingDate(entitlement) ? (
              <div style={{ ...fieldRowStyle, borderBottom: "none" }}>
                <span style={fieldLabelStyle}>
                  {entitlement?.status === "canceled" || entitlement?.cancel_at_period_end ? "Access ends" : "Next renewal"}
                </span>
                <span style={fieldValueStyle}>{formatBillingDate(entitlement)}</span>
              </div>
            ) : (
              <div style={{ ...fieldRowStyle, borderBottom: "none" }} />
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <a
              className="account-billing-btn"
              href="https://customer.paddle.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={ghostBtnStyle}
            >
              Manage subscription
            </a>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={cardKickerStyle}>DRIFTLATCH SETUP</div>
          <h2 style={sectionTitleStyle}>Profile and defaults</h2>

          <div>
            <div style={fieldRowStyle}>
              <span style={fieldLabelStyle}>Display name</span>
              <span style={fieldValueStyle}>
                {profileLoadFailed ? "Unavailable right now" : profile?.display_name?.trim() || "Not set"}
              </span>
            </div>
            <div style={{ ...fieldRowStyle, alignItems: "flex-start", borderBottom: "none" }}>
              <span style={fieldLabelStyle}>Attachment pattern</span>
              <div style={{ ...fieldValueStyle, display: "grid", gap: 6 }}>
                <span style={neutralPillStyle}>
                  {profileLoadFailed ? "Unavailable" : getAttachmentStyleDisplayLabel(profile?.attachment_style)}
                </span>
                {!profileLoadFailed && (attachmentStyleSummary?.body ?? getAttachmentStyleExplanation()) ? (
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(161,161,170,0.6)", lineHeight: 1.55 }}>
                    {attachmentStyleSummary?.body ?? getAttachmentStyleExplanation()}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ ...subCardStyle, marginTop: 20 }}>
            <div style={subCardHeaderStyle}>
              <div>
                <div style={cardKickerStyle}>Defaults</div>
                <div style={actionTitleStyle}>Check-in defaults</div>
                <p className="small" style={{ margin: 0 }}>
                  These prefill the check-in flow. Your attachment pattern still updates only through the Pressure Profile.
                </p>
              </div>
            </div>

            {profileLoadFailed ? (
              <div
                style={{
                  ...noticeStyle("error"),
                  borderRadius: 16,
                  padding: "12px 14px",
                  fontSize: 13,
                  lineHeight: 1.55,
                  marginBottom: 16,
                }}
              >
                Saved profile data is temporarily unavailable, so defaults are locked instead of being treated as empty.
              </div>
            ) : null}

            <div style={defaultsGridStyle}>
              <label style={fieldStyle}>
                <span className="small">Default need</span>
                <ThemedSelect
                  value={editableDefaults.default_need}
                  onValueChange={(value) => setEditableDefaults((current) => ({ ...current, default_need: value }))}
                  disabled={profileLoadFailed || busyAction === "save-defaults" || busyAction === "clear-defaults"}
                  placeholder="No default"
                  options={[...NO_DEFAULT_OPTION, ...DEFAULT_NEED_OPTIONS]}
                />
              </label>

              <label style={fieldStyle}>
                <span className="small">Default time</span>
                <ThemedSelect
                  value={editableDefaults.default_time}
                  onValueChange={(value) => setEditableDefaults((current) => ({ ...current, default_time: value }))}
                  disabled={profileLoadFailed || busyAction === "save-defaults" || busyAction === "clear-defaults"}
                  placeholder="No default"
                  options={[...NO_DEFAULT_OPTION, ...DEFAULT_TIME_OPTIONS]}
                />
              </label>

              <label style={fieldStyle}>
                <span className="small">Default situation</span>
                <ThemedSelect
                  value={editableDefaults.default_situation}
                  onValueChange={(value) =>
                    setEditableDefaults((current) => ({ ...current, default_situation: value }))
                  }
                  disabled={profileLoadFailed || busyAction === "save-defaults" || busyAction === "clear-defaults"}
                  placeholder="No default"
                  options={[...NO_DEFAULT_OPTION, ...DEFAULT_SITUATION_OPTIONS]}
                />
              </label>
            </div>

            <div style={buttonRowStyle}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => void handleClearDefaults()}
                disabled={profileLoadFailed || busyAction !== null}
              >
                {busyAction === "clear-defaults" ? "Clearing..." : "Clear defaults"}
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => void handleSaveDefaults()}
                disabled={profileLoadFailed || busyAction !== null || !defaultsDirty}
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
          <div style={cardKickerStyle}>DATA CONTROLS</div>
          <h2 style={sectionTitleStyle}>History, export, and reset</h2>

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
                  Clears saved defaults, your saved attachment pattern, and the related personalization keys.
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
                className="account-signout"
                type="button"
                onClick={() => void handleExportData()}
                disabled={busyAction !== null}
                style={ghostBtnStyle}
              >
                {busyAction === "export" ? "Preparing export..." : "Export my data"}
              </button>
            </div>
          </div>
        </section>

        <section style={dangerCardStyle}>
          <div style={dangerRimStyle} />
          <div style={dangerCardKickerStyle}>DANGER ZONE</div>
          <h2 style={dangerSectionTitleStyle}>Delete account</h2>

          <div style={actionRowStyle}>
            <div>
              <div style={actionTitleStyle}>Delete account</div>
              <p className="small" style={{ margin: 0 }}>
                Deletes your public Driftlatch data, then signs you out.
              </p>
            </div>
            <button
              className="account-delete-btn"
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busyAction !== null}
              style={deleteBtnStyle}
            >
              Delete account
            </button>
          </div>

          {confirmDelete ? (
            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(180,80,80,0.22)",
                background: "rgba(180,80,80,0.07)",
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
        </section>

        <section style={cardStyle}>
          <div style={cardTopHighlightStyle} />
          <div style={cardKickerStyle}>BILLING / SUPPORT</div>
          <h2 style={sectionTitleStyle}>Subscription and help</h2>

          <div style={stackStyle}>
            <div style={actionRowStyle}>
              <div>
                <div style={actionTitleStyle}>Manage subscription</div>
                <p className="small" style={{ margin: 0 }}>
                  Update payment method, download invoices, or cancel your plan via the Paddle billing portal.
                </p>
              </div>
              <a
                className="account-billing-btn"
                href="https://customer.paddle.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={ghostBtnStyle}
              >
                Billing portal
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
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(18,18,22,0.9)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  padding: 24,
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
} as const;

const pageStyle = {
  minHeight: "100dvh",
  background: "var(--bg)",
  color: "var(--text)",
  position: "relative",
  overflow: "hidden",
  padding: "44px 18px 100px",
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
  maxWidth: 640,
  margin: "0 auto",
  display: "grid",
  gap: 12,
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
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(18,18,22,0.9)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
  overflow: "hidden",
  padding: "28px 24px",
} as const;

const pageKickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(161,161,170,0.45)",
  marginBottom: 10,
};

const pageH1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-serif)",
  fontSize: "clamp(1.8rem, 5vw, 2.2rem)",
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: "var(--text)",
  lineHeight: 1.1,
  marginBottom: 8,
};

const pageSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "rgba(161,161,170,0.55)",
  lineHeight: 1.6,
  marginBottom: 40,
  fontWeight: 400,
};

const cardKickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(161,161,170,0.4)",
  marginBottom: 4,
};

const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: 14,
  paddingBottom: 14,
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(161,161,170,0.55)",
  fontWeight: 400,
};

const fieldValueStyle: React.CSSProperties = {
  fontSize: 14,
  color: "rgba(244,244,245,0.88)",
  fontWeight: 500,
  textAlign: "right",
  wordBreak: "break-word",
  maxWidth: "60%",
};

const planPillStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "3px 10px",
  borderRadius: 999,
  background: "rgba(194,122,92,0.1)",
  border: "1px solid rgba(194,122,92,0.2)",
  color: "rgba(194,122,92,0.9)",
  fontSize: 12,
  fontWeight: 600,
};

const greenPillStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "3px 10px",
  borderRadius: 999,
  background: "rgba(120,190,150,0.1)",
  border: "1px solid rgba(120,190,150,0.2)",
  color: "rgba(120,190,150,0.9)",
  fontSize: 12,
  fontWeight: 600,
};

const neutralPillStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "3px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(244,244,245,0.7)",
  fontSize: 12,
  fontWeight: 500,
};

const ghostBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 20px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "rgba(161,161,170,0.7)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s ease",
  textDecoration: "none",
};

const dangerCardStyle: React.CSSProperties = {
  position: "relative",
  borderRadius: 22,
  border: "1px solid rgba(180,80,80,0.15)",
  background: "rgba(18,12,12,0.9)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
  overflow: "hidden",
  padding: "28px 24px",
};

const dangerCardKickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(180,80,80,0.45)",
  marginBottom: 4,
};

const dangerSectionTitleStyle: React.CSSProperties = {
  margin: "6px 0 18px",
  fontSize: "1.15rem",
  fontFamily: "var(--font-serif)",
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "-0.025em",
  color: "rgba(244,244,245,0.7)",
};

const dangerRimStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 16,
  right: 16,
  height: 1,
  background: "linear-gradient(90deg, transparent, rgba(180,80,80,0.18), transparent)",
  pointerEvents: "none",
};

const deleteBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 20px",
  borderRadius: 10,
  border: "1px solid rgba(180,80,80,0.2)",
  background: "rgba(180,80,80,0.06)",
  color: "rgba(180,80,80,0.75)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const orientationSectionStyle = {
  ...cardStyle,
  padding: 0,
  background: "rgba(18,18,22,0.9)",
} as const;

const orientationSectionGlowStyle = {
  position: "absolute",
  top: -80,
  right: -60,
  width: 260,
  height: 260,
  borderRadius: 999,
  background: "radial-gradient(circle, rgba(194,122,92,0.16) 0%, rgba(24,24,27,0) 72%)",
  filter: "blur(46px)",
  pointerEvents: "none",
} as const;

const orientationInnerStyle = {
  position: "relative",
  zIndex: 1,
  padding: 22,
  display: "grid",
  gap: 0,
} as const;

const orientationToggleButtonStyle = {
  width: "100%",
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)",
  color: "var(--text)",
  borderRadius: 20,
  padding: "16px 16px 15px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
} as const;

const orientationToggleButtonOpenStyle = {
  border: "1px solid rgba(194,122,92,0.16)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.048) 0%, rgba(255,255,255,0.024) 100%), radial-gradient(circle at top left, rgba(194,122,92,0.07) 0%, rgba(39,39,42,0) 46%)",
} as const;

const orientationToggleCopyStyle = {
  minWidth: 0,
  display: "grid",
  gap: 6,
} as const;

const orientationToggleTitleStyle = {
  color: "rgba(244,244,245,0.85)",
  fontSize: 15,
  lineHeight: 1.3,
  letterSpacing: "-0.01em",
  fontWeight: 500,
} as const;

const orientationToggleHelperStyle = {
  margin: "2px 0 0",
  color: "rgba(161,161,170,0.5)",
  fontSize: 13,
  lineHeight: 1.5,
  maxWidth: 560,
} as const;

const orientationChevronShellStyle = {
  width: 38,
  height: 38,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.04)",
  display: "grid",
  placeItems: "center",
  color: "rgba(244,244,245,0.84)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
} as const;

const orientationChevronIconStyle = {
  width: 18,
  height: 18,
  display: "block",
} as const;

const orientationRevealStyle = {
  overflow: "hidden",
} as const;

const orientationExpandedContentStyle = {
  paddingTop: 16,
  display: "grid",
  gap: 16,
  willChange: "transform, opacity",
} as const;

const orientationRevealTransition = {
  duration: 0.44,
  ease: [0.22, 1, 0.36, 1],
} as const;

const orientationContentTransition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
} as const;

const orientationChevronTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
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
  marginBottom: 0,
} as const;

const sectionTitleStyle = {
  margin: "6px 0 18px",
  fontSize: "1.15rem",
  fontFamily: "var(--font-serif)",
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "-0.025em",
  color: "rgba(244,244,245,0.9)",
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
  color: "rgba(244,244,245,0.88)",
  fontSize: 14,
  lineHeight: 1.3,
  fontWeight: 600,
  marginBottom: 4,
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

const orientationFlowGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
} as const;

const orientationFlowCardStyle = {
  position: "relative",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
  padding: 12,
  display: "grid",
  gap: 10,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
} as const;

const orientationFlowCardTopStyle = {
  display: "flex",
  justifyContent: "flex-start",
  gap: 8,
  alignItems: "center",
} as const;

const orientationStepBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 36,
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid rgba(194,122,92,0.26)",
  background: "rgba(194,122,92,0.10)",
  color: "rgba(255,236,228,0.92)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
} as const;

const orientationVisualShellStyle = {
  position: "relative",
  minHeight: 136,
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  background:
    "radial-gradient(circle at top, rgba(194,122,92,0.12) 0%, rgba(39,39,42,0.12) 34%, rgba(24,24,27,0.5) 100%)",
} as const;

const orientationVisualGlowStyle = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(circle, rgba(194,122,92,0.18) 0%, rgba(24,24,27,0) 70%)",
  filter: "blur(30px)",
  transform: "translateY(-18%)",
} as const;

const orientationVisualPanelStyle = {
  position: "relative",
  zIndex: 1,
  margin: 11,
  minHeight: 112,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "linear-gradient(180deg, rgba(24,24,27,0.76) 0%, rgba(39,39,42,0.88) 100%)",
  padding: 11,
  display: "grid",
  gap: 10,
  boxShadow: "0 18px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)",
} as const;

const orientationMiniTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
} as const;

const orientationMiniChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "4px 9px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "rgba(161,161,170,0.9)",
  fontSize: 10,
  lineHeight: 1,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

const orientationStackStyle = {
  display: "grid",
  gap: 10,
  alignContent: "start",
} as const;

const orientationMiniStateBarStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.05)",
  color: "rgba(244,244,245,0.9)",
  fontSize: 13,
  fontWeight: 600,
} as const;

const orientationMiniDotStyle = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#C27A5C",
  boxShadow: "0 0 0 6px rgba(194,122,92,0.14)",
} as const;

const orientationMiniActionCardStyle = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.03)",
  padding: 12,
  display: "grid",
  gap: 6,
} as const;

const orientationMiniActionLabelStyle = {
  color: "rgba(161,161,170,0.9)",
  fontSize: 10,
  lineHeight: 1.2,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} as const;

const orientationMiniActionTitleStyle = {
  color: "var(--text)",
  fontSize: 14,
  lineHeight: 1.25,
  fontWeight: 650,
} as const;

const orientationMiniActionLineStyle = {
  width: "68%",
  height: 6,
  borderRadius: 999,
  background: "linear-gradient(90deg, rgba(194,122,92,0.9) 0%, rgba(194,122,92,0.2) 100%)",
} as const;

const orientationPillGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
} as const;

const orientationSupportPillStyle = {
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.03)",
  padding: "10px 12px",
  color: "rgba(244,244,245,0.9)",
  fontSize: 12,
  lineHeight: 1.35,
  fontWeight: 600,
} as const;

const orientationChartStyle = {
  position: "relative",
  minHeight: 64,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.05)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%), repeating-linear-gradient(180deg, transparent 0 16px, rgba(255,255,255,0.035) 16px 17px)",
} as const;

const orientationChartLineStyle = {
  position: "absolute",
  left: "8%",
  right: "8%",
  top: "50%",
  height: 2,
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(120,170,140,0.12) 0%, rgba(120,170,140,0.74) 26%, rgba(120,170,140,0.3) 56%, rgba(120,170,140,0.82) 100%)",
  transform: "translateY(-50%) rotate(-12deg)",
  transformOrigin: "left center",
} as const;

const orientationChartDotStyle = {
  position: "absolute",
  width: 9,
  height: 9,
  borderRadius: 999,
  background: "rgba(136,196,156,0.96)",
  boxShadow: "0 0 0 5px rgba(136,196,156,0.12)",
  transform: "translate(-50%, -50%)",
} as const;

const orientationMiniFooterRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
} as const;

const orientationMiniMutedStyle = {
  color: "rgba(161,161,170,0.88)",
  fontSize: 11,
  lineHeight: 1.4,
} as const;

const orientationFlowCopyStyle = {
  display: "grid",
  gap: 6,
} as const;

const orientationCardTitleStyle = {
  margin: 0,
  color: "var(--text)",
  fontSize: 22,
  lineHeight: 1.02,
  letterSpacing: "-0.03em",
} as const;

const orientationCardCopyStyle = {
  margin: 0,
  color: "rgba(244,244,245,0.8)",
  fontSize: 14,
  lineHeight: 1.55,
} as const;

const orientationDefaultsNoteStyle = {
  display: "grid",
  gap: 8,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "linear-gradient(90deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
  padding: "14px 16px",
} as const;

const orientationNoteEyebrowStyle = {
  color: "rgba(194,122,92,0.95)",
  fontSize: 11,
  lineHeight: 1.2,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} as const;

const orientationNoteCopyStyle = {
  margin: 0,
  color: "rgba(244,244,245,0.82)",
  fontSize: 14,
  lineHeight: 1.6,
} as const;

const orientationMeaningGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
} as const;

const orientationMeaningCardStyle = {
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.03)",
  padding: 14,
  display: "grid",
  gap: 10,
} as const;

const orientationMeaningHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  paddingBottom: 10,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
} as const;

const orientationMeaningTitleStyle = {
  color: "var(--text)",
  fontSize: 18,
  lineHeight: 1.2,
  fontWeight: 650,
  marginTop: 6,
} as const;

const orientationMeaningCountStyle = {
  minWidth: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.04)",
  display: "grid",
  placeItems: "center",
  color: "rgba(244,244,245,0.82)",
  fontSize: 12,
  fontWeight: 700,
} as const;

const orientationMeaningItemsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
} as const;

const orientationMeaningItemStyle = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(24,24,27,0.26)",
  padding: 11,
  display: "grid",
  gap: 6,
  alignContent: "start",
} as const;

const orientationSupportItemStyle = {
  ...orientationMeaningItemStyle,
  padding: "12px 13px",
  gap: 5,
  background: "linear-gradient(180deg, rgba(24,24,27,0.28) 0%, rgba(24,24,27,0.18) 100%)",
} as const;

const orientationMeaningItemHeaderStyle = {
  display: "flex",
  gap: 7,
  alignItems: "center",
  minWidth: 0,
} as const;

const orientationMeaningDotStyle = {
  width: 8,
  height: 8,
  borderRadius: 999,
  flexShrink: 0,
} as const;

const orientationMeaningSupportAccentStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "rgba(194,122,92,0.9)",
  boxShadow: "0 0 0 5px rgba(194,122,92,0.12)",
  flexShrink: 0,
} as const;

const orientationMeaningLabelStyle = {
  color: "var(--text)",
  fontSize: 14,
  lineHeight: 1.35,
  fontWeight: 650,
  minWidth: 0,
} as const;

const orientationMeaningCopyStyle = {
  margin: 0,
  color: "rgba(161,161,170,0.92)",
  fontSize: 13,
  lineHeight: 1.55,
} as const;
