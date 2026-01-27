/**
 * VeeValidate Configuration for Admin Application
 */

import { defineRule, configure } from 'vee-validate';
import { localize } from '@vee-validate/i18n';
import en from '@vee-validate/i18n/dist/locale/en.json';
import zh from '@vee-validate/i18n/dist/locale/zh_CN.json';

// Import custom validation rules
import * as validationRules from '@xboard/shared/validation/rules';

/**
 * Register custom validation rules
 */
export function setupVeeValidate() {
  // Email validation
  defineRule('email', validationRules.isEmail);

  // Password validation
  defineRule('strong_password', validationRules.isStrongPassword);

  // Required validation
  defineRule('required', (value: any, [fieldName]: string[]) => {
    return validationRules.isRequired(fieldName || 'This field')(value);
  });

  // Length validation
  defineRule('min_length', (value: string, [min]: number[]) => {
    return validationRules.minLength(min)(value);
  });

  defineRule('max_length', (value: string, [max]: number[]) => {
    return validationRules.maxLength(max)(value);
  });

  // Number validation
  defineRule('number', validationRules.isNumber);
  defineRule('positive', validationRules.isPositive);

  defineRule('min_value', (value: any, [min]: number[]) => {
    return validationRules.minValue(min)(value);
  });

  defineRule('max_value', (value: any, [max]: number[]) => {
    return validationRules.maxValue(max)(value);
  });

  // URL validation
  defineRule('url', validationRules.isUrl);

  // IP and Port validation
  defineRule('ip_address', validationRules.isIpAddress);
  defineRule('port', validationRules.isPort);

  // One of validation
  defineRule('one_of', (value: any, allowedValues: any[]) => {
    return validationRules.isOneOf(allowedValues)(value);
  });

  // JSON validation
  defineRule('json', validationRules.isJson);

  // Alphanumeric validation
  defineRule('alphanumeric', validationRules.isAlphanumeric);

  // No whitespace validation
  defineRule('no_whitespace', validationRules.noWhitespace);

  // Array validation
  defineRule('min_items', (value: any[], [min]: number[]) => {
    return validationRules.minItems(min)(value);
  });

  defineRule('max_items', (value: any[], [max]: number[]) => {
    return validationRules.maxItems(max)(value);
  });

  // Confirmed validation (for password confirmation)
  defineRule('confirmed', (value: any, [target]: any[]) => {
    if (value === target) {
      return true;
    }
    return 'The fields do not match';
  });

  /**
   * Configure VeeValidate
   */
  configure({
    // Generate error messages with localization
    generateMessage: localize({
      en: {
        ...en,
        messages: {
          ...en.messages,
          email: 'Please enter a valid email address',
          strong_password: 'Password must be at least 8 characters',
          required: '{field} is required',
          min_length: '{field} must be at least {min} characters',
          max_length: '{field} must not exceed {max} characters',
          number: '{field} must be a number',
          positive: '{field} must be a positive number',
          min_value: '{field} must be at least {min}',
          max_value: '{field} must not exceed {max}',
          url: 'Please enter a valid URL',
          ip_address: 'Please enter a valid IP address',
          port: 'Port must be between 1 and 65535',
          one_of: '{field} must be one of the allowed values',
          json: '{field} must be valid JSON',
          alphanumeric: '{field} must contain only letters and numbers',
          no_whitespace: '{field} must not contain whitespace',
          min_items: '{field} must have at least {min} item(s)',
          max_items: '{field} must not exceed {max} item(s)',
          confirmed: 'The fields do not match',
        },
      },
      zh: {
        ...zh,
        messages: {
          ...zh.messages,
          email: '请输入有效的电子邮件地址',
          strong_password: '密码必须至少8个字符',
          required: '{field}是必填项',
          min_length: '{field}必须至少{min}个字符',
          max_length: '{field}不能超过{max}个字符',
          number: '{field}必须是数字',
          positive: '{field}必须是正数',
          min_value: '{field}必须至少为{min}',
          max_value: '{field}不能超过{max}',
          url: '请输入有效的URL',
          ip_address: '请输入有效的IP地址',
          port: '端口必须在1到65535之间',
          one_of: '{field}必须是允许的值之一',
          json: '{field}必须是有效的JSON',
          alphanumeric: '{field}只能包含字母和数字',
          no_whitespace: '{field}不能包含空格',
          min_items: '{field}必须至少有{min}项',
          max_items: '{field}不能超过{max}项',
          confirmed: '字段不匹配',
        },
      },
    }),
    // Validation triggers
    validateOnBlur: true,
    validateOnChange: true,
    validateOnInput: false,
    validateOnModelUpdate: true,
  });
}
