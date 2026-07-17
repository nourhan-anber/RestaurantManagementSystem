'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { requestBaseUrl } from '@/server/base-url';
import { acceptInviteSchema, inviteStaffSchema } from '@/lib/validation/staff';
import { acceptInvite, createInvite } from '@/server/services/staff';

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
  return { inviteUrl: `${base}/accept-invite/${token}` };
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
