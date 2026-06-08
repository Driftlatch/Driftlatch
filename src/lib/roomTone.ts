import type { DriftSituation } from "./toolLibrary";

export type PartnerRoomTone = "easy" | "neutral" | "tense" | "guarded" | "distant";
export type KidsRoomTone = "settled" | "busy" | "frayed" | "loud" | "clingy";
export type LongDistanceRoomTone = "connected" | "neutral" | "unclear" | "tense" | "far";
export type RoomTone = PartnerRoomTone | KidsRoomTone | LongDistanceRoomTone;

type RoomToneOption<TTone extends RoomTone> = {
  id: TTone;
  label: string;
};

export const ROOM_TONE_OPTIONS = {
  partner_nearby: [
    { id: "easy", label: "Easy" },
    { id: "neutral", label: "Neutral" },
    { id: "tense", label: "Tense" },
    { id: "guarded", label: "Guarded" },
    { id: "distant", label: "Distant" },
  ] satisfies readonly RoomToneOption<PartnerRoomTone>[],
  kids_around: [
    { id: "settled", label: "Settled" },
    { id: "busy", label: "Busy" },
    { id: "frayed", label: "Frayed" },
    { id: "loud", label: "Loud" },
    { id: "clingy", label: "Clingy" },
  ] satisfies readonly RoomToneOption<KidsRoomTone>[],
  long_distance: [
    { id: "connected", label: "Connected" },
    { id: "neutral", label: "Neutral" },
    { id: "unclear", label: "Unclear" },
    { id: "tense", label: "Tense" },
    { id: "far", label: "Far" },
  ] satisfies readonly RoomToneOption<LongDistanceRoomTone>[],
} as const;

export function isRoomTone(value: unknown): value is RoomTone {
  return Object.values(ROOM_TONE_OPTIONS).some((options) => options.some((option) => option.id === value));
}

export function getRoomToneOptions(situation: DriftSituation) {
  // Situations without a person-specific tone read return [] so the room-tone
  // card is suppressed. housemates_around: a non-intimate person is present
  // but isn't the channel the user is regulating around.
  if (situation === "alone" || situation === "housemates_around") return [] as const;
  return ROOM_TONE_OPTIONS[situation];
}

export function isRoomToneForSituation(situation: DriftSituation, value: unknown): value is RoomTone {
  return getRoomToneOptions(situation).some((option) => option.id === value);
}

export function getRoomToneLabel(roomTone: RoomTone | null | undefined) {
  if (!roomTone) return null;

  for (const options of Object.values(ROOM_TONE_OPTIONS)) {
    const match = options.find((option) => option.id === roomTone);
    if (match) return match.label;
  }

  return null;
}
