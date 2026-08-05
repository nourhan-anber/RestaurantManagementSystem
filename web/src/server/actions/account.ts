'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { requestBaseUrl } from '@/server/base-url';
import { sendEmail } from '@/server/email';
import { passwordReset } from '@/lib/email-templates';
import {
  changePassword,
  createPasswordReset,
  resetPassword,
  updateName,
} from '@/server/services/account';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  profileSchema,
  resetPasswordSchema,
} from '@/lib/validation/auth';

export interface ForgotState {
  error?: string;
  ok?: boolean;
}

/**
 * Request a password-reset link. Always reports success (even for an unknown email)
 * so the endpoint can't be used to enumerate accounts. Emails the link when a
 * matching user exists; the dev console logs it when email isn't configured.
 */
export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid email.' };

  const issued = await createPasswordReset(db, parsed.data.email, new Date());
  if (issued) {
    const base = await requestBaseUrl();
    await sendEmail({
      to: parsed.data.email,
      ...passwordReset({ resetUrl: `${base}/reset/${issued.token}` }),
    });
  }
  return { ok: true };
}

export interface ResetState {
  error?: string;
  ok?: boolean;
}

/** Set a new password from a reset link. */
export async function submitPasswordReset(
  token: string,
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' };

  const result = await resetPassword(db, token, parsed.data.password, new Date());
  if (!result.ok) {
    const message: Record<typeof result.reason, string> = {
      invalid: 'This reset link is invalid.',
      expired: 'This reset link has expired.',
      used: 'This reset link has already been used.',
    };
    return { error: message[result.reason] };
  }
  return { ok: true };
}

export interface ProfileState {
  error?: string;
  ok?: boolean;
}

/** Update the signed-in user's display name. */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not signed in.' };

  const parsed = profileSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid name.' };

  await updateName(db, session.user.id, parsed.data.name);
  revalidatePath('/account');
  return { ok: true };
}

/** Change the signed-in user's password after re-verifying the current one. */
export async function changeUserPassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not signed in.' };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const result = await changePassword(db, session.user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) {
    return { error: result.reason === 'wrong_password' ? 'Your current password is incorrect.' : 'Account not found.' };
  }
  return { ok: true };
}
