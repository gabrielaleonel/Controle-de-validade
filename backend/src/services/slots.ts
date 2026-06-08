import type { SlotConfig, SlotName } from "../types";

const DEFAULT_SLOTS: SlotConfig = {
  morning: "08:00",
  afternoon: "14:00",
  evening: "20:00",
};

export function getSlotConfig(): SlotConfig {
  const raw = process.env.EXPIRATION_EMAIL_SLOTS;
  if (!raw) return DEFAULT_SLOTS;

  const parts = raw.split(",").map((s) => s.trim());
  const map: Record<string, string> = {};
  for (const part of parts) {
    const [key, val] = part.split(":");
    if (key && val) map[key.trim()] = val.trim();
  }

  return {
    morning: map.morning ?? DEFAULT_SLOTS.morning,
    afternoon: map.afternoon ?? DEFAULT_SLOTS.afternoon,
    evening: map.evening ?? DEFAULT_SLOTS.evening,
  };
}

export function isValidSlot(value: string): value is SlotName {
  return ["morning", "afternoon", "evening"].includes(value);
}
