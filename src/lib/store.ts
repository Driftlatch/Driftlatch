import { getSupabase } from "@/lib/supabase";

const SAVED_TOOLS_KEY = "driftlatch_saved_tools";

function readLocalSavedTools() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const raw = window.localStorage.getItem(SAVED_TOOLS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalSavedTools(toolIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_TOOLS_KEY, JSON.stringify(toolIds));
}

export async function requireUser() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user; // null if not logged in
}

export async function upsertProfile(payload: {
  attachment_style: string;
  defaults: any;
}) {
  const user = await requireUser();
  if (!user) throw new Error("Not logged in");
  const supabase = getSupabase();

  const { error } = await supabase.from("user_profile").upsert({
    user_id: user.id,
    attachment_style: payload.attachment_style,
    defaults: payload.defaults,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function loadProfile() {
  const user = await requireUser();
  if (!user) return null;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function saveTool(toolId: string) {
  const user = await requireUser();
  if (!user) {
    const next = [toolId, ...readLocalSavedTools().filter((id) => id !== toolId)];
    writeLocalSavedTools(next);
    return;
  }
  const supabase = getSupabase();

  const { error } = await supabase.from("user_saved_tools").upsert(
    {
      user_id: user.id,
      tool_id: toolId,
    },
    { onConflict: "user_id,tool_id" },
  );

  if (error) throw error;
}

export async function unsaveTool(toolId: string) {
  const user = await requireUser();
  if (!user) {
    writeLocalSavedTools(readLocalSavedTools().filter((id) => id !== toolId));
    return;
  }
  const supabase = getSupabase();

  const { error } = await supabase
    .from("user_saved_tools")
    .delete()
    .eq("user_id", user.id)
    .eq("tool_id", toolId);

  if (error) throw error;
}

export async function loadSavedToolIds() {
  const user = await requireUser();
  if (!user) return readLocalSavedTools();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_saved_tools")
    .select("tool_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => row.tool_id);
}

export async function touchRecent(toolId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Not logged in");
  const supabase = getSupabase();

  const { error } = await supabase.from("user_recent_tools").upsert({
    user_id: user.id,
    tool_id: toolId,
    used_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function pinTool(contextKey: string, toolId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Not logged in");
  const supabase = getSupabase();

  const { error } = await supabase.from("user_pins").upsert({
    user_id: user.id,
    context_key: contextKey,
    tool_id: toolId,
  });

  if (error) throw error;
}

export async function unpinTool(contextKey: string) {
  const user = await requireUser();
  if (!user) throw new Error("Not logged in");
  const supabase = getSupabase();

  const { error } = await supabase
    .from("user_pins")
    .delete()
    .eq("user_id", user.id)
    .eq("context_key", contextKey);

  if (error) throw error;
}

export async function loadLibraryState() {
  const user = await requireUser();
  if (!user) return null;
  const supabase = getSupabase();

  const [saved, recent, pins] = await Promise.all([
    supabase.from("user_saved_tools").select("tool_id").eq("user_id", user.id),
    supabase
      .from("user_recent_tools")
      .select("tool_id, used_at")
      .eq("user_id", user.id)
      .order("used_at", { ascending: false }),
    supabase.from("user_pins").select("context_key, tool_id").eq("user_id", user.id),
  ]);

  return {
    saved: (saved.data ?? []).map((x) => x.tool_id),
    recent: (recent.data ?? []).map((x) => x.tool_id),
    pins: Object.fromEntries((pins.data ?? []).map((x) => [x.context_key, x.tool_id])),
  };
}
