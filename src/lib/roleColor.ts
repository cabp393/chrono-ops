const DEFAULT_ROLE_COLOR = '#60a5fa';

const expandHex = (value: string) => {
  if (value.length !== 4) return value;
  return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
};

const parseHexColor = (value?: string) => {
  if (!value) return null;
  const expanded = expandHex(value.trim().toLowerCase());
  if (!/^#[0-9a-f]{6}$/.test(expanded)) return null;
  return {
    r: Number.parseInt(expanded.slice(1, 3), 16),
    g: Number.parseInt(expanded.slice(3, 5), 16),
    b: Number.parseInt(expanded.slice(5, 7), 16)
  };
};

const toHex = ({ r, g, b }: { r: number; g: number; b: number }) => `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;

const relativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const normalized = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * normalized[0] + 0.7152 * normalized[1] + 0.0722 * normalized[2];
};

export const normalizeRoleColor = (value?: string) => {
  const parsed = parseHexColor(value);
  if (!parsed) return DEFAULT_ROLE_COLOR;

  if (relativeLuminance(parsed) <= 0.72) {
    return toHex(parsed);
  }

  const darkened = {
    r: Math.round(parsed.r * 0.75),
    g: Math.round(parsed.g * 0.75),
    b: Math.round(parsed.b * 0.75)
  };
  return toHex(darkened);
};

