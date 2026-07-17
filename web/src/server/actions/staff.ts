'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { requestBaseUrl } from '@/server/base-url';
import { sendEmail } from '@/server/email';
import { staffInvite } from '@/lib/email-templates';
import { acceptInviteSchema, INVITABLE_ROLES, inviteStaffSchema } from '@/lib/validation/staff';
import {
  acceptInvite,
  changeMemberRole,
  createInvite,
  removeMember,
  revokeInvite,
} from '@/server/services/staff';

export interface InviteState {
  error?: string;
  inviteUrl?: string;
}

export async function inviteStaff(
  slug: string,
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { restaurantId } = await requireAbility(slug, 'staff:manage');

  const parsed = inviteStaffSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { token } = await createInvite(db, restaurantId, parsed.data.email, parsed.data.role);
  revalidatePath(`/r/${slug}/staff`);

  const base = await requestBaseUrl();
  const inviteUrl = `${base}/accept-invite/${token}`;

  // Best-effort email with the accept link (the URL is also returned + shown in the UI).
  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { name: true } });
  await sendEmail({
    to: parsed.data.email,
    ...staffInvite({ restaurantName: restaurant?.name ?? 'the team', role: parsed.data.role, acceptUrl: inviteUrl }),
  });

  return { inviteUrl };
}

export interface AcceptState {
  error?: string;
}

export async function submitAcceptInvite(
  token: string,
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const parsed = acceptInviteSchema.safeParse({
    name: formData.get('name'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const result = await acceptInvite(db, token, parsed.data);
  if (!result.ok) {
    return {
      error:
        result.reason === 'expired'
          ? 'This invite has expired. Ask for a new link.'
          : result.reason === 'used'
            ? 'This invite has already been used. Try signing in.'
            : 'This invite link is invalid.',
    };
  }

  redirect('/login');
}

// ─────────────────────── Member management ───────────────────────

/** Remove a member. Silently no-ops on self-removal or the last-owner guard. */
export async function removeStaff(slug: string, userId: string): Promise<void> {
  const ctx = await requireAbility(slug, 'staff:manage');
  if (userId !== ctx.userId) {
    await removeMember(db, ctx.restaurantId, userId);
  }
  revalidatePath(`/r/${slug}/staff`);
}

/** Change a member's role (to a manager/chef/server role — never OWNER via this UI). */
export async function changeStaffRole(slug: string, userId: string, formData: FormData): Promise<void> {
  const ctx = await requireAbility(slug, 'staff:manage');
  const parsed = z.enum(INVITABLE_ROLES).safeParse(formData.get('role'));
  if (parsed.success && userId !== ctx.userId) {
    await changeMemberRole(db, ctx.restaurantId, userId, parsed.data);
  }
  revalidatePath(`/r/${slug}/staff`);
}

/** Revoke a pending invite. */
export async function revokeStaffInvite(slug: string, inviteId: string): Promise<void> {
  const ctx = await requireAbility(slug, 'staff:manage');
  await revokeInvite(db, ctx.restaurantId, inviteId);
  revalidatePath(`/r/${slug}/staff`);
}
