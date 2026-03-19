import { NextResponse } from "next/server";
import {
  PADDLE_WEBHOOK_EVENTS,
  getCurrentPeriodEnd,
  hasScheduledCancellation,
  normalizeEntitlementStatus,
  resolveLinkedUserId,
  resolvePlanFromData,
  verifyPaddleSignature,
  type PaddleSubscriptionData,
  type PaddleTransactionData,
  type PaddleWebhookEvent,
} from "@/lib/paddle";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Tables, TablesInsert } from "@/lib/types/supabase";

export const runtime = "edge";

type EntitlementRow = Tables<"user_entitlements">;

async function findEntitlementByUserId(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_entitlements")
    .select(
      "user_id, plan, status, current_period_end, cancel_at_period_end, paddle_customer_id, paddle_subscription_id, paddle_transaction_id, last_event_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as EntitlementRow | null;
}

async function findEntitlementByPaddleIds(ids: {
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (ids.subscriptionId) {
    const { data, error } = await supabase
      .from("user_entitlements")
      .select(
        "user_id, plan, status, current_period_end, cancel_at_period_end, paddle_customer_id, paddle_subscription_id, paddle_transaction_id, last_event_at",
      )
      .eq("paddle_subscription_id", ids.subscriptionId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as EntitlementRow;
  }

  if (ids.customerId) {
    const { data, error } = await supabase
      .from("user_entitlements")
      .select(
        "user_id, plan, status, current_period_end, cancel_at_period_end, paddle_customer_id, paddle_subscription_id, paddle_transaction_id, last_event_at",
      )
      .eq("paddle_customer_id", ids.customerId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as EntitlementRow;
  }

  return null;
}

function isIncomingEventNewer(lastEventAt: string | null, occurredAt: string) {
  if (!lastEventAt) return true;

  const last = Date.parse(lastEventAt);
  const next = Date.parse(occurredAt);

  if (!Number.isFinite(last) || !Number.isFinite(next)) {
    return true;
  }

  return next >= last;
}

function buildSubscriptionPayload(
  event: PaddleWebhookEvent<PaddleSubscriptionData>,
  userId: string,
  existing: EntitlementRow | null,
): TablesInsert<"user_entitlements"> {
  const currentPeriodEnd = getCurrentPeriodEnd(event.data);
  const isCancelScheduled = event.data.status?.toLowerCase() === "active" && hasScheduledCancellation(event.data);

  return {
    cancel_at_period_end: isCancelScheduled,
    current_period_end: currentPeriodEnd ?? existing?.current_period_end ?? null,
    last_event_at: event.occurred_at,
    last_event_id: event.event_id,
    last_event_type: event.event_type,
    paddle_customer_id: event.data.customer_id ?? existing?.paddle_customer_id ?? null,
    paddle_subscription_id: event.data.id ?? existing?.paddle_subscription_id ?? null,
    paddle_transaction_id: existing?.paddle_transaction_id ?? null,
    plan: resolvePlanFromData(event.data) ?? existing?.plan ?? null,
    status: normalizeEntitlementStatus(event.data.status, {
      currentPeriodEnd,
      eventType: event.event_type,
    }),
    updated_at: new Date().toISOString(),
    user_id: userId,
  };
}

function buildTransactionPayload(
  event: PaddleWebhookEvent<PaddleTransactionData>,
  userId: string,
  existing: EntitlementRow | null,
): TablesInsert<"user_entitlements"> {
  return {
    cancel_at_period_end: existing?.cancel_at_period_end ?? false,
    current_period_end: existing?.current_period_end ?? null,
    last_event_at: event.occurred_at,
    last_event_id: event.event_id,
    last_event_type: event.event_type,
    paddle_customer_id: event.data.customer_id ?? existing?.paddle_customer_id ?? null,
    paddle_subscription_id: event.data.subscription_id ?? existing?.paddle_subscription_id ?? null,
    paddle_transaction_id: event.data.id,
    plan: resolvePlanFromData(event.data) ?? existing?.plan ?? null,
    status: normalizeEntitlementStatus(event.data.status, { eventType: event.event_type }),
    updated_at: new Date().toISOString(),
    user_id: userId,
  };
}

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[paddle-webhook] Missing PADDLE_WEBHOOK_SECRET.");
    return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 500 });
  }

  const signatureHeader = request.headers.get("paddle-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing paddle-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!(await verifyPaddleSignature(rawBody, signatureHeader, secret))) {
    console.warn("[paddle-webhook] Signature verification failed.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaddleWebhookEvent<PaddleSubscriptionData | PaddleTransactionData>;

  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent<PaddleSubscriptionData | PaddleTransactionData>;
  } catch (error) {
    console.warn("[paddle-webhook] Failed to parse webhook JSON.", error);
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!PADDLE_WEBHOOK_EVENTS.has(event.event_type)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const explicitUserId = resolveLinkedUserId(event.data);
    const matchedEntitlement = explicitUserId
      ? await findEntitlementByUserId(explicitUserId)
      : await findEntitlementByPaddleIds({
          customerId: "customer_id" in event.data ? event.data.customer_id : null,
          subscriptionId:
            "subscription_id" in event.data
              ? event.data.subscription_id
              : "id" in event.data
                ? event.data.id
                : null,
        });

    const userId = explicitUserId ?? matchedEntitlement?.user_id ?? null;
    if (!userId) {
      console.warn("[paddle-webhook] Could not link webhook to a Driftlatch user.", {
        eventId: event.event_id,
        eventType: event.event_type,
      });
      return NextResponse.json({ ok: true, linked: false });
    }

    const existing = matchedEntitlement ?? (await findEntitlementByUserId(userId));
    if (!isIncomingEventNewer(existing?.last_event_at ?? null, event.occurred_at)) {
      console.info("[paddle-webhook] Ignored stale webhook.", {
        eventId: event.event_id,
        eventType: event.event_type,
        userId,
      });
      return NextResponse.json({ ok: true, stale: true });
    }

    const payload =
      event.event_type === "transaction.completed"
        ? buildTransactionPayload(event as PaddleWebhookEvent<PaddleTransactionData>, userId, existing)
        : buildSubscriptionPayload(event as PaddleWebhookEvent<PaddleSubscriptionData>, userId, existing);

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("user_entitlements").upsert(payload, {
      onConflict: "user_id",
    });

    if (error) {
      throw error;
    }

    console.info("[paddle-webhook] Processed webhook.", {
      eventId: event.event_id,
      eventType: event.event_type,
      status: payload.status,
      userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[paddle-webhook] Failed to process webhook.", error);
    return NextResponse.json({ error: "Failed to process webhook." }, { status: 500 });
  }
}
