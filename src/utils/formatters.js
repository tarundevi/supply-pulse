/**
 * Format a number as USD currency (e.g. $284B, $38.2M)
 */
export function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0.00';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Format a trade volume with units (e.g. 284B, 38.2M)
 */
export function formatVolume(value) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return `${Math.round(value * 100) / 100}`;
}

/**
 * Format a number as a percentage (e.g. 67%)
 */
export function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}
