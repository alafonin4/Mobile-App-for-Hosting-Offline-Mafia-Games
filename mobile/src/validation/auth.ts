import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must contain at least 6 characters'),
});

export const registerSchema = loginSchema.extend({
  confirmPassword: z.string().min(6, 'Confirm password'),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
