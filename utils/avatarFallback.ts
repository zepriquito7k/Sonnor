export const AVATAR_FALLBACK_COLORS = [
  "#ff5c8a",
  "#7c5cff",
  "#2f80ed",
  "#00b894",
  "#f2a900",
  "#ff6b35",
  "#00a8cc",
  "#b76cff",
] as const;

export function getRandomAvatarFallbackColor() {
  const index = Math.floor(Math.random() * AVATAR_FALLBACK_COLORS.length);
  return AVATAR_FALLBACK_COLORS[index];
}

export function getAvatarFallbackColor(value?: string | null) {
  return value && value.trim() ? value : AVATAR_FALLBACK_COLORS[0];
}
