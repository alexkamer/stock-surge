/**
 * Chart color generation utilities for sector/industry visualizations
 */

// Sector-specific base hues for color palette generation
const SECTOR_HUES: Record<string, number> = {
  "technology": 220,              // Blue
  "healthcare": 150,              // Green
  "financial-services": 40,       // Gold
  "consumer-cyclical": 280,       // Purple
  "industrials": 200,             // Cyan
  "communication-services": 260,  // Blue-Purple
  "energy": 25,                   // Orange
  "basic-materials": 180,         // Teal
  "consumer-defensive": 140,      // Green-Yellow
  "real-estate": 30,              // Orange-Yellow
  "utilities": 190,               // Light Blue
};

/**
 * Get the base hue for a sector
 */
export const getSectorBaseHue = (sectorKey: string): number => {
  return SECTOR_HUES[sectorKey] || 220; // Default to blue
};

/**
 * Convert HSL to Hex color string
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Generate N distinct colors for pie chart segments based on sector
 * Creates a visually appealing gradient of colors around the color wheel
 */
export const generateIndustryColors = (
  count: number,
  sectorKey: string
): string[] => {
  const baseHue = getSectorBaseHue(sectorKey);
  const colors: string[] = [];
  const saturation = 65; // Professional, not too vibrant
  const lightnessStart = 55;
  const lightnessEnd = 75;

  for (let i = 0; i < count; i++) {
    // Spread colors around the color wheel starting from base hue
    const hue = (baseHue + (i * 360) / count) % 360;

    // Vary lightness to create depth
    const lightness =
      lightnessStart + ((lightnessEnd - lightnessStart) * i) / Math.max(count - 1, 1);

    colors.push(hslToHex(hue, saturation, lightness));
  }

  return colors;
};

/**
 * Generate colors with higher contrast for better distinguishability
 * Alternative algorithm that spaces colors further apart
 */
export const generateHighContrastColors = (
  count: number,
  sectorKey: string
): string[] => {
  const baseHue = getSectorBaseHue(sectorKey);
  const colors: string[] = [];
  const saturationValues = [70, 60, 65, 75, 55]; // Vary saturation
  const lightnessValues = [60, 70, 55, 65, 75]; // Vary lightness

  for (let i = 0; i < count; i++) {
    // Use golden angle (137.5°) for better distribution
    const hue = (baseHue + i * 137.5) % 360;
    const saturation = saturationValues[i % saturationValues.length];
    const lightness = lightnessValues[i % lightnessValues.length];

    colors.push(hslToHex(hue, saturation, lightness));
  }

  return colors;
};
