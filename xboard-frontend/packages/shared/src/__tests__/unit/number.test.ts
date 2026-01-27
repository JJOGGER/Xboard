/**
 * Unit tests for number utilities
 * Tests number formatting with various inputs and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatBytes,
  formatNumber,
  formatPercentage,
  formatCompactNumber,
  roundNumber,
  clamp,
  calculatePercentage,
  parseFormattedNumber,
  formatSpeed,
  bytesToMB,
  bytesToGB,
  mbToBytes,
  gbToBytes,
} from '@/utils/number';

describe('Number Utilities', () => {
  describe('formatCurrency', () => {
    it('should format USD currency by default', () => {
      const result = formatCurrency(1234.56);
      expect(result).toMatch(/\$1,234\.56/);
    });

    it('should format with different currency', () => {
      const result = formatCurrency(1234.56, 'EUR');
      expect(result).toMatch(/1,234\.56/);
      expect(result).toMatch(/€|EUR/);
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/\$0\.00/);
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-1234.56);
      expect(result).toMatch(/-?\$1,234\.56/);
    });

    it('should handle large amounts', () => {
      const result = formatCurrency(1234567.89);
      expect(result).toMatch(/\$1,234,567\.89/);
    });

    it('should handle decimal precision', () => {
      const result = formatCurrency(10.5);
      expect(result).toMatch(/\$10\.50/);
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should format terabytes', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should handle decimal values', () => {
      const result = formatBytes(1536);
      expect(result).toBe('1.5 KB');
    });

    it('should respect decimal places parameter', () => {
      const result = formatBytes(1536, 0);
      expect(result).toBe('2 KB');
    });

    it('should handle large values', () => {
      const result = formatBytes(1234567890);
      expect(result).toMatch(/1\.15 GB/);
    });

    it('should handle negative decimals parameter', () => {
      const result = formatBytes(1536, -1);
      expect(result).toBe('2 KB');
    });
  });

  describe('formatNumber', () => {
    it('should format number with thousand separators', () => {
      expect(formatNumber(1234567)).toMatch(/1,234,567/);
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234);
      expect(result).toMatch(/-1,234/);
    });

    it('should handle decimal numbers', () => {
      const result = formatNumber(1234.56);
      expect(result).toMatch(/1,234\.56/);
    });

    it('should handle small numbers', () => {
      expect(formatNumber(42)).toBe('42');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal percentage', () => {
      expect(formatPercentage(0.75)).toBe('75%');
    });

    it('should format with decimal places', () => {
      expect(formatPercentage(0.7567, 2)).toBe('75.67%');
    });

    it('should handle non-decimal percentage', () => {
      expect(formatPercentage(75, 0, false)).toBe('75%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0%');
    });

    it('should handle 100%', () => {
      expect(formatPercentage(1)).toBe('100%');
    });

    it('should handle values over 100%', () => {
      expect(formatPercentage(1.5)).toBe('150%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-0.25)).toBe('-25%');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format small numbers normally', () => {
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('should format thousands', () => {
      const result = formatCompactNumber(1500);
      expect(result).toMatch(/1\.5K|1.5K/);
    });

    it('should format millions', () => {
      const result = formatCompactNumber(2500000);
      expect(result).toMatch(/2\.5M|2.5M/);
    });

    it('should format billions', () => {
      const result = formatCompactNumber(3500000000);
      expect(result).toMatch(/3\.5B|3.5B/);
    });

    it('should handle zero', () => {
      expect(formatCompactNumber(0)).toBe('0');
    });
  });

  describe('roundNumber', () => {
    it('should round to 2 decimal places by default', () => {
      expect(roundNumber(3.14159)).toBe(3.14);
    });

    it('should round to specified decimal places', () => {
      expect(roundNumber(3.14159, 3)).toBe(3.142);
    });

    it('should round to integer', () => {
      expect(roundNumber(3.7, 0)).toBe(4);
    });

    it('should handle negative numbers', () => {
      expect(roundNumber(-3.14159, 2)).toBe(-3.14);
    });

    it('should handle zero', () => {
      expect(roundNumber(0)).toBe(0);
    });

    it('should handle rounding up', () => {
      expect(roundNumber(1.555, 2)).toBe(1.56);
    });

    it('should handle rounding down', () => {
      expect(roundNumber(1.554, 2)).toBe(1.55);
    });
  });

  describe('clamp', () => {
    it('should return value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should clamp to minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should clamp to maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
    });

    it('should handle value at boundaries', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('should handle zero value', () => {
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('should respect decimal places', () => {
      expect(calculatePercentage(1, 3, 2)).toBe(33.33);
    });

    it('should handle values over 100%', () => {
      expect(calculatePercentage(150, 100)).toBe(150);
    });

    it('should handle decimal values', () => {
      expect(calculatePercentage(33.33, 100, 2)).toBe(33.33);
    });
  });

  describe('parseFormattedNumber', () => {
    it('should parse currency string', () => {
      expect(parseFormattedNumber('$1,234.56')).toBe(1234.56);
    });

    it('should parse number with commas', () => {
      expect(parseFormattedNumber('1,234,567')).toBe(1234567);
    });

    it('should parse negative numbers', () => {
      expect(parseFormattedNumber('-$1,234.56')).toBe(-1234.56);
    });

    it('should parse plain numbers', () => {
      expect(parseFormattedNumber('1234')).toBe(1234);
    });

    it('should handle decimal numbers', () => {
      expect(parseFormattedNumber('123.45')).toBe(123.45);
    });

    it('should handle numbers with spaces', () => {
      expect(parseFormattedNumber('1 234.56')).toBe(1234.56);
    });
  });

  describe('formatSpeed', () => {
    it('should format bytes per second', () => {
      expect(formatSpeed(1024)).toBe('1 KB/s');
    });

    it('should format megabytes per second', () => {
      expect(formatSpeed(1048576)).toBe('1 MB/s');
    });

    it('should format zero speed', () => {
      expect(formatSpeed(0)).toBe('0 Bytes/s');
    });

    it('should format large speeds', () => {
      const result = formatSpeed(1073741824);
      expect(result).toBe('1 GB/s');
    });
  });

  describe('bytesToMB', () => {
    it('should convert bytes to megabytes', () => {
      expect(bytesToMB(1048576)).toBe(1);
    });

    it('should handle zero bytes', () => {
      expect(bytesToMB(0)).toBe(0);
    });

    it('should respect decimal places', () => {
      expect(bytesToMB(1572864, 2)).toBe(1.5);
    });

    it('should handle large values', () => {
      expect(bytesToMB(10485760)).toBe(10);
    });

    it('should handle small values', () => {
      expect(bytesToMB(524288, 2)).toBe(0.5);
    });
  });

  describe('bytesToGB', () => {
    it('should convert bytes to gigabytes', () => {
      expect(bytesToGB(1073741824)).toBe(1);
    });

    it('should handle zero bytes', () => {
      expect(bytesToGB(0)).toBe(0);
    });

    it('should respect decimal places', () => {
      expect(bytesToGB(1610612736, 2)).toBe(1.5);
    });

    it('should handle large values', () => {
      expect(bytesToGB(10737418240)).toBe(10);
    });

    it('should handle small values', () => {
      expect(bytesToGB(536870912, 2)).toBe(0.5);
    });
  });

  describe('mbToBytes', () => {
    it('should convert megabytes to bytes', () => {
      expect(mbToBytes(1)).toBe(1048576);
    });

    it('should handle zero', () => {
      expect(mbToBytes(0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(mbToBytes(1.5)).toBe(1572864);
    });

    it('should handle large values', () => {
      expect(mbToBytes(1024)).toBe(1073741824);
    });
  });

  describe('gbToBytes', () => {
    it('should convert gigabytes to bytes', () => {
      expect(gbToBytes(1)).toBe(1073741824);
    });

    it('should handle zero', () => {
      expect(gbToBytes(0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(gbToBytes(1.5)).toBe(1610612736);
    });

    it('should handle large values', () => {
      expect(gbToBytes(10)).toBe(10737418240);
    });
  });
});
