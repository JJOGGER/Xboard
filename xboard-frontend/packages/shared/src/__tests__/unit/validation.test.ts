/**
 * Unit tests for validation utilities
 * Tests validation helpers with various inputs and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUrl,
  isValidPassword,
  isStrongPassword,
  isValidPhone,
  isValidIPv4,
  isValidPort,
  isValidDomain,
  isNumeric,
  isInteger,
  isPositive,
  isInRange,
  isRequired,
  hasMinLength,
  hasMaxLength,
  isValidCreditCard,
  isValidDateFormat,
  isValidJSON,
} from '@/utils/validation';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('should validate email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should validate email with plus sign', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should validate email with dots', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should reject email without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate HTTP URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should validate HTTPS URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should validate URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should validate URL with query params', () => {
      expect(isValidUrl('https://example.com?key=value')).toBe(true);
    });

    it('should validate URL with port', () => {
      expect(isValidUrl('https://example.com:8080')).toBe(true);
    });

    it('should reject URL without protocol', () => {
      expect(isValidUrl('example.com')).toBe(false);
    });

    it('should reject invalid URL', () => {
      expect(isValidUrl('not a url')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate password meeting minimum length', () => {
      expect(isValidPassword('password123')).toBe(true);
    });

    it('should validate password with custom minimum length', () => {
      expect(isValidPassword('pass', 4)).toBe(true);
    });

    it('should reject password below minimum length', () => {
      expect(isValidPassword('short')).toBe(false);
    });

    it('should reject empty password', () => {
      expect(isValidPassword('')).toBe(false);
    });

    it('should validate exactly minimum length', () => {
      expect(isValidPassword('12345678')).toBe(true);
    });
  });

  describe('isStrongPassword', () => {
    it('should validate strong password', () => {
      const result = isStrongPassword('Password123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without lowercase', () => {
      const result = isStrongPassword('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase', () => {
      const result = isStrongPassword('password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = isStrongPassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = isStrongPassword('Password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject short password', () => {
      const result = isStrongPassword('Pass1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return multiple errors', () => {
      const result = isStrongPassword('pass');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('isValidPhone', () => {
    it('should validate basic phone number', () => {
      expect(isValidPhone('1234567890')).toBe(true);
    });

    it('should validate phone with country code', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
    });

    it('should validate phone with hyphens', () => {
      expect(isValidPhone('123-456-7890')).toBe(true);
    });

    it('should validate phone with spaces', () => {
      expect(isValidPhone('123 456 7890')).toBe(true);
    });

    it('should validate phone with parentheses', () => {
      expect(isValidPhone('(123) 456-7890')).toBe(true);
    });

    it('should reject letters', () => {
      expect(isValidPhone('abc-def-ghij')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('isValidIPv4', () => {
    it('should validate correct IPv4', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
    });

    it('should validate localhost', () => {
      expect(isValidIPv4('127.0.0.1')).toBe(true);
    });

    it('should validate zero IP', () => {
      expect(isValidIPv4('0.0.0.0')).toBe(true);
    });

    it('should validate max IP', () => {
      expect(isValidIPv4('255.255.255.255')).toBe(true);
    });

    it('should reject IP with value > 255', () => {
      expect(isValidIPv4('256.1.1.1')).toBe(false);
    });

    it('should reject IP with missing octet', () => {
      expect(isValidIPv4('192.168.1')).toBe(false);
    });

    it('should reject IP with extra octet', () => {
      expect(isValidIPv4('192.168.1.1.1')).toBe(false);
    });

    it('should reject non-numeric IP', () => {
      expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidIPv4('')).toBe(false);
    });
  });

  describe('isValidPort', () => {
    it('should validate port 80', () => {
      expect(isValidPort(80)).toBe(true);
    });

    it('should validate port 443', () => {
      expect(isValidPort(443)).toBe(true);
    });

    it('should validate port 8080', () => {
      expect(isValidPort(8080)).toBe(true);
    });

    it('should validate port as string', () => {
      expect(isValidPort('8080')).toBe(true);
    });

    it('should validate minimum port', () => {
      expect(isValidPort(1)).toBe(true);
    });

    it('should validate maximum port', () => {
      expect(isValidPort(65535)).toBe(true);
    });

    it('should reject port 0', () => {
      expect(isValidPort(0)).toBe(false);
    });

    it('should reject port > 65535', () => {
      expect(isValidPort(65536)).toBe(false);
    });

    it('should reject negative port', () => {
      expect(isValidPort(-1)).toBe(false);
    });

    it('should reject non-numeric string', () => {
      expect(isValidPort('abc')).toBe(false);
    });
  });

  describe('isValidDomain', () => {
    it('should validate simple domain', () => {
      expect(isValidDomain('example.com')).toBe(true);
    });

    it('should validate subdomain', () => {
      expect(isValidDomain('www.example.com')).toBe(true);
    });

    it('should validate multiple subdomains', () => {
      expect(isValidDomain('mail.server.example.com')).toBe(true);
    });

    it('should validate domain with hyphens', () => {
      expect(isValidDomain('my-domain.com')).toBe(true);
    });

    it('should reject domain without TLD', () => {
      expect(isValidDomain('example')).toBe(false);
    });

    it('should reject domain with spaces', () => {
      expect(isValidDomain('example .com')).toBe(false);
    });

    it('should reject domain starting with hyphen', () => {
      expect(isValidDomain('-example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidDomain('')).toBe(false);
    });
  });

  describe('isNumeric', () => {
    it('should validate integer', () => {
      expect(isNumeric(42)).toBe(true);
    });

    it('should validate decimal', () => {
      expect(isNumeric(3.14)).toBe(true);
    });

    it('should validate negative number', () => {
      expect(isNumeric(-10)).toBe(true);
    });

    it('should validate zero', () => {
      expect(isNumeric(0)).toBe(true);
    });

    it('should validate numeric string', () => {
      expect(isNumeric('42')).toBe(true);
    });

    it('should reject non-numeric string', () => {
      expect(isNumeric('abc')).toBe(false);
    });

    it('should reject NaN', () => {
      expect(isNumeric(NaN)).toBe(false);
    });

    it('should reject Infinity', () => {
      expect(isNumeric(Infinity)).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('should validate integer', () => {
      expect(isInteger(42)).toBe(true);
    });

    it('should validate zero', () => {
      expect(isInteger(0)).toBe(true);
    });

    it('should validate negative integer', () => {
      expect(isInteger(-10)).toBe(true);
    });

    it('should validate integer string', () => {
      expect(isInteger('42')).toBe(true);
    });

    it('should reject decimal', () => {
      expect(isInteger(3.14)).toBe(false);
    });

    it('should reject non-numeric', () => {
      expect(isInteger('abc')).toBe(false);
    });
  });

  describe('isPositive', () => {
    it('should validate positive number', () => {
      expect(isPositive(42)).toBe(true);
    });

    it('should validate decimal', () => {
      expect(isPositive(3.14)).toBe(true);
    });

    it('should reject zero', () => {
      expect(isPositive(0)).toBe(false);
    });

    it('should reject negative number', () => {
      expect(isPositive(-10)).toBe(false);
    });

    it('should reject non-numeric', () => {
      expect(isPositive('abc' as any)).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should validate value in range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
    });

    it('should validate minimum boundary', () => {
      expect(isInRange(0, 0, 10)).toBe(true);
    });

    it('should validate maximum boundary', () => {
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    it('should reject value below range', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
    });

    it('should reject value above range', () => {
      expect(isInRange(11, 0, 10)).toBe(false);
    });

    it('should handle negative ranges', () => {
      expect(isInRange(-5, -10, 0)).toBe(true);
    });

    it('should reject non-numeric', () => {
      expect(isInRange('abc' as any, 0, 10)).toBe(false);
    });
  });

  describe('isRequired', () => {
    it('should validate non-empty string', () => {
      expect(isRequired('hello')).toBe(true);
    });

    it('should validate non-empty array', () => {
      expect(isRequired([1, 2, 3])).toBe(true);
    });

    it('should validate number', () => {
      expect(isRequired(42)).toBe(true);
    });

    it('should validate zero', () => {
      expect(isRequired(0)).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isRequired('')).toBe(false);
    });

    it('should reject whitespace only', () => {
      expect(isRequired('   ')).toBe(false);
    });

    it('should reject empty array', () => {
      expect(isRequired([])).toBe(false);
    });

    it('should reject null', () => {
      expect(isRequired(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isRequired(undefined)).toBe(false);
    });
  });

  describe('hasMinLength', () => {
    it('should validate string meeting minimum', () => {
      expect(hasMinLength('hello', 3)).toBe(true);
    });

    it('should validate array meeting minimum', () => {
      expect(hasMinLength([1, 2, 3], 2)).toBe(true);
    });

    it('should validate exact minimum length', () => {
      expect(hasMinLength('hello', 5)).toBe(true);
    });

    it('should reject string below minimum', () => {
      expect(hasMinLength('hi', 3)).toBe(false);
    });

    it('should reject array below minimum', () => {
      expect(hasMinLength([1], 2)).toBe(false);
    });

    it('should handle zero minimum', () => {
      expect(hasMinLength('', 0)).toBe(true);
    });
  });

  describe('hasMaxLength', () => {
    it('should validate string within maximum', () => {
      expect(hasMaxLength('hello', 10)).toBe(true);
    });

    it('should validate array within maximum', () => {
      expect(hasMaxLength([1, 2], 5)).toBe(true);
    });

    it('should validate exact maximum length', () => {
      expect(hasMaxLength('hello', 5)).toBe(true);
    });

    it('should reject string exceeding maximum', () => {
      expect(hasMaxLength('hello world', 5)).toBe(false);
    });

    it('should reject array exceeding maximum', () => {
      expect(hasMaxLength([1, 2, 3], 2)).toBe(false);
    });
  });

  describe('isValidCreditCard', () => {
    it('should validate valid credit card (Visa)', () => {
      expect(isValidCreditCard('4532015112830366')).toBe(true);
    });

    it('should validate valid credit card (Mastercard)', () => {
      expect(isValidCreditCard('5425233430109903')).toBe(true);
    });

    it('should handle credit card with spaces', () => {
      expect(isValidCreditCard('4532 0151 1283 0366')).toBe(true);
    });

    it('should handle credit card with hyphens', () => {
      expect(isValidCreditCard('4532-0151-1283-0366')).toBe(true);
    });

    it('should reject invalid checksum', () => {
      expect(isValidCreditCard('4532015112830367')).toBe(false);
    });

    it('should reject too short number', () => {
      expect(isValidCreditCard('123456789012')).toBe(false);
    });

    it('should reject too long number', () => {
      expect(isValidCreditCard('12345678901234567890')).toBe(false);
    });

    it('should reject non-numeric', () => {
      expect(isValidCreditCard('abcd-efgh-ijkl-mnop')).toBe(false);
    });
  });

  describe('isValidDateFormat', () => {
    it('should validate correct date format', () => {
      expect(isValidDateFormat('2024-01-15')).toBe(true);
    });

    it('should validate leap year date', () => {
      expect(isValidDateFormat('2024-02-29')).toBe(true);
    });

    it('should reject invalid date format', () => {
      expect(isValidDateFormat('15-01-2024')).toBe(false);
    });

    it('should reject invalid month', () => {
      expect(isValidDateFormat('2024-13-01')).toBe(false);
    });

    it('should reject invalid day', () => {
      expect(isValidDateFormat('2024-01-32')).toBe(false);
    });

    it('should reject non-leap year Feb 29', () => {
      expect(isValidDateFormat('2023-02-29')).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(isValidDateFormat('2024/01/15')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidDateFormat('')).toBe(false);
    });
  });

  describe('isValidJSON', () => {
    it('should validate valid JSON object', () => {
      expect(isValidJSON('{"key": "value"}')).toBe(true);
    });

    it('should validate valid JSON array', () => {
      expect(isValidJSON('[1, 2, 3]')).toBe(true);
    });

    it('should validate JSON with nested objects', () => {
      expect(isValidJSON('{"nested": {"key": "value"}}')).toBe(true);
    });

    it('should validate JSON primitives', () => {
      expect(isValidJSON('42')).toBe(true);
      expect(isValidJSON('"string"')).toBe(true);
      expect(isValidJSON('true')).toBe(true);
      expect(isValidJSON('null')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(isValidJSON('{key: value}')).toBe(false);
    });

    it('should reject malformed JSON', () => {
      expect(isValidJSON('{"key": "value"')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidJSON('')).toBe(false);
    });

    it('should reject plain text', () => {
      expect(isValidJSON('not json')).toBe(false);
    });
  });
});
