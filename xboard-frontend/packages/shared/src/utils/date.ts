/**
 * Date Utilities
 * Date formatting and manipulation using Day.js
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Extend dayjs with plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/**
 * Format date to standard format (YYYY-MM-DD HH:mm:ss)
 */
export function formatDate(date: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(format);
}

/**
 * Format date to short format (YYYY-MM-DD)
 */
export function formatDateShort(date: string | number | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Format date to time only (HH:mm:ss)
 */
export function formatTime(date: string | number | Date): string {
  return dayjs(date).format('HH:mm:ss');
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | number | Date): string {
  return dayjs(date).fromNow();
}

/**
 * Format Unix timestamp to date string
 */
export function formatUnixTimestamp(timestamp: number, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs.unix(timestamp).format(format);
}

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Check if date is expired
 */
export function isExpired(timestamp: number): boolean {
  return timestamp < getCurrentTimestamp();
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(timestamp: number): number {
  const now = getCurrentTimestamp();
  const diff = timestamp - now;
  return Math.ceil(diff / 86400); // 86400 seconds in a day
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '0m';
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString: string, format?: string): Date {
  if (format) {
    return dayjs(dateString, format).toDate();
  }
  return dayjs(dateString).toDate();
}

/**
 * Get start of day
 */
export function getStartOfDay(date?: string | number | Date): Date {
  return dayjs(date).startOf('day').toDate();
}

/**
 * Get end of day
 */
export function getEndOfDay(date?: string | number | Date): Date {
  return dayjs(date).endOf('day').toDate();
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: 'today' | 'yesterday' | 'week' | 'month' | 'year'): {
  start: Date;
  end: Date;
} {
  const now = dayjs();
  
  switch (period) {
    case 'today':
      return {
        start: now.startOf('day').toDate(),
        end: now.endOf('day').toDate(),
      };
    case 'yesterday':
      return {
        start: now.subtract(1, 'day').startOf('day').toDate(),
        end: now.subtract(1, 'day').endOf('day').toDate(),
      };
    case 'week':
      return {
        start: now.startOf('week').toDate(),
        end: now.endOf('week').toDate(),
      };
    case 'month':
      return {
        start: now.startOf('month').toDate(),
        end: now.endOf('month').toDate(),
      };
    case 'year':
      return {
        start: now.startOf('year').toDate(),
        end: now.endOf('year').toDate(),
      };
  }
}
