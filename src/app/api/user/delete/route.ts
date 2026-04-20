import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(request: Request) {
  // Authenticate the caller via Bearer token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("[delete-account] Missing Supabase server environment variables.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the session token and get the authenticated user
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    console.warn("[delete-account] Could not verify user from token.", { error: userError?.message });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = userData.user.id;
  console.info("[delete-account] Starting deletion for user.", { userId });

  try {
    // 1. user_tool_feedback
    const { error: e1 } = await supabaseAdmin.from("user_tool_feedback").delete().eq("user_id", userId);
    if (e1) throw new Error(`user_tool_feedback: ${e1.message}`);
    console.info("[delete-account] Deleted user_tool_feedback.", { userId });

    // 2. user_recent_tools
    const { error: e2 } = await supabaseAdmin.from("user_recent_tools").delete().eq("user_id", userId);
    if (e2) throw new Error(`user_recent_tools: ${e2.message}`);
    console.info("[delete-account] Deleted user_recent_tools.", { userId });

    // 3. user_saved_tools
    const { error: e3 } = await supabaseAdmin.from("user_saved_tools").delete().eq("user_id", userId);
    if (e3) throw new Error(`user_saved_tools: ${e3.message}`);
    console.info("[delete-account] Deleted user_saved_tools.", { userId });

    // 4. user_pins
    const { error: e4 } = await supabaseAdmin.from("user_pins").delete().eq("user_id", userId);
    if (e4) throw new Error(`user_pins: ${e4.message}`);
    console.info("[delete-account] Deleted user_pins.", { userId });

    // 5. user_checkins
    const { error: e5 } = await supabaseAdmin.from("user_checkins").delete().eq("user_id", userId);
    if (e5) throw new Error(`user_checkins: ${e5.message}`);
    console.info("[delete-account] Deleted user_checkins.", { userId });

    // 6. user_entitlements
    const { error: e6 } = await supabaseAdmin.from("user_entitlements").delete().eq("user_id", userId);
    if (e6) throw new Error(`user_entitlements: ${e6.message}`);
    console.info("[delete-account] Deleted user_entitlements.", { userId });

    // 7. user_profile
    const { error: e7 } = await supabaseAdmin.from("user_profile").delete().eq("user_id", userId);
    if (e7) throw new Error(`user_profile: ${e7.message}`);
    console.info("[delete-account] Deleted user_profile.", { userId });

    // 8. auth.users (hard delete via admin API)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) throw new Error(`auth.users: ${authDeleteError.message}`);
    console.info("[delete-account] Deleted auth user.", { userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during deletion.";
    console.error("[delete-account] Failed to delete account.", { userId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
