import { selectTool } from "@/lib/selectTool";
import type { AttachmentStyle, DriftNeed, DriftSituation, DriftState } from "@/lib/toolLibrary";

export type StoredProfileDefaults = {
  default_need?: DriftNeed;
  default_time?: ValidToolTime;
  default_situation?: DriftSituation;
};

export type ValidToolTime = 1 | 3 | 5 | 10;

export type ToolContext = {
  state: DriftState;
  need: DriftNeed;
  time: ValidToolTime;
  situation: DriftSituation;
};

export type ResolvedQuickDefaults = {
  attachmentStyle: AttachmentStyle;
  need: DriftNeed;
  time: ValidToolTime;
  situation: DriftSituation;
};

export type QuickRecommendation = {
  contextKey: string;
  ctx: ToolContext;
  href: string;
  primary: ReturnType<typeof selectTool>["primary"];
};

const NEED_LABEL: Record<DriftNeed, string> = {
  regain_clarity: "regain clarity",
  wind_down: "wind down",
  be_here: "be here",
  come_back: "come back",
};

const SITUATION_LABEL: Record<DriftSituation, string> = {
  partner_nearby: "partner nearby",
  kids_around: "kids around",
  alone: "alone",
  long_distance: "long distance",
};

function isDriftNeed(value: unknown): value is DriftNeed {
  return value === "regain_clarity" || value === "wind_down" || value === "be_here" || value === "come_back";
}

function isDriftSituation(value: unknown): value is DriftSituation {
  return value === "partner_nearby" || value === "kids_around" || value === "alone" || value === "long_distance";
}

function isAttachmentStyle(value: unknown): value is AttachmentStyle {
  return value === "Anxious" || value === "Avoidant" || value === "Mixed" || value === "Unknown";
}

export function toValidToolTime(value: unknown): ValidToolTime | null {
  return value === 1 || value === 3 || value === 5 || value === 10 ? value : null;
}

export function parseStoredProfileDefaults(value: unknown): StoredProfileDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const raw = value as Record<string, unknown>;
  const defaultTime = toValidToolTime(raw.default_time);

  return {
    default_need: isDriftNeed(raw.default_need) ? raw.default_need : undefined,
    default_time: defaultTime ?? undefined,
    default_situation: isDriftSituation(raw.default_situation) ? raw.default_situation : undefined,
  };
}

export function resolveQuickDefaults(
  defaults: StoredProfileDefaults | unknown,
  attachmentStyle?: AttachmentStyle | null,
): ResolvedQuickDefaults {
  const parsedDefaults =
    defaults && typeof defaults === "object" && !Array.isArray(defaults)
      ? (defaults as StoredProfileDefaults)
      : parseStoredProfileDefaults(defaults);

  return {
    attachmentStyle: isAttachmentStyle(attachmentStyle) ? attachmentStyle : "Unknown",
    need: parsedDefaults.default_need ?? "wind_down",
    time: parsedDefaults.default_time ?? 3,
    situation: parsedDefaults.default_situation ?? "alone",
  };
}

export function formatQuickDefaultsSummary(defaults: Pick<ResolvedQuickDefaults, "need" | "time" | "situation">) {
  return `${defaults.time} min · ${SITUATION_LABEL[defaults.situation]} · ${NEED_LABEL[defaults.need]}`;
}

export function buildToolContext(
  state: DriftState,
  defaults: Pick<ResolvedQuickDefaults, "need" | "time" | "situation">,
): ToolContext {
  return {
    state,
    need: defaults.need,
    time: defaults.time,
    situation: defaults.situation,
  };
}

export function buildToolContextKey(ctx: ToolContext) {
  return `need=${ctx.need}|state=${ctx.state}|situation=${ctx.situation}|time=${ctx.time}`;
}

export function buildRecommendedToolHref(
  toolId: string,
  ctx: ToolContext,
  options: {
    attachmentStyle?: AttachmentStyle;
    from: "checkin" | "home";
    mode?: "quick" | "standard";
    preferredPackIds?: string[];
  },
) {
  const params = new URLSearchParams({
    from: options.from,
    need: ctx.need,
    situation: ctx.situation,
    state: ctx.state,
    time: `${ctx.time}`,
  });

  if (options.mode) params.set("mode", options.mode);
  if (options.attachmentStyle) params.set("attachmentStyle", options.attachmentStyle);
  if ((options.preferredPackIds?.length ?? 0) > 0) {
    params.set("preferredPackIds", options.preferredPackIds!.join(","));
  }

  return `/app/tool/${toolId}?${params.toString()}`;
}

export function buildQuickRecommendation(options: {
  attachmentStyle?: AttachmentStyle;
  defaults: Pick<ResolvedQuickDefaults, "need" | "time" | "situation">;
  excludeToolIds?: string[];
  from: "checkin" | "home";
  mode?: "quick" | "standard";
  preferredPackIds?: string[];
  state: DriftState;
}): QuickRecommendation {
  const ctx = buildToolContext(options.state, options.defaults);
  const primary = selectTool({
    attachmentStyle: options.attachmentStyle,
    excludeToolIds: options.excludeToolIds,
    mode: options.mode,
    need: ctx.need,
    preferredPackIds: options.preferredPackIds,
    situation: ctx.situation,
    state: ctx.state,
    timeMinutes: ctx.time,
  }).primary;

  return {
    contextKey: buildToolContextKey(ctx),
    ctx,
    href: buildRecommendedToolHref(primary.id, ctx, {
      attachmentStyle: options.attachmentStyle,
      from: options.from,
      mode: options.mode,
      preferredPackIds: options.preferredPackIds,
    }),
    primary,
  };
}
