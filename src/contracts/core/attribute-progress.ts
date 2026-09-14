/** Saves retain hundredths: the integer is ability, the remainder is experience / 100. */
export function attributeProgress(value: number, cap = Number.POSITIVE_INFINITY): {
  level: number; experience: number; capped: boolean;
} {
  const units = Math.round(Math.max(0, Math.min(cap, value)) * 100);
  return { level: Math.floor(units / 100), experience: units % 100, capped: units >= cap * 100 };
}
