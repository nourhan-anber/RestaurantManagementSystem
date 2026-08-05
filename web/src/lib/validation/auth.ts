import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Request a password reset link. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

/** Set a new password from a reset link. */
export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters.'),
});

/** Update the signed-in user's display name. */
export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120),
});

/** Change the signed-in user's password (re-verifies the current one). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z.string().min(8, 'Use at least 8 characters.'),
});
