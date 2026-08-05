import { z } from 'zod';

// Owners/managers can invite these roles (never OWNER — those are created by the
// platform admin, preventing privilege escalation via invite).
export const INVITABLE_ROLES = ['MANAGER', 'CHEF', 'SERVER'] as const;

export const inviteStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  role: z.enum(INVITABLE_ROLES),
});

export const acceptInviteSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
