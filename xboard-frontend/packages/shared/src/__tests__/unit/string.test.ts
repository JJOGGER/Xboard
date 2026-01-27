/**
 * Unit tests for string utilities
 * Tests string manipulation and formatting functions
 */

import { describe, it, expect } from 'vitest';
import {
  truncate,
  capitalize,
  capitalizeWords,
  toKebabCase,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  stripHtml,
  escapeHtml,
  randomString,
  isEmpty,
  pluralize,
  maskString,
  extractEmailDomain,
  formatEmail,
  slugify,
  highlightText,
} from '@/utils/string';

describe('String Utilities', () => {
  describe('truncate', () => {
    it('should truncate long strings', () => {
      const result = truncate('Hello World', 8);
      expect(result).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      const result = truncate('Hello', 10);
      expect(result).toBe('Hello');
    });

    it('should use custom suffix', () => {
      const result = truncate('Hello World', 8, '…');
      expect(result).toBe('Hello W…');
    });

    it('should handle empty string', () => {
      const result = truncate('', 5);
      expect(result).toBe('');
    });

    it('should handle exact length', () => {
      const result = truncate('Hello', 5);
      expect(result).toBe('Hello');
    });

    it('should handle very short length', () => {
      const result = truncate('Hello World', 3);
      expect(result).toBe('...');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('h')).toBe('H');
    });

    it('should not affect rest of string', () => {
      expect(capitalize('hELLO')).toBe('HELLO');
    });
  });

  describe('capitalizeWords', () => {
    it('should capitalize each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(capitalizeWords('hello')).toBe('Hello');
    });

    it('should handle multiple spaces', () => {
      expect(capitalizeWords('hello  world')).toBe('Hello  World');
    });

    it('should handle already capitalized', () => {
      expect(capitalizeWords('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(capitalizeWords('')).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('should convert spaces to hyphens', () => {
      expect(toKebabCase('hello world')).toBe('hello-world');
    });

    it('should convert underscores to hyphens', () => {
      expect(toKebabCase('hello_world')).toBe('hello-world');
    });

    it('should handle already kebab-case', () => {
      expect(toKebabCase('hello-world')).toBe('hello-world');
    });

    it('should handle multiple consecutive separators', () => {
      expect(toKebabCase('hello  world')).toBe('hello-world');
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
    });

    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });

    it('should convert spaces to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
    });

    it('should handle PascalCase input', () => {
      expect(toCamelCase('HelloWorld')).toBe('helloWorld');
    });

    it('should handle already camelCase', () => {
      expect(toCamelCase('helloWorld')).toBe('helloWorld');
    });

    it('should handle single word', () => {
      expect(toCamelCase('hello')).toBe('hello');
    });
  });

  describe('toPascalCase', () => {
    it('should convert kebab-case to PascalCase', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
    });

    it('should convert camelCase to PascalCase', () => {
      expect(toPascalCase('helloWorld')).toBe('HelloWorld');
    });

    it('should convert snake_case to PascalCase', () => {
      expect(toPascalCase('hello_world')).toBe('HelloWorld');
    });

    it('should handle already PascalCase', () => {
      expect(toPascalCase('HelloWorld')).toBe('HelloWorld');
    });

    it('should handle single word', () => {
      expect(toPascalCase('hello')).toBe('Hello');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
    });

    it('should convert PascalCase to snake_case', () => {
      expect(toSnakeCase('HelloWorld')).toBe('hello_world');
    });

    it('should convert kebab-case to snake_case', () => {
      expect(toSnakeCase('hello-world')).toBe('hello_world');
    });

    it('should convert spaces to underscores', () => {
      expect(toSnakeCase('hello world')).toBe('hello_world');
    });

    it('should handle already snake_case', () => {
      expect(toSnakeCase('hello_world')).toBe('hello_world');
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('should remove multiple tags', () => {
      expect(stripHtml('<div><p>Hello</p></div>')).toBe('Hello');
    });

    it('should handle self-closing tags', () => {
      expect(stripHtml('Hello<br/>World')).toBe('HelloWorld');
    });

    it('should handle tags with attributes', () => {
      expect(stripHtml('<a href="#">Link</a>')).toBe('Link');
    });

    it('should handle plain text', () => {
      expect(stripHtml('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape less than', () => {
      expect(escapeHtml('A < B')).toBe('A &lt; B');
    });

    it('should escape greater than', () => {
      expect(escapeHtml('A > B')).toBe('A &gt; B');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"Hello"')).toBe('&quot;Hello&quot;');
    });

    it('should escape apostrophes', () => {
      expect(escapeHtml("It's")).toBe('It&#39;s');
    });

    it('should escape multiple characters', () => {
      expect(escapeHtml('<div>"Hello"</div>')).toBe('&lt;div&gt;&quot;Hello&quot;&lt;/div&gt;');
    });

    it('should handle plain text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('randomString', () => {
    it('should generate string of specified length', () => {
      const result = randomString(10);
      expect(result).toHaveLength(10);
    });

    it('should use default charset', () => {
      const result = randomString(100);
      expect(/^[A-Za-z0-9]+$/.test(result)).toBe(true);
    });

    it('should use custom charset', () => {
      const result = randomString(10, 'ABC');
      expect(/^[ABC]+$/.test(result)).toBe(true);
    });

    it('should generate different strings', () => {
      const str1 = randomString(20);
      const str2 = randomString(20);
      expect(str1).not.toBe(str2);
    });

    it('should handle zero length', () => {
      const result = randomString(0);
      expect(result).toBe('');
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace only', () => {
      expect(isEmpty('   ')).toBe(true);
    });

    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('Hello')).toBe(false);
    });

    it('should return false for string with content and whitespace', () => {
      expect(isEmpty('  Hello  ')).toBe(false);
    });
  });

  describe('pluralize', () => {
    it('should return singular for count of 1', () => {
      expect(pluralize(1, 'item')).toBe('item');
    });

    it('should return plural for count of 0', () => {
      expect(pluralize(0, 'item')).toBe('items');
    });

    it('should return plural for count > 1', () => {
      expect(pluralize(5, 'item')).toBe('items');
    });

    it('should use custom plural form', () => {
      expect(pluralize(2, 'child', 'children')).toBe('children');
    });

    it('should handle irregular plurals', () => {
      expect(pluralize(3, 'person', 'people')).toBe('people');
    });
  });

  describe('maskString', () => {
    it('should mask middle of string', () => {
      const result = maskString('1234567890', 3, 3);
      expect(result).toBe('123****890');
    });

    it('should use custom mask character', () => {
      const result = maskString('1234567890', 3, 3, 'X');
      expect(result).toBe('123XXXX890');
    });

    it('should not mask short strings', () => {
      const result = maskString('12345', 3, 3);
      expect(result).toBe('12345');
    });

    it('should handle different visible lengths', () => {
      const result = maskString('1234567890', 2, 2);
      expect(result).toBe('12******90');
    });

    it('should handle zero visible characters', () => {
      const result = maskString('1234567890', 0, 0);
      expect(result).toBe('**********');
    });
  });

  describe('extractEmailDomain', () => {
    it('should extract domain from email', () => {
      expect(extractEmailDomain('user@example.com')).toBe('example.com');
    });

    it('should handle subdomain', () => {
      expect(extractEmailDomain('user@mail.example.com')).toBe('mail.example.com');
    });

    it('should return empty for invalid email', () => {
      expect(extractEmailDomain('invalid')).toBe('');
    });

    it('should handle multiple @ symbols', () => {
      expect(extractEmailDomain('user@@example.com')).toBe('');
    });
  });

  describe('formatEmail', () => {
    it('should mask email local part', () => {
      const result = formatEmail('username@example.com');
      expect(result).toMatch(/us\*+me@example\.com/);
    });

    it('should handle short local part', () => {
      const result = formatEmail('ab@example.com');
      expect(result).toBe('ab@example.com');
    });

    it('should return original for invalid email', () => {
      expect(formatEmail('invalid')).toBe('invalid');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(slugify('-Hello World-')).toBe('hello-world');
    });

    it('should handle underscores', () => {
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('should handle already slugified', () => {
      expect(slugify('hello-world')).toBe('hello-world');
    });
  });

  describe('highlightText', () => {
    it('should wrap search term in span', () => {
      const result = highlightText('Hello World', 'World');
      expect(result).toBe('Hello <span class="highlight">World</span>');
    });

    it('should be case insensitive', () => {
      const result = highlightText('Hello World', 'world');
      expect(result).toBe('Hello <span class="highlight">World</span>');
    });

    it('should use custom class name', () => {
      const result = highlightText('Hello World', 'World', 'custom');
      expect(result).toBe('Hello <span class="custom">World</span>');
    });

    it('should handle multiple occurrences', () => {
      const result = highlightText('Hello Hello', 'Hello');
      expect(result).toBe('<span class="highlight">Hello</span> <span class="highlight">Hello</span>');
    });

    it('should return original for empty term', () => {
      const result = highlightText('Hello World', '');
      expect(result).toBe('Hello World');
    });

    it('should handle no matches', () => {
      const result = highlightText('Hello World', 'xyz');
      expect(result).toBe('Hello World');
    });
  });
});
