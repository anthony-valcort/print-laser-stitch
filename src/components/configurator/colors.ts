export const COLOR_HEX: Record<string, string> = {
  black: "#0b0b0b",
  white: "#f7f7f7",
  navy: "#1c2940",
  "navy blue": "#1c2940",
  red: "#c93434",
  "royal blue": "#1f4ec9",
  blue: "#2563eb",
  "sky blue": "#7dd3fc",
  "light blue": "#bae6fd",
  green: "#16a34a",
  "forest green": "#1b5e20",
  "kelly green": "#22c55e",
  "lime green": "#a3e635",
  yellow: "#fde047",
  orange: "#f97316",
  pink: "#ec4899",
  "hot pink": "#f43f5e",
  purple: "#7c3aed",
  maroon: "#7f1d1d",
  burgundy: "#7f1d1d",
  brown: "#78350f",
  tan: "#d2b48c",
  beige: "#e9dcc4",
  grey: "#6b7280",
  gray: "#6b7280",
  "heather grey": "#a3a3a3",
  "heather gray": "#a3a3a3",
  "charcoal grey": "#374151",
  "charcoal gray": "#374151",
  charcoal: "#374151",
  silver: "#cbd5e1",
  gold: "#d4af37",
};

export function colorHex(name: string): string | null {
  return COLOR_HEX[name.toLowerCase().trim()] ?? null;
}

export function isColorOption(name: string): boolean {
  return name.toLowerCase() === "color" || name.toLowerCase() === "colour";
}

export function isSizeOption(name: string): boolean {
  return name.toLowerCase() === "size";
}
