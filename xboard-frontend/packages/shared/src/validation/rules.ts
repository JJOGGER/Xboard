/**
 * Reusable validation rules for VeeValidate
 * These can be used with VeeValidate's defineRule or as standalone validators
 */

/**
 * Validates email format
 */
export const isEmail = (value: string): boolean | string => {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) || 'Please enter a valid email address';
};

/**
 * Validates password strength
 * Minimum 8 characters
 */
export const isStrongPassword = (value: string): boolean | string => {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  return true;
};

/**
 * Validates that field is required
 */
export const isRequired = (fieldName: string) => (value: any): boolean | string => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName} is required`;
  }
  return true;
};

/**
 * Validates minimum length
 */
export const minLength = (min: number) => (value: string): boolean | string => {
  if (!value) return true; // Let required rule handle empty values
  return value.length >= min || `Must be at least ${min} characters`;
};

/**
 * Validates maximum length
 */
export const maxLength = (max: number) => (value: string): boolean | string => {
  if (!value) return true;
  return value.length <= max || `Must not exceed ${max} characters`;
};

/**
 * Validates that value is a number
 */
export const isNumber = (value: any): boolean | string => {
  if (value === null || value === undefined || value === '') return true;
  return !isNaN(Number(value)) || 'Must be a valid number';
};

/**
 * Validates that value is a positive number
 */
export const isPositive = (value: any): boolean | string => {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return (!isNaN(num) && num > 0) || 'Must be a positive number';
};

/**
 * Validates minimum value
 */
export const minValue = (min: number) => (value: any): boolean | string => {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return (!isNaN(num) && num >= min) || `Must be at least ${min}`;
};

/**
 * Validates maximum value
 */
export const maxValue = (max: number) => (value: any): boolean | string => {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return (!isNaN(num) && num <= max) || `Must not exceed ${max}`;
};

/**
 * Validates URL format
 */
export const isUrl = (value: string): boolean | string => {
  if (!value) return true; // Let required rule handle empty values
  try {
    new URL(value);
    return true;
  } catch {
    return 'Please enter a valid URL';
  }
};

/**
 * Validates that two fields match
 */
export const matches = (targetField: string, targetValue: any) => (value: any): boolean | string => {
  return value === targetValue || `Must match ${targetField}`;
};

/**
 * Validates IP address format (IPv4)
 */
export const isIpAddress = (value: string): boolean | string => {
  if (!value) return true;
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(value)) return 'Please enter a valid IP address';
  
  const parts = value.split('.');
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return 'Please enter a valid IP address';
  }
  
  return true;
};

/**
 * Validates port number
 */
export const isPort = (value: any): boolean | string => {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return (!isNaN(num) && num >= 1 && num <= 65535) || 'Port must be between 1 and 65535';
};

/**
 * Validates that value is one of allowed values
 */
export const isOneOf = (allowedValues: any[]) => (value: any): boolean | string => {
  if (value === null || value === undefined || value === '') return true;
  return allowedValues.includes(value) || `Must be one of: ${allowedValues.join(', ')}`;
};

/**
 * Validates JSON format
 */
export const isJson = (value: string): boolean | string => {
  if (!value) return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return 'Must be valid JSON';
  }
};

/**
 * Validates alphanumeric characters only
 */
export const isAlphanumeric = (value: string): boolean | string => {
  if (!value) return true;
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(value) || 'Must contain only letters and numbers';
};

/**
 * Validates that value contains no whitespace
 */
export const noWhitespace = (value: string): boolean | string => {
  if (!value) return true;
  return !/\s/.test(value) || 'Must not contain whitespace';
};

/**
 * Custom validator for invite codes
 */
export const isInviteCode = (value: string): boolean | string => {
  if (!value) return true;
  const inviteCodeRegex = /^[A-Z0-9]{6,12}$/;
  return inviteCodeRegex.test(value) || 'Invalid invite code format';
};

/**
 * Validates that array has minimum items
 */
export const minItems = (min: number) => (value: any[]): boolean | string => {
  if (!value) return true;
  return value.length >= min || `Must have at least ${min} item(s)`;
};

/**
 * Validates that array has maximum items
 */
export const maxItems = (max: number) => (value: any[]): boolean | string => {
  if (!value) return true;
  return value.length <= max || `Must not exceed ${max} item(s)`;
};

/**
 * Validates file size
 */
export const maxFileSize = (maxSizeInMB: number) => (file: File): boolean | string => {
  if (!file) return true;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes || `File size must not exceed ${maxSizeInMB}MB`;
};

/**
 * Validates file type
 */
export const allowedFileTypes = (types: string[]) => (file: File): boolean | string => {
  if (!file) return true;
  return types.includes(file.type) || `File type must be one of: ${types.join(', ')}`;
};
