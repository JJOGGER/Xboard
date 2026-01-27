# Form Validation Guide

This directory contains reusable validation schemas and rules for the XBoard frontend applications.

## Overview

The validation system uses:
- **VeeValidate 4.x** - Form validation library for Vue 3
- **Yup** - Schema validation library
- **Custom validation rules** - Reusable validation functions

## Setup

VeeValidate is configured in both admin and user applications:
- `packages/admin/src/plugins/vee-validate.ts`
- `packages/user/src/plugins/vee-validate.ts`

The setup is automatically initialized in `main.ts` of each application.

## Usage

### Option 1: Using Yup Schemas (Recommended for complex forms)

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { loginSchema } from '@xboard/shared/validation/schemas';

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: loginSchema
});

const [email] = defineField('email');
const [password] = defineField('password');

const onSubmit = handleSubmit(async (values) => {
  // Form is valid, submit data
  console.log(values);
});
</script>

<template>
  <form @submit="onSubmit">
    <input v-model="email" type="email" />
    <span v-if="errors.email">{{ errors.email }}</span>
    
    <input v-model="password" type="password" />
    <span v-if="errors.password">{{ errors.password }}</span>
    
    <button type="submit">Submit</button>
  </form>
</template>
```

### Option 2: Using Element Plus with VeeValidate Rules

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

const formRef = ref<FormInstance>();

const formData = reactive({
  email: '',
  password: ''
});

const rules: FormRules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' }
  ]
};

const handleSubmit = async () => {
  await formRef.value?.validate();
  // Form is valid, submit data
};
</script>

<template>
  <el-form ref="formRef" :model="formData" :rules="rules">
    <el-form-item label="Email" prop="email">
      <el-input v-model="formData.email" />
    </el-form-item>
    
    <el-form-item label="Password" prop="password">
      <el-input v-model="formData.password" type="password" />
    </el-form-item>
    
    <el-button @click="handleSubmit">Submit</el-button>
  </el-form>
</template>
```

### Option 3: Using Naive UI with VeeValidate

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { registrationSchema } from '@xboard/shared/validation/schemas';

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: registrationSchema
});

const [email] = defineField('email');
const [password] = defineField('password');
const [passwordConfirmation] = defineField('password_confirmation');

const onSubmit = handleSubmit(async (values) => {
  // Form is valid, submit data
  console.log(values);
});
</script>

<template>
  <n-form @submit.prevent="onSubmit">
    <n-form-item label="Email" :feedback="errors.email">
      <n-input v-model:value="email" type="email" />
    </n-form-item>
    
    <n-form-item label="Password" :feedback="errors.password">
      <n-input v-model:value="password" type="password" show-password-on="click" />
    </n-form-item>
    
    <n-form-item label="Confirm Password" :feedback="errors.password_confirmation">
      <n-input v-model:value="passwordConfirmation" type="password" show-password-on="click" />
    </n-form-item>
    
    <n-button attr-type="submit">Register</n-button>
  </n-form>
</template>
```

## Available Schemas

Pre-built Yup schemas in `schemas.ts`:

- `loginSchema` - Email and password
- `registrationSchema` - Email, password, password confirmation, optional invite code
- `changePasswordSchema` - Current password, new password, confirmation
- `resetPasswordSchema` - Email only
- `profileUpdateSchema` - Email
- `ticketCreationSchema` - Subject, message, priority level
- `ticketReplySchema` - Message only
- `giftCardRedemptionSchema` - Gift card code
- `couponCodeSchema` - Coupon code

## Available Validation Rules

Custom validation functions in `rules.ts`:

### Basic Validation
- `isRequired(fieldName)` - Required field validation
- `isEmail(value)` - Email format validation
- `isStrongPassword(value)` - Password strength (min 8 chars)

### String Validation
- `minLength(min)` - Minimum length
- `maxLength(max)` - Maximum length
- `isAlphanumeric(value)` - Letters and numbers only
- `noWhitespace(value)` - No whitespace allowed

### Number Validation
- `isNumber(value)` - Valid number
- `isPositive(value)` - Positive number
- `minValue(min)` - Minimum value
- `maxValue(max)` - Maximum value

### Format Validation
- `isUrl(value)` - Valid URL format
- `isIpAddress(value)` - Valid IPv4 address
- `isPort(value)` - Valid port number (1-65535)
- `isJson(value)` - Valid JSON format
- `isInviteCode(value)` - Valid invite code format

### Array Validation
- `minItems(min)` - Minimum array length
- `maxItems(max)` - Maximum array length

### File Validation
- `maxFileSize(maxSizeInMB)` - Maximum file size
- `allowedFileTypes(types)` - Allowed MIME types

### Other
- `matches(targetField, targetValue)` - Field matching
- `isOneOf(allowedValues)` - Value in allowed list

## Creating Custom Schemas

```typescript
import * as yup from 'yup';
import { emailSchema, passwordSchema } from '@xboard/shared/validation/schemas';

// Create a custom schema
export const myCustomSchema = yup.object({
  email: emailSchema,
  password: passwordSchema,
  age: yup.number()
    .required('Age is required')
    .min(18, 'Must be at least 18 years old')
    .max(120, 'Invalid age'),
  terms: yup.boolean()
    .required('You must accept the terms')
    .oneOf([true], 'You must accept the terms')
});
```

## Validation Triggers

VeeValidate is configured with these triggers:
- `validateOnBlur: true` - Validate when field loses focus
- `validateOnChange: true` - Validate when field value changes
- `validateOnInput: false` - Don't validate on every keystroke
- `validateOnModelUpdate: true` - Validate when v-model updates

## Internationalization

Validation messages support both English and Chinese:
- English messages are the default
- Chinese messages are automatically used when the app language is set to Chinese
- Messages use placeholders like `{field}`, `{min}`, `{max}` for dynamic values

## Best Practices

1. **Use Yup schemas for complex forms** - Better type safety and reusability
2. **Use Element Plus/Naive UI validation for simple forms** - Less overhead
3. **Validate on blur, not on input** - Better UX, less annoying
4. **Provide clear error messages** - Help users understand what's wrong
5. **Disable submit buttons during validation** - Prevent duplicate submissions
6. **Show field-specific errors** - Don't just show a generic error message
7. **Test validation logic** - Write property tests for validation rules

## Testing

Property tests for validation are located in:
- `packages/admin/src/__tests__/property/validation.property.test.ts`
- `packages/user/src/__tests__/property/validation.property.test.ts`

Example property test:
```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { isEmail } from '@xboard/shared/validation/rules';

describe('Property: Email validation', () => {
  it('should reject invalid email formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => !s.includes('@')),
        async (invalidEmail) => {
          const result = isEmail(invalidEmail);
          expect(result).not.toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## References

- [VeeValidate Documentation](https://vee-validate.logaretm.com/v4/)
- [Yup Documentation](https://github.com/jquense/yup)
- [Element Plus Form Validation](https://element-plus.org/en-US/component/form.html#validation)
- [Naive UI Form Validation](https://www.naiveui.com/en-US/os-theme/components/form)
