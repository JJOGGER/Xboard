/**
 * Number Utilities
 * Number formatting for currency, bytes, percentages, etc.
 */

/**
 * Format number as currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting (default: en-US)
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format bytes to human readable format
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format number with thousand separators
 * @param num - Number to format
 * @param locale - Locale for formatting (default: en-US)
 */
export function formatNumber(num: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format number as percentage
 * @param value - Value to format (0-1 or 0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @param isDecimal - Whether value is in decimal format (0-1) or percentage (0-100)
 */
export function formatPercentage(
  value: number,
  decimals = 0,
  isDecimal = true
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format number with compact notation (e.g., 1.2K, 3.4M)
 * @param num - Number to format
 * @param locale - Locale for formatting (default: en-US)
 */
export function formatCompactNumber(num: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Round number to specified decimal places
 * @param num - Number to round
 * @param decimals - Number of decimal places (default: 2)
 */
export function roundNumber(num: number, decimals = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Clamp number between min and max values
 * @param num - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Calculate percentage of value relative to total
 * @param value - Current value
 * @param total - Total value
 * @param decimals - Number of decimal places (default: 2)
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals = 2
): number {
  if (total === 0) return 0;
  return roundNumber((value / total) * 100, decimals);
}

/**
 * Parse formatted number string to number
 * @param str - Formatted number string
 */
export function parseFormattedNumber(str: string): number {
  return parseFloat(str.replace(/[^0-9.-]+/g, ''));
}

/**
 * Format traffic speed (bytes per second)
 * @param bytesPerSecond - Speed in bytes per second
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Convert bytes to megabytes
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 */
export function bytesToMB(bytes: number, decimals = 2): number {
  return roundNumber(bytes / (1024 * 1024), decimals);
}

/**
 * Convert bytes to gigabytes
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 */
export function bytesToGB(bytes: number, decimals = 2): number {
  return roundNumber(bytes / (1024 * 1024 * 1024), decimals);
}

/**
 * Convert megabytes to bytes
 * @param mb - Number of megabytes
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

/**
 * Convert gigabytes to bytes
 * @param gb - Number of gigabytes
 */
export function gbToBytes(gb: number): number {
  return gb * 1024 * 1024 * 1024;
}
