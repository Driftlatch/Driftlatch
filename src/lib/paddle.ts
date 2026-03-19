import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_TOLERANCE_SECONDS = 300;

type PaddleCustomData = Record<string, unknown> & {
  driftlatch_plan?: string;
  driftlatch_user_email?: string;
  driftlatch_user_id?: string;
};

type PaddlePriceData = {
  id?: string | null;
  name?: string | null;
};

type PaddleProductData = {
  name?: string | null;
};

type PaddleItem = {
  price?: PaddlePriceData | null;
  product?: PaddleProductData | null;
};

export type PaddleSubscriptionData = {
  canceled_at?: string | null;
  current_billing_period?: {
    ends_at?: string | null;
  } | null;
  custom_data?: PaddleCustomData | null;
  customer_id?: string | null;
  id: string;
  items?: PaddleItem[] | null;
  scheduled_change?: {
    action?: string | null;
  } | null;
  status?: string | null;
  updated_at?: string | null;
};

export type PaddleTransactionData = {
  billed_at?: string | null;
  custom_data?: PaddleCustomData | null;
  customer_id?: string | null;
  id: string;
  items?: PaddleItem[] | null;
  status?: string | null;
  subscription_id?: string | null;
  updated_at?: string | null;
};

export type PaddleWebhookEvent<TData = unknown> = {
  data: TData;
  event_id: string;
  event_type: string;
  notification_id?: string;
  occurred_at: string;
};

function safeCompareHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(";").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("ts="));
  const h1Parts = parts.filter((part) => part.startsWith("h1="));

  if (!timestampPart || h1Parts.length === 0) {
    return false;
  }

  const timestamp = Number(timestampPart.slice(3));
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}:${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  return h1Parts.some((part) => {
    const signature = part.slice(3);
    if (!/^[a-f0-9]+$/i.test(signature)) return false;
    return safeCompareHex(signature, expected);
  });
}

export function getCurrentPeriodEnd(data: { current_billing_period?: { ends_at?: string | null } | null }) {
  return data.current_billing_period?.ends_at ?? null;
}

export function hasScheduledCancellation(data: PaddleSubscriptionData) {
  return data.scheduled_change?.action === "cancel";
}

function inferPlanFromItems(items: PaddleItem[] | null | undefined) {
  const search = (items ?? [])
    .flatMap((item) => [item.price?.id, item.price?.name, item.product?.name])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (!search) return null;
  if (search.includes("annual") || search.includes("year")) return "annual";
  if (search.includes("month")) return "monthly";
  return null;
}

export function resolvePlanFromData(data: { custom_data?: PaddleCustomData | null; items?: PaddleItem[] | null }) {
  const customPlan = data.custom_data?.driftlatch_plan;
  if (customPlan === "annual" || customPlan === "monthly") {
    return customPlan;
  }

  return inferPlanFromItems(data.items);
}

export function resolveLinkedUserId(data: { custom_data?: PaddleCustomData | null }) {
  const userId = data.custom_data?.driftlatch_user_id;
  return typeof userId === "string" && userId.trim().length > 0 ? userId : null;
}

export function normalizeEntitlementStatus(
  status: string | null | undefined,
  options?: { currentPeriodEnd?: string | null; eventType?: string },
) {
  const normalized = status?.trim().toLowerCase() ?? null;

  if (normalized === "active") return "active";
  if (normalized === "trialing") return "trialing";
  if (normalized === "past_due" || normalized === "paused" || normalized === "inactive") {
    return "inactive";
  }
  if (normalized === "canceled") {
    if (options?.currentPeriodEnd) {
      const endsAt = Date.parse(options.currentPeriodEnd);
      if (Number.isFinite(endsAt) && endsAt <= Date.now()) {
        return "expired";
      }
    }

    return "canceled";
  }
  if (options?.eventType === "transaction.completed") {
    return "active";
  }

  return "inactive";
}

export const PADDLE_WEBHOOK_EVENTS = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.canceled",
  "subscription.past_due",
  "subscription.trialing",
  "transaction.completed",
]);
