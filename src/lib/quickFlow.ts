import { selectTool } from "@/lib/selectTool";
import { type RoomTone } from "@/lib/roomTone";
import { getNeedLabel } from "@/lib/supportLabels";
import type { AttachmentStyle, DriftNeed, DriftSituation, DriftState, PressureDirection } from "@/lib/toolLibrary";

export type StoredProfileDefaults = {
  default_need?: DriftNeed;
  default_time?: ValidToolTime;
  default_situation?: DriftSituation;
};

export type ValidToolTime = 1 | 3 | 5 | 10;

export type ToolContext = {
  state: DriftState;
  need: DriftNeed;
  roomTone?: RoomTone | null;
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
  alternates: ReturnType<typeof selectTool>["alternates"];
  selectorDebug: ReturnType<typeof selectTool>["debug"] | null;
  selectorReason: ReturnType<typeof selectTool>["reason"];
};

const SITUATION_LABEL: Record<DriftSituation, string> = {
  partner_nearby: "Partner nearby",
  kids_around: "Kids around",
  alone: "Alone",
  long_distance: "Long distance",
  housemates_around: "Housemates around",
};

function isDriftNeed(value: unknown): value is DriftNeed {
  return value === "regain_clarity" || value === "wind_down" || value === "be_here" || value === "come_back";
}

function isDriftSituation(value: unknown): value is DriftSituation {
  return (
    value === "partner_nearby" ||
    value === "kids_around" ||
    value === "alone" ||
    value === "long_distance" ||
    value === "housemates_around"
  );
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
  return `${defaults.time} min · ${SITUATION_LABEL[defaults.situation]} · ${getNeedLabel(defaults.need)}`;
}

export function buildToolContext(
  state: DriftState,
  defaults: Pick<ToolContext, "need" | "roomTone" | "time" | "situation">,
): ToolContext {
  return {
    state,
    need: defaults.need,
    roomTone: defaults.roomTone ?? null,
    time: defaults.time,
    situation: defaults.situation,
  };
}

export function buildToolContextKey(ctx: ToolContext) {
  return `need=${ctx.need}|state=${ctx.state}|situation=${ctx.situation}|roomTone=${ctx.roomTone ?? "none"}|time=${ctx.time}`;
}

export function buildRecommendedToolHref(
  toolId: string,
  ctx: ToolContext,
  options: {
    attachmentStyle?: AttachmentStyle;
    from: "checkin" | "home";
    mode?: "quick" | "standard";
    preferredPackIds?: string[];
    pressureDirection?: PressureDirection | null;
  },
) {
  const params = new URLSearchParams({
    from: options.from,
    need: ctx.need,
    situation: ctx.situation,
    state: ctx.state,
    time: `${ctx.time}`,
  });

  if (ctx.roomTone) params.set("roomTone", ctx.roomTone);
  if (options.mode) params.set("mode", options.mode);
  if (options.attachmentStyle) params.set("attachmentStyle", options.attachmentStyle);
  if ((options.preferredPackIds?.length ?? 0) > 0) {
    params.set("preferredPackIds", options.preferredPackIds!.join(","));
  }
  if (options.pressureDirection) {
    params.set("pressureDirection", options.pressureDirection);
  }

  return `/app/tool/${toolId}?${params.toString()}`;
}

export function buildQuickRecommendation(options: {
  attachmentStyle?: AttachmentStyle;
  defaults: Pick<ToolContext, "need" | "roomTone" | "time" | "situation">;
  excludeToolIds?: string[];
  from: "checkin" | "home";
  mode?: "quick" | "standard";
  preferredPackIds?: string[];
  pressureDirection?: PressureDirection | null;
  state: DriftState;
}): QuickRecommendation {
  const ctx = buildToolContext(options.state, options.defaults);
  const selection = selectTool({
    attachmentStyle: options.attachmentStyle,
    excludeToolIds: options.excludeToolIds,
    mode: options.mode,
    need: ctx.need,
    preferredPackIds: options.preferredPackIds,
    pressureDirection: options.pressureDirection ?? null,
    roomTone: ctx.roomTone,
    situation: ctx.situation,
    state: ctx.state,
    timeMinutes: ctx.time,
  });
  const primary = selection.primary;

  return {
    alternates: selection.alternates,
    contextKey: buildToolContextKey(ctx),
    ctx,
    href: buildRecommendedToolHref(primary.id, ctx, {
      attachmentStyle: options.attachmentStyle,
      from: options.from,
      mode: options.mode,
      preferredPackIds: options.preferredPackIds,
      pressureDirection: options.pressureDirection ?? null,
    }),
    primary,
    selectorDebug: selection.debug ?? null,
    selectorReason: selection.reason,
  };
}
