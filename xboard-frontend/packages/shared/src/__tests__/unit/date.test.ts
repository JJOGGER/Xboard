/**
 * Unit tests for date utilities
 * Tests date formatting edge cases and various date operations
 */

import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatTime,
  formatRelativeTime,
  formatUnixTimestamp,
  getCurrentTimestamp,
  isExpired,
  getDaysUntilExpiration,
  formatDuration,
  parseDate,
  getStartOfDay,
  getEndOfDay,
  getDateRange,
} from '@/utils/date';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2024-01-15T10:30:45');
      const result = formatDate(date);
      expect(result).toMatch(/2024-01-15 \d{2}:\d{2}:\d{2}/);
    });

    it('should format date with custom format', () => {
      const date = new Date('2024-01-15T10:30:45');
      const result = formatDate(date, 'YYYY/MM/DD');
      expect(result).toBe('2024/01/15');
    });

    it('should handle string date input', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/2024-01-15/);
    });

    it('should handle timestamp input', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const result = formatDate(timestamp);
      expect(result).toMatch(/2024-01-15/);
    });

    it('should handle invalid date gracefully', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDateShort', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:45');
      const result = formatDateShort(date);
      expect(result).toBe('2024-01-15');
    });

    it('should handle single digit months and days', () => {
      const date = new Date('2024-03-05');
      const result = formatDateShort(date);
      expect(result).toBe('2024-03-05');
    });
  });

  describe('formatTime', () => {
    it('should format time to HH:mm:ss', () => {
      const date = new Date('2024-01-15T10:30:45');
      const result = formatTime(date);
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should handle midnight', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = formatTime(date);
      expect(result).toMatch(/00:00:00/);
    });

    it('should handle noon', () => {
      const date = new Date('2024-01-15T12:00:00');
      const result = formatTime(date);
      expect(result).toMatch(/12:00:00/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent date as relative time', () => {
      const now = new Date();
      const result = formatRelativeTime(now);
      expect(result).toMatch(/few seconds ago|a few seconds ago/);
    });

    it('should format past date correctly', () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = formatRelativeTime(pastDate);
      expect(result).toMatch(/hours? ago/);
    });
  });

  describe('formatUnixTimestamp', () => {
    it('should format unix timestamp with default format', () => {
      const timestamp = 1705315845; // 2024-01-15 10:30:45 UTC
      const result = formatUnixTimestamp(timestamp);
      expect(result).toMatch(/2024-01-15/);
    });

    it('should format unix timestamp with custom format', () => {
      const timestamp = 1705315845;
      const result = formatUnixTimestamp(timestamp, 'YYYY/MM/DD');
      expect(result).toBe('2024/01/15');
    });

    it('should handle zero timestamp', () => {
      const result = formatUnixTimestamp(0);
      expect(result).toMatch(/1970-01-01/);
    });

    it('should handle negative timestamp', () => {
      const result = formatUnixTimestamp(-86400); // 1 day before epoch
      expect(result).toMatch(/1969-12-31/);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return current timestamp in seconds', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = getCurrentTimestamp();
      const after = Math.floor(Date.now() / 1000);
      
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('should return integer value', () => {
      const result = getCurrentTimestamp();
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('should return true for past timestamp', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(isExpired(pastTimestamp)).toBe(true);
    });

    it('should return false for future timestamp', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(isExpired(futureTimestamp)).toBe(false);
    });

    it('should handle current timestamp edge case', () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const result = isExpired(currentTimestamp);
      // Could be true or false depending on exact timing
      expect(typeof result).toBe('boolean');
    });

    it('should return true for zero timestamp', () => {
      expect(isExpired(0)).toBe(true);
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should calculate positive days for future date', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 7 * 86400; // 7 days from now
      const result = getDaysUntilExpiration(futureTimestamp);
      expect(result).toBeGreaterThanOrEqual(6);
      expect(result).toBeLessThanOrEqual(8);
    });

    it('should calculate negative days for past date', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3 * 86400; // 3 days ago
      const result = getDaysUntilExpiration(pastTimestamp);
      expect(result).toBeLessThan(0);
    });

    it('should handle same day', () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const result = getDaysUntilExpiration(currentTimestamp);
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should round up partial days', () => {
      const timestamp = Math.floor(Date.now() / 1000) + 43200; // 12 hours from now
      const result = getDaysUntilExpiration(timestamp);
      expect(result).toBe(1); // Should round up to 1 day
    });
  });

  describe('formatDuration', () => {
    it('should format zero seconds', () => {
      expect(formatDuration(0)).toBe('0m');
    });

    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('0m');
    });

    it('should format minutes only', () => {
      expect(formatDuration(300)).toBe('5m');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3900)).toBe('1h 5m');
    });

    it('should format days, hours, and minutes', () => {
      expect(formatDuration(90000)).toBe('1d 1h');
    });

    it('should format days only', () => {
      expect(formatDuration(86400)).toBe('1d');
    });

    it('should format large durations', () => {
      const result = formatDuration(259200); // 3 days
      expect(result).toBe('3d');
    });

    it('should handle negative duration', () => {
      const result = formatDuration(-3600);
      expect(result).toBe('0m');
    });
  });

  describe('parseDate', () => {
    it('should parse ISO date string', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
    });

    it('should parse date with custom format', () => {
      const result = parseDate('15/01/2024', 'DD/MM/YYYY');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should handle invalid date string', () => {
      const result = parseDate('invalid');
      expect(result.toString()).toBe('Invalid Date');
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day for given date', () => {
      const date = new Date('2024-01-15T15:30:45');
      const result = getStartOfDay(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return start of current day when no date provided', () => {
      const result = getStartOfDay();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day for given date', () => {
      const date = new Date('2024-01-15T10:30:45');
      const result = getEndOfDay(date);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });

    it('should return end of current day when no date provided', () => {
      const result = getEndOfDay();
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe('getDateRange', () => {
    it('should return today range', () => {
      const { start, end } = getDateRange('today');
      expect(start.getHours()).toBe(0);
      expect(end.getHours()).toBe(23);
      expect(start.getDate()).toBe(end.getDate());
    });

    it('should return yesterday range', () => {
      const { start, end } = getDateRange('yesterday');
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(start.getDate()).toBe(yesterday.getDate());
      expect(end.getDate()).toBe(yesterday.getDate());
    });

    it('should return week range', () => {
      const { start, end } = getDateRange('week');
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });

    it('should return month range', () => {
      const { start, end } = getDateRange('month');
      expect(start.getDate()).toBe(1); // First day of month
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });

    it('should return year range', () => {
      const { start, end } = getDateRange('year');
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(11); // December
    });
  });
});
