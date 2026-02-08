import { format } from "date-fns";

/**
 * Format a number as currency
 */
export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a large number with abbreviations (K, M, B, T)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

/**
 * Format currency with abbreviations for large numbers (M, B, T)
 */
export function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1e12) return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  if (absValue >= 1e9) return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  if (absValue >= 1e3) return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  return `${sign}$${absValue.toFixed(2)}`;
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

/**
 * Format a percentage without sign (for weights, ratios, etc.)
 */
export function formatPercentNoSign(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date
 */
export function formatDate(date: string | Date, formatStr: string = "MMM dd, yyyy"): string {
  return format(new Date(date), formatStr);
}

/**
 * Get color class for positive/negative values
 */
export function getChangeColor(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-text-secondary";
}
