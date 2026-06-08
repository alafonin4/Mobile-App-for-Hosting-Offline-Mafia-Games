import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must contain at least 8 characters').max(128, 'Password is too long'),
});

export const registerSchema = loginSchema.extend({
  confirmPassword: z.string().min(8, 'Confirm password').max(128, 'Password is too long'),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
