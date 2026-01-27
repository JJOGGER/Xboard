import * as yup from 'yup';

/**
 * Common validation schemas using Yup
 * These schemas can be reused across admin and user applications
 */

// Email validation
export const emailSchema = yup
  .string()
  .trim()
  .required('Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must not exceed 255 characters');

// Password validation
export const passwordSchema = yup
  .string()
  .trim()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(255, 'Password must not exceed 255 characters');

// Password confirmation validation
export const passwordConfirmationSchema = (passwordField = 'password') =>
  yup
    .string()
    .trim()
    .required('Password confirmation is required')
    .test(
      'passwords-match',
      'Passwords must match',
      function (value) {
        // Only check if passwords match after confirming the field is not empty
        // This ensures "required" error takes precedence over "match" error
        if (!value || value.trim() === '') {
          return true; // Let .required() handle empty values
        }
        return value === this.parent[passwordField];
      }
    );

// Required string validation
export const requiredStringSchema = (fieldName: string, maxLength = 255) =>
  yup
    .string()
    .trim()
    .required(`${fieldName} is required`)
    .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`);

// Optional string validation
export const optionalStringSchema = (maxLength = 255) =>
  yup.string().max(maxLength, `Must not exceed ${maxLength} characters`);

// Number validation
export const numberSchema = (fieldName: string, min?: number, max?: number) => {
  let schema = yup
    .number()
    .required(`${fieldName} is required`)
    .typeError(`${fieldName} must be a number`);

  if (min !== undefined) {
    schema = schema.min(min, `${fieldName} must be at least ${min}`);
  }

  if (max !== undefined) {
    schema = schema.max(max, `${fieldName} must not exceed ${max}`);
  }

  return schema;
};

// Positive number validation
export const positiveNumberSchema = (fieldName: string) =>
  yup
    .number()
    .required(`${fieldName} is required`)
    .positive(`${fieldName} must be a positive number`)
    .typeError(`${fieldName} must be a number`);

// Optional positive number validation
export const optionalPositiveNumberSchema = () =>
  yup
    .number()
    .nullable()
    .positive('Must be a positive number')
    .typeError('Must be a number');

// URL validation
export const urlSchema = (fieldName: string) =>
  yup
    .string()
    .trim()
    .required(`${fieldName} is required`)
    .url(`${fieldName} must be a valid URL`)
    .max(2048, `${fieldName} must not exceed 2048 characters`);

// Optional URL validation
export const optionalUrlSchema = () =>
  yup
    .string()
    .url('Must be a valid URL')
    .max(2048, 'Must not exceed 2048 characters');

// Date validation
export const dateSchema = (fieldName: string) =>
  yup
    .date()
    .required(`${fieldName} is required`)
    .typeError(`${fieldName} must be a valid date`);

// Array validation
export const arraySchema = (fieldName: string, minItems = 1) =>
  yup
    .array()
    .required(`${fieldName} is required`)
    .min(minItems, `${fieldName} must have at least ${minItems} item(s)`);

// Boolean validation
export const booleanSchema = (fieldName: string) =>
  yup
    .boolean()
    .required(`${fieldName} is required`)
    .typeError(`${fieldName} must be true or false`);

// Login schema
export const loginSchema = yup.object({
  email: emailSchema,
  password: passwordSchema,
});

// Registration schema
export const registrationSchema = yup.object({
  email: emailSchema,
  password: passwordSchema,
  password_confirmation: passwordConfirmationSchema(),
  invite_code: yup.string().max(50, 'Invite code must not exceed 50 characters'),
});

// Change password schema
export const changePasswordSchema = yup.object({
  current_password: yup.string().trim().required('Current password is required'),
  new_password: passwordSchema,
  new_password_confirmation: passwordConfirmationSchema('new_password'),
});

// Reset password schema
export const resetPasswordSchema = yup.object({
  email: emailSchema,
});

// Forgot password schema
export const forgotPasswordSchema = yup.object({
  email: emailSchema,
});

// Profile update schema
export const profileUpdateSchema = yup.object({
  email: emailSchema,
});

// Ticket creation schema
export const ticketCreationSchema = yup.object({
  subject: requiredStringSchema('Subject', 200),
  message: requiredStringSchema('Message', 5000),
  level: yup
    .number()
    .required('Priority is required')
    .oneOf([0, 1, 2], 'Invalid priority level'),
});

// Ticket reply schema
export const ticketReplySchema = yup.object({
  message: requiredStringSchema('Message', 5000),
});

// Gift card redemption schema
export const giftCardRedemptionSchema = yup.object({
  code: requiredStringSchema('Gift card code', 50),
});

// Coupon code schema
export const couponCodeSchema = yup.object({
  code: requiredStringSchema('Coupon code', 50),
});
