'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { INVITABLE_ROLES } from '@/lib/validation/staff';
import {
  changeStaffRole,
  inviteStaff,
  removeStaff,
  revokeStaffInvite,
  type InviteState,
} from '@/server/actions/staff';

interface Member {
  id: string;
  userId: string;
  role: string;
  name: string | null;
  email: string;
}
interface Invite {
  id: string;
  email: string;
  role: string;
}

const INITIAL: InviteState = {};
const selectClass =
  'h-9 rounded-[var(--radius)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30';

export function StaffManager({
  slug,
  currentUserId,
  members,
  invites,
}: {
  slug: string;
  currentUserId: string;
  members: Member[];
  invites: Invite[];
}) {
  const [state, formAction, pending] = useActionState(inviteStaff.bind(null, slug), INITIAL);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Staff</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <form action={formAction} className="h-fit space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5">
          <h2 className="font-display text-lg text-foreground">Invite a teammate</h2>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="chef@restaurant.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="SERVER"
              className="h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30"
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create invite link'}
          </Button>

          {state.inviteUrl ? (
            <div className="space-y-2 rounded-[var(--radius)] border border-border bg-background p-3">
              <p className="text-xs text-muted">Share this link with your teammate:</p>
              <p className="break-all font-mono text-xs text-foreground">{state.inviteUrl}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(state.inviteUrl!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? 'Copied ✓' : 'Copy link'}
              </Button>
            </div>
          ) : null}
        </form>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
              Team ({members.length})
            </h3>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
              {members.map((m) => {
                const isSelf = m.userId === currentUserId;
                const isOwner = m.role === 'OWNER';
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {m.name ?? m.email}
                        {isSelf ? <span className="ml-1 text-xs text-muted">(you)</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted">{m.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isOwner || isSelf ? (
                        <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-pine dark:bg-linen/10 dark:text-linen">
                          {m.role.toLowerCase()}
                        </span>
                      ) : (
                        <>
                          <form action={changeStaffRole.bind(null, slug, m.userId)}>
                            <select name="role" defaultValue={m.role} onChange={(e) => e.currentTarget.form?.requestSubmit()} className={selectClass}>
                              {INVITABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r.charAt(0) + r.slice(1).toLowerCase()}
                                </option>
                              ))}
                            </select>
                          </form>
                          <form action={removeStaff.bind(null, slug, m.userId)}>
                            <Button type="submit" size="sm" variant="ghost" className="text-ember-600">
                              Remove
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {invites.length > 0 ? (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                Pending invites ({invites.length})
              </h3>
              <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <p className="text-sm text-foreground">{i.email}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">{i.role.toLowerCase()} · pending</span>
                      <form action={revokeStaffInvite.bind(null, slug, i.id)}>
                        <Button type="submit" size="sm" variant="ghost" className="text-ember-600">
                          Revoke
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
